# 📱 ТЗ: Витрина клубов AllCourt (веб-версия)

## 📋 СТАТУС: РЕАЛИЗОВАНО ✅

**Дата завершения:** 26 августа 2025
**URL:** https://allcourt.ru

## 🎯 Цели и задачи

### Основные цели:
1. **SEO продвижение** - привлечение органического трафика из поисковиков
2. **Доступность без приложения** - быстрый поиск и бронирование через веб
3. **Геолокационный поиск** - показ ближайших кортов как в мобильном приложении

### Функциональные требования:
- Автоматическое определение города по IP/геолокации
- Фильтрация по виду спорта (падел, теннис, бадминтон)
- Выбор города вручную
- Показ клубов на карте и списком
- Адаптивный дизайн (mobile-first)

## 🔗 Структура URL (РЕКОМЕНДАЦИЯ)

### Вариант 1: Город → Спорт (SEO ОПТИМАЛЬНО) ✅
```
allcourt.ru/                           → Главная (геолокация или выбор города)
allcourt.ru/moscow/                    → Все клубы Москвы
allcourt.ru/moscow/padel/              → Падел клубы Москвы
allcourt.ru/moscow/tennis/             → Теннисные корты Москвы
allcourt.ru/moscow/badminton/          → Бадминтон в Москве
allcourt.ru/club/smartpadel-moscow/    → Страница клуба
```

**Преимущества:**
- ✅ Лучше для SEO (люди ищут "падел москва", а не "падел" → "москва")
- ✅ Логичная иерархия: страна → город → спорт → клуб
- ✅ Возможность создать landing page для каждого города
- ✅ Легко масштабировать на регионы

### Вариант 2: Спорт → Город
```
allcourt.ru/padel/moscow/              → Падел в Москве
allcourt.ru/tennis/spb/                → Теннис в СПб
```

**Недостатки:**
- ❌ Менее естественно для пользователя
- ❌ Сложнее создавать городские landing pages
- ❌ Не соответствует поисковым запросам

**РЕКОМЕНДУЮ: Вариант 1 (Город → Спорт)**

## 🎨 Дизайн главной страницы (без выбранного города)

### Концепция: "Flutter-like веб интерфейс"

```jsx
<HomePage>
  {/* Hero Section с автоопределением локации */}
  <HeroSection>
    <Greeting>
      {isAuthenticated ? `Привет, ${userName}!` : 'Привет!'}
    </Greeting>
    
    <LocationDetector>
      🔄 Определяем ваше местоположение...
      {/* После определения: */}
      📍 Москва
      <ChangeCity>изменить</ChangeCity>
    </LocationDetector>
    
    {/* Поисковая строка как в Flutter */}
    <SearchBar 
      placeholder="Название клуба или адрес..."
      icon="🔍"
    />
  </HeroSection>

  {/* Быстрые фильтры по спорту */}
  <SportFilters>
    <SportChip active={sport === 'all'}>
      Все корты
    </SportChip>
    <SportChip active={sport === 'padel'}>
      🏓 Падел
    </SportChip>
    <SportChip active={sport === 'tennis'}>
      🎾 Теннис
    </SportChip>
    <SportChip active={sport === 'badminton'}>
      🏸 Бадминтон
    </SportChip>
  </SportFilters>

  {/* Интерактивная карта на фоне */}
  <MapSection>
    <InteractiveMap 
      showUserLocation={true}
      clubs={nearbyClubs}
      zoom={12}
    />
    
    {/* Оверлей с популярными городами */}
    <PopularCitiesOverlay>
      <h3>Выберите город</h3>
      <CityGrid>
        <CityCard href="/moscow/">
          <CityImage src="moscow.jpg" />
          <CityName>Москва</CityName>
          <ClubCount>234 клуба</ClubCount>
        </CityCard>
        <CityCard href="/spb/">
          <CityImage src="spb.jpg" />
          <CityName>Санкт-Петербург</CityName>
          <ClubCount>89 клубов</ClubCount>
        </CityCard>
        <CityCard href="/kazan/">
          <CityImage src="kazan.jpg" />
          <CityName>Казань</CityName>
          <ClubCount>45 клубов</ClubCount>
        </CityCard>
        <CityCard href="/nn/">
          <CityImage src="nn.jpg" />
          <CityName>Нижний Новгород</CityName>
          <ClubCount>38 клубов</ClubCount>
        </CityCard>
      </CityGrid>
      
      <AllCitiesLink href="/cities/">
        Все города →
      </AllCitiesLink>
    </PopularCitiesOverlay>
  </MapSection>

  {/* Нижняя секция с преимуществами */}
  <Features>
    <Feature>
      <Icon>📱</Icon>
      <Title>Онлайн бронирование</Title>
      <Description>24/7 без звонков</Description>
    </Feature>
    <Feature>
      <Icon>💰</Icon>
      <Title>Лучшие цены</Title>
      <Description>Без наценок</Description>
    </Feature>
    <Feature>
      <Icon>⭐</Icon>
      <Title>Реальные отзывы</Title>
      <Description>От игроков</Description>
    </Feature>
  </Features>
</HomePage>
```

