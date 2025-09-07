#!/usr/bin/env node

/**
 * Структурированный парсер падел клубов
 * Разделяет юридическую информацию и физические локации клубов
 * Поддерживает сетевые клубы с несколькими филиалами
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
 * Структура данных для правильного разделения
 * юридических лиц и физических клубов
 */
class PadelClubData {
  constructor() {
    // Юридические лица (уникальные по ИНН)
    this.legalEntities = new Map(); // ИНН -> LegalEntity
    
    // Физические клубы
    this.clubs = [];
  }
  
  /**
   * Добавление или обновление юридического лица
   */
  addLegalEntity(inn, data) {
    if (!inn) return null;
    
    if (!this.legalEntities.has(inn)) {
      this.legalEntities.set(inn, {
        inn,
        ogrn: data.ogrn || '',
        legalName: data.legalName || '',
        legalAddress: data.legalAddress || '',
        kpp: data.kpp || '',
        okved: data.okved || '',
        managementName: data.managementName || '',
        managementPost: data.managementPost || '',
        foundedDate: data.foundedDate || null,
        capital: data.capital || null,
        phones: data.phones || [],
        emails: data.emails || [],
        website: data.website || '',
        clubs: [] // Список ID клубов этого юр. лица
      });
    }
    
    return this.legalEntities.get(inn);
  }
  
  /**
   * Добавление физического клуба
   */
  addClub(clubData) {
    const club = {
      id: `club_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: clubData.name,
      brand: clubData.brand || clubData.name, // Бренд/сеть
      address: clubData.address,
      coordinates: clubData.coordinates || null,
      phone: clubData.phone || '',
      email: clubData.email || '',
      website: clubData.website || '',
      description: clubData.description || '',
      workingHours: clubData.workingHours || '',
      courtsCount: clubData.courtsCount || null,
      courtType: clubData.courtType || '',
      inn: clubData.inn || '', // Связь с юр. лицом
      parsedAt: new Date().toISOString()
    };
    
    this.clubs.push(club);
    
    // Связываем с юридическим лицом
    if (club.inn && this.legalEntities.has(club.inn)) {
      this.legalEntities.get(club.inn).clubs.push(club.id);
    }
    
    return club;
  }
  
  /**
   * Экспорт в JSON
   */
  toJSON() {
    return {
      summary: {
        totalLegalEntities: this.legalEntities.size,
        totalClubs: this.clubs.length,
        parsedAt: new Date().toISOString()
      },
      legalEntities: Array.from(this.legalEntities.values()),
      clubs: this.clubs
    };
  }
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
 * Поиск всех филиалов компании через DaData
 */
async function findCompanyBranches(inn, apiKey, secret) {
  if (!inn || !apiKey || !secret) {
    return [];
  }

  try {
    const url = 'https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party';
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Token ${apiKey}`,
      'X-Secret': secret
    };

    const response = await axios.post(url, {
      query: inn,
      branch_type: 'BRANCH' // Ищем филиалы
    }, { headers });

    const branches = [];
    
    if (response.data.suggestions) {
      for (const suggestion of response.data.suggestions) {
        const data = suggestion.data;
        if (data.branch_type === 'BRANCH' || data.type === 'BRANCH') {
          branches.push({
            name: data.name?.short || data.name?.full || '',
            address: data.address?.value || '',
            kpp: data.kpp || '',
            manager: data.management?.name || ''
          });
        }
      }
    }
    
    return branches;
  } catch (error) {
    console.log(`   ⚠️ Ошибка поиска филиалов: ${error.message}`);
  }

  return [];
}

/**
 * Пример данных падел клубов для парсинга
 */
const padelClubsData = [
  {
    name: 'Padel Friends Казань',
    brand: 'Padel Friends',
    website: 'https://padelfriends.ru',
    address: 'Казань, проспект Альберта Камалеева, 27М',
    phone: '+7 (843) 212-23-23',
    description: '6 панорамных кортов Drop Shot'
  },
  {
    name: 'LUNDA Padel Москва - Ленинградский',
    brand: 'LUNDA Padel',
    website: 'https://lundapadel.ru',
    address: 'Москва, Ленинградский проспект, 36с33',
    phone: '+7 (800) 234-50-50',
    description: 'Крупнейшая сеть падел клубов'
  },
  {
    name: 'LUNDA Padel Москва - Кутузовский',
    brand: 'LUNDA Padel', 
    website: 'https://lundapadel.ru',
    address: 'Москва, Кутузовский проспект, 36',
    phone: '+7 (800) 234-50-50',
    description: 'Крупнейшая сеть падел клубов'
  },
  {
    name: 'LUNDA Padel Санкт-Петербург',
    brand: 'LUNDA Padel',
    website: 'https://lundapadel.ru', 
    address: 'Санкт-Петербург, Крестовский остров',
    phone: '+7 (800) 234-50-50',
    description: 'Крупнейшая сеть падел клубов'
  },
  {
    name: 'АРТЕН - Арена тенниса',
    brand: 'АРТЕН',
    website: 'https://artennis.ru',
    address: 'Казань, ул. Адоратского, 34',
    phone: '+7 (843) 212-10-10',
    description: 'Падел, сквош и настольный теннис'
  }
];

