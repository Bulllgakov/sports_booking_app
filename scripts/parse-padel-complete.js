#!/usr/bin/env node

/**
 * Полный парсер падел клубов
 * Вся информация о клубе (включая юридическую) в одном объекте
 * Поддержка Яндекс Геокодер и DaData
 */

import WebsiteParser from './website-parser.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем переменные окружения
dotenv.config({ path: path.join(__dirname, '.env') });

/**
 * Получение координат через Яндекс Геокодер API
 * Бесплатный лимит: 1000 запросов в сутки
 */
async function getCoordinatesFromYandex(address, apiKey) {
  if (!apiKey || !address) {
    return null;
  }

  try {
    const url = 'https://geocode-maps.yandex.ru/1.x/';
    const response = await axios.get(url, {
      params: {
        apikey: apiKey,
        geocode: address,
        format: 'json',
        results: 1,
        lang: 'ru_RU'
      }
    });

    const geoObject = response.data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
    
    if (geoObject) {
      const [lng, lat] = geoObject.Point.pos.split(' ').map(parseFloat);
      
      return {
        latitude: lat,
        longitude: lng,
        formattedAddress: geoObject.metaDataProperty.GeocoderMetaData.text,
        precision: geoObject.metaDataProperty.GeocoderMetaData.precision,
        source: 'yandex'
      };
    }
  } catch (error) {
    console.log(`   ⚠️ Ошибка Яндекс Геокодера: ${error.message}`);
  }

  return null;
}

/**
 * Получение координат через DaData API
 */
async function getCoordinatesFromDaData(address, apiKey, secret) {
  if (!apiKey || !secret || !address) {
    return null;
  }

  try {
    const url = 'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address';
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Token ${apiKey}`,
      'X-Secret': secret
    };

    const response = await axios.post(url, {
      query: address,
      count: 1
    }, { headers });

    if (response.data.suggestions && response.data.suggestions.length > 0) {
      const suggestion = response.data.suggestions[0];
      const data = suggestion.data;
      
      if (data.geo_lat && data.geo_lon) {
        return {
          latitude: parseFloat(data.geo_lat),
          longitude: parseFloat(data.geo_lon),
          formattedAddress: suggestion.value,
          postalCode: data.postal_code,
          fiasId: data.fias_id,
          source: 'dadata'
        };
      }
    }
  } catch (error) {
    console.log(`   ⚠️ Ошибка DaData геокодинга: ${error.message}`);
  }

  return null;
}

/**
 * Структура полной информации о клубе
 */
class CompleteClubInfo {
  constructor(clubData) {
    // Основная информация о клубе
    this.id = `club_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.name = clubData.name || '';
    this.brand = clubData.brand || clubData.name;
    this.website = clubData.website || '';
    this.description = clubData.description || '';
    
    // Физический адрес клуба и координаты
    this.clubAddress = clubData.address || '';
    this.coordinates = clubData.coordinates || null;
    
    // Контактная информация
    this.phone = clubData.phone || '';
    this.email = clubData.email || '';
    this.workingHours = clubData.workingHours || '';
    
    // Информация о кортах
    this.courtsCount = clubData.courtsCount || null;
    this.courtType = clubData.courtType || '';
    this.priceRange = clubData.priceRange || '';
    
    // Юридическая информация
    this.legalInfo = {
      inn: clubData.inn || '',
      ogrn: clubData.ogrn || '',
      kpp: clubData.kpp || '',
      legalName: clubData.legalName || '',
      legalAddress: clubData.legalAddress || '',
      okved: clubData.okved || '',
      okvedDescription: clubData.okvedDescription || '',
      managementName: clubData.managementName || '',
      managementPost: clubData.managementPost || '',
      foundedDate: clubData.foundedDate || null,
      capital: clubData.capital || null,
      employeeCount: clubData.employeeCount || null,
      organizationStatus: clubData.organizationStatus || ''
    };
    
    // Метаданные парсинга
    this.parsedAt = new Date().toISOString();
    this.dataSource = clubData.dataSource || 'website';
    this.parseErrors = clubData.parseErrors || [];
  }
  
  /**
   * Проверка полноты данных
   */
  getDataCompleteness() {
    let score = 0;
    let maxScore = 0;
    
    // Основная информация
    if (this.name) score += 10;
    maxScore += 10;
    
    if (this.clubAddress) score += 10;
    maxScore += 10;
    
    if (this.coordinates) score += 15;
    maxScore += 15;
    
    if (this.phone) score += 5;
    maxScore += 5;
    
    if (this.email) score += 5;
    maxScore += 5;
    
    // Юридическая информация
    if (this.legalInfo.inn) score += 15;
    maxScore += 15;
    
    if (this.legalInfo.legalName) score += 10;
    maxScore += 10;
    
    if (this.legalInfo.legalAddress) score += 5;
    maxScore += 5;
    
    // Информация о кортах
    if (this.courtsCount) score += 5;
    maxScore += 5;
    
    return {
      score,
      maxScore,
      percentage: Math.round((score / maxScore) * 100)
    };
  }
}