## 📍 Страница города (после выбора)

### URL: `/moscow/`

```jsx
<CityPage>
  {/* Шапка с городом */}
  <CityHeader>
    <BackButton href="/">← Все города</BackButton>
    <CityInfo>
      <h1>Спортивные клубы в Москве</h1>
      <Stats>234 клуба • 1,245 кортов • 89 тренеров</Stats>
    </CityInfo>
    <ChangeCity>Изменить город</ChangeCity>
  </CityHeader>

  {/* Поиск и фильтры */}
  <SearchSection>
    <SearchBar placeholder="Район, метро или название..." />
    <SportFilters>
      <FilterChip active>Все</FilterChip>
      <FilterChip>🏓 Падел</FilterChip>
      <FilterChip>🎾 Теннис</FilterChip>
      <FilterChip>🏸 Бадминтон</FilterChip>
    </SportFilters>
  </SearchSection>

  {/* Переключатель вида */}
  <ViewToggle>
    <ViewOption active={view === 'map'}>🗺️ Карта</ViewOption>
    <ViewOption active={view === 'list'}>📋 Список</ViewOption>
  </ViewToggle>

  {/* Контент */}
  <Content>
    {view === 'map' ? (
      <MapView>
        <InteractiveMap clubs={clubs} />
        <FloatingClubsList>
          {/* Карточки клубов поверх карты */}
        </FloatingClubsList>
      </MapView>
    ) : (
      <ListView>
        {/* Сортировка */}
        <SortBar>
          <SortOption active>📍 По расстоянию</SortOption>
          <SortOption>⭐ По рейтингу</SortOption>
          <SortOption>💰 По цене</SortOption>
        </SortBar>
        
        {/* Список клубов */}
        <ClubsGrid>
          {clubs.map(club => (
            <ClubCard key={club.id}>
              <ClubImage src={club.image} />
              <ClubBadge>{club.sport}</ClubBadge>
              <ClubContent>
                <ClubName>{club.name}</ClubName>
                <ClubAddress>
                  📍 {club.address} • {club.distance}км
                </ClubAddress>
                <ClubRating>
                  ⭐ {club.rating} ({club.reviews})
                </ClubRating>
                <ClubFeatures>
                  {club.indoor && <Feature>🏠 Крытый</Feature>}
                  {club.parking && <Feature>🚗 Парковка</Feature>}
                  {club.cafe && <Feature>☕ Кафе</Feature>}
                </ClubFeatures>
                <ClubPrice>от {club.minPrice}₽/час</ClubPrice>
                <ClubActions>
                  <DetailButton href={`/club/${club.slug}/`}>
                    Подробнее
                  </DetailButton>
                  <BookButton href={`/club/${club.id}/booking/`}>
                    Забронировать
                  </BookButton>
                </ClubActions>
              </ClubContent>
            </ClubCard>
          ))}
        </ClubsGrid>
        
        {/* Пагинация или бесконечный скролл */}
        <LoadMore>Показать еще</LoadMore>
      </ListView>
    )}
  </Content>

  {/* SEO текст внизу */}
  <SEOSection>
    <h2>Бронирование кортов в Москве</h2>
    <p>
      В Москве доступно {stats.clubs} спортивных клубов для игры в теннис, 
      падел и бадминтон. Забронируйте корт онлайн без звонков и наценок.
    </p>
  </SEOSection>
</CityPage>
```

## 🏢 Страница клуба

### URL: `/club/smartpadel-moscow/`

