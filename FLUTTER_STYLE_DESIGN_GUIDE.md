# 🎨 Дизайн-гайд витрины в стиле Flutter приложения

## 🎨 Цветовая палитра (из Flutter приложения)

```scss
// Основные цвета
$primary: #00D632;           // Зеленый AllCourt
$secondary: #3B82F6;         // Синий
$primary-light: #D1FAE5;     // Светло-зеленый фон
$primary-dark: #065F46;      // Темно-зеленый

// Нейтральные
$dark: #1A1F36;              // Основной темный текст
$gray: #6B7280;              // Серый текст
$light-gray: #9CA3AF;        // Светло-серый
$extra-light-gray: #E5E7EB;  // Очень светло-серый
$background: #F8F9FA;        // Фон страницы
$white: #FFFFFF;             // Белый

// Спортивные цвета
$tennis: #00D632;            // Теннис (зеленый)
$padel: #3B82F6;            // Падел (синий)
$badminton: #F59E0B;        // Бадминтон (оранжевый)

// Статусы
$available: #4CAF50;         // Доступен
$busy: #FECACA;             // Занят
$error: #DC2626;            // Ошибка
$warning: #F59E0B;          // Предупреждение
```

## 📐 Компоненты в стиле Flutter

### 1️⃣ Главная страница (Flutter-style)

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <style>
    /* Flutter-like стили */
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen;
      background-color: #F8F9FA;
      margin: 0;
      padding: 0;
    }

    /* Приветствие как в Flutter */
    .greeting-section {
      padding: 24px 16px;
      background: white;
    }
    
    .greeting-title {
      font-size: 24px;
      font-weight: 700;
      color: #1A1F36;
      margin-bottom: 8px;
    }
    
    .location-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      background: #F0FDF4;
      border-radius: 20px;
      font-size: 14px;
      color: #065F46;
    }
    
    /* Поиск как в Flutter */
    .search-container {
      padding: 0 16px;
      margin-top: 16px;
    }
    
    .search-bar {
      width: 100%;
      padding: 16px;
      border: none;
      border-radius: 12px;
      background: white;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
      font-size: 16px;
    }
    
    /* Спортивные фильтры как в Flutter */
    .sport-filters {
      display: flex;
      gap: 12px;
      padding: 16px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    
    .sport-chip {
      padding: 10px 20px;
      border-radius: 20px;
      background: white;
      border: 2px solid transparent;
      font-weight: 600;
      font-size: 14px;
      white-space: nowrap;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .sport-chip.active {
      background: #D1FAE5;
      border-color: #00D632;
      color: #065F46;
    }
    
    .sport-chip.padel {
      border-color: #E5E7EB;
    }
    
    .sport-chip.padel.active {
      background: #DBEAFE;
      border-color: #3B82F6;
      color: #1E40AF;
    }
    
    .sport-chip.tennis.active {
      background: #D1FAE5;
      border-color: #00D632;
      color: #065F46;
    }
    
    .sport-chip.badminton.active {
      background: #FED7AA;
      border-color: #F59E0B;
      color: #92400E;
    }
    
    /* Карточки клубов как в Flutter */
    .clubs-list {
      padding: 16px;
    }
    
    .club-card {
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
      margin-bottom: 16px;
      transition: transform 0.2s;
    }
    
    .club-card:active {
      transform: scale(0.98);
    }
    
    .club-image {
      width: 100%;
      height: 200px;
      object-fit: cover;
      background: #E5E7EB;
    }
    
    .club-content {
      padding: 16px;
    }
    
    .club-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 8px;
    }
    
    .club-name {
      font-size: 18px;
      font-weight: 700;
      color: #1A1F36;
    }
    
    .sport-badge {
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .sport-badge.padel {
      background: #DBEAFE;
      color: #1E40AF;
    }
    
    .sport-badge.tennis {
      background: #D1FAE5;
      color: #065F46;
    }
    
    .club-info {
      margin-bottom: 12px;
    }
    
    .info-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
      font-size: 14px;
      color: #6B7280;
    }
    
    .rating {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #F59E0B;
      font-weight: 600;
    }
    
    .distance-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: #F3F4F6;
      border-radius: 12px;
      font-size: 12px;
      color: #6B7280;
    }
    
    /* Удобства как в Flutter */
    .amenities {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }
    
    .amenity-chip {
      padding: 4px 8px;
      background: #F8F9FA;
      border-radius: 6px;
      font-size: 12px;
      color: #6B7280;
    }
    
    /* Кнопки действий */
    .card-actions {
      display: flex;
      gap: 12px;
      padding-top: 12px;
      border-top: 1px solid #F3F4F6;
    }
    
    .btn {
      flex: 1;
      padding: 12px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 14px;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
      text-decoration: none;
    }
    
    .btn-primary {
      background: #00D632;
      color: white;
    }
    
    .btn-primary:hover {
      background: #00C02E;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 209, 50, 0.2);
    }
    
    .btn-secondary {
      background: white;
      color: #1A1F36;
      border: 2px solid #E5E7EB;
    }
    
    .btn-secondary:hover {
      background: #F8F9FA;
    }
    
    /* Floating Action Button как в Flutter */
    .fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 16px;
      background: #00D632;
      color: white;
      border: none;
      box-shadow: 0 4px 12px rgba(0, 209, 50, 0.3);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      z-index: 100;
    }
    
    .fab:hover {
      transform: scale(1.1);
    }
    
    /* Bottom Navigation как в Flutter */
    .bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: white;
      border-top: 1px solid #F3F4F6;
      display: flex;
      justify-content: space-around;
      padding: 8px 0;
      z-index: 50;
    }
    
    .nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 8px 16px;
      color: #9CA3AF;
      font-size: 12px;
      text-decoration: none;
      transition: all 0.2s;
    }
    
    .nav-item.active {
      color: #00D632;
    }
    
    .nav-icon {
      font-size: 20px;
    }
  </style>