/**
 * Реальные падел клубы для тестирования
 */
const testPadelClubs = [
  {
    name: 'АРТЕН - Арена тенниса',
    brand: 'АРТЕН',
    website: 'https://artennis.ru',
    address: 'Казань, ул. Родина, 10', // Обновленный адрес
    phone: '+7 (843) 212-10-10',
    description: 'Падел, сквош и настольный теннис',
    courtsCount: 4,
    priceRange: '2500 руб/час'
  },
  {
    name: 'Padel Friends Казань',
    brand: 'Padel Friends',
    website: 'https://padelfriends.ru',
    address: 'Казань, проспект Альберта Камалеева, 27М',
    phone: '+7 (843) 212-23-23',
    description: '6 панорамных кортов Drop Shot',
    courtsCount: 6,
    courtType: 'Drop Shot'
  },
  {
    name: 'LUNDA Padel Москва - Ленинградский',
    brand: 'LUNDA Padel',
    website: 'https://lundapadel.ru',
    address: 'Москва, Ленинградский проспект, 36с33',
    phone: '+7 (800) 234-50-50',
    description: 'Премиум падел клуб',
    courtsCount: 8
  },
  {
    name: 'LUNDA Padel Москва - Кутузовский',
    brand: 'LUNDA Padel',
    website: 'https://lundapadel.ru',
    address: 'Москва, Кутузовский проспект, 36с3',
    phone: '+7 (800) 234-50-50',
    description: 'Премиум падел клуб',
    courtsCount: 6
  },
  {
    name: 'LUNDA Padel Казань',
    brand: 'LUNDA Padel',
    website: 'https://lundapadel.ru',
    address: 'Казань, ул. Сибгата Хакима, 60',
    phone: '+7 (800) 234-50-50',
    description: 'Премиум падел клуб',
    courtsCount: 4
  }
];