```jsx
<ClubPage>
  {/* Галерея изображений */}
  <PhotoGallery>
    <MainPhoto src={club.mainPhoto} />
    <PhotoGrid photos={club.photos} />
    <ViewAllPhotos>Все фото ({club.photosCount})</ViewAllPhotos>
  </PhotoGallery>

  {/* Основная информация */}
  <ClubInfo>
    <ClubHeader>
      <h1>{club.name}</h1>
      <ClubBadges>
        <SportBadge>{club.sport}</SportBadge>
        {club.verified && <VerifiedBadge>✓ Проверено</VerifiedBadge>}
      </ClubBadges>
    </ClubHeader>
    
    <QuickInfo>
      <InfoItem>📍 {club.address}</InfoItem>
      <InfoItem>⭐ {club.rating} ({club.reviews} отзывов)</InfoItem>
      <InfoItem>⏰ {club.workingHours}</InfoItem>
      <InfoItem>💰 {club.priceRange}₽/час</InfoItem>
    </QuickInfo>

    {/* Табы с контентом */}
    <Tabs>
      <Tab name="О клубе">
        <Description>{club.description}</Description>
        
        <CourtsSection>
          <h3>Корты</h3>
          {club.courts.map(court => (
            <CourtItem>
              <CourtType>{court.type}</CourtType>
              <CourtDetails>
                {court.indoor ? '🏠 Крытый' : '☀️ Открытый'}
                • {court.surface}
              </CourtDetails>
            </CourtItem>
          ))}
        </CourtsSection>
        
        <AmenitiesSection>
          <h3>Удобства</h3>
          <AmenitiesGrid>
            {club.amenities.map(amenity => (
              <Amenity>
                <AmenityIcon>{amenity.icon}</AmenityIcon>
                <AmenityName>{amenity.name}</AmenityName>
              </Amenity>
            ))}
          </AmenitiesGrid>
        </AmenitiesSection>
      </Tab>
      
      <Tab name="Цены">
        <PriceTable>
          {club.prices.map(price => (
            <PriceRow>
              <PeriodName>{price.period}</PeriodName>
              <Price>{price.amount}₽/час</Price>
            </PriceRow>
          ))}
        </PriceTable>
      </Tab>
      
      <Tab name="Тренеры">
        <TrainersList>
          {club.trainers.map(trainer => (
            <TrainerCard>
              <TrainerPhoto src={trainer.photo} />
              <TrainerInfo>
                <TrainerName>{trainer.name}</TrainerName>
                <TrainerSport>{trainer.sport}</TrainerSport>
                <TrainerRating>⭐ {trainer.rating}</TrainerRating>
                <TrainerPrice>{trainer.price}₽/час</TrainerPrice>
              </TrainerInfo>
            </TrainerCard>
          ))}
        </TrainersList>
      </Tab>
      
      <Tab name="Отзывы">
        <ReviewsSection>
          <ReviewsSummary>
            <AverageRating>{club.rating}</AverageRating>
            <StarsDisplay rating={club.rating} />
            <ReviewsCount>{club.reviews} отзывов</ReviewsCount>
          </ReviewsSummary>
          
          <ReviewsList>
            {reviews.map(review => (
              <Review>
                <ReviewHeader>
                  <UserName>{review.userName}</UserName>
                  <ReviewDate>{review.date}</ReviewDate>
                  <ReviewRating>⭐ {review.rating}</ReviewRating>
                </ReviewHeader>
                <ReviewText>{review.text}</ReviewText>
              </Review>
            ))}
          </ReviewsList>
        </ReviewsSection>
      </Tab>
    </Tabs>
  </ClubInfo>

  {/* Sticky блок бронирования */}
  <BookingBlock>
    <BookingHeader>
      <PriceRange>от {club.minPrice}₽/час</PriceRange>
      {club.isActive ? (
        <BookingButtons>
          <BookOnline href={`/club/${club.id}/booking/`}>
            Забронировать онлайн
          </BookOnline>
          <CallButton href={`tel:${club.phone}`}>
            📞 Позвонить
          </CallButton>
        </BookingButtons>
      ) : (
        <InactiveNotice>
          <p>Онлайн-бронирование временно недоступно</p>
          <CallButton href={`tel:${club.phone}`}>
            📞 {club.phone}
          </CallButton>
          <NotifyButton>
            🔔 Уведомить когда заработает
          </NotifyButton>
        </InactiveNotice>
      )}
    </BookingHeader>
  </BookingBlock>

  {/* Карта */}
  <MapSection>
    <h3>Местоположение</h3>
    <Map lat={club.lat} lng={club.lng} />
    <Address>{club.fullAddress}</Address>
    <Directions>
      <DirectionButton>🚇 Метро: {club.metro}</DirectionButton>
      <DirectionButton>🚗 Построить маршрут</DirectionButton>
    </Directions>
  </MapSection>

  {/* Похожие клубы */}
  <SimilarClubs>
    <h3>Похожие клубы рядом</h3>
    <ClubsSlider clubs={similarClubs} />
  </SimilarClubs>
</ClubPage>
```

## 🎨 Визуальный стиль

### Цветовая схема (из Flutter приложения):
```scss
$primary: #00D632;        // Зеленый (AllCourt)
$tennis: #00D632;          // Теннис
$padel: #3B82F6;          // Падел (синий)
$badminton: #F59E0B;      // Бадминтон (оранжевый)
$background: #F8F9FA;      // Светло-серый фон
$card: #FFFFFF;           // Белые карточки
$text-primary: #1A1F36;   // Темный текст
$text-secondary: #6B7280; // Серый текст
```

