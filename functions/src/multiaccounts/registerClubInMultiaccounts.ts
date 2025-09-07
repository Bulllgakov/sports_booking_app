import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';

const db = admin.firestore();
const region = 'europe-west1';

/**
 * Cloud Function для регистрации клуба в системе Мультирасчетов Тбанка
 * Вызывается при подаче заявки на подключение Мультирасчетов
 * Использует статический IP через VPC коннектор
 */
export const registerClubInMultiaccounts = functions
  .region(region)
  .runWith({
    vpcConnector: 'firebase-connector',
    vpcConnectorEgressSettings: 'ALL_TRAFFIC'
  })
  .https.onCall(async (data, context) => {
  // Проверяем авторизацию
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Требуется авторизация');
  }

  const { venueId } = data;

  if (!venueId) {
    throw new functions.https.HttpsError('invalid-argument', 'Не указан ID клуба');
  }

  try {
    // Получаем данные клуба
    const venueDoc = await db.collection('venues').doc(venueId).get();
    
    if (!venueDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Клуб не найден');
    }

    const venueData = venueDoc.data()!;

    // Проверяем обязательные поля для регистрации
    const requiredFields = [
      'organizationType', 'legalName', 'inn', 'ogrn',
      'legalAddress', 'bankName', 'bik', 'correspondentAccount',
      'settlementAccount', 'financeEmail', 'financePhone',
      'directorName', 'directorPosition'
    ];

    const missingFields = requiredFields.filter(field => !venueData[field]);
    
    if (missingFields.length > 0) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Не заполнены обязательные реквизиты: ${missingFields.join(', ')}`
      );
    }

    // Формируем данные для отправки в Тбанк API
    const tbankPayload = {
      // Основная информация о компании
      company: {
        type: venueData.organizationType, // 'ИП', 'ООО', 'АО', 'НКО', 'Самозанятый'
        name: venueData.legalName,
        inn: venueData.inn,
        kpp: venueData.kpp || null,
        ogrn: venueData.ogrn,
        okpo: venueData.okpo || null,
        okved: venueData.okved || null,
        legalAddress: venueData.legalAddress,
        actualAddress: venueData.address || venueData.legalAddress,
      },
      // Банковские реквизиты
      bankDetails: {
        bankName: venueData.bankName,
        bik: venueData.bik,
        correspondentAccount: venueData.correspondentAccount,
        settlementAccount: venueData.settlementAccount,
      },
      // Контактная информация
      contacts: {
        email: venueData.financeEmail,
        phone: venueData.financePhone,
        directorName: venueData.directorName,
        directorPosition: venueData.directorPosition,
      },
      // Настройки платформы
      platformSettings: {
        platformCommission: venueData.platformCommission || 1, // Комиссия платформы в процентах
        venueId: venueId,
        venueName: venueData.name,
      }
    };

    // TODO: Заменить на реальный эндпоинт Тбанк API
    const TBANK_API_URL = functions.config().tbank?.api_url || 'https://api.tbank.ru/v1/multiaccounts';
    const TBANK_API_KEY = functions.config().tbank?.api_key || 'test_key';

    // Отправляем запрос в Тбанк API
    console.log('Отправка данных в Тбанк API:', tbankPayload);
    
    // В тестовом режиме имитируем успешный ответ
    let tbankResponse;
    if (TBANK_API_KEY === 'test_key') {
      // Тестовый режим - имитируем ответ
      tbankResponse = {
        data: {
          recipientId: `test_recipient_${venueId}_${Date.now()}`,
          status: 'pending',
          message: 'Заявка принята в обработку (тестовый режим)'
        }
      };
    } else {
      // Боевой режим - реальный API запрос
      tbankResponse = await axios.post(
        `${TBANK_API_URL}/register`,
        tbankPayload,
        {
          headers: {
            'Authorization': `Bearer ${TBANK_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Обновляем статус в базе данных
    await venueDoc.ref.update({
      'multiaccountsConfig.status': 'pending',
      'multiaccountsConfig.recipientId': tbankResponse.data.recipientId,
      'multiaccountsConfig.registeredAt': admin.firestore.FieldValue.serverTimestamp(),
      'multiaccountsConfig.lastChecked': admin.firestore.FieldValue.serverTimestamp(),
      'multiaccountsConfig.tbankResponse': tbankResponse.data,
      'paymentType': 'multiaccounts',
      'platformCommission': venueData.platformCommission || 1
    });

    // Отправляем email уведомление администратору клуба
    await sendRegistrationEmail(venueData.financeEmail, venueData.name);

    // Логируем событие
    await db.collection('audit_logs').add({
      type: 'multiaccounts_registration',
      venueId: venueId,
      venueName: venueData.name,
      recipientId: tbankResponse.data.recipientId,
      status: 'pending',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      initiatedBy: context.auth.uid
    });

    return {
      success: true,
      recipientId: tbankResponse.data.recipientId,
      message: 'Заявка на подключение Мультирасчетов успешно отправлена'
    };

  } catch (error: any) {
    console.error('Ошибка при регистрации в Мультирасчетах:', error);
    
    // Обновляем статус ошибки в БД
    await db.collection('venues').doc(venueId).update({
      'multiaccountsConfig.status': 'error',
      'multiaccountsConfig.errorMessage': error.message,
      'multiaccountsConfig.lastChecked': admin.firestore.FieldValue.serverTimestamp()
    });

    if (error.response) {
      // Ошибка от Тбанк API
      throw new functions.https.HttpsError(
        'internal',
        `Ошибка API Тбанк: ${error.response.data?.message || error.message}`
      );
    } else if (error.code) {
      // Firebase функция ошибка
      throw error;
    } else {
      // Неизвестная ошибка
      throw new functions.https.HttpsError(
        'internal',
        'Произошла ошибка при регистрации. Попробуйте позже.'
      );
    }
  }
});

