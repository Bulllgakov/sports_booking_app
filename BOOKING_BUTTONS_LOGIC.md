# 🎯 Логика кнопок "Забронировать" на страницах витрины

## 📍 Где будут кнопки бронирования

### 1. Страница города `/moscow/`
```jsx
<ClubCard>
  <ClubName>SmartPadel Moscow</ClubName>
  <ClubInfo>...</ClubInfo>
  <CardActions>
    <DetailButton href="/club/smartpadel-moscow/">
      Подробнее
    </DetailButton>
    <BookButton href="/club/123abc/booking/" target="_blank">
      Забронировать
    </BookButton>
  </CardActions>
</ClubCard>
```

### 2. Страница клуба `/club/smartpadel-moscow/`
```jsx
<ClubPage>
  {/* Плавающая кнопка (sticky) */}
  <StickyBookingBar>
    <Price>от 1500₽/час</Price>
    <BookButton href="/club/123abc/booking/" target="_blank">
      Забронировать онлайн →
    </BookButton>
  </StickyBookingBar>
  
  {/* Также кнопка в нескольких местах */}
  <HeroSection>
    <BookButton>Выбрать время →</BookButton>
  </HeroSection>
  
  <PricesSection>
    <PriceTable>...</PriceTable>
    <BookButton>Забронировать сейчас</BookButton>
  </PricesSection>
  
  <ContactSection>
    <BookButton>Забронировать корт</BookButton>
    <CallButton>📞 Позвонить</CallButton>
  </ContactSection>
</ClubPage>
```

### 3. Карта (маркеры клубов)
```jsx
<MapPopup>
  <ClubName>SmartPadel</ClubName>
  <Address>ул. Профсоюзная, 69</Address>
  <PopupActions>
    <BookButton href="/club/123abc/booking/">
      Забронировать
    </BookButton>
  </PopupActions>
</MapPopup>
```

## 🔀 Сценарии работы кнопок

### ✅ Сценарий 1: Клуб активен (обычный случай)
```jsx
{club.isActive && club.hasOnlineBooking ? (
  <BookButton 
    href={`/club/${club.id}/booking/`}
    target="_blank"
    className="btn-primary"
  >
    Забронировать онлайн
  </BookButton>
) : null}
```
**Действие:** Открывает в новой вкладке существующую страницу бронирования

### ⏸️ Сценарий 2: Клуб не прошел модерацию
```jsx
{club.status === 'pending' && (
  <DisabledBookingBlock>
    <Badge>Клуб на модерации</Badge>
    <p>Онлайн-бронирование скоро будет доступно</p>
    <NotifyButton onClick={subscribeToClub}>
      🔔 Уведомить когда заработает
    </NotifyButton>
    <CallButton href={`tel:${club.phone}`}>
      📞 Позвонить напрямую: {club.phone}
    </CallButton>
  </DisabledBookingBlock>
)}
```
**Действие:** Показываем телефон и возможность подписаться

### 🚫 Сценарий 3: Клуб временно отключил онлайн-бронирование
```jsx
{club.isActive && !club.hasOnlineBooking && (
  <AlternativeBookingBlock>
    <p>Онлайн-бронирование временно недоступно</p>
    <CallButton href={`tel:${club.phone}`}>
      📞 Забронировать по телефону
    </CallButton>
    <WhatsAppButton href={`https://wa.me/${club.whatsapp}`}>
      💬 Написать в WhatsApp
    </WhatsAppButton>
  </AlternativeBookingBlock>
)}
```
**Действие:** Предлагаем альтернативные способы связи

### 🆕 Сценарий 4: Клуб еще не на платформе (для SEO)
```jsx
{!club.isRegistered && (
  <NotRegisteredBlock>
    <p>Этот клуб пока не подключен к AllCourt</p>
    <ViewContactsButton onClick={showContacts}>
      📞 Показать контакты
    </ViewContactsButton>
    <RequestConnectionButton onClick={requestClubConnection}>
      📧 Запросить подключение клуба
    </RequestConnectionButton>
  </NotRegisteredBlock>
)}
```
**Действие:** Показываем базовую информацию и мотивируем клуб подключиться

## 📊 Техническая реализация

### Компонент универсальной кнопки
```tsx
interface BookingButtonProps {
  club: Club;
  variant?: 'primary' | 'secondary' | 'card';
  showPrice?: boolean;
}