### Компоненты в стиле Flutter:
- Скругленные карточки (border-radius: 12px)
- Мягкие тени (box-shadow: 0 2px 10px rgba(0,0,0,0.05))
- Чипсы для фильтров
- Floating Action Buttons для основных действий
- Bottom sheets для мобильной версии

## 📱 Адаптивность

### Mobile First подход:
```scss
// Mobile (default)
.club-card {
  width: 100%;
  margin-bottom: 16px;
}

// Tablet
@media (min-width: 768px) {
  .clubs-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

// Desktop
@media (min-width: 1024px) {
  .clubs-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .content {
    display: grid;
    grid-template-columns: 1fr 400px; // Карта слева, список справа
  }
}
```

## 🚀 Технологическая реализация

### Использованный Stack:
- **React 18 + TypeScript** - основа витрины
- **Vite** - сборщик с конфигурацией vite.config.showcase.ts
- **React Router** - маршрутизация
- **Firebase Firestore** - база данных клубов
- **Firebase Hosting** - хостинг
- **CSS Modules** - стилизация компонентов

### Оптимизация:
- Static Site Generation для страниц городов
- Incremental Static Regeneration каждые 60 минут
- Image optimization с next/image
- Lazy loading для карт
- Service Worker для offline

## 📊 Приоритеты реализации

### MVP (Фаза 1):
1. ✅ Главная страница с выбором города
2. ✅ Страница города со списком клубов
3. ✅ Базовая фильтрация по спорту
4. ✅ Страница клуба с информацией
5. ✅ Кнопка перехода на бронирование

### Фаза 2:
1. ⏳ Интерактивная карта
2. ⏳ Геолокация пользователя
3. ⏳ Расширенные фильтры
4. ⏳ Отзывы и рейтинги

### Фаза 3:
1. ⏳ Поиск партнеров для игры
2. ⏳ Календарь турниров
3. ⏳ Личный кабинет
4. ⏳ PWA функционал

## 🔍 SEO оптимизация

### Meta теги для города:
```html
<title>Падел клубы в Москве - 45 кортов, бронирование онлайн | AllCourt</title>
<meta name="description" content="Найдите падел корт в Москве. 45 клубов, онлайн бронирование, цены от 1500₽/час. Рейтинги, отзывы, фото.">
```

### Structured Data:
```json
{
  "@context": "https://schema.org",
  "@type": "SportsActivityLocation",
  "name": "SmartPadel Moscow",
  "sport": "Padel",
  "address": {...},
  "geo": {...},
  "aggregateRating": {...}
}
```

### Sitemap:
- Приоритет 1.0: Главная
- Приоритет 0.9: Города
- Приоритет 0.8: Виды спорта в городах
- Приоритет 0.7: Клубы

## ✅ РЕАЛИЗОВАННЫЙ ФУНКЦИОНАЛ

### Структура проекта:
```
/src/components/showcase/  - Компоненты витрины
  Header.tsx              - Шапка с поиском и выбором города
  Footer.tsx              - Подвал с динамическими реквизитами
  ClubCard.tsx           - Карточка клуба
  ClubList.tsx           - Список клубов
  ClubPage.tsx           - Страница клуба
  LandingSection.tsx     - Лендинг секции (для игроков/клубов)
  
/dist/showcase/          - Собранная витрина
/public/business/        - B2B лендинг
```

### Реализованные функции:
✅ Главная страница с витриной клубов
✅ Выбор города из списка
✅ Фильтрация по видам спорта
✅ Поиск клубов по названию
✅ Страницы клубов с детальной информацией
✅ SEO-оптимизированные URL (/:city/:sport)
✅ Динамические meta-теги для SEO
✅ Геолокация для определения ближайшего города
✅ Адаптивная верстка (breakpoint 769px)
✅ Интеграция с Firebase для получения данных
✅ Динамическая загрузка реквизитов компании
✅ Лендинг секции (для игроков, клубов, отзывы)

### Конфигурация:
- **Build:** `npm run build:showcase`
- **Dev:** `npm run dev:showcase`
- **Deploy:** Автоматически при `firebase deploy`
- **Роутинг:** Настроен в firebase.json
- **Assets:** Путь `/showcase/` для всех ассетов

### Особенности реализации:
- Отключен publicDir в vite.config.showcase.ts для избежания конфликтов
- Пути к изображениям используют префикс `/showcase/`
- Реквизиты компании загружаются из Firebase settings/company
- B2B лендинг перемещен на /business
- Демо версия доступна на /demo
