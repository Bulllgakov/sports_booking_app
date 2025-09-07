# 🏟️ Концепция витрины клубов AllCourt

## 📋 Цели и задачи

### Основные цели:
1. **SEO продвижение** - привлечение органического трафика через поисковые системы
2. **Доступность без приложения** - возможность найти и забронировать корт через веб
3. **Каталог всех клубов** - включая неактивные и немодерированные

### Бизнес-задачи:
- Увеличение органического трафика на 200% за 6 месяцев
- Конверсия веб-посетителей в бронирования: 5-10%
- Привлечение новых клубов через демонстрацию потенциала платформы

## 🗺️ Структура URL и навигация

### Иерархия URL:
```
allcourt.ru/
├── /clubs/                        # Главная витрина
├── /clubs/moscow/                 # Клубы города
├── /clubs/moscow/tennis/          # Фильтр по спорту в городе
├── /club/smartpadel-moscow/       # Страница клуба
├── /trainers/moscow/              # Тренеры города
└── /tournaments/                  # Турниры (будущее)
```

### Примеры URL для SEO:
- `/clubs/moscow/padel/` - "Падел клубы в Москве"
- `/clubs/spb/tennis/` - "Теннисные корты в Санкт-Петербурге"
- `/clubs/kazan/badminton/` - "Бадминтонные залы в Казани"

## 🎨 Дизайн и функциональность

### Главная страница витрины (`/clubs/`)

```html
<header>
  <!-- Поисковая строка с автодополнением -->
  <SearchBar placeholder="Город, район, название клуба..." />
  
  <!-- Быстрые фильтры -->
  <QuickFilters>
    🎾 Теннис | 🏓 Падел | 🏸 Бадминтон
  </QuickFilters>
</header>

<main>
  <!-- Популярные города -->
  <PopularCities>
    Москва (234 клуба) | СПб (89 клубов) | Казань (45 клубов)
  </PopularCities>
  
  <!-- Карта с клубами -->
  <InteractiveMap showClusters={true} />
  
  <!-- Листинг клубов -->
  <ClubGrid>
    <ClubCard>
      <Image src="club-photo.jpg" alt="SmartPadel Moscow" />
      <Title>SmartPadel Moscow</Title>
      <Rating>4.8 ⭐ (234 отзыва)</Rating>
      <Sports>🏓 Падел • 🎾 Теннис</Sports>
      <Price>от 2000₽/час</Price>
      <Status>✅ Доступен для бронирования</Status>
    </ClubCard>
  </ClubGrid>
</main>
```

### Страница клуба (`/club/smartpadel-moscow/`)

```html
<article itemscope itemtype="https://schema.org/SportsClub">
  <!-- Галерея изображений -->
  <PhotoGallery images={[...]} />
  
  <!-- Основная информация -->
  <ClubHeader>
    <h1 itemprop="name">SmartPadel Moscow</h1>
    <Rating itemprop="aggregateRating">4.8 ⭐ (234 отзыва)</Rating>
    <Address itemprop="address">ул. Профсоюзная, 69</Address>
  </ClubHeader>
  
  <!-- Табы с информацией -->
  <Tabs>
    <Tab name="О клубе">
      <Description />
      <Amenities>
        ✅ Парковка | ✅ Душевые | ✅ Кафе | ✅ Магазин
      </Amenities>
      <Courts>
        • 4 корта для падела (крытые)
        • 2 теннисных корта (открытые)
      </Courts>
    </Tab>
    
    <Tab name="Цены">
      <PriceTable>
        Будни 07:00-17:00: 1500₽/час
        Будни 17:00-23:00: 2500₽/час
        Выходные: 3000₽/час
      </PriceTable>
    </Tab>
    
    <Tab name="Тренеры">
      <TrainersList />
    </Tab>
    
    <Tab name="Отзывы">
      <Reviews />
    </Tab>
  </Tabs>
  
  <!-- CTA блок -->
  <BookingCTA>
    {club.isActive ? (
      <Button href="/club/{clubId}/booking">
        Забронировать онлайн
      </Button>
    ) : (
      <InactiveClubBlock>
        <p>Клуб временно недоступен для онлайн-бронирования</p>
        <p>📞 Позвоните: +7 (495) 123-45-67</p>
        <Button variant="secondary">
          Уведомить когда заработает
        </Button>
      </InactiveClubBlock>
    )}
  </BookingCTA>
  
  <!-- Карта -->
  <Map lat={club.lat} lng={club.lng} />
  
  <!-- Похожие клубы -->
  <SimilarClubs />
</article>
```

## 🔍 SEO оптимизация

### Meta теги для страницы города:
```html
<title>Падел клубы в Москве - 45 кортов, цены от 1500₽ | AllCourt</title>
<meta name="description" content="Найдите и забронируйте падел корт в Москве. 45 клубов, онлайн бронирование, цены от 1500₽/час. Рейтинги, отзывы, фото.">
<link rel="canonical" href="https://allcourt.ru/clubs/moscow/padel/">
```

