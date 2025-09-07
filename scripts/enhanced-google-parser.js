#!/usr/bin/env node

/**
 * Enhanced Google Places API парсер с DaData обогащением
 * Собирает полную информацию о падел клубах и обогащает через DaData
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

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const DADATA_API_KEY = process.env.DADATA_API_KEY || '';
const DADATA_SECRET = process.env.DADATA_SECRET || '';

if (!GOOGLE_API_KEY) {
  console.error('❌ Не найден Google API ключ! Добавьте GOOGLE_PLACES_API_KEY в файл .env');
  process.exit(1);
}

// Города России для поиска падел клубов
const RUSSIAN_CITIES = [
  { name: 'Москва', lat: 55.755826, lng: 37.617300, radius: 50000 },
  { name: 'Санкт-Петербург', lat: 59.931226, lng: 30.360940, radius: 40000 },
  { name: 'Новосибирск', lat: 55.008353, lng: 82.935733, radius: 30000 },
  { name: 'Екатеринбург', lat: 56.838011, lng: 60.597474, radius: 30000 },
  { name: 'Казань', lat: 55.798551, lng: 49.106324, radius: 25000 },
];

class EnhancedPadelParser {
  constructor() {
    this.clubs = [];
    this.outputDir = path.join(__dirname, '../padel-data-enhanced');
    this.requestCount = 0;
    this.dadataRequestCount = 0;
  }

  async init() {
    await fs.mkdir(this.outputDir, { recursive: true });
    console.log('🎾 ENHANCED PADEL PARSER WITH DADATA');
    console.log('=====================================');
    console.log(`📍 Будет обработано ${RUSSIAN_CITIES.length} городов`);
    console.log(`🔧 DaData: ${DADATA_API_KEY ? 'Подключен' : 'Не настроен'}\n`);
  }

  async searchNearby(city, keyword = 'падел') {
    const url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
    const params = {
      location: `${city.lat},${city.lng}`,
      radius: city.radius,
      keyword: keyword,
      type: 'establishment',
      language: 'ru',
      key: GOOGLE_API_KEY
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
    
    // Используем только поддерживаемые поля Places API
    const fields = [
      'name',
      'formatted_address',
      'address_components',
      'geometry',
      'formatted_phone_number',
      'international_phone_number',
      'website',
      'opening_hours',
      'business_status',
      'rating',
      'user_ratings_total',
      'photos',
      'types',
      'url',
      'vicinity',
      'plus_code',
      'price_level',
      'place_id'
    ].join(',');
    
    const params = {
      place_id: placeId,
      fields: fields,
      language: 'ru',
      key: GOOGLE_API_KEY
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

  async enrichWithDaData(club) {
    if (!DADATA_API_KEY || !DADATA_SECRET) {
      return club;
    }

    try {
      // Ищем организацию по адресу и названию
      const url = 'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/party';
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Token ${DADATA_API_KEY}`,
        'X-Secret': DADATA_SECRET
      };

      // Пробуем найти по названию и адресу
      const response = await axios.post(url, {
        query: `${club.name} ${club.city}`,
        count: 5,
        locations: [{ city: club.city }]
      }, { headers });

      this.dadataRequestCount++;

      if (response.data.suggestions && response.data.suggestions.length > 0) {
        // Ищем наиболее подходящее совпадение
        const match = response.data.suggestions.find(s => 
          s.value.toLowerCase().includes('падел') || 
          s.value.toLowerCase().includes('padel') ||
          s.data.address?.value?.toLowerCase().includes(club.address.toLowerCase().slice(0, 20))
        ) || response.data.suggestions[0];

        if (match) {
          const org = match.data;
          
          // Обогащаем данными из DaData
          club.legalName = org.name?.full || org.name?.short || '';
          club.inn = org.inn || '';
          club.ogrn = org.ogrn || '';
          club.kpp = org.kpp || '';
          club.okved = org.okved || '';
          club.okvedType = org.okved_type || '';
          club.legalAddress = org.address?.value || '';
          club.managementName = org.management?.name || '';
          club.managementPost = org.management?.post || '';
          club.foundedDate = org.state?.registration_date || '';
          club.organizationStatus = org.state?.status || '';
          club.organizationType = org.type || '';
          
          // Дополнительные контакты
          if (org.emails && org.emails.length > 0) {
            club.email = org.emails[0].value;
          }
          
          if (org.phones && org.phones.length > 0 && !club.phone) {
            club.phone = org.phones[0].value;
          }

          console.log(`     ✅ Обогащено DaData: ${club.legalName || club.name}`);
        }
      }
    } catch (error) {
      console.error(`     ⚠️ Ошибка DaData: ${error.message}`);
    }

    return club;
  }

  formatClubData(place, details, city) {
    // Создаем описание на основе имеющихся данных
    let description = '';
    if (place.rating && place.user_ratings_total) {
      description = `Падел клуб "${place.name}" в городе ${city.name}. Рейтинг: ${place.rating}/5 на основе ${place.user_ratings_total} отзывов.`;
    } else {
      description = `Падел клуб "${place.name}" в городе ${city.name}.`;
    }

    // Парсим компоненты адреса для извлечения почтового индекса
    let postalCode = '';
    if (details?.address_components) {
      const postal = details.address_components.find(c => 
        c.types.includes('postal_code')
      );
      if (postal) postalCode = postal.long_name;
    }

    // Формируем подробные часы работы
    let workingHoursText = '';
    if (details?.opening_hours?.weekday_text) {
      workingHoursText = details.opening_hours.weekday_text.join('; ');
    }

    const club = {
      // Основные поля
      name: place.name,
      address: details?.formatted_address || place.vicinity || '',
      postalCode: postalCode,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      
      // Контакты
      phone: details?.formatted_phone_number || details?.international_phone_number || '',
      website: details?.website || '',
      email: '', // Будет заполнено из DaData
      
      // Описание и характеристики
      description: description || `Падел клуб в ${city.name}. Рейтинг: ${place.rating || 'нет данных'}/5`,
      
      // Время работы
      openTime: '',
      closeTime: '',
      workingDays: [],
      workingHoursText: workingHoursText,
      isOpen24Hours: details?.opening_hours?.open_now === true && details?.opening_hours?.periods?.length === 1,
      
      // Дополнительная информация
      rating: place.rating || 0,
      reviewsCount: place.user_ratings_total || 0,
      priceLevel: place.price_level || null,
      priceLevelText: this.getPriceLevelText(place.price_level),
      businessStatus: details?.business_status || place.business_status || '',
      googlePlaceId: place.place_id,
      googleMapsUrl: details?.url || '',
      plusCode: details?.plus_code?.global_code || '',
      
      // Фотографии
      photos: [],
      
      // Доступность
      wheelchairAccessible: false,
      
      // Метаданные
      sports: ['padel'],
      city: city.name,
      types: place.types || [],
      source: 'Google Places API',
      parsedAt: new Date().toISOString(),
      
      // Поля для DaData (будут заполнены позже)
      legalName: '',
      inn: '',
      ogrn: '',
      kpp: '',
      okved: '',
      okvedType: '',
      legalAddress: '',
      managementName: '',
      managementPost: '',
      foundedDate: '',
      organizationStatus: '',
      organizationType: ''
    };

    // Парсим время работы
    if (details?.opening_hours) {
      const hours = this.parseOpeningHours(details.opening_hours);
      club.openTime = hours.openTime;
      club.closeTime = hours.closeTime;
      club.workingDays = hours.workingDays;
    }

    // Добавляем ссылки на фотографии (до 20 фото)
    if (details?.photos && details.photos.length > 0) {
      club.photos = details.photos.slice(0, 20).map(photo => 
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photoreference=${photo.photo_reference}&key=${GOOGLE_API_KEY}`
      );
    }

    return club;
  }

  getPriceLevelText(level) {
    const levels = {
      0: 'Бесплатно',
      1: 'Недорого',
      2: 'Средние цены',
      3: 'Дорого',
      4: 'Очень дорого'
    };
    return levels[level] || 'Не указано';
  }

  parseOpeningHours(openingHours) {
    const result = {
      openTime: '',
      closeTime: '',
      workingDays: []
    };

    if (!openingHours?.periods) return result;

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
      await this.delay(1000);
    }

    // Убираем дубликаты по place_id
    const uniquePlaces = new Map();
    allResults.forEach(place => {
      if (!uniquePlaces.has(place.place_id)) {
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
      let club = this.formatClubData(place, details, city);
      
      // Обогащаем через DaData
      club = await this.enrichWithDaData(club);
      
      cityClubs.push(club);
      
      // Выводим основную информацию
      console.log(`     ✅ ${club.legalName || club.name}`);
      console.log(`     📍 ${club.latitude.toFixed(6)}, ${club.longitude.toFixed(6)}`);
      if (club.phone) console.log(`     📞 ${club.phone}`);
      if (club.email) console.log(`     📧 ${club.email}`);
      if (club.inn) console.log(`     🏢 ИНН: ${club.inn}`);
      if (club.website) console.log(`     🌐 ${club.website}`);
      if (club.photos.length) console.log(`     📸 ${club.photos.length} фото`);
      if (club.description) console.log(`     📝 ${club.description.slice(0, 50)}...`);
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
      console.log(`   Google API запросов: ${this.requestCount}`);
      console.log(`   DaData API запросов: ${this.dadataRequestCount}`);
    }
  }

  async saveIntermediateResults(cityName, clubs) {
    if (clubs.length === 0) return;
    
    const cityDir = path.join(this.outputDir, 'cities');
    await fs.mkdir(cityDir, { recursive: true });
    
    const filename = `${cityName.toLowerCase().replace(/\s+/g, '-')}.json`;
    const filepath = path.join(cityDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(clubs, null, 2));
    console.log(`   💾 Сохранено ${clubs.length} клубов в ${filename}`);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async saveResults() {
    // Основной файл со всеми клубами
    const allClubsPath = path.join(this.outputDir, 'all-padel-clubs-enhanced.json');
    await fs.writeFile(allClubsPath, JSON.stringify(this.clubs, null, 2));
    
    // Файл для импорта в Firebase
    const firebaseData = this.clubs.map((club, index) => ({
      id: `padel_${Date.now()}_${index}`,
      name: club.name,
      legalName: club.legalName || club.name,
      address: club.address,
      postalCode: club.postalCode,
      latitude: club.latitude,
      longitude: club.longitude,
      phone: club.phone,
      email: club.email,
      website: club.website,
      description: club.description,
      logoUrl: club.photos[0] || '',
      photos: club.photos,
      amenities: [],
      features: club.wheelchairAccessible ? ['wheelchair_accessible'] : [],
      sports: ['padel'],
      status: 'inactive',
      public: false,
      openTime: club.openTime || '07:00',
      closeTime: club.closeTime || '23:00',
      workingDays: club.workingDays,
      workingHoursText: club.workingHoursText,
      isOpen24Hours: club.isOpen24Hours,
      priceLevel: club.priceLevelText,
      rating: club.rating,
      reviewsCount: club.reviewsCount,
      
      // Юридическая информация
      inn: club.inn,
      ogrn: club.ogrn,
      kpp: club.kpp,
      okved: club.okved,
      legalAddress: club.legalAddress,
      managementName: club.managementName,
      managementPost: club.managementPost,
      foundedDate: club.foundedDate,
      organizationStatus: club.organizationStatus,
      organizationType: club.organizationType,
      
      // Метаданные
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'Google Places API + DaData',
      googlePlaceId: club.googlePlaceId,
      googleMapsUrl: club.googleMapsUrl,
      plusCode: club.plusCode
    }));
    
    const firebasePath = path.join(this.outputDir, 'firebase-import-enhanced.json');
    await fs.writeFile(firebasePath, JSON.stringify(firebaseData, null, 2));
    
    // Статистика
    const stats = {
      totalClubs: this.clubs.length,
      byCity: {},
      withPhone: this.clubs.filter(c => c.phone).length,
      withEmail: this.clubs.filter(c => c.email).length,
      withWebsite: this.clubs.filter(c => c.website).length,
      withPhotos: this.clubs.filter(c => c.photos && c.photos.length > 0).length,
      withWorkingHours: this.clubs.filter(c => c.openTime && c.closeTime).length,
      withDescription: this.clubs.filter(c => c.description && c.description.length > 50).length,
      withLegalInfo: this.clubs.filter(c => c.inn).length,
      averageRating: this.clubs.reduce((sum, c) => sum + (c.rating || 0), 0) / this.clubs.length,
      totalReviews: this.clubs.reduce((sum, c) => sum + (c.reviewsCount || 0), 0),
      googleApiRequestsUsed: this.requestCount,
      dadataApiRequestsUsed: this.dadataRequestCount,
      parsedAt: new Date().toISOString()
    };
    
    this.clubs.forEach(club => {
      stats.byCity[club.city] = (stats.byCity[club.city] || 0) + 1;
    });
    
    const statsPath = path.join(this.outputDir, 'statistics.json');
    await fs.writeFile(statsPath, JSON.stringify(stats, null, 2));
    
    // CSV для Excel с расширенными полями
    const csvContent = this.generateCSV();
    const csvPath = path.join(this.outputDir, 'padel-clubs-enhanced.csv');
    await fs.writeFile(csvPath, csvContent, 'utf8');
    
    console.log('\n\n📊 ФИНАЛЬНАЯ СТАТИСТИКА:');
    console.log('=====================================');
    console.log(`✅ Всего найдено: ${stats.totalClubs} падел клубов`);
    console.log(`📞 С телефонами: ${stats.withPhone} (${Math.round(stats.withPhone/stats.totalClubs*100)}%)`);
    console.log(`📧 С email: ${stats.withEmail} (${Math.round(stats.withEmail/stats.totalClubs*100)}%)`);
    console.log(`🌐 С сайтами: ${stats.withWebsite} (${Math.round(stats.withWebsite/stats.totalClubs*100)}%)`);
    console.log(`📸 С фотографиями: ${stats.withPhotos} (${Math.round(stats.withPhotos/stats.totalClubs*100)}%)`);
    console.log(`🕐 С часами работы: ${stats.withWorkingHours} (${Math.round(stats.withWorkingHours/stats.totalClubs*100)}%)`);
    console.log(`📝 С описанием: ${stats.withDescription} (${Math.round(stats.withDescription/stats.totalClubs*100)}%)`);
    console.log(`🏢 С юр. информацией: ${stats.withLegalInfo} (${Math.round(stats.withLegalInfo/stats.totalClubs*100)}%)`);
    console.log(`⭐ Средний рейтинг: ${stats.averageRating.toFixed(1)}/5`);
    console.log(`💬 Всего отзывов: ${stats.totalReviews}`);
    console.log(`📡 Google API запросов: ${stats.googleApiRequestsUsed}`);
    console.log(`📡 DaData API запросов: ${stats.dadataApiRequestsUsed}`);
    console.log(`💰 Примерная стоимость: $${(stats.googleApiRequestsUsed * 0.008).toFixed(2)}`);
    console.log(`\n📁 Файлы сохранены в: ${this.outputDir}`);
  }

  generateCSV() {
    const headers = [
      'Название', 'Юр. название', 'Город', 'Адрес', 'Индекс', 'Широта', 'Долгота', 
      'Телефон', 'Email', 'Сайт', 'Описание', 'Рейтинг', 'Отзывы', 
      'Время открытия', 'Время закрытия', 'Режим работы', 'Ценовой уровень',
      'ИНН', 'ОГРН', 'КПП', 'ОКВЭД', 'Юр. адрес', 'Руководитель', 'Должность',
      'Дата основания', 'Статус организации', 'Кол-во фото', 'Google Maps URL'
    ];
    
    const rows = this.clubs.map(club => [
      club.name,
      club.legalName || '',
      club.city,
      club.address,
      club.postalCode || '',
      club.latitude,
      club.longitude,
      club.phone || '',
      club.email || '',
      club.website || '',
      (club.description || '').replace(/"/g, '""').slice(0, 200),
      club.rating || '',
      club.reviewsCount || '',
      club.openTime || '',
      club.closeTime || '',
      club.workingHoursText || '',
      club.priceLevelText || '',
      club.inn || '',
      club.ogrn || '',
      club.kpp || '',
      club.okved || '',
      club.legalAddress || '',
      club.managementName || '',
      club.managementPost || '',
      club.foundedDate || '',
      club.organizationStatus || '',
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
const parser = new EnhancedPadelParser();
parser.run().catch(console.error);