async function parseCompletePadelClubs() {
  const parser = new WebsiteParser();
  const results = [];
  
  try {
    console.log('🎾 Полный парсинг падел клубов с координатами...\n');
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Проверяем API ключи
    const DADATA_API_KEY = process.env.DADATA_API_KEY;
    const DADATA_SECRET = process.env.DADATA_SECRET;
    const YANDEX_API_KEY = process.env.YANDEX_GEOCODER_API_KEY;
    
    console.log('📋 Статус API ключей:');
    console.log(`  DaData: ${DADATA_API_KEY ? '✅' : '❌'}`);
    console.log(`  Яндекс Геокодер: ${YANDEX_API_KEY ? '✅' : '❌'}`);
    console.log('');
    
    // Инициализируем парсер
    await parser.init();
    
    // Обрабатываем каждый клуб
    for (let i = 0; i < testPadelClubs.length; i++) {
      const club = testPadelClubs[i];
      console.log(`[${i + 1}/${testPadelClubs.length}] ${club.name}`);
      console.log('─'.repeat(50));
      
      // Парсим сайт
      const parseResult = await parser.parseSite(club.website);
      
      const clubInfo = new CompleteClubInfo({
        ...club,
        email: parseResult?.emails?.[0] || '',
        inn: parseResult?.inn || '',
        ogrn: parseResult?.ogrn || ''
      });
      
      // Обогащаем юридическую информацию через DaData
      if (parseResult?.inn && DADATA_API_KEY && DADATA_SECRET) {
        console.log('   🔄 Обогащаем юридические данные через DaData...');
        const enrichedData = await parser.enrichWithDaData(
          parseResult.inn, 
          DADATA_API_KEY, 
          DADATA_SECRET
        );
        
        if (enrichedData) {
          clubInfo.legalInfo = {
            ...clubInfo.legalInfo,
            ...enrichedData,
            inn: parseResult.inn
          };
          console.log(`   ✅ Юр. лицо: ${enrichedData.legalName}`);
          console.log(`   📋 ИНН: ${parseResult.inn}`);
          console.log(`   📍 Юр. адрес: ${enrichedData.legalAddress}`);
        }
      } else if (parseResult?.inn) {
        console.log(`   📋 ИНН найден: ${parseResult.inn}`);
      }
      
      // Получаем координаты физического адреса клуба
      // Приоритет: Яндекс -> DaData
      let coordinates = null;
      
      if (YANDEX_API_KEY && club.address) {
        console.log('   🗺️  Получаем координаты через Яндекс...');
        coordinates = await getCoordinatesFromYandex(club.address, YANDEX_API_KEY);
        
        if (coordinates) {
          console.log(`   📍 Яндекс координаты: ${coordinates.latitude}, ${coordinates.longitude}`);
        }
      }
      
      if (!coordinates && DADATA_API_KEY && DADATA_SECRET && club.address) {
        console.log('   🗺️  Получаем координаты через DaData...');
        coordinates = await getCoordinatesFromDaData(
          club.address, 
          DADATA_API_KEY, 
          DADATA_SECRET
        );
        
        if (coordinates) {
          console.log(`   📍 DaData координаты: ${coordinates.latitude}, ${coordinates.longitude}`);
        }
      }
      
      clubInfo.coordinates = coordinates;
      
      // Оцениваем полноту данных
      const completeness = clubInfo.getDataCompleteness();
      console.log(`   📊 Полнота данных: ${completeness.percentage}% (${completeness.score}/${completeness.maxScore})`);
      
      // Добавляем email если найден
      if (parseResult?.emails?.length > 0) {
        clubInfo.email = parseResult.emails[0];
        console.log(`   📧 Email: ${clubInfo.email}`);
      }
      
      results.push(clubInfo);
      console.log('');
      
      // Задержка между запросами
      if (i < testPadelClubs.length - 1) {
        await parser.delay(2000);
      }
    }
    
    // Закрываем браузер
    await parser.close();
    
    // Сохраняем результаты
    const timestamp = new Date().toISOString().slice(0, 10);
    const outputDir = path.join(__dirname, '..', 'padel-data-complete');
    const outputFile = path.join(outputDir, `padel-clubs-complete-${timestamp}.json`);
    
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(outputFile, JSON.stringify(results, null, 2), 'utf8');
    
    // Выводим итоговую статистику
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log('─'.repeat(50));
    console.log(`Всего клубов обработано: ${results.length}`);
    console.log(`С координатами: ${results.filter(r => r.coordinates).length}`);
    console.log(`  - через Яндекс: ${results.filter(r => r.coordinates?.source === 'yandex').length}`);
    console.log(`  - через DaData: ${results.filter(r => r.coordinates?.source === 'dadata').length}`);
    console.log(`С ИНН: ${results.filter(r => r.legalInfo.inn).length}`);
    console.log(`С юр. названием: ${results.filter(r => r.legalInfo.legalName).length}`);
    console.log(`С email: ${results.filter(r => r.email).length}`);
    
    // Статистика по полноте данных
    const avgCompleteness = results.reduce((sum, club) => 
      sum + club.getDataCompleteness().percentage, 0) / results.length;
    console.log(`\nСредняя полнота данных: ${Math.round(avgCompleteness)}%`);
    
    // Группировка по брендам
    const brandStats = {};
    results.forEach(club => {
      if (!brandStats[club.brand]) {
        brandStats[club.brand] = [];
      }
      brandStats[club.brand].push({
        name: club.name,
        city: club.clubAddress.split(',')[0],
        completeness: club.getDataCompleteness().percentage
      });
    });
    
    console.log('\n🏢 СЕТЕВЫЕ БРЕНДЫ:');
    console.log('─'.repeat(50));
    Object.entries(brandStats).forEach(([brand, clubs]) => {
      console.log(`\n${brand}: ${clubs.length} локаций`);
      clubs.forEach(club => {
        console.log(`  - ${club.city} (полнота: ${club.completeness}%)`);
      });
    });
    
    console.log('\n✅ Результаты сохранены в: ' + outputFile);
    
  } catch (error) {
    console.error('\n❌ Критическая ошибка:', error.message);
  } finally {
    await parser.close();
  }
}

// Запускаем парсинг
parseCompletePadelClubs().catch(console.error);