/**
 * Отправка email уведомления о регистрации
 */
async function sendRegistrationEmail(email: string, clubName: string) {
  // TODO: Интегрировать с вашим email сервисом (SendGrid, Mailgun, etc.)
  console.log(`Отправка email на ${email} для клуба ${clubName}`);
  
  const emailContent = `
    Здравствуйте!
    
    Ваша заявка на подключение Мультирасчетов от Т-Банка для клуба "${clubName}" принята в обработку.
    
    Статус заявки: На рассмотрении
    Ожидаемое время обработки: 1-2 рабочих дня
    
    Мы отправим вам уведомление, как только заявка будет одобрена.
    
    С уважением,
    Команда AllCourt
  `;
  
  // В реальном приложении здесь будет вызов email API
  return true;
}

/**
 * Cloud Function для проверки статуса регистрации в Мультирасчетах
 * Запускается по расписанию каждый час
 */
export const checkMultiaccountsStatusScheduled = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    console.log('Проверка статусов заявок на Мультирасчеты...');
    
    // Получаем все клубы со статусом pending
    const pendingVenues = await db.collection('venues')
      .where('multiaccountsConfig.status', '==', 'pending')
      .get();
    
    console.log(`Найдено ${pendingVenues.size} клубов в статусе ожидания`);
    
    const TBANK_API_URL = functions.config().tbank?.api_url || 'https://api.tbank.ru/v1/multiaccounts';
    const TBANK_API_KEY = functions.config().tbank?.api_key || 'test_key';
    
    for (const venueDoc of pendingVenues.docs) {
      const venueData = venueDoc.data();
      const recipientId = venueData.multiaccountsConfig?.recipientId;
      
      if (!recipientId) {
        console.error(`Нет recipientId для клуба ${venueDoc.id}`);
        continue;
      }
      
      try {
        // Проверяем статус в Тбанк API
        let statusResponse;
        
        if (TBANK_API_KEY === 'test_key') {
          // Тестовый режим - имитируем одобрение через 1 час после регистрации
          const registeredAt = venueData.multiaccountsConfig.registeredAt?.toDate();
          const hoursSinceRegistration = registeredAt 
            ? (Date.now() - registeredAt.getTime()) / (1000 * 60 * 60)
            : 0;
          
          statusResponse = {
            data: {
              status: hoursSinceRegistration > 1 ? 'active' : 'pending',
              recipientId: recipientId,
              message: hoursSinceRegistration > 1 
                ? 'Мультирасчеты активированы (тестовый режим)'
                : 'Заявка на рассмотрении (тестовый режим)'
            }
          };
        } else {
          // Боевой режим - реальный API запрос
          statusResponse = await axios.get(
            `${TBANK_API_URL}/status/${recipientId}`,
            {
              headers: {
                'Authorization': `Bearer ${TBANK_API_KEY}`
              }
            }
          );
        }
        
        // Обновляем статус если изменился
        if (statusResponse.data.status !== 'pending') {
          const updateData: any = {
            'multiaccountsConfig.status': statusResponse.data.status,
            'multiaccountsConfig.lastChecked': admin.firestore.FieldValue.serverTimestamp()
          };
          
          if (statusResponse.data.status === 'active') {
            updateData['multiaccountsConfig.activatedAt'] = admin.firestore.FieldValue.serverTimestamp();
            
            // Отправляем уведомление об активации
            await sendActivationEmail(
              venueData.financeEmail,
              venueData.name,
              venueData.platformCommission || 1
            );
          } else if (statusResponse.data.status === 'rejected') {
            updateData['multiaccountsConfig.rejectionReason'] = statusResponse.data.rejectionReason || 'Не указана';
            
            // Отправляем уведомление об отказе
            await sendRejectionEmail(
              venueData.financeEmail,
              venueData.name,
              statusResponse.data.rejectionReason
            );
          }
          
          await venueDoc.ref.update(updateData);
          
          console.log(`Статус клуба ${venueData.name} обновлен на ${statusResponse.data.status}`);
        }
        
      } catch (error) {
        console.error(`Ошибка при проверке статуса для клуба ${venueDoc.id}:`, error);
      }
    }
    
    console.log('Проверка статусов завершена');
  });

