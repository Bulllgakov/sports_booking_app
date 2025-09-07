#!/usr/bin/env node

/**
 * Парсинг падел клубов Казани с извлечением юридической информации,
 * обогащением через DaData API и получением координат через Google Maps
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

// Падел клубы Казани (реальные клубы)
const kazanPadelClubs = [
  {
    name: 'Padel Friends Казань',
    website: 'https://padelfriends.ru',
    address: 'Казань, проспект Альберта Камалеева, 27М',
    phone: '+7 (843) 212-23-23',
    description: '6 панорамных кортов Drop Shot'
  },
  {
    name: 'АРТЕН - Арена тенниса',
    website: 'https://artennis.ru',
    address: 'Казань, ул. Адоратского, 34',
    phone: '+7 (843) 212-10-10',
    description: 'Падел, сквош и настольный теннис'
  },
  {
    name: 'LUNDA Padel Казань',
    website: 'https://lundapadel.ru',
    address: 'Казань, ул. Сибгата Хакима, 60',
    phone: '+7 (800) 234-50-50',
    description: 'Крупнейшая сеть падел клубов'
  },
  {
    name: 'Padel Time',
    website: 'https://padeltime.ru',
    address: 'Санкт-Петербург, поселок Репино, Приморское шоссе, 394',
    phone: '+7 (812) 670-00-00',
    description: 'Сеть падел клубов'
  },
  {
    name: 'X-Padel Kazan',
    website: 'https://x-padel.ru',
    address: 'Казань, ул. Чистопольская, 19г',
    phone: '+7 (843) 207-07-71',
    description: 'Падел корты в Казани'
  }
];

/**
 * Получение координат через DaData API
 */
async function getCoordinatesFromDaData(address, apiKey, secret) {
  if (!apiKey || !secret) {
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
 * Получение координат через Google Maps Geocoding API
 */
async function getCoordinatesFromGoogle(address, apiKey) {
  if (!apiKey) {
    console.log('   ⚠️ Google Maps API ключ не найден');
    return null;
  }

  try {
    const url = 'https://maps.googleapis.com/maps/api/geocode/json';
    const response = await axios.get(url, {
      params: {
        address: address,
        key: apiKey,
        language: 'ru',
        region: 'ru'
      }
    });

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      const formattedAddress = response.data.results[0].formatted_address;
      
      return {
        latitude: location.lat,
        longitude: location.lng,
        formattedAddress: formattedAddress,
        googlePlaceId: response.data.results[0].place_id
      };
    } else if (response.data.status === 'ZERO_RESULTS') {
      console.log('   ⚠️ Google Maps: адрес не найден');
    } else {
      console.log(`   ⚠️ Google Maps API статус: ${response.data.status}`);
    }
  } catch (error) {
    console.log(`   ⚠️ Ошибка Google Maps: ${error.message}`);
  }

  return null;
}

/**
 * Извлечение координат из кода сайта (если есть)
 */
function extractCoordinatesFromWebsite(content) {
  const patterns = [
    // Google Maps embed URLs
    /!1d([-\d.]+)!2d([-\d.]+)/g,
    // Яндекс карты
    /ll=([-\d.]+),([-\d.]+)/g,
    // JSON-LD структурированные данные
    /"latitude":\s*([-\d.]+)[^}]*"longitude":\s*([-\d.]+)/g,
    // Обычные координаты в тексте
    /(?:lat|latitude)[:\s]*([-\d.]+)[,\s]+(?:lng|lon|longitude)[:\s]*([-\d.]+)/gi,
    // Координаты в data атрибутах
    /data-lat[itude]*="([-\d.]+)"[^>]*data-l[o]*ng[itude]*="([-\d.]+)"/gi,
  ];

  for (const pattern of patterns) {
    const matches = [...content.matchAll(pattern)];
    if (matches.length > 0) {
      const match = matches[0];
      let lat, lng;
      
      if (pattern.source.includes('!1d')) {
        // Google Maps format (lat и lng поменяны местами)
        lng = parseFloat(match[1]);
        lat = parseFloat(match[2]);
      } else if (pattern.source.includes('ll=')) {
        // Яндекс формат
        lng = parseFloat(match[1]);
        lat = parseFloat(match[2]);
      } else {
        // Стандартный формат
        lat = parseFloat(match[1]);
        lng = parseFloat(match[2]);
      }
      
      // Проверяем валидность координат для Казани (примерный диапазон)
      if (lat >= 55 && lat <= 57 && lng >= 48 && lng <= 50) {
        return { latitude: lat, longitude: lng, source: 'website' };
      }
    }
  }
  
  return null;
}

