#!/usr/bin/env node

/**
 * Google Places API парсер для падел клубов России
 * Использует официальный API для получения полной информации
 */

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем переменные окружения
dotenv.config({ path: path.join(__dirname, '.env') });

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

if (!API_KEY) {
  console.error('❌ Не найден API ключ! Добавьте GOOGLE_PLACES_API_KEY в файл .env');
  process.exit(1);
}

// Города России для поиска падел клубов
const RUSSIAN_CITIES = [
  // Начнем с крупнейших городов
  { name: 'Москва', lat: 55.755826, lng: 37.617300, radius: 50000 },
  { name: 'Санкт-Петербург', lat: 59.931226, lng: 30.360940, radius: 40000 },
  { name: 'Новосибирск', lat: 55.008353, lng: 82.935733, radius: 30000 },
  { name: 'Екатеринбург', lat: 56.838011, lng: 60.597474, radius: 30000 },
  { name: 'Казань', lat: 55.798551, lng: 49.106324, radius: 25000 },
  { name: 'Нижний Новгород', lat: 56.326797, lng: 44.006516, radius: 25000 },
  { name: 'Челябинск', lat: 55.159902, lng: 61.402554, radius: 25000 },
  { name: 'Самара', lat: 53.195538, lng: 50.101783, radius: 25000 },
  { name: 'Омск', lat: 54.989342, lng: 73.368212, radius: 25000 },
  { name: 'Ростов-на-Дону', lat: 47.222078, lng: 39.720349, radius: 25000 },
  { name: 'Уфа', lat: 54.735152, lng: 55.958736, radius: 25000 },
  { name: 'Красноярск', lat: 56.010563, lng: 92.852572, radius: 25000 },
  { name: 'Воронеж', lat: 51.672, lng: 39.1843, radius: 20000 },
  { name: 'Пермь', lat: 58.0105, lng: 56.2502, radius: 20000 },
  { name: 'Волгоград', lat: 48.708048, lng: 44.513303, radius: 20000 },
  { name: 'Краснодар', lat: 45.035470, lng: 38.975313, radius: 20000 },
  { name: 'Сочи', lat: 43.585525, lng: 39.723062, radius: 30000 },
  { name: 'Тюмень', lat: 57.1522, lng: 65.5272, radius: 20000 },
  { name: 'Тольятти', lat: 53.5303, lng: 49.3461, radius: 20000 },
  { name: 'Ижевск', lat: 56.8527, lng: 53.2116, radius: 20000 },
  { name: 'Барнаул', lat: 53.3606, lng: 83.7636, radius: 20000 },
  { name: 'Ульяновск', lat: 54.3282, lng: 48.3866, radius: 20000 },
  { name: 'Иркутск', lat: 52.2978, lng: 104.2964, radius: 20000 },
  { name: 'Хабаровск', lat: 48.4827, lng: 135.0838, radius: 20000 },
  { name: 'Владивосток', lat: 43.1332, lng: 131.9113, radius: 20000 },
  { name: 'Ярославль', lat: 57.6261, lng: 39.8845, radius: 20000 },
  { name: 'Махачкала', lat: 42.9849, lng: 47.5047, radius: 20000 },
  { name: 'Томск', lat: 56.4977, lng: 84.9744, radius: 20000 },
  { name: 'Оренбург', lat: 51.7681, lng: 55.0968, radius: 20000 },
  { name: 'Кемерово', lat: 55.3333, lng: 86.0833, radius: 20000 },
  { name: 'Рязань', lat: 54.6269, lng: 39.6916, radius: 15000 },
  { name: 'Астрахань', lat: 46.3497, lng: 48.0408, radius: 15000 },
  { name: 'Пенза', lat: 53.1958, lng: 45.0183, radius: 15000 },
  { name: 'Липецк', lat: 52.6031, lng: 39.5708, radius: 15000 },
  { name: 'Тула', lat: 54.2044, lng: 37.6111, radius: 15000 },
  { name: 'Киров', lat: 58.6035, lng: 49.6679, radius: 15000 },
  { name: 'Чебоксары', lat: 56.1324, lng: 47.2519, radius: 15000 },
  { name: 'Калининград', lat: 54.7104, lng: 20.4522, radius: 15000 },
  { name: 'Брянск', lat: 53.2521, lng: 34.3717, radius: 15000 },
  { name: 'Курск', lat: 51.7303, lng: 36.1930, radius: 15000 },
  { name: 'Иваново', lat: 57.0000, lng: 40.9739, radius: 15000 },
  { name: 'Магнитогорск', lat: 53.4242, lng: 58.9815, radius: 15000 },
  { name: 'Тверь', lat: 56.8587, lng: 35.9176, radius: 15000 },
  { name: 'Ставрополь', lat: 45.0428, lng: 41.9734, radius: 15000 },
  { name: 'Белгород', lat: 50.5997, lng: 36.5983, radius: 15000 },
  { name: 'Сургут', lat: 61.2500, lng: 73.4167, radius: 15000 },
  { name: 'Владимир', lat: 56.1365, lng: 40.3966, radius: 15000 },
  { name: 'Нижний Тагил', lat: 57.9195, lng: 59.9652, radius: 15000 },
  { name: 'Архангельск', lat: 64.5401, lng: 40.5433, radius: 15000 },
  { name: 'Калуга', lat: 54.5293, lng: 36.2754, radius: 15000 }
];

