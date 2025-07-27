import { getFunctions, httpsCallable } from 'firebase/functions';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * Тестирование отправки email через Firebase Extension
 */
export async function testEmailExtension(testEmail: string) {
  try {
    // Метод 1: Через Cloud Function
    console.log('Тестирование через Cloud Function...');
    const functions = getFunctions(undefined, 'europe-west1');
    const testEmailFn = httpsCallable(functions, 'testEmailSending');
    
    const result = await testEmailFn({ testEmail });
    console.log('✅ Результат отправки через функцию:', result.data);
    
    return result.data;
  } catch (error) {
    console.error('❌ Ошибка при отправке через функцию:', error);
    
    // Метод 2: Напрямую в коллекцию mail
    console.log('Попытка отправки напрямую в коллекцию mail...');
    try {
      const mailRef = await addDoc(collection(db, 'mail'), {
        to: testEmail,
        message: {
          subject: 'Тест Email Extension - Все Корты',
          text: 'Если вы видите это письмо, значит Firebase Extension работает корректно!',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #00A86B;">✅ Тест Email Extension</h2>
              <p>Если вы видите это письмо, значит Firebase Extension для отправки email работает корректно!</p>
              <hr style="border: 1px solid #eee; margin: 20px 0;">
              <p style="color: #666; font-size: 14px;">
                Отправлено через Firebase Extension (firestore-send-email)<br>
                Время: ${new Date().toLocaleString('ru-RU')}
              </p>
            </div>
          `
        }
      });
      
      console.log('✅ Email добавлен в очередь отправки:', mailRef.id);
      return { 
        success: true, 
        message: 'Email добавлен в очередь', 
        mailId: mailRef.id 
      };
    } catch (mailError) {
      console.error('❌ Ошибка при добавлении в коллекцию mail:', mailError);
      throw mailError;
    }
  }
}

// Экспортируем функцию для использования в консоли браузера
if (typeof window !== 'undefined') {
  (window as any).testEmailExtension = testEmailExtension;
}