async function parseKazanPadelClubs() {
  const parser = new WebsiteParser();
  const results = [];
  
  try {
    console.log('🎾 Начинаем парсинг падел клубов Казани с координатами...\n');
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Проверяем наличие API ключей
    const DADATA_API_KEY = process.env.DADATA_API_KEY;
    const DADATA_SECRET = process.env.DADATA_SECRET;
    const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
    
    if (!DADATA_API_KEY || !DADATA_SECRET) {
      console.log('⚠️  DaData API ключи не найдены в .env файле');
    } else {
      console.log('✅ DaData API ключи найдены');
    }
    
    if (!GOOGLE_API_KEY) {
      console.log('⚠️  Google Maps API ключ не найден в .env файле');
    } else {
      console.log('✅ Google Maps API ключ найден');
    }
    console.log('');
    
    // Инициализируем парсер
    await parser.init();
    
    // Обрабатываем каждый клуб
    for (let i = 0; i < kazanPadelClubs.length; i++) {
      const club = kazanPadelClubs[i];
      console.log(`[${i + 1}/${kazanPadelClubs.length}] ${club.name}`);
      console.log('─'.repeat(50));
      
      // Парсим сайт
      const parseResult = await parser.parseSite(club.website);
      
      if (parseResult) {
        const clubData = {
          ...club,
          parsedData: {
            inn: parseResult.inn || '',
            ogrn: parseResult.ogrn || '',
            emails: parseResult.emails || [],
            companyNames: parseResult.companyNames || [],
            foundOnPages: parseResult.foundPages || []
          },
          enrichedData: null,
          coordinates: null,
          parseError: parseResult.error
        };
        
        // Пытаемся извлечь координаты из сайта
        if (parseResult) {
          const websiteCoords = extractCoordinatesFromWebsite(parseResult.content || '');
          if (websiteCoords) {
            clubData.coordinates = websiteCoords;
            console.log(`   📍 Координаты с сайта: ${websiteCoords.latitude}, ${websiteCoords.longitude}`);
          }
        }
        
        // Если координаты не найдены на сайте, используем Google Maps API
        if (!clubData.coordinates && GOOGLE_API_KEY && club.address) {
          console.log('   🗺️  Получаем координаты через Google Maps...');
          const googleCoords = await getCoordinatesFromGoogle(club.address, GOOGLE_API_KEY);
          if (googleCoords) {
            clubData.coordinates = googleCoords;
            console.log(`   📍 Координаты Google: ${googleCoords.latitude}, ${googleCoords.longitude}`);
          }
        }
        
        // Если нашли ИНН и есть API ключи, обогащаем через DaData
        if (parseResult.inn && DADATA_API_KEY && DADATA_SECRET) {
          console.log('   🔄 Обогащаем данные через DaData...');
          const enrichedData = await parser.enrichWithDaData(
            parseResult.inn, 
            DADATA_API_KEY, 
            DADATA_SECRET
          );
          
          if (enrichedData) {
            clubData.enrichedData = enrichedData;
            console.log('   ✅ Данные успешно обогащены');
            console.log(`   📋 Юр. название: ${enrichedData.legalName}`);
          }
        }
        
        // Если координаты еще не найдены и есть DaData ключи, используем DaData геокодинг
        if (!clubData.coordinates && DADATA_API_KEY && DADATA_SECRET && club.address) {
          console.log('   🗺️  Получаем координаты через DaData...');
          const dadataCoords = await getCoordinatesFromDaData(club.address, DADATA_API_KEY, DADATA_SECRET);
          if (dadataCoords) {
            clubData.coordinates = dadataCoords;
            console.log(`   📍 Координаты DaData: ${dadataCoords.latitude}, ${dadataCoords.longitude}`);
          }
        }
        
        results.push(clubData);
      } else {
        results.push({
          ...club,
          parsedData: null,
          enrichedData: null,
          coordinates: null,
          parseError: 'Failed to parse website'
        });
      }
      
      console.log('');
      
      // Задержка между клубами
      if (i < kazanPadelClubs.length - 1) {
        await parser.delay(2000);
      }
    }
    
    // Закрываем браузер
    await parser.close();
    
    // Сохраняем результаты
    const timestamp = new Date().toISOString().slice(0, 10);
    const outputDir = path.join(__dirname, '..', 'padel-data-kazan');
    const outputFile = path.join(outputDir, `kazan-padel-clubs-coords-${timestamp}.json`);
    
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(outputFile, JSON.stringify(results, null, 2), 'utf8');
    
    // Выводим итоговую статистику
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log('─'.repeat(50));
    console.log(`Всего клубов обработано: ${results.length}`);
    console.log(`Найдено ИНН: ${results.filter(r => r.parsedData?.inn).length}`);
    console.log(`Найдено координат: ${results.filter(r => r.coordinates).length}`);
    console.log(`  - с сайта: ${results.filter(r => r.coordinates?.source === 'website').length}`);
    console.log(`  - через Google Maps: ${results.filter(r => r.coordinates && r.coordinates.source !== 'website').length}`);
    console.log(`Обогащено через DaData: ${results.filter(r => r.enrichedData).length}`);
    console.log(`С ошибками парсинга: ${results.filter(r => r.parseError).length}`);
    console.log('');
    console.log(`✅ Результаты сохранены в: ${outputFile}`);
    
    // Выводим сводку по найденным данным
    console.log('\n📋 НАЙДЕННАЯ ИНФОРМАЦИЯ:');
    console.log('─'.repeat(50));
    
    results.forEach(club => {
      if (club.parsedData?.inn || club.enrichedData || club.coordinates) {
        console.log(`\n${club.name}:`);
        if (club.parsedData?.inn) {
          console.log(`  ИНН: ${club.parsedData.inn}`);
        }
        if (club.enrichedData?.legalName) {
          console.log(`  Юр. название: ${club.enrichedData.legalName}`);
        }
        if (club.coordinates) {
          console.log(`  📍 Координаты: ${club.coordinates.latitude}, ${club.coordinates.longitude}`);
          if (club.coordinates.formattedAddress) {
            console.log(`  📍 Адрес Google: ${club.coordinates.formattedAddress}`);
          }
        }
        if (club.parsedData?.emails?.length > 0) {
          console.log(`  Email: ${club.parsedData.emails.join(', ')}`);
        }
      }
    });
    
  } catch (error) {
    console.error('\n❌ Критическая ошибка:', error.message);
  } finally {
    await parser.close();
  }
}

// Запускаем парсинг
parseKazanPadelClubs().catch(console.error);