class GooglePlacesParser {
  constructor() {
    this.clubs = [];
    this.outputDir = path.join(__dirname, '../padel-data-google');
    this.requestCount = 0;
    this.monthlyLimit = 25000; // Примерный лимит на $200
  }

  async init() {
    await fs.mkdir(this.outputDir, { recursive: true });
    console.log('🎾 GOOGLE PLACES API ПАРСЕР ДЛЯ ПАДЕЛ КЛУБОВ');
    console.log('===========================================');
    console.log(`📍 Будет обработано ${RUSSIAN_CITIES.length} городов\n`);
  }

  async searchNearby(city, keyword = 'падел') {
    const url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
    const params = {
      location: `${city.lat},${city.lng}`,
      radius: city.radius,
      keyword: keyword,
      type: 'establishment',
      language: 'ru',
      key: API_KEY
    };

    try {
      console.log(`  🔍 Поиск "${keyword}" в радиусе ${city.radius}м...`);
      const response = await axios.get(url, { params });
      this.requestCount++;
      
      if (response.data.status === 'OK') {
        return response.data.results;
      } else if (response.data.status === 'ZERO_RESULTS') {
        console.log(`  ⚠️  Не найдено результатов`);
        return [];
      } else {
        console.error(`  ❌ Ошибка API: ${response.data.status}`);
        return [];
      }
    } catch (error) {
      console.error(`  ❌ Ошибка запроса: ${error.message}`);
      return [];
    }
  }

  async getPlaceDetails(placeId) {
    const url = 'https://maps.googleapis.com/maps/api/place/details/json';
    const params = {
      place_id: placeId,
      fields: 'name,formatted_address,geometry,formatted_phone_number,international_phone_number,website,opening_hours,business_status,rating,user_ratings_total,photos,types,url,vicinity,plus_code,price_level',
      language: 'ru',
      key: API_KEY
    };

    try {
      const response = await axios.get(url, { params });
      this.requestCount++;
      
      if (response.data.status === 'OK') {
        return response.data.result;
      } else {
        console.error(`  ❌ Ошибка получения деталей: ${response.data.status}`);
        return null;
      }
    } catch (error) {
      console.error(`  ❌ Ошибка запроса деталей: ${error.message}`);
      return null;
    }
  }