</head>
<body>
  <!-- Приветствие как в Flutter -->
  <div class="greeting-section">
    <h1 class="greeting-title">Привет! 👋</h1>
    <div class="location-chip">
      📍 Москва
      <span style="margin-left: 4px; opacity: 0.6;">изменить</span>
    </div>
  </div>
  
  <!-- Поиск как в Flutter -->
  <div class="search-container">
    <input 
      type="text" 
      class="search-bar" 
      placeholder="Название клуба или адрес..."
    />
  </div>
  
  <!-- Фильтры по спорту -->
  <div class="sport-filters">
    <div class="sport-chip active">
      Все корты
    </div>
    <div class="sport-chip padel">
      🏓 Падел
    </div>
    <div class="sport-chip tennis">
      🎾 Теннис  
    </div>
    <div class="sport-chip badminton">
      🏸 Бадминтон
    </div>
  </div>
  
  <!-- Список клубов -->
  <div class="clubs-list">
    <!-- Карточка клуба -->
    <div class="club-card">
      <img class="club-image" src="/club-photo.jpg" alt="SmartPadel" />
      
      <div class="club-content">
        <div class="club-header">
          <h3 class="club-name">SmartPadel Moscow</h3>
          <span class="sport-badge padel">Падел</span>
        </div>
        
        <div class="club-info">
          <div class="info-row">
            <span class="rating">⭐ 4.8</span>
            <span>(234 отзыва)</span>
          </div>
          <div class="info-row">
            📍 ул. Профсоюзная, 69
            <span class="distance-chip">2.3 км</span>
          </div>
          <div class="info-row">
            💰 от 2000₽/час
          </div>
        </div>
        
        <div class="amenities">
          <span class="amenity-chip">🅿️ Парковка</span>
          <span class="amenity-chip">🚿 Душевые</span>
          <span class="amenity-chip">☕ Кафе</span>
          <span class="amenity-chip">🏠 Крытый</span>
        </div>
        
        <div class="card-actions">
          <a href="/club/smartpadel/" class="btn btn-secondary">
            Подробнее
          </a>
          <a href="/club/123/booking/" class="btn btn-primary">
            Забронировать
          </a>
        </div>
      </div>
    </div>
    
    <!-- Еще карточки... -->
  </div>
  
  <!-- Floating Action Button -->
  <button class="fab">
    🗺️
  </button>
  
  <!-- Bottom Navigation -->
  <nav class="bottom-nav">
    <a href="/" class="nav-item active">
      <span class="nav-icon">🏠</span>
      <span>Главная</span>
    </a>
    <a href="/search" class="nav-item">
      <span class="nav-icon">🔍</span>
      <span>Поиск</span>
    </a>
    <a href="/map" class="nav-item">
      <span class="nav-icon">🗺️</span>
      <span>Карта</span>
    </a>
    <a href="/bookings" class="nav-item">
      <span class="nav-icon">📅</span>
      <span>Мои брони</span>
    </a>
    <a href="/profile" class="nav-item">
      <span class="nav-icon">👤</span>
      <span>Профиль</span>
    </a>
  </nav>
