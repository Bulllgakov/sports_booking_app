import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { CircularProgress, Container, Paper, Typography, Box, Button } from '@mui/material'
import { ArrowBack, Print } from '@mui/icons-material'

interface ClubData {
  name: string
  organizationType: string
  legalName: string
  inn: string
  kpp: string
  ogrn: string
  legalAddress: string
  bankName: string
  bankBik: string
  bankCorrespondentAccount: string
  bankAccount: string
  directorName: string
  directorPosition: string
  phone: string
  email: string
  address: string
}

export default function UserAgreement() {
  const { clubId } = useParams<{ clubId: string }>()
  const [club, setClub] = useState<ClubData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (clubId) {
      loadClubData()
    }
  }, [clubId])

  const loadClubData = async () => {
    try {
      const docRef = doc(db, 'venues', clubId!)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        setClub(docSnap.data() as ClubData)
      } else {
        setError('Клуб не найден')
      }
    } catch (err) {
      console.error('Error loading club data:', err)
      setError('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const formatDate = () => {
    return new Date().toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    )
  }

  if (error || !club) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography color="error">{error || 'Данные не найдены'}</Typography>
        <Button component={Link} to="/" startIcon={<ArrowBack />} sx={{ mt: 2 }}>
          Вернуться на главную
        </Button>
      </Container>
    )
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', '@media print': { display: 'none' } }}>
        <Button component={Link} to={`/club/${clubId}`} startIcon={<ArrowBack />}>
          Вернуться к клубу
        </Button>
        <Button variant="outlined" startIcon={<Print />} onClick={handlePrint}>
          Печать
        </Button>
      </Box>

      <Paper sx={{ p: 4, '@media print': { boxShadow: 'none', p: 2 } }}>
        <Typography variant="h4" component="h1" align="center" gutterBottom>
          ПОЛЬЗОВАТЕЛЬСКОЕ СОГЛАШЕНИЕ
        </Typography>
        <Typography variant="subtitle1" align="center" gutterBottom color="text.secondary">
          об оказании услуг по предоставлению спортивных площадок
        </Typography>
        
        <Typography variant="body2" align="center" sx={{ mt: 3, mb: 4 }}>
          Дата публикации: {formatDate()}
        </Typography>

        <Box sx={{ mt: 4 }}>
          <Typography paragraph>
            Настоящее Пользовательское соглашение (далее – «Соглашение») регулирует отношения между {club.legalName || club.name} 
            {club.organizationType && ` (${club.organizationType})`}, именуемым в дальнейшем «Исполнитель», с одной стороны, 
            и физическим лицом, именуемым в дальнейшем «Заказчик», с другой стороны, совместно именуемые «Стороны», 
            по поводу оказания услуг по предоставлению спортивных площадок для занятий спортом.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
            1. ТЕРМИНЫ И ОПРЕДЕЛЕНИЯ
          </Typography>
          <Typography paragraph>
            1.1. <strong>Клуб</strong> — спортивный комплекс, расположенный по адресу: {club.address}, 
            управляемый Исполнителем.
          </Typography>
          <Typography paragraph>
            1.2. <strong>Корт/Площадка</strong> — специально оборудованная спортивная площадка для занятий теннисом, 
            паделом, бадминтоном или иными видами спорта.
          </Typography>
          <Typography paragraph>
            1.3. <strong>Бронирование</strong> — резервирование Корта на определенную дату и время через мобильное 
            приложение «Все Корты» или иным способом, предусмотренным Исполнителем.
          </Typography>
          <Typography paragraph>
            1.4. <strong>Услуги</strong> — предоставление Корта во временное пользование Заказчику для занятий спортом.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
            2. ПРЕДМЕТ СОГЛАШЕНИЯ
          </Typography>
          <Typography paragraph>
            2.1. Исполнитель обязуется предоставить Заказчику во временное пользование Корт для занятий спортом, 
            а Заказчик обязуется оплатить Услуги в соответствии с условиями настоящего Соглашения.
          </Typography>
          <Typography paragraph>
            2.2. Конкретные условия предоставления Услуг (дата, время, продолжительность, стоимость) определяются 
            при Бронировании.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
            3. ПОРЯДОК БРОНИРОВАНИЯ И ОПЛАТЫ
          </Typography>
          <Typography paragraph>
            3.1. Бронирование осуществляется через мобильное приложение «Все Корты», по телефону {club.phone} 
            или иным доступным способом.
          </Typography>
          <Typography paragraph>
            3.2. Оплата Услуг производится в соответствии с действующими тарифами Исполнителя одним из следующих способов:
          </Typography>
          <Typography component="div" paragraph sx={{ pl: 2 }}>
            • Онлайн-оплата банковской картой через приложение<br />
            • Оплата наличными в кассе Клуба<br />
            • Оплата банковской картой на месте<br />
            • Безналичный перевод по реквизитам Исполнителя
          </Typography>
          <Typography paragraph>
            3.3. Бронирование считается подтвержденным после получения оплаты или подтверждения от администратора Клуба.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
            4. ПРАВА И ОБЯЗАННОСТИ СТОРОН
          </Typography>
          <Typography paragraph>
            <strong>4.1. Исполнитель обязуется:</strong>
          </Typography>
          <Typography component="div" paragraph sx={{ pl: 2 }}>
            • Предоставить Корт в соответствии с Бронированием<br />
            • Обеспечить надлежащее состояние Корта и оборудования<br />
            • Предоставить раздевалки и душевые (при наличии)<br />
            • Обеспечить безопасность на территории Клуба
          </Typography>
          
          <Typography paragraph>
            <strong>4.2. Заказчик обязуется:</strong>
          </Typography>
          <Typography component="div" paragraph sx={{ pl: 2 }}>
            • Своевременно оплатить Услуги<br />
            • Соблюдать правила поведения в Клубе<br />
            • Бережно относиться к имуществу Клуба<br />
            • Использовать спортивную обувь и форму<br />
            • Освободить Корт по истечении оплаченного времени
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
            5. ОТМЕНА И ПЕРЕНОС БРОНИРОВАНИЯ
          </Typography>
          <Typography paragraph>
            5.1. Заказчик вправе отменить или перенести Бронирование не позднее чем за 24 часа до начала оказания Услуг.
          </Typography>
          <Typography paragraph>
            5.2. При отмене Бронирования менее чем за 24 часа, внесенная предоплата не возвращается.
          </Typography>
          <Typography paragraph>
            5.3. Исполнитель вправе отменить Бронирование по техническим причинам с полным возвратом предоплаты.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
            6. ОТВЕТСТВЕННОСТЬ СТОРОН
          </Typography>
          <Typography paragraph>
            6.1. Исполнитель не несет ответственности за вред, причиненный жизни и здоровью Заказчика в результате 
            нарушения им правил техники безопасности и правил поведения в Клубе.
          </Typography>
          <Typography paragraph>
            6.2. Заказчик несет материальную ответственность за ущерб, причиненный имуществу Клуба.
          </Typography>
          <Typography paragraph>
            6.3. Исполнитель не несет ответственности за сохранность личных вещей Заказчика.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
            7. ПЕРСОНАЛЬНЫЕ ДАННЫЕ
          </Typography>
          <Typography paragraph>
            7.1. Заказчик дает согласие на обработку своих персональных данных в соответствии с Федеральным законом 
            «О персональных данных» №152-ФЗ.
          </Typography>
          <Typography paragraph>
            7.2. Исполнитель обязуется использовать персональные данные Заказчика исключительно для оказания Услуг 
            и не передавать их третьим лицам без согласия Заказчика.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
            8. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ
          </Typography>
          <Typography paragraph>
            8.1. Настоящее Соглашение вступает в силу с момента акцепта Заказчиком его условий путем оформления 
            Бронирования и действует до полного исполнения Сторонами своих обязательств.
          </Typography>
          <Typography paragraph>
            8.2. Все споры и разногласия решаются путем переговоров, а при невозможности достижения соглашения — 
            в судебном порядке.
          </Typography>
          <Typography paragraph>
            8.3. Исполнитель вправе в одностороннем порядке изменять условия настоящего Соглашения, публикуя 
            изменения на сайте и в приложении.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
            9. РЕКВИЗИТЫ ИСПОЛНИТЕЛЯ
          </Typography>
          <Box sx={{ backgroundColor: 'grey.50', p: 3, borderRadius: 1, mt: 2 }}>
            <Typography variant="body2" component="div">
              <strong>{club.legalName || club.name}</strong><br />
              {club.legalAddress && (
                <>Юридический адрес: {club.legalAddress}<br /></>
              )}
              {club.inn && (
                <>ИНН: {club.inn}<br /></>
              )}
              {club.kpp && (
                <>КПП: {club.kpp}<br /></>
              )}
              {club.ogrn && (
                <>ОГРН: {club.ogrn}<br /></>
              )}
              {club.bankAccount && (
                <>
                  <br />
                  <strong>Банковские реквизиты:</strong><br />
                  Расчетный счет: {club.bankAccount}<br />
                  {club.bankName && (
                    <>Банк: {club.bankName}<br /></>
                  )}
                  {club.bankBik && (
                    <>БИК: {club.bankBik}<br /></>
                  )}
                  {club.bankCorrespondentAccount && (
                    <>Корр. счет: {club.bankCorrespondentAccount}<br /></>
                  )}
                </>
              )}
              {(club.directorName || club.directorPosition) && (
                <>
                  <br />
                  <strong>Руководитель:</strong><br />
                  {club.directorPosition && <>{club.directorPosition} </>}
                  {club.directorName}
                </>
              )}
              {(club.phone || club.email) && (
                <>
                  <br />
                  <strong>Контакты:</strong><br />
                  {club.phone && <>Телефон: {club.phone}<br /></>}
                  {club.email && <>Email: {club.email}</>}
                </>
              )}
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  )
}