/**
 * Отправка email об активации Мультирасчетов
 */
async function sendActivationEmail(email: string, clubName: string, commission: number) {
  console.log(`Отправка уведомления об активации на ${email}`);
  
  const emailContent = `
    Поздравляем!
    
    Мультирасчеты от Т-Банка для клуба "${clubName}" успешно активированы!
    
    Теперь все платежи будут автоматически обрабатываться через платформу AllCourt.
    
    Условия:
    - Комиссия платформы: ${commission}%
    - Выплаты: ежедневно в 10:00 МСК
    - Возвраты: обрабатываются автоматически
    
    Вы можете отслеживать все транзакции и выплаты в разделе "Финансы" вашей админ-панели.
    
    С уважением,
    Команда AllCourt
  `;
  
  return true;
}

/**
 * Отправка email об отказе в регистрации
 */
async function sendRejectionEmail(email: string, clubName: string, reason: string) {
  console.log(`Отправка уведомления об отказе на ${email}`);
  
  const emailContent = `
    Здравствуйте!
    
    К сожалению, заявка на подключение Мультирасчетов для клуба "${clubName}" была отклонена.
    
    Причина отказа: ${reason || 'Не соответствие требованиям'}
    
    Пожалуйста, проверьте правильность заполнения всех реквизитов и подайте заявку повторно.
    
    Если у вас есть вопросы, свяжитесь с нашей службой поддержки.
    
    С уважением,
    Команда AllCourt
  `;
  
  return true;
}
/**
 * Cloud Function для ручной проверки статуса заявки на мультирасчеты
 * Вызывается из админ-панели при нажатии кнопки "Проверить статус"
 */
export const checkMultiaccountsStatus = functions
  .region(region)
  .runWith({
    vpcConnector: 'firebase-connector',
    vpcConnectorEgressSettings: 'ALL_TRAFFIC'
  })
  .https.onCall(async (data, context) => {
    // Проверка авторизации
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Необходима авторизация'
      );
    }

    const { venueId } = data;

    if (!venueId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Не указан ID клуба'
      );
    }

    try {
      // Получаем данные клуба
      const venueDoc = await db.collection('venues').doc(venueId).get();

      if (!venueDoc.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          'Клуб не найден'
        );
      }

      const venueData = venueDoc.data()!;
      
      // Проверяем, что есть конфигурация мультирасчетов
      if (!venueData.multiaccountsConfig) {
        return {
          success: false,
          error: 'Конфигурация мультирасчетов не найдена'
        };
      }

      const config = venueData.multiaccountsConfig;

      // ВАЖНО: В production версии здесь должен быть реальный вызов API Т-Банка
      // Сейчас используем тестовый режим для демонстрации
      
      const TBANK_API_KEY = functions.config().tbank?.api_key || 'test_key';
      
      if (TBANK_API_KEY === 'test_key') {
        // Тестовый режим - симулируем одобрение через 5 минут
        const registeredAt = config.registeredAt?.toDate();
        if (registeredAt) {
          const minutesPassed = (Date.now() - registeredAt.getTime()) / 1000 / 60;
          
          // Если прошло больше 5 минут - одобряем
          if (minutesPassed > 5) {
            return {
              success: true,
              status: 'active',
              recipientId: 'TEST_RECIPIENT_' + venueId.substring(0, 8),
              message: 'Заявка одобрена (тестовый режим)'
            };
          }
          
          // Заявка еще на рассмотрении
          const remaining = Math.ceil(5 - minutesPassed);
          return {
            success: true,
            status: 'pending',
            message: `Заявка на рассмотрении (осталось ${remaining} минут до автоматического одобрения в тестовом режиме)`
          };
        }
        
        return {
          success: true,
          status: 'pending',
          message: 'Заявка на рассмотрении'
        };
      } else {
        // Боевой режим - реальный API запрос к Т-Банку
        const TBANK_API_URL = functions.config().tbank?.api_url || 'https://api.tbank.ru/v1/multiaccounts';
        
        const statusResponse = await axios.get(
          `${TBANK_API_URL}/status/${config.recipientId}`,
          {
            headers: {
              'Authorization': `Bearer ${TBANK_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (statusResponse.data.status === 'active') {
          return {
            success: true,
            status: 'active',
            recipientId: statusResponse.data.recipientId,
            message: 'Мультирасчеты активны'
          };
        } else if (statusResponse.data.status === 'rejected') {
          return {
            success: true,
            status: 'rejected',
            reason: statusResponse.data.rejectionReason || 'Заявка отклонена банком',
            message: 'Заявка отклонена'
          };
        } else {
          return {
            success: true,
            status: 'pending',
            message: 'Заявка на рассмотрении'
          };
        }
      }
    } catch (error) {
      console.error('Error checking multiaccounts status:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Ошибка при проверке статуса'
      );
    }
  });