export const BookingButton: React.FC<BookingButtonProps> = ({ 
  club, 
  variant = 'primary',
  showPrice = false 
}) => {
  // Клуб активен и есть онлайн-бронирование
  if (club.isActive && club.hasOnlineBooking) {
    return (
      <a
        href={`/club/${club.id}/booking/`}
        target="_blank"
        rel="noopener noreferrer"
        className={`btn btn-${variant}`}
        onClick={() => {
          // Трекинг для аналитики
          gtag('event', 'booking_click', {
            club_id: club.id,
            club_name: club.name,
            source: 'showcase'
          });
        }}
      >
        {showPrice && <span>от {club.minPrice}₽</span>}
        Забронировать онлайн
      </a>
    );
  }
  
  // Клуб на модерации
  if (club.status === 'pending') {
    return (
      <div className="booking-pending">
        <button 
          className="btn btn-disabled"
          disabled
        >
          Скоро будет доступно
        </button>
        <a 
          href={`tel:${club.phone}`}
          className="btn btn-secondary"
        >
          📞 Позвонить
        </a>
      </div>
    );
  }
  
  // Клуб отключил онлайн-бронирование
  if (club.isActive && !club.hasOnlineBooking) {
    return (
      <div className="booking-alternative">
        <a 
          href={`tel:${club.phone}`}
          className="btn btn-primary"
        >
          📞 Забронировать по телефону
        </a>
      </div>
    );
  }
  
  // Клуб не зарегистрирован
  return (
    <div className="booking-not-available">
      <button 
        className="btn btn-secondary"
        onClick={() => showClubContacts(club)}
      >
        Показать контакты
      </button>
    </div>
  );
};
```

### Данные клуба в Firestore
```typescript
interface Club {
  id: string;                    // ID в Firebase
  slug: string;                  // SEO-friendly URL
  name: string;
  
  // Статусы
  isActive: boolean;             // Клуб активен
  hasOnlineBooking: boolean;     // Включено онлайн-бронирование
  status: 'active' | 'pending' | 'suspended';
  
  // URL для бронирования
  bookingUrl?: string;           // Кастомный URL если есть
  
  // Контакты (всегда показываем)
  phone: string;
  whatsapp?: string;
  telegram?: string;
  email?: string;
  
  // SEO данные
  description: string;
  photos: string[];
  address: string;
  metro?: string;
  
  // Цены (для отображения)
  minPrice?: number;
  maxPrice?: number;
  currency: string;
}
```

## 🎨 Визуальные состояния кнопок

### 1. Активная кнопка (можно бронировать)
```css
.btn-book-active {
  background: var(--primary);
  color: white;
  font-weight: 600;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-book-active:hover {
  background: var(--primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 209, 50, 0.3);
}
```

### 2. Недоступная кнопка (клуб на модерации)
```css
.btn-book-pending {
  background: var(--gray-light);
  color: var(--gray);
  cursor: not-allowed;
  position: relative;
}

.btn-book-pending::after {
  content: "🔒";
  margin-left: 8px;
}
```

### 3. Альтернативная кнопка (только телефон)
```css
.btn-book-phone {
  background: white;
  border: 2px solid var(--primary);
  color: var(--primary);
}

.btn-book-phone:hover {
  background: var(--primary-light);
}
```

## 📱 Мобильная адаптация

### На мобильных устройствах:
```jsx
// Для мобильных - не открываем в новой вкладке
const isMobile = window.innerWidth < 768;

<BookButton 
  href={`/club/${club.id}/booking/`}
  target={isMobile ? "_self" : "_blank"}
>
  Забронировать
</BookButton>

// Плюс добавляем floating action button
<FloatingBookButton>
  <BookIcon />
  <Price>от 1500₽</Price>
</FloatingBookButton>
```

## 📊 Аналитика кликов

### Отслеживаем:
```javascript
// Клики на кнопки бронирования
gtag('event', 'booking_button_click', {
  club_id: club.id,
  club_name: club.name,
  club_status: club.status,
  source_page: window.location.pathname,
  user_location: userCity,
  timestamp: Date.now()
});

// Для неактивных клубов - запросы на подключение
gtag('event', 'club_connection_request', {
  club_name: club.name,
  user_email: userEmail,
  reason: 'wants_to_book'
});
```

## ✅ Итоговая логика

1. **Всегда показываем клубы** (даже неактивные) для SEO
2. **Кнопка "Забронировать"** адаптируется под статус клуба:
   - ✅ Активный → открывает `/club/{id}/booking/`
   - ⏸️ На модерации → показывает телефон + уведомление
   - 🚫 Без онлайн-бронирования → только телефон/WhatsApp
   - 🆕 Не в системе → контакты + запрос на подключение

3. **Цель:** Максимальная конверсия в бронирование любым способом
4. **SEO бонус:** Все клубы индексируются, даже неактивные