  formatClubData(place, details, city) {
    // Формируем данные в формате платформы AllCourt
    const club = {
      // Основные поля
      name: place.name,
      address: details?.formatted_address || place.vicinity || '',
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      
      // Контакты
      phone: details?.formatted_phone_number || details?.international_phone_number || '',
      website: details?.website || '',
      
      // Время работы
      openTime: '',
      closeTime: '',
      workingDays: [],
      
      // Дополнительная информация
      rating: place.rating || 0,
      reviewsCount: place.user_ratings_total || 0,
      priceLevel: place.price_level || null,
      businessStatus: details?.business_status || place.business_status || '',
      googlePlaceId: place.place_id,
      googleMapsUrl: details?.url || '',
      
      // Фотографии
      photos: [],
      
      // Метаданные
      sports: ['padel'],
      city: city.name,
      types: place.types || [],
      source: 'Google Places API',
      parsedAt: new Date().toISOString()
    };

    // Парсим время работы
    if (details?.opening_hours?.weekday_text) {
      const hours = this.parseOpeningHours(details.opening_hours);
      club.openTime = hours.openTime;
      club.closeTime = hours.closeTime;
      club.workingDays = hours.workingDays;
    }

    // Добавляем ссылки на фотографии
    if (details?.photos && details.photos.length > 0) {
      club.photos = details.photos.slice(0, 10).map(photo => 
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=${API_KEY}`
      );
    }

    return club;
  }

  parseOpeningHours(openingHours) {
    const result = {
      openTime: '',
      closeTime: '',
      workingDays: []
    };

    if (!openingHours.periods) return result;

    // Находим самое раннее время открытия и самое позднее время закрытия
    let minOpen = 2400;
    let maxClose = 0;
    const daysOpen = new Set();

    openingHours.periods.forEach(period => {
      if (period.open) {
        const openTime = parseInt(period.open.time);
        if (openTime < minOpen) minOpen = openTime;
        daysOpen.add(period.open.day);
      }
      if (period.close) {
        const closeTime = parseInt(period.close.time);
        if (closeTime > maxClose) maxClose = closeTime;
      }
    });

    // Форматируем время
    if (minOpen < 2400) {
      const hours = Math.floor(minOpen / 100);
      const minutes = minOpen % 100;
      result.openTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    if (maxClose > 0) {
      const hours = Math.floor(maxClose / 100);
      const minutes = maxClose % 100;
      result.closeTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    // Дни недели
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    result.workingDays = Array.from(daysOpen).map(day => dayNames[day]);

    return result;
  }

  async parseCityClubs(city) {
    console.log(`\n📍 ${city.name}`);
    console.log(`   Координаты: ${city.lat}, ${city.lng}`);
    
    const allResults = [];
    
    // Ищем по разным ключевым словам
    const keywords = ['падел', 'padel', 'падел клуб', 'padel club', 'падел корт'];
    
    for (const keyword of keywords) {
      const results = await this.searchNearby(city, keyword);
      allResults.push(...results);
      await this.delay(1000); // Задержка между запросами
    }

    // Убираем дубликаты по place_id
    const uniquePlaces = new Map();
    allResults.forEach(place => {
      if (!uniquePlaces.has(place.place_id)) {
        // Проверяем, что это действительно связано с паделом
        const name = place.name.toLowerCase();
        const types = place.types.join(' ').toLowerCase();
        
        if (name.includes('падел') || name.includes('padel') || 
            types.includes('спорт') || types.includes('sport')) {
          uniquePlaces.set(place.place_id, place);
        }
      }
    });

    console.log(`  📊 Найдено уникальных мест: ${uniquePlaces.size}`);

    // Получаем детальную информацию
    const cityClubs = [];
    let processed = 0;
    
    for (const [placeId, place] of uniquePlaces) {
      processed++;
      console.log(`  📍 [${processed}/${uniquePlaces.size}] ${place.name}`);
      
      // Получаем детали
      const details = await this.getPlaceDetails(placeId);
      await this.delay(500);
      
      // Форматируем данные
      const club = this.formatClubData(place, details, city);
      cityClubs.push(club);
      
      // Выводим основную информацию
      console.log(`     ✅ ${club.name}`);
      console.log(`     📍 ${club.latitude.toFixed(6)}, ${club.longitude.toFixed(6)}`);
      if (club.phone) console.log(`     📞 ${club.phone}`);
      if (club.website) console.log(`     🌐 ${club.website}`);
      if (club.photos.length) console.log(`     📸 ${club.photos.length} фото`);
      
      // Проверяем лимит
      if (this.requestCount >= this.monthlyLimit * 0.8) {
        console.warn(`\n⚠️  Приближаемся к месячному лимиту (${this.requestCount} запросов)`);
      }
    }

    return cityClubs;
  }

  async parseAllCities() {
    for (const city of RUSSIAN_CITIES) {
      const cityClubs = await this.parseCityClubs(city);
      this.clubs.push(...cityClubs);
      
      // Сохраняем промежуточные результаты
      await this.saveIntermediateResults(city.name, cityClubs);
      
      // Пауза между городами
      await this.delay(2000);
      
      console.log(`\n📊 Текущая статистика:`);
      console.log(`   Всего клубов: ${this.clubs.length}`);
      console.log(`   API запросов: ${this.requestCount}`);
    }
  }

  async saveIntermediateResults(cityName, clubs) {
    if (clubs.length === 0) return;
    
    const cityDir = path.join(this.outputDir, 'cities');
    await fs.mkdir(cityDir, { recursive: true });
    
    const filename = `${cityName.toLowerCase().replace(/\s+/g, '-')}.json`;
    const filepath = path.join(cityDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(clubs, null, 2));
    console.log(`   💾 Сохранено ${clubs.length} клубов`);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async saveResults() {
    // Основной файл со всеми клубами
    const allClubsPath = path.join(this.outputDir, `all-padel-clubs-russia.json`);
    await fs.writeFile(allClubsPath, JSON.stringify(this.clubs, null, 2));
    
    // Файл для импорта в Firebase
    const firebaseData = this.clubs.map((club, index) => ({
      id: `padel_${Date.now()}_${index}`,
      name: club.name,
      address: club.address,
      latitude: club.latitude,
      longitude: club.longitude,
      phone: club.phone,
      email: '',
      website: club.website,
      description: `Рейтинг: ${club.rating}/5 (${club.reviewsCount} отзывов)`,
      logoUrl: club.photos[0] || '',
      photos: club.photos,
      amenities: [],
      features: [],
      sports: ['padel'],
      status: 'inactive',
      public: false,
      openTime: club.openTime || '07:00',
      closeTime: club.closeTime || '23:00',
      workingDays: club.workingDays,
      minPrice: null,
      maxPrice: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'Google Places API',
      googlePlaceId: club.googlePlaceId,
      googleMapsUrl: club.googleMapsUrl
    }));
    
    const firebasePath = path.join(this.outputDir, 'firebase-import.json');
    await fs.writeFile(firebasePath, JSON.stringify(firebaseData, null, 2));
    
    // Статистика
    const stats = {
      totalClubs: this.clubs.length,
      byCity: {},
      withPhone: this.clubs.filter(c => c.phone).length,
      withWebsite: this.clubs.filter(c => c.website).length,
      withPhotos: this.clubs.filter(c => c.photos && c.photos.length > 0).length,
      withWorkingHours: this.clubs.filter(c => c.openTime && c.closeTime).length,
      averageRating: this.clubs.reduce((sum, c) => sum + (c.rating || 0), 0) / this.clubs.length,
      totalReviews: this.clubs.reduce((sum, c) => sum + (c.reviewsCount || 0), 0),
      apiRequestsUsed: this.requestCount,
      parsedAt: new Date().toISOString()
    };
    
    this.clubs.forEach(club => {
      stats.byCity[club.city] = (stats.byCity[club.city] || 0) + 1;
    });
    
    const statsPath = path.join(this.outputDir, 'statistics.json');
    await fs.writeFile(statsPath, JSON.stringify(stats, null, 2));
    
    // CSV для Excel
    const csvContent = this.generateCSV();
    const csvPath = path.join(this.outputDir, 'padel-clubs-google.csv');
    await fs.writeFile(csvPath, csvContent, 'utf8');
    
    console.log('\n\n📊 ФИНАЛЬНАЯ СТАТИСТИКА:');
    console.log('=====================================');
    console.log(`✅ Всего найдено: ${stats.totalClubs} падел клубов`);
    console.log(`📞 С телефонами: ${stats.withPhone} (${Math.round(stats.withPhone/stats.totalClubs*100)}%)`);
    console.log(`🌐 С сайтами: ${stats.withWebsite} (${Math.round(stats.withWebsite/stats.totalClubs*100)}%)`);
    console.log(`📸 С фотографиями: ${stats.withPhotos} (${Math.round(stats.withPhotos/stats.totalClubs*100)}%)`);
    console.log(`🕐 С часами работы: ${stats.withWorkingHours} (${Math.round(stats.withWorkingHours/stats.totalClubs*100)}%)`);
    console.log(`⭐ Средний рейтинг: ${stats.averageRating.toFixed(1)}/5`);
    console.log(`💬 Всего отзывов: ${stats.totalReviews}`);
    console.log(`📡 API запросов использовано: ${stats.apiRequestsUsed}`);
    console.log(`💰 Примерная стоимость: $${(stats.apiRequestsUsed * 0.008).toFixed(2)}`);
    console.log(`\n📁 Файлы сохранены в: ${this.outputDir}`);
  }

  generateCSV() {
    const headers = [
      'Название', 'Город', 'Адрес', 'Широта', 'Долгота', 
      'Телефон', 'Сайт', 'Рейтинг', 'Отзывы', 
      'Время открытия', 'Время закрытия', 'Кол-во фото', 
      'Google Maps URL'
    ];
    
    const rows = this.clubs.map(club => [
      club.name,
      club.city,
      club.address,
      club.latitude,
      club.longitude,
      club.phone || '',
      club.website || '',
      club.rating || '',
      club.reviewsCount || '',
      club.openTime || '',
      club.closeTime || '',
      club.photos ? club.photos.length : 0,
      club.googleMapsUrl || ''
    ]);
    
    const csvRows = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ];
    
    return '\ufeff' + csvRows.join('\n');
  }

  async run() {
    try {
      await this.init();
      
      // Можно начать с одного города для теста
      const testMode = process.argv.includes('--test');
      
      if (testMode) {
        console.log('🧪 ТЕСТОВЫЙ РЕЖИМ - только Москва\n');
        const moscow = RUSSIAN_CITIES[0];
        const clubs = await this.parseCityClubs(moscow);
        this.clubs.push(...clubs);
      } else {
        await this.parseAllCities();
      }
      
      await this.saveResults();
      console.log('\n✅ Парсинг завершен успешно!');
      
    } catch (error) {
      console.error('\n❌ Критическая ошибка:', error);
      
      // Сохраняем что успели собрать
      if (this.clubs.length > 0) {
        await this.saveResults();
        console.log(`\n💾 Сохранено ${this.clubs.length} клубов до ошибки`);
      }
    }
  }
}

// Запуск парсера
const parser = new GooglePlacesParser();
parser.run().catch(console.error);