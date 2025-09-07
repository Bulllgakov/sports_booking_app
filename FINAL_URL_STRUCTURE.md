# 📁 Финальная структура URL для AllCourt

## ✅ Утвержденная структура (на папках)

```
allcourt.ru/                         → Витрина клубов (B2C) - НОВАЯ ГЛАВНАЯ
allcourt.ru/business/                → Лендинг для клубов (B2B) - перенос текущей главной
allcourt.ru/admin/                   → Админ-панель (остается как есть)

# B2C страницы (витрина)
allcourt.ru/clubs/moscow/            → Клубы Москвы
allcourt.ru/clubs/spb/               → Клубы Санкт-Петербурга
allcourt.ru/club/smartpadel-moscow/  → Страница конкретного клуба
allcourt.ru/search/                  → Поиск клубов
allcourt.ru/trainers/                → Все тренеры
allcourt.ru/trainers/moscow/         → Тренеры Москвы

# B2B страницы (бизнес)
allcourt.ru/business/                → Главная для клубов
allcourt.ru/business/pricing/        → Тарифы
allcourt.ru/business/features/       → Возможности
allcourt.ru/business/demo/           → Демо админки
allcourt.ru/business/register/       → Регистрация клуба

# Существующие страницы (не меняем)
allcourt.ru/admin/                   → Админ-панель
allcourt.ru/club/{clubId}/booking/   → Страницы бронирования
allcourt.ru/fm/                      → Финансовая модель
allcourt.ru/offer/                   → Публичная оферта
allcourt.ru/privacy/                 → Политика конфиденциальности
```

## 🎯 План реализации

### Фаза 1: Подготовка (не ломаем текущее)
1. **Создать новую B2C витрину** в папке `/src/pages/public/showcase/`
2. **Скопировать текущий лендинг** в `/business/` (работают обе версии)
3. **Тестирование** новой структуры без affecting текущих пользователей

### Фаза 2: Мягкое переключение
1. **Деплой новой главной** (витрина клубов) на `/`
2. **301 редирект** старых B2B страниц на `/business/`
3. **Обновление навигации** в админке

### Фаза 3: SEO оптимизация
1. **Обновить sitemap.xml** с новой структурой
2. **Настроить canonical URLs** для избежания дублей
3. **Обновить robots.txt** с правильными директивами

## 📝 Технические детали реализации

### Роутинг (React Router)
```javascript
// App.tsx
const routes = [
  // B2C - Витрина (новая главная)
  { path: '/', element: <ClubsShowcase /> },
  { path: '/clubs/:city', element: <CityClubs /> },
  { path: '/club/:clubSlug', element: <ClubPage /> },
  { path: '/search', element: <SearchPage /> },
  { path: '/trainers/:city?', element: <TrainersPage /> },
  
  // B2B - Бизнес (перенесенный лендинг)
  { path: '/business', element: <BusinessLanding /> },
  { path: '/business/pricing', element: <PricingPage /> },
  { path: '/business/features', element: <FeaturesPage /> },
  { path: '/business/demo', element: <DemoPage /> },
  { path: '/business/register', element: <RegisterClubPage /> },
  
  // Админка (без изменений)
  { path: '/admin/*', element: <AdminPanel /> },
  
  // Бронирование (без изменений)
  { path: '/club/:clubId/booking/*', element: <BookingFlow /> },
]
```

### 301 Редиректы
```javascript
// redirects.js
const redirects = {
  '/pricing': '/business/pricing',
  '/features': '/business/features',
  '/register': '/business/register',
  '/for-clubs': '/business',
}
```

### Meta теги для новой главной
```html
<!-- B2C главная (/) -->
<title>Бронирование кортов онлайн - теннис, падел, бадминтон | AllCourt</title>
<meta name="description" content="Найдите и забронируйте спортивный корт онлайн. 500+ клубов по всей России. Теннис, падел, бадминтон. Лучшие цены без наценок.">

<!-- B2B страница (/business) -->
<title>Система управления спортивным клубом - CRM и онлайн-бронирование | AllCourt Business</title>
<meta name="description" content="Автоматизируйте управление теннисным клубом. Онлайн-бронирование, CRM, платежи. Без абонентской платы, комиссия 1%.">
```

### Навигация между B2C и B2B
```jsx
// Header.tsx для B2C страниц
<header className="b2c-header">
  <nav>
    <Logo href="/" />
    <SearchBar />
    <Links>
      <a href="/clubs/moscow">Москва</a>
      <a href="/clubs/spb">Санкт-Петербург</a>
    </Links>
    <CTAForBusiness>
      <a href="/business" className="small-link">Для клубов</a>
    </CTAForBusiness>
  </nav>
</header>

// Header.tsx для B2B страниц
<header className="b2b-header">
  <nav>
    <Logo href="/business" />
    <Links>
      <a href="/business/pricing">Тарифы</a>
      <a href="/business/features">Возможности</a>
      <a href="/business/demo">Демо</a>
    </Links>
    <CTAs>
      <a href="/admin" className="btn-secondary">Вход</a>
      <a href="/business/register" className="btn-primary">Начать бесплатно</a>
    </CTAs>
  </nav>
</header>
```

## ✅ Преимущества выбранного подхода

1. **Быстрый запуск** - не нужна сложная настройка поддоменов
2. **Единая кодовая база** - проще поддерживать на старте
3. **SEO juice** - весь авторитет домена работает на обе части
4. **Простая миграция** - когда понадобится, легко вынести на поддомен

## ⚠️ Что важно учесть

1. **Разделение bundles** - отдельные JS/CSS для B2C и B2B
2. **Разная аналитика** - настроить сегменты в GA4
3. **Разные дизайны** - B2C яркий/мобильный, B2B серьезный/desktop
4. **Canonical URLs** - избежать дублирования контента

## 📊 KPI для отслеживания

### После запуска витрины отслеживаем:
- Органический трафик на главную (цель: +200% за 3 месяца)
- Конверсия в бронирование с витрины (цель: 5-10%)
- Позиции по запросам "{спорт} {город}" (цель: топ-10)
- Количество новых клубов от B2C трафика (цель: 5-10 в месяц)

## 🚀 Следующие шаги

1. **Разработать витрину клубов** для главной страницы
2. **Создать страницы городов** (начать с Москвы и СПб)
3. **Перенести текущий лендинг** в /business/
4. **Настроить редиректы** и обновить ссылки
5. **Запустить и мониторить** метрики

---

*Документ финализирован и готов к реализации. При росте до 100+ клубов рассмотреть миграцию на поддомены.*