### Structured Data (JSON-LD):
```json
{
  "@context": "https://schema.org",
  "@type": "SportsClub",
  "name": "SmartPadel Moscow",
  "image": [
    "https://allcourt.ru/images/club1.jpg",
    "https://allcourt.ru/images/club2.jpg"
  ],
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "ул. Профсоюзная, 69",
    "addressLocality": "Москва",
    "postalCode": "117342",
    "addressCountry": "RU"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 55.651084,
    "longitude": 37.528877
  },
  "url": "https://allcourt.ru/club/smartpadel-moscow/",
  "telephone": "+74951234567",
  "openingHoursSpecification": {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    "opens": "07:00",
    "closes": "23:00"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "234"
  },
  "amenityFeature": [
    {"@type": "LocationFeatureSpecification", "name": "Parking"},
    {"@type": "LocationFeatureSpecification", "name": "Shower"},
    {"@type": "LocationFeatureSpecification", "name": "Cafe"}
  ],
  "sport": ["Tennis", "Padel"],
  "priceRange": "1500-3000 RUB"
}
```

### Sitemap.xml структура:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Главная витрина -->
  <url>
    <loc>https://allcourt.ru/clubs/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Города (высокий приоритет) -->
  <url>
    <loc>https://allcourt.ru/clubs/moscow/</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  
  <!-- Клубы (средний приоритет) -->
  <url>
    <loc>https://allcourt.ru/club/smartpadel-moscow/</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>
```

## 📊 Фильтрация и поиск

### Основные фильтры:
- **Город/Район** - с автодополнением
- **Вид спорта** - теннис, падел, бадминтон
- **Тип корта** - крытый, открытый
- **Цена** - слайдер диапазона
- **Удобства** - чекбоксы (парковка, душ, кафе, магазин)
- **Рейтинг** - от 4+ звезд
- **Доступность** - открыто сейчас

### Сортировка:
- По популярности (default)
- По рейтингу
- По цене (возрастание/убывание)
- По расстоянию (с геолокацией)
- По новизне

## 🚀 Техническая реализация

### Архитектура:
```
Frontend (Next.js 14):
├── Static Generation (SSG) для SEO
├── ISR (Incremental Static Regeneration) каждые 60 минут
├── Dynamic imports для оптимизации
└── Image optimization с next/image

Backend (Firebase):
├── Firestore для данных клубов
├── Cloud Functions для API
├── Cloud Storage для изображений
└── Analytics для отслеживания

CDN:
├── Cloudflare для кеширования
└── Image CDN для оптимизации изображений
```

### Оптимизация производительности:
- **Lazy loading** изображений
- **Virtual scrolling** для больших списков
- **Progressive enhancement** - базовый функционал работает без JS
- **Service Worker** для offline режима
- **WebP изображения** с fallback на JPEG

### API endpoints:
```
GET /api/clubs?city=moscow&sport=padel&limit=20&offset=0
GET /api/club/{clubId}
GET /api/clubs/search?q=smartpadel
GET /api/cities/popular
POST /api/club/{clubId}/notify-when-available
```

## 📈 Метрики успеха

### SEO метрики:
- Позиции в топ-10 по запросам "{спорт} {город}"
- Органический трафик: +200% за 6 месяцев
- CTR из поиска: >5%
- Bounce rate: <40%

### Бизнес метрики:
- Конверсия просмотр → бронирование: 5-10%
- Среднее время на сайте: >3 минут
- Страниц за сессию: >4
- Возвратные посетители: >30%

### Технические метрики:
- PageSpeed Score: >90
- Core Web Vitals: все в зеленой зоне
- Time to First Byte: <200ms
- First Contentful Paint: <1.5s

## 🔄 Обработка клубов без модерации

### Статусы клубов:
1. **Active** - полностью активен, можно бронировать
2. **Pending** - ожидает модерации, показываем с ограничениями
3. **Inactive** - временно недоступен
4. **Suspended** - заблокирован (не показываем)

### Отображение Pending клубов:
```html
<ClubCard status="pending">
  <Badge>Новый клуб</Badge>
  <Info>
    Клуб проходит модерацию. 
    Онлайн-бронирование скоро будет доступно.
  </Info>
  <Actions>
    <Button variant="secondary">📞 Позвонить</Button>
    <Button variant="ghost">🔔 Уведомить о запуске</Button>
  </Actions>
</ClubCard>
```

## 🌍 Локализация и масштабирование

### Мультиязычность:
- Основной язык: Русский
- Планируемые: Английский, Казахский
- URL структура: `/en/clubs/moscow/`

### Географическое расширение:
1. **Фаза 1**: Москва, СПб, города-миллионники
2. **Фаза 2**: Региональные центры
3. **Фаза 3**: СНГ (Казахстан, Беларусь)

## 📱 Progressive Web App (PWA)

### Функции PWA:
- Установка на домашний экран
- Offline режим для просмотра
- Push-уведомления о доступности клубов
- Кеширование данных клубов

## 🎯 Roadmap

### MVP (2-3 недели):
- [ ] Базовая витрина клубов
- [ ] Страницы городов с SSG
- [ ] Простой поиск и фильтрация
- [ ] Structured data для SEO

### V2 (1-2 месяца):
- [ ] Расширенная фильтрация
- [ ] Отзывы и рейтинги
- [ ] Интерактивная карта
- [ ] PWA функциональность

### V3 (3-4 месяца):
- [ ] Персонализация
- [ ] Рекомендательная система
- [ ] Социальные функции
- [ ] Интеграция с турнирами