async function parseStructuredPadelClubs() {
  const parser = new WebsiteParser();
  const clubData = new PadelClubData();
  
  try {
    console.log('🎾 Структурированный парсинг падел клубов...\n');
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Проверяем API ключи
    const DADATA_API_KEY = process.env.DADATA_API_KEY;
    const DADATA_SECRET = process.env.DADATA_SECRET;
    
    if (!DADATA_API_KEY || !DADATA_SECRET) {
      console.log('⚠️  DaData API ключи не найдены в .env файле\n');
    } else {
      console.log('✅ DaData API ключи найдены\n');
    }
    
    // Инициализируем парсер
    await parser.init();
    
    // Обрабатываем каждый клуб
    for (let i = 0; i < padelClubsData.length; i++) {
      const club = padelClubsData[i];
      console.log(`[${i + 1}/${padelClubsData.length}] ${club.name}`);
      console.log('─'.repeat(50));
      
      // Парсим сайт
      const parseResult = await parser.parseSite(club.website);
      
      if (parseResult && parseResult.inn) {
        // Обогащаем данные юридического лица через DaData
        if (DADATA_API_KEY && DADATA_SECRET) {
          console.log('   🔄 Обогащаем данные юр. лица через DaData...');
          const enrichedData = await parser.enrichWithDaData(
            parseResult.inn, 
            DADATA_API_KEY, 
            DADATA_SECRET
          );
          
          if (enrichedData) {
            // Добавляем юридическое лицо
            const legalEntity = clubData.addLegalEntity(parseResult.inn, {
              ...enrichedData,
              website: club.website,
              emails: parseResult.emails || []
            });
            
            console.log(`   ✅ Юр. лицо: ${enrichedData.legalName}`);
            console.log(`   📋 ИНН: ${parseResult.inn}`);
            console.log(`   📍 Юр. адрес: ${enrichedData.legalAddress}`);
            
            // Проверяем филиалы
            console.log('   🔍 Поиск филиалов...');
            const branches = await findCompanyBranches(
              parseResult.inn,
              DADATA_API_KEY,
              DADATA_SECRET
            );
            
            if (branches.length > 0) {
              console.log(`   📌 Найдено филиалов: ${branches.length}`);
              branches.forEach(branch => {
                console.log(`      - ${branch.name}: ${branch.address}`);
              });
            }
          }
        }
      }
      
      // Получаем координаты физического адреса клуба
      let coordinates = null;
      if (DADATA_API_KEY && DADATA_SECRET && club.address) {
        console.log('   🗺️  Получаем координаты клуба...');
        coordinates = await getCoordinatesFromDaData(
          club.address, 
          DADATA_API_KEY, 
          DADATA_SECRET
        );
        
        if (coordinates) {
          console.log(`   📍 Координаты: ${coordinates.latitude}, ${coordinates.longitude}`);
        }
      }
      
      // Добавляем физический клуб
      const addedClub = clubData.addClub({
        ...club,
        inn: parseResult?.inn || '',
        email: parseResult?.emails?.[0] || '',
        coordinates: coordinates
      });
      
      console.log(`   ✅ Клуб добавлен: ${addedClub.id}`);
      console.log('');
      
      // Задержка между запросами
      if (i < padelClubsData.length - 1) {
        await parser.delay(2000);
      }
    }
    
    // Закрываем браузер
    await parser.close();
    
    // Сохраняем результаты
    const timestamp = new Date().toISOString().slice(0, 10);
    const outputDir = path.join(__dirname, '..', 'padel-data-structured');
    const outputFile = path.join(outputDir, `padel-clubs-structured-${timestamp}.json`);
    
    await fs.mkdir(outputDir, { recursive: true });
    
    const jsonData = clubData.toJSON();
    await fs.writeFile(outputFile, JSON.stringify(jsonData, null, 2), 'utf8');
    
    // Выводим итоговую статистику
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log('─'.repeat(50));
    console.log(`Юридических лиц найдено: ${jsonData.summary.totalLegalEntities}`);
    console.log(`Физических клубов обработано: ${jsonData.summary.totalClubs}`);
    console.log('');
    
    // Статистика по юр. лицам
    console.log('📋 ЮРИДИЧЕСКИЕ ЛИЦА:');
    console.log('─'.repeat(50));
    jsonData.legalEntities.forEach(entity => {
      console.log(`\n${entity.legalName || 'Неизвестно'}:`);
      console.log(`  ИНН: ${entity.inn}`);
      console.log(`  Юр. адрес: ${entity.legalAddress}`);
      console.log(`  Клубов: ${entity.clubs.length}`);
    });
    
    // Статистика по брендам
    const brandStats = {};
    jsonData.clubs.forEach(club => {
      if (!brandStats[club.brand]) {
        brandStats[club.brand] = {
          count: 0,
          locations: []
        };
      }
      brandStats[club.brand].count++;
      brandStats[club.brand].locations.push(club.address.split(',')[0]);
    });
    
    console.log('\n🏢 СЕТЕВЫЕ БРЕНДЫ:');
    console.log('─'.repeat(50));
    Object.entries(brandStats).forEach(([brand, stats]) => {
      console.log(`\n${brand}: ${stats.count} локаций`);
      stats.locations.forEach(loc => console.log(`  - ${loc}`));
    });
    
    console.log('\n✅ Результаты сохранены в: ' + outputFile);
    
  } catch (error) {
    console.error('\n❌ Критическая ошибка:', error.message);
  } finally {
    await parser.close();
  }
}

// Запускаем парсинг
parseStructuredPadelClubs().catch(console.error);