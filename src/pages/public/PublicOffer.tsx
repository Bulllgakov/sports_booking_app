import React from 'react'
import { Box, Container, Typography, Paper } from '@mui/material'
import { useNavigate } from 'react-router-dom'

export default function PublicOffer() {
  const navigate = useNavigate()

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom align="center">
          ПУБЛИЧНАЯ ОФЕРТА
        </Typography>
        <Typography variant="subtitle1" gutterBottom align="center" color="text.secondary">
          о заключении договора на оказание услуг системы бронирования
        </Typography>
        
        <Typography variant="body2" sx={{ mt: 2, mb: 4 }} align="center" color="text.secondary">
          Дата публикации: 01 января 2025 года
        </Typography>

        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
          1. ОБЩИЕ ПОЛОЖЕНИЯ
        </Typography>
        <Typography variant="body1" paragraph>
          1.1. Настоящая публичная оферта (далее – «Оферта») является официальным предложением 
          ИП ТЕН КРИСТИНА ВАДИМОВНА (ОГРНИП 313028000082460, ИНН 026401027275), именуемого в дальнейшем «Исполнитель», 
          заключить договор на оказание услуг системы бронирования «Все Корты» (далее – «Система») 
          на условиях, изложенных в настоящей Оферте.
        </Typography>
        <Typography variant="body1" paragraph>
          1.2. Акцептом настоящей Оферты является регистрация в Системе и/или оплата услуг Исполнителя.
        </Typography>
        <Typography variant="body1" paragraph>
          1.3. Акцепт Оферты означает полное и безоговорочное согласие Заказчика с условиями настоящей Оферты.
        </Typography>

        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
          2. ПРЕДМЕТ ДОГОВОРА
        </Typography>
        <Typography variant="body1" paragraph>
          2.1. Исполнитель обязуется предоставить Заказчику доступ к Системе бронирования спортивных площадок, 
          а Заказчик обязуется оплатить услуги в соответствии с выбранным тарифным планом.
        </Typography>
        <Typography variant="body1" paragraph>
          2.2. Система предоставляет следующие основные функции:
          <br />• Онлайн-бронирование спортивных площадок
          <br />• Управление расписанием и загрузкой кортов
          <br />• Прием онлайн-платежей от клиентов
          <br />• Система уведомлений (SMS/Email)
          <br />• Аналитика и отчетность
          <br />• Мобильное приложение для клиентов
        </Typography>

        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
          3. ТАРИФНЫЕ ПЛАНЫ И СТОИМОСТЬ УСЛУГ
        </Typography>
        <Typography variant="body1" paragraph>
          3.1. Стоимость услуг определяется в соответствии с выбранным тарифным планом:
          <br />• <strong>СТАРТ</strong> - бесплатно (до 2 кортов)
          <br />• <strong>СТАНДАРТ</strong> - 990 рублей за корт в месяц (первые 3 месяца бесплатно)
          <br />• <strong>ПРОФИ</strong> - 1990 рублей за корт в месяц
        </Typography>
        <Typography variant="body1" paragraph>
          3.2. SMS-уведомления тарифицируются отдельно: 6 рублей за сообщение для всех тарифов.
        </Typography>
        <Typography variant="body1" paragraph>
          3.3. Оплата производится ежемесячно путем списания с привязанной банковской карты или по выставленному счету.
        </Typography>

        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
          4. ПРАВА И ОБЯЗАННОСТИ СТОРОН
        </Typography>
        <Typography variant="body1" paragraph>
          4.1. Исполнитель обязуется:
          <br />• Обеспечить круглосуточный доступ к Системе (за исключением времени технического обслуживания)
          <br />• Обеспечить сохранность данных Заказчика
          <br />• Предоставлять техническую поддержку в соответствии с тарифным планом
          <br />• Не взимать комиссию с платежей клиентов Заказчика
        </Typography>
        <Typography variant="body1" paragraph>
          4.2. Заказчик обязуется:
          <br />• Своевременно оплачивать услуги
          <br />• Не использовать Систему в противоправных целях
          <br />• Соблюдать авторские права Исполнителя
          <br />• Предоставлять достоверную информацию при регистрации
        </Typography>

        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
          5. ОТВЕТСТВЕННОСТЬ СТОРОН
        </Typography>
        <Typography variant="body1" paragraph>
          5.1. Исполнитель не несет ответственности за упущенную выгоду и иные косвенные убытки Заказчика.
        </Typography>
        <Typography variant="body1" paragraph>
          5.2. Исполнитель не несет ответственности за качество услуг связи, предоставляемых третьими лицами.
        </Typography>
        <Typography variant="body1" paragraph>
          5.3. Совокупная ответственность Исполнителя ограничена суммой, уплаченной Заказчиком за последний месяц использования Системы.
        </Typography>

        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
          6. КОНФИДЕНЦИАЛЬНОСТЬ
        </Typography>
        <Typography variant="body1" paragraph>
          6.1. Стороны обязуются соблюдать конфиденциальность информации, полученной в рамках исполнения настоящего Договора.
        </Typography>
        <Typography variant="body1" paragraph>
          6.2. Обработка персональных данных осуществляется в соответствии с Политикой конфиденциальности, 
          размещенной на сайте Системы.
        </Typography>

        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
          7. СРОК ДЕЙСТВИЯ И ПОРЯДОК РАСТОРЖЕНИЯ
        </Typography>
        <Typography variant="body1" paragraph>
          7.1. Договор вступает в силу с момента акцепта Оферты и действует до его расторжения любой из Сторон.
        </Typography>
        <Typography variant="body1" paragraph>
          7.2. Заказчик может расторгнуть Договор в любое время через личный кабинет в Системе.
        </Typography>
        <Typography variant="body1" paragraph>
          7.3. Исполнитель вправе расторгнуть Договор в одностороннем порядке при нарушении Заказчиком условий настоящей Оферты.
        </Typography>

        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
          8. РАЗРЕШЕНИЕ СПОРОВ
        </Typography>
        <Typography variant="body1" paragraph>
          8.1. Все споры решаются путем переговоров. При недостижении согласия споры передаются на рассмотрение 
          в Арбитражный суд Республики Татарстан.
        </Typography>

        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
          9. РЕКВИЗИТЫ ИСПОЛНИТЕЛЯ
        </Typography>
        <Typography variant="body1" paragraph>
          <strong>ИП ТЕН КРИСТИНА ВАДИМОВНА</strong>
          <br />ИНН: 026401027275
          <br />ОГРНИП: 313028000082460
          <br />Юридический адрес: 420000, Республика Татарстан, г. Казань, ул. Павлюхина, д. 114, кв. 39
          <br />
          <br />Банковские реквизиты:
          <br />Расчетный счет: 40802810800000000779
          <br />Банк: АО "ТБанк"
          <br />БИК: 044525974
          <br />Корр. счет: 30101810145250000974
          <br />
          <br />Email: admin@allcourt.ru
          <br />Телефон: +7 (999) 123-45-67
        </Typography>

        <Box sx={{ mt: 4, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary" align="center">
            Нажимая кнопку "Зарегистрироваться" или оплачивая услуги, вы принимаете условия настоящей Оферты
          </Typography>
        </Box>
      </Paper>
    </Container>
  )
}