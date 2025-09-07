#!/usr/bin/env node

/**
 * Парсер падел клубов России для платформы AllCourt
 * Собирает все необходимые поля для регистрации на платформе
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Структура данных клуба согласно платформе AllCourt
const createVenueTemplate = () => ({
  // Основные поля (обязательные)
  name: '',           // Название клуба
  address: '',        // Адрес
  latitude: null,     // Широта (КРИТИЧНО!)
  longitude: null,    // Долгота (КРИТИЧНО!)
  
  // Контакты
  phone: '',          // Телефон
  email: '',          // Email
  website: '',        // Сайт
  instagram: '',      // Instagram
  
  // Описание и характеристики
  description: '',    // Описание клуба
  sports: [],         // ['padel', 'tennis', 'badminton']
  
  // Фотографии
  photos: [],         // Массив URL фотографий
  logoUrl: '',        // URL логотипа
  
  // Время работы
  openTime: '',       // Время открытия (например "07:00")
  closeTime: '',      // Время закрытия (например "23:00")
  workingDays: [],    // Рабочие дни ['monday', 'tuesday', ...]
  
  // Цены
  minPrice: null,     // Минимальная цена за час
  maxPrice: null,     // Максимальная цена за час
  
  // Удобства и особенности
  amenities: [],      // ['parking', 'shower', 'cafe', 'shop']
  features: [],       // ['indoor', 'outdoor', 'lighting', 'heating']
  
  // Служебные поля
  status: 'inactive', // По умолчанию неактивен (требует проверки)
  public: false,      // Не показывать в витрине до проверки
  
  // Метаданные парсинга
  source: '',         // Источник данных
  parsedAt: '',       // Время парсинга
  city: '',           // Город
  region: ''          // Регион
});

// Все крупные города России
const RUSSIAN_CITIES = [
  // Города-миллионники
  { name: 'Москва', region: 'Москва', lat: 55.755826, lng: 37.617300, searchQuery: 'падел москва' },
  { name: 'Санкт-Петербург', region: 'Санкт-Петербург', lat: 59.931226, lng: 30.360940, searchQuery: 'падел санкт-петербург' },
  { name: 'Новосибирск', region: 'Новосибирская область', lat: 55.008353, lng: 82.935733, searchQuery: 'падел новосибирск' },
  { name: 'Екатеринбург', region: 'Свердловская область', lat: 56.838011, lng: 60.597474, searchQuery: 'падел екатеринбург' },
  { name: 'Казань', region: 'Республика Татарстан', lat: 55.798551, lng: 49.106324, searchQuery: 'падел казань' },
  { name: 'Нижний Новгород', region: 'Нижегородская область', lat: 56.326797, lng: 44.006516, searchQuery: 'падел нижний новгород' },
  { name: 'Челябинск', region: 'Челябинская область', lat: 55.159902, lng: 61.402554, searchQuery: 'падел челябинск' },
  { name: 'Омск', region: 'Омская область', lat: 54.989342, lng: 73.368212, searchQuery: 'падел омск' },
  { name: 'Самара', region: 'Самарская область', lat: 53.195538, lng: 50.101783, searchQuery: 'падел самара' },
  { name: 'Ростов-на-Дону', region: 'Ростовская область', lat: 47.222078, lng: 39.720349, searchQuery: 'падел ростов-на-дону' },
  { name: 'Уфа', region: 'Республика Башкортостан', lat: 54.735152, lng: 55.958736, searchQuery: 'падел уфа' },
  { name: 'Красноярск', region: 'Красноярский край', lat: 56.010563, lng: 92.852572, searchQuery: 'падел красноярск' },
  { name: 'Воронеж', region: 'Воронежская область', lat: 51.672, lng: 39.1843, searchQuery: 'падел воронеж' },
  { name: 'Пермь', region: 'Пермский край', lat: 58.0105, lng: 56.2502, searchQuery: 'падел пермь' },
  { name: 'Волгоград', region: 'Волгоградская область', lat: 48.708048, lng: 44.513303, searchQuery: 'падел волгоград' },
  
  // Курортные города
  { name: 'Сочи', region: 'Краснодарский край', lat: 43.585525, lng: 39.723062, searchQuery: 'падел сочи' },
  { name: 'Краснодар', region: 'Краснодарский край', lat: 45.035470, lng: 38.975313, searchQuery: 'падел краснодар' },
  { name: 'Анапа', region: 'Краснодарский край', lat: 44.895, lng: 37.316, searchQuery: 'падел анапа' },
  
  // Другие крупные города
  { name: 'Тюмень', region: 'Тюменская область', lat: 57.1522, lng: 65.5272, searchQuery: 'падел тюмень' },
  { name: 'Иркутск', region: 'Иркутская область', lat: 52.2978, lng: 104.2964, searchQuery: 'падел иркутск' },
  { name: 'Хабаровск', region: 'Хабаровский край', lat: 48.4827, lng: 135.0838, searchQuery: 'падел хабаровск' },
  { name: 'Владивосток', region: 'Приморский край', lat: 43.1332, lng: 131.9113, searchQuery: 'падел владивосток' },
  { name: 'Ярославль', region: 'Ярославская область', lat: 57.6261, lng: 39.8845, searchQuery: 'падел ярославль' },
  { name: 'Махачкала', region: 'Республика Дагестан', lat: 42.9849, lng: 47.5047, searchQuery: 'падел махачкала' },
  { name: 'Томск', region: 'Томская область', lat: 56.4977, lng: 84.9744, searchQuery: 'падел томск' },
  { name: 'Оренбург', region: 'Оренбургская область', lat: 51.7681, lng: 55.0968, searchQuery: 'падел оренбург' },
  { name: 'Кемерово', region: 'Кемеровская область', lat: 55.3333, lng: 86.0833, searchQuery: 'падел кемерово' },
  { name: 'Новокузнецк', region: 'Кемеровская область', lat: 53.7596, lng: 87.1216, searchQuery: 'падел новокузнецк' },
  { name: 'Рязань', region: 'Рязанская область', lat: 54.6269, lng: 39.6916, searchQuery: 'падел рязань' },
  { name: 'Астрахань', region: 'Астраханская область', lat: 46.3497, lng: 48.0408, searchQuery: 'падел астрахань' },
  { name: 'Пенза', region: 'Пензенская область', lat: 53.1958, lng: 45.0183, searchQuery: 'падел пенза' },
  { name: 'Липецк', region: 'Липецкая область', lat: 52.6031, lng: 39.5708, searchQuery: 'падел липецк' },
  { name: 'Тула', region: 'Тульская область', lat: 54.2044, lng: 37.6111, searchQuery: 'падел тула' },
  { name: 'Киров', region: 'Кировская область', lat: 58.6035, lng: 49.6679, searchQuery: 'падел киров' },
  { name: 'Чебоксары', region: 'Чувашская Республика', lat: 56.1324, lng: 47.2519, searchQuery: 'падел чебоксары' },
  { name: 'Калининград', region: 'Калининградская область', lat: 54.7104, lng: 20.4522, searchQuery: 'падел калининград' },
  { name: 'Брянск', region: 'Брянская область', lat: 53.2521, lng: 34.3717, searchQuery: 'падел брянск' },
  { name: 'Курск', region: 'Курская область', lat: 51.7303, lng: 36.1930, searchQuery: 'падел курск' },
  { name: 'Иваново', region: 'Ивановская область', lat: 57.0000, lng: 40.9739, searchQuery: 'падел иваново' },
  { name: 'Ульяновск', region: 'Ульяновская область', lat: 54.3282, lng: 48.3866, searchQuery: 'падел ульяновск' },
  { name: 'Тверь', region: 'Тверская область', lat: 56.8587, lng: 35.9176, searchQuery: 'падел тверь' },
  { name: 'Магнитогорск', region: 'Челябинская область', lat: 53.4242, lng: 58.9815, searchQuery: 'падел магнитогорск' },
  { name: 'Ижевск', region: 'Удмуртская Республика', lat: 56.8527, lng: 53.2116, searchQuery: 'падел ижевск' },
  { name: 'Барнаул', region: 'Алтайский край', lat: 53.3606, lng: 83.7636, searchQuery: 'падел барнаул' },
  { name: 'Белгород', region: 'Белгородская область', lat: 50.5997, lng: 36.5983, searchQuery: 'падел белгород' },
  { name: 'Владимир', region: 'Владимирская область', lat: 56.1365, lng: 40.3966, searchQuery: 'падел владимир' },
  { name: 'Сургут', region: 'ХМАО', lat: 61.2500, lng: 73.4167, searchQuery: 'падел сургут' },
  { name: 'Нижний Тагил', region: 'Свердловская область', lat: 57.9195, lng: 59.9652, searchQuery: 'падел нижний тагил' },
  { name: 'Архангельск', region: 'Архангельская область', lat: 64.5401, lng: 40.5433, searchQuery: 'падел архангельск' },
  { name: 'Калуга', region: 'Калужская область', lat: 54.5293, lng: 36.2754, searchQuery: 'падел калуга' }
];

class PadelRussiaParser {
  constructor() {
    this.browser = null;
    this.clubs = [];
    this.outputDir = path.join(__dirname, '../padel-data');
  }

  async init() {
    await fs.mkdir(this.outputDir, { recursive: true });
    
    this.browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: [
        '--start-maximized',
        '--disable-blink-features=AutomationControlled',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      ]
    });
  }

  async parseYandexMaps(city) {
    const page = await this.browser.newPage();
    const clubs = [];
    
    try {
      const url = `https://yandex.ru/maps/search/${encodeURIComponent(city.searchQuery)}/`;
      console.log(`🔍 Яндекс.Карты: ${city.name}...`);
      
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      await this.delay(3000);
      
      // Прокручиваем для загрузки всех результатов
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => {
          const searchResults = document.querySelector('.search-list-view__list');
          if (searchResults) searchResults.scrollTop = searchResults.scrollHeight;
        });
        await this.delay(1500);
      }
      
      // Собираем данные
      const searchResults = await page.evaluate(() => {
        const results = [];
        const items = document.querySelectorAll('.search-snippet-view');
        
        items.forEach(item => {
          try {
            // Базовая информация
            const name = item.querySelector('.search-business-snippet-view__title')?.textContent?.trim();
            const address = item.querySelector('.search-business-snippet-view__address')?.textContent?.trim();
            
            // Рейтинг и отзывы
            const rating = item.querySelector('.business-rating-badge-view__rating')?.textContent?.trim();
            const reviewCount = item.querySelector('.business-rating-badge-view__count')?.textContent?.trim();
            
            // Телефон
            const phoneElement = item.querySelector('[class*="phone"]');
            const phone = phoneElement?.textContent?.trim();
            
            // Время работы
            const hoursElement = item.querySelector('.search-business-snippet-view__closed');
            const workHours = hoursElement?.textContent?.trim();
            
            // Категория
            const categoryElement = item.querySelector('.search-business-snippet-view__category');
            const category = categoryElement?.textContent?.trim();
            
            // Сайт (если есть ссылка)
            const websiteElement = item.querySelector('[class*="website"]');
            const website = websiteElement?.href;
            
            // Фото превью
            const photoElement = item.querySelector('.search-business-snippet-view__image img');
            const photoUrl = photoElement?.src;
            
            if (name) {
              results.push({
                name,
                address,
                phone: phone || '',
                rating: parseFloat(rating) || 0,
                reviewCount: parseInt(reviewCount?.replace(/\D/g, '')) || 0,
                workHours: workHours || '',
                category: category || '',
                website: website || '',
                photoUrl: photoUrl || ''
              });
            }
          } catch (e) {
            console.error('Ошибка парсинга элемента:', e);
          }
        });
        
        return results;
      });
      
      // Для каждого найденного клуба пытаемся получить детальную информацию
      for (const result of searchResults) {
        if (result.name.toLowerCase().includes('падел') || 
            result.name.toLowerCase().includes('padel') ||
            result.category.toLowerCase().includes('падел')) {
          
          // Кликаем на клуб для получения координат
          await page.evaluate((name) => {
            const elements = Array.from(document.querySelectorAll('.search-business-snippet-view__title'));
            const element = elements.find(el => el.textContent.trim() === name);
            if (element) element.click();
          }, result.name);
          
          await this.delay(2000);
          
          // Получаем координаты из URL
          const currentUrl = page.url();
          const coordMatch = currentUrl.match(/ll=([\d.]+)%2C([\d.]+)/);
          let latitude = null, longitude = null;
          
          if (coordMatch) {
            longitude = parseFloat(coordMatch[1]);
            latitude = parseFloat(coordMatch[2]);
          }
          
          // Пытаемся получить дополнительную информацию из карточки
          const details = await page.evaluate(() => {
            const card = document.querySelector('.business-card-view');
            if (!card) return {};
            
            // Телефоны
            const phones = Array.from(card.querySelectorAll('.card-phones-view__phone-number'))
              .map(el => el.textContent.trim());
            
            // Сайт
            const website = card.querySelector('.business-urls-view__link')?.href;
            
            // Соцсети
            const instagram = card.querySelector('[class*="instagram"]')?.href;
            
            // Время работы детально
            const workingHours = {};
            card.querySelectorAll('.business-working-hours-view__item').forEach(item => {
              const day = item.querySelector('.business-working-hours-view__day')?.textContent;
              const hours = item.querySelector('.business-working-hours-view__time')?.textContent;
              if (day && hours) workingHours[day] = hours;
            });
            
            // Фотографии
            const photos = Array.from(card.querySelectorAll('.carousel__image'))
              .map(img => img.src)
              .filter(src => src && !src.includes('data:'));
            
            // Удобства
            const features = Array.from(card.querySelectorAll('.business-features-view__valued'))
              .map(el => el.textContent.trim());
            
            return {
              phones: phones[0] || '',
              website,
              instagram,
              workingHours,
              photos,
              features
            };
          });
          
          // Создаем объект клуба
          const venue = createVenueTemplate();
          venue.name = result.name;
          venue.address = result.address;
          venue.latitude = latitude;
          venue.longitude = longitude;
          venue.phone = details.phones || result.phone;
          venue.website = details.website || result.website;
          venue.instagram = details.instagram || '';
          venue.photos = details.photos || (result.photoUrl ? [result.photoUrl] : []);
          venue.features = details.features || [];
          venue.sports = ['padel'];
          venue.city = city.name;
          venue.region = city.region;
          venue.source = 'Yandex.Maps';
          venue.parsedAt = new Date().toISOString();
          
          // Парсим время работы
          if (details.workingHours) {
            const times = Object.values(details.workingHours)[0];
            if (times && times.includes('–')) {
              const [open, close] = times.split('–').map(t => t.trim());
              venue.openTime = open;
              venue.closeTime = close;
            }
          }
          
          clubs.push(venue);
          console.log(`  ✅ ${venue.name} - координаты: ${latitude}, ${longitude}`);
        }
      }
      
      console.log(`  Найдено ${clubs.length} падел клубов в ${city.name}`);
      
    } catch (error) {
      console.error(`❌ Ошибка при парсинге ${city.name}:`, error.message);
    } finally {
      await page.close();
    }
    
    return clubs;
  }

  async parseGoogleMaps(city) {
    const page = await this.browser.newPage();
    const clubs = [];
    
    try {
      const url = `https://www.google.com/maps/search/${encodeURIComponent(city.searchQuery)}/@${city.lat},${city.lng},12z`;
      console.log(`🔍 Google Maps: ${city.name}...`);
      
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      await this.delay(3000);
      
      // Прокручиваем результаты
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => {
          const feed = document.querySelector('[role="feed"]');
          if (feed) feed.scrollTop = feed.scrollHeight;
        });
        await this.delay(2000);
      }
      
      // Собираем результаты
      const results = await page.evaluate(() => {
        const items = [];
        document.querySelectorAll('[role="article"]').forEach(article => {
          const name = article.querySelector('[class*="fontHeadlineSmall"]')?.textContent;
          const rating = article.querySelector('[class*="MW4etd"]')?.textContent;
          const reviews = article.querySelector('[class*="UY7F9"]')?.textContent;
          
          if (name) {
            items.push({ name, rating, reviews });
          }
        });
        return items;
      });
      
      // Обрабатываем каждый результат
      for (const result of results) {
        if (result.name.toLowerCase().includes('падел') || 
            result.name.toLowerCase().includes('padel')) {
          
          // Кликаем для получения деталей
          await page.evaluate((name) => {
            const elements = Array.from(document.querySelectorAll('[class*="fontHeadlineSmall"]'));
            const element = elements.find(el => el.textContent === name);
            if (element) element.click();
          }, result.name);
          
          await this.delay(3000);
          
          // Получаем детальную информацию
          const details = await page.evaluate(() => {
            const getTextByIcon = (icon) => {
              const elements = Array.from(document.querySelectorAll('[data-tooltip]'));
              const element = elements.find(el => el.textContent.includes(icon));
              return element?.parentElement?.parentElement?.textContent?.replace(icon, '').trim();
            };
            
            return {
              name: document.querySelector('h1')?.textContent,
              address: getTextByIcon('📍') || document.querySelector('[data-item-id="address"]')?.textContent,
              phone: getTextByIcon('📞') || document.querySelector('[data-tooltip="Copy phone number"]')?.parentElement?.textContent,
              website: document.querySelector('[data-tooltip="Open website"]')?.href,
              hours: document.querySelector('[class*="open"]')?.parentElement?.textContent,
              photos: Array.from(document.querySelectorAll('[class*="gallery"] img')).map(img => img.src)
            };
          });
          
          // Получаем координаты из URL
          const currentUrl = page.url();
          const coordMatch = currentUrl.match(/@([-\d.]+),([-\d.]+),/);
          let latitude = null, longitude = null;
          
          if (coordMatch) {
            latitude = parseFloat(coordMatch[1]);
            longitude = parseFloat(coordMatch[2]);
          }
          
          // Создаем объект клуба
          const venue = createVenueTemplate();
          venue.name = details.name || result.name;
          venue.address = details.address || '';
          venue.latitude = latitude;
          venue.longitude = longitude;
          venue.phone = details.phone || '';
          venue.website = details.website || '';
          venue.photos = details.photos || [];
          venue.sports = ['padel'];
          venue.city = city.name;
          venue.region = city.region;
          venue.source = 'Google.Maps';
          venue.parsedAt = new Date().toISOString();
          
          clubs.push(venue);
          console.log(`  ✅ ${venue.name} - координаты: ${latitude}, ${longitude}`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Ошибка Google Maps для ${city.name}:`, error.message);
    } finally {
      await page.close();
    }
    
    return clubs;
  }

  async parseCityClubs(city) {
    console.log(`\n📍 Обработка города: ${city.name} (${city.region})`);
    
    const allClubs = [];
    
    // Парсим с Яндекс.Карт
    const yandexClubs = await this.parseYandexMaps(city);
    allClubs.push(...yandexClubs);
    
    // Задержка между источниками
    await this.delay(5000);
    
    // Парсим с Google Maps
    const googleClubs = await this.parseGoogleMaps(city);
    allClubs.push(...googleClubs);
    
    return allClubs;
  }

  async parseAllCities() {
    for (const city of RUSSIAN_CITIES) {
      const cityClubs = await this.parseCityClubs(city);
      this.clubs.push(...cityClubs);
      
      // Сохраняем промежуточные результаты
      await this.saveIntermediateResults(city.name);
      
      // Задержка между городами
      await this.delay(10000);
    }
  }

  async saveIntermediateResults(cityName) {
    const cityClubs = this.clubs.filter(c => c.city === cityName);
    if (cityClubs.length === 0) return;
    
    const cityDir = path.join(this.outputDir, 'cities');
    await fs.mkdir(cityDir, { recursive: true });
    
    const filename = `${cityName.toLowerCase().replace(/\s+/g, '-')}.json`;
    const filepath = path.join(cityDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(cityClubs, null, 2));
    console.log(`  💾 Сохранено ${cityClubs.length} клубов для ${cityName}`);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  removeDuplicates() {
    const uniqueClubs = new Map();
    
    this.clubs.forEach(club => {
      // Ключ для определения уникальности: координаты или название+адрес
      let key;
      if (club.latitude && club.longitude) {
        key = `${club.latitude.toFixed(4)}_${club.longitude.toFixed(4)}`;
      } else {
        key = `${club.name}_${club.address}`;
      }
      
      // Если клуб уже есть, объединяем информацию
      if (uniqueClubs.has(key)) {
        const existing = uniqueClubs.get(key);
        // Дополняем пустые поля
        Object.keys(club).forEach(field => {
          if (!existing[field] && club[field]) {
            existing[field] = club[field];
          }
        });
        // Объединяем массивы фотографий
        if (club.photos && club.photos.length > 0) {
          existing.photos = [...new Set([...existing.photos, ...club.photos])];
        }
      } else {
        uniqueClubs.set(key, club);
      }
    });
    
    return Array.from(uniqueClubs.values());
  }

  async saveResults() {
    const uniqueClubs = this.removeDuplicates();
    
    // Полный файл со всеми клубами
    const allClubsPath = path.join(this.outputDir, 'all-padel-clubs-russia.json');
    await fs.writeFile(allClubsPath, JSON.stringify(uniqueClubs, null, 2));
    
    // Файл для импорта в Firebase
    const firebaseData = uniqueClubs.map((club, index) => ({
      ...club,
      id: `padel_${Date.now()}_${index}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    
    const firebasePath = path.join(this.outputDir, 'firebase-import.json');
    await fs.writeFile(firebasePath, JSON.stringify(firebaseData, null, 2));
    
    // Статистика
    const stats = {
      totalClubs: uniqueClubs.length,
      byCity: {},
      byRegion: {},
      withCoordinates: uniqueClubs.filter(c => c.latitude && c.longitude).length,
      withPhotos: uniqueClubs.filter(c => c.photos && c.photos.length > 0).length,
      withPhone: uniqueClubs.filter(c => c.phone).length,
      withWebsite: uniqueClubs.filter(c => c.website).length,
      parsedAt: new Date().toISOString()
    };
    
    uniqueClubs.forEach(club => {
      stats.byCity[club.city] = (stats.byCity[club.city] || 0) + 1;
      stats.byRegion[club.region] = (stats.byRegion[club.region] || 0) + 1;
    });
    
    const statsPath = path.join(this.outputDir, 'statistics.json');
    await fs.writeFile(statsPath, JSON.stringify(stats, null, 2));
    
    // CSV файл для Excel
    const csvContent = this.generateCSV(uniqueClubs);
    const csvPath = path.join(this.outputDir, 'padel-clubs-russia.csv');
    await fs.writeFile(csvPath, csvContent, 'utf8');
    
    console.log('\n📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log(`✅ Всего найдено: ${stats.totalClubs} падел клубов`);
    console.log(`📍 С координатами: ${stats.withCoordinates} (${Math.round(stats.withCoordinates/stats.totalClubs*100)}%)`);
    console.log(`📸 С фотографиями: ${stats.withPhotos} (${Math.round(stats.withPhotos/stats.totalClubs*100)}%)`);
    console.log(`📞 С телефонами: ${stats.withPhone} (${Math.round(stats.withPhone/stats.totalClubs*100)}%)`);
    console.log(`🌐 С сайтами: ${stats.withWebsite} (${Math.round(stats.withWebsite/stats.totalClubs*100)}%)`);
    console.log(`\n📁 Файлы сохранены в: ${this.outputDir}`);
  }

  generateCSV(clubs) {
    const headers = [
      'Название', 'Город', 'Регион', 'Адрес', 
      'Широта', 'Долгота', 'Телефон', 'Email', 
      'Сайт', 'Instagram', 'Время открытия', 'Время закрытия',
      'Мин. цена', 'Макс. цена', 'Кол-во фото', 'Источник'
    ];
    
    const rows = clubs.map(club => [
      club.name,
      club.city,
      club.region,
      club.address,
      club.latitude || '',
      club.longitude || '',
      club.phone,
      club.email,
      club.website,
      club.instagram,
      club.openTime,
      club.closeTime,
      club.minPrice || '',
      club.maxPrice || '',
      club.photos ? club.photos.length : 0,
      club.source
    ]);
    
    const csvRows = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ];
    
    return '\ufeff' + csvRows.join('\n'); // BOM для корректного отображения в Excel
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      console.log('🎾 ПАРСЕР ПАДЕЛ КЛУБОВ РОССИИ');
      console.log('=====================================');
      console.log(`📍 Будет обработано ${RUSSIAN_CITIES.length} городов`);
      console.log('⚠️  Процесс может занять несколько часов\n');
      
      await this.init();
      await this.parseAllCities();
      await this.saveResults();
      
    } catch (error) {
      console.error('❌ Критическая ошибка:', error);
    } finally {
      await this.close();
    }
  }
}

// Запуск парсера
const parser = new PadelRussiaParser();
parser.run().catch(console.error);