</body>
</html>
```

## 📱 Мобильные паттерны из Flutter

### 1. Material Design 3 компоненты
- **Карточки** с elevation (тени)
- **Chips** для фильтров
- **FAB** (Floating Action Button)
- **Bottom Navigation**
- **Ripple эффекты** при нажатии

### 2. Анимации и переходы
```css
/* Ripple effect при нажатии */
.ripple {
  position: relative;
  overflow: hidden;
}

.ripple::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(0, 209, 50, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.ripple:active::before {
  width: 300px;
  height: 300px;
}

/* Skeleton loading как в Flutter */
@keyframes shimmer {
  0% {
    background-position: -468px 0;
  }
  100% {
    background-position: 468px 0;
  }
}

.skeleton {
  background: linear-gradient(
    90deg,
    #f0f0f0 25%,
    #e0e0e0 50%,
    #f0f0f0 75%
  );
  background-size: 1000px 100%;
  animation: shimmer 2s infinite;
}
```

### 3. Адаптивная сетка
```css
/* Mobile First подход */
.clubs-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  padding: 16px;
}

/* Tablet */
@media (min-width: 768px) {
  .clubs-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Desktop */  
@media (min-width: 1024px) {
  .clubs-grid {
    grid-template-columns: repeat(3, 1fr);
    max-width: 1200px;
    margin: 0 auto;
  }
  
  /* Убираем bottom nav на десктопе */
  .bottom-nav {
    display: none;
  }
}
```

## 🎯 Ключевые UI элементы из Flutter

### 1. Greeting Section (как в Flutter)
```jsx
<GreetingSection>
  <Title>
    {isAuth ? `Привет, ${userName}!` : 'Привет!'}
  </Title>
  <Subtitle>Найдите идеальный корт рядом с вами</Subtitle>
  <LocationChip>
    📍 {userCity || 'Выберите город'}
  </LocationChip>
</GreetingSection>
```

### 2. Sport Type Selector (цветовая кодировка)
```jsx
<SportFilters>
  <SportChip active={sport === 'all'} color="primary">
    Все корты
  </SportChip>
  <SportChip active={sport === 'padel'} color="blue">
    🏓 Падел
  </SportChip>
  <SportChip active={sport === 'tennis'} color="green">
    🎾 Теннис
  </SportChip>
  <SportChip active={sport === 'badminton'} color="orange">
    🏸 Бадминтон
  </SportChip>
</SportFilters>
```

### 3. Club Card (Material Design)
```jsx
<ClubCard elevation={2}>
  <CardImage src={club.image} />
  <SportBadge type={club.sport} />
  <CardContent>
    <ClubName>{club.name}</ClubName>
    <Rating value={club.rating} count={club.reviews} />
    <Distance>{club.distance} км</Distance>
    <Price>от {club.minPrice}₽</Price>
    <AmenityChips>
      {club.amenities.map(a => <Chip key={a}>{a}</Chip>)}
    </AmenityChips>
  </CardContent>
  <CardActions>
    <OutlinedButton>Подробнее</OutlinedButton>
    <FilledButton>Забронировать</FilledButton>
  </CardActions>
</ClubCard>
```

## 🎨 Цветовые акценты для спорта

```scss
// Падел - синяя тема
.padel-theme {
  --sport-primary: #3B82F6;
  --sport-light: #DBEAFE;
  --sport-dark: #1E40AF;
}

// Теннис - зеленая тема
.tennis-theme {
  --sport-primary: #00D632;
  --sport-light: #D1FAE5;
  --sport-dark: #065F46;
}

// Бадминтон - оранжевая тема
.badminton-theme {
  --sport-primary: #F59E0B;
  --sport-light: #FED7AA;
  --sport-dark: #92400E;
}
```

## 📱 Мобильные жесты и интеракции

1. **Pull to refresh** - обновление списка
2. **Swipe на карточках** - быстрые действия
3. **Bottom sheet** - для фильтров
4. **Haptic feedback** - вибрация при действиях
5. **Skeleton screens** - при загрузке

## ✅ Итог

Витрина будет выглядеть как нативное Flutter приложение в вебе:
- Material Design компоненты
- Цветовая схема из Flutter
- Характерные карточки с тенями
- Chips для фильтров
- FAB для карты
- Bottom Navigation на мобильных