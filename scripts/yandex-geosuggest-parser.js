#!/usr/bin/env node

/**
 * Парсер падел клубов через Яндекс Геосаджест API
 * Ищет организации по названию и категории в разных городах
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

/**
 * Поиск организаций через Яндекс Геосаджест
 */
async function searchYandexGeosuggest(query, city, apiKey) {
  if (!apiKey) {
    throw new Error('Яндекс Геосаджест API ключ не найден');
  }

  try {
    const url = 'https://suggest-maps.yandex.ru/v1/suggest';
    
    const response = await axios.get(url, {
      params: {
        apikey: apiKey,
        text: query,
        ll: `${city.center.lng},${city.center.lat}`, // центр поиска: долгота,широта
        spn: '0.3,0.3', // размер области поиска (около 30км)
        bbox: city.bbox, // дополнительно ограничиваем bbox
        types: 'biz',
        results: 20,
        lang: 'ru_RU',
        print_address: 1,
        strict_bounds: 1, // строгое ограничение по границам
        attrs: 'uri' // только базовый атрибут
      },
      headers: {
        'Accept': 'application/json'
      }
    });

    if (response.data && response.data.results) {
      return response.data.results.map(item => {
        // Для отладки - выводим первый результат полностью
        if (response.data.results.indexOf(item) === 0) {
          console.log('       🔍 DEBUG полный объект:', JSON.stringify(item, null, 2));
        }
        
        return {
          title: item.title?.text || '',
          subtitle: item.subtitle?.text || '',
          address: item.address?.formatted_address || '',
          tags: item.tags || [],
          distance: item.distance?.value || null,
          uri: item.uri || '',
          type: item.type || '',
          // Пытаемся извлечь дополнительные поля если они есть
          phones: item.phones || [],
          hours: item.hours || null,
          website: item.website || null,
          rubrics: item.rubrics || [],
          description: item.description || null
        };
      });
    }

    return [];
  } catch (error) {
    console.error(`Ошибка Геосаджест API: ${error.message}`);
    if (error.response) {
      console.error('Ответ сервера:', error.response.data);
    }
    return [];
  }
}

/**
 * Получение координат через Яндекс Геокодер
 */
async function getCoordinatesFromGeocoder(address, apiKey) {
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
        precision: geoObject.metaDataProperty.GeocoderMetaData.precision
      };
    }
  } catch (error) {
    console.error(`Ошибка геокодирования: ${error.message}`);
  }

  return null;
}

/**
 * Города для поиска с их bbox (ограничивающие координаты)
 * Пока ограничиваемся только Казанью
 */
const cities = [
  {
    name: 'Казань',
    bbox: '48.802752,55.625578~49.448442,55.913057',
    center: { lat: 55.796127, lng: 49.106405 }
  }
  // Для расширения добавить другие города:
  // {
  //   name: 'Москва',
  //   bbox: '36.803267,55.142221~38.234218,56.021276',
  //   center: { lat: 55.755826, lng: 37.617300 }
  // },
  // {
  //   name: 'Санкт-Петербург',
  //   bbox: '29.438891,59.684476~31.261872,60.241194',
  //   center: { lat: 59.931226, lng: 30.359909 }
  // }
];

/**
 * Ключевые слова для поиска падел клубов
 */
const searchQueries = [
  'падел',
  'padel',
  'падел клуб',
  'padel club',
  'падел корт',
  'теннис падел',
  'спортивный клуб падел'
];

/**
 * Основная функция парсинга
 */
async function parsePadelClubsFromYandex() {
  console.log('🎾 Парсинг падел клубов через Яндекс Геосаджест...\n');
  console.log('═══════════════════════════════════════════════════════\n');

  // Проверяем API ключи
  const GEOSUGGEST_KEY = process.env.YANDEX_GEOSUGGEST_API_KEY;
  const GEOCODER_KEY = process.env.YANDEX_GEOCODER_API_KEY;
  const DADATA_KEY = process.env.DADATA_API_KEY;
  const DADATA_SECRET = process.env.DADATA_SECRET;

  if (!GEOSUGGEST_KEY) {
    console.error('❌ Яндекс Геосаджест API ключ не найден в .env');
    return;
  }

  console.log('📋 Статус API ключей:');
  console.log(`  Геосаджест: ${GEOSUGGEST_KEY ? '✅' : '❌'}`);
  console.log(`  Геокодер: ${GEOCODER_KEY ? '✅' : '❌'}`);
  console.log(`  DaData: ${DADATA_KEY ? '✅' : '❌'}`);
  console.log('');

  const allClubs = [];
  const uniqueClubs = new Map(); // Для дедупликации по названию+адресу

  // Поиск по каждому городу
  for (const city of cities) {
    console.log(`\n🏙️  ${city.name}`);
    console.log('─'.repeat(50));

    let cityClubsCount = 0;

    // Поиск по каждому ключевому слову
    for (const query of searchQueries) {
      console.log(`  🔍 Поиск: "${query}"`);
      
      const results = await searchYandexGeosuggest(
        query,
        city,
        GEOSUGGEST_KEY
      );

      if (results.length > 0) {
        console.log(`     Найдено: ${results.length} результатов`);
        
        // Фильтруем и обрабатываем результаты
        for (const result of results) {
          // Для отладки выводим первые несколько результатов
          if (results.indexOf(result) < 3) {
            console.log(`       DEBUG: "${result.title}" | Адрес: "${result.address}" | Subtitle: "${result.subtitle}"`);
          }
          
          // Раз мы уже ограничили поиск координатами - все результаты из Казани
          // Проверяем только, что это действительно спортивный объект
          const isRelevant = 
            result.title.toLowerCase().includes('падел') ||
            result.title.toLowerCase().includes('padel') ||
            result.title.toLowerCase().includes('артен') || // АРТЕН - известный падел клуб
            result.title.toLowerCase().includes('теннис') ||
            result.title.toLowerCase().includes('спорт') ||
            result.subtitle?.toLowerCase().includes('падел-клуб') || // проверяем subtitle
            result.tags.some(tag => 
              tag.includes('спорт') || 
              tag.includes('фитнес') || 
              tag.includes('падел') ||
              tag.includes('теннис')
            );

          if (isRelevant) {
            const clubKey = `${result.title}_${result.address}`;
            
            // Проверяем на дубликаты
            if (!uniqueClubs.has(clubKey)) {
              const club = {
                name: result.title,
                city: city.name,
                address: result.address || `${city.name}, ${result.subtitle}`,
                tags: result.tags,
                uri: result.uri,
                searchQuery: query,
                coordinates: null,
                // Дополнительные поля
                phones: result.phones || [],
                hours: result.hours || null,
                website: result.website || null,
                rubrics: result.rubrics || [],
                description: result.subtitle || '' // subtitle часто содержит описание
              };

              // Получаем координаты если есть геокодер
              if (GEOCODER_KEY && club.address) {
                // Добавляем город к адресу для более точного геокодирования
                const fullAddress = club.address.includes(city.name) 
                  ? club.address 
                  : `${city.name}, ${club.address}`;
                
                const coords = await getCoordinatesFromGeocoder(
                  fullAddress,
                  GEOCODER_KEY
                );
                
                if (coords) {
                  // Проверяем, что координаты в пределах города
                  const [minLng, minLat, maxLng, maxLat] = city.bbox.split(/[,~]/).map(Number);
                  const isInCity = 
                    coords.latitude >= minLat && 
                    coords.latitude <= maxLat &&
                    coords.longitude >= minLng && 
                    coords.longitude <= maxLng;
                  
                  if (isInCity) {
                    club.coordinates = {
                      latitude: coords.latitude,
                      longitude: coords.longitude
                    };
                  } else {
                    console.log(`        ⚠️ Координаты вне границ города: ${coords.latitude}, ${coords.longitude}`);
                  }
                }
              }

              uniqueClubs.set(clubKey, club);
              cityClubsCount++;
              
              console.log(`     ✅ ${result.title}`);
              if (result.subtitle) {
                console.log(`        📍 ${result.subtitle}`);
              }
            }
          }
        }
      }

      // Задержка между запросами
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`  📊 Итого в ${city.name}: ${cityClubsCount} клубов`);
  }

  // Конвертируем Map в массив
  const finalClubs = Array.from(uniqueClubs.values());

  // Сохраняем результаты
  const timestamp = new Date().toISOString().slice(0, 10);
  const outputDir = path.join(__dirname, '..', 'padel-data-yandex');
  const outputFile = path.join(outputDir, `yandex-padel-clubs-${timestamp}.json`);

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputFile, JSON.stringify(finalClubs, null, 2), 'utf8');

  // Выводим итоговую статистику
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
  console.log('─'.repeat(50));
  console.log(`Всего уникальных клубов: ${finalClubs.length}`);
  console.log(`С координатами: ${finalClubs.filter(c => c.coordinates).length}`);
  
  // Статистика по городам
  const citiesStats = {};
  finalClubs.forEach(club => {
    if (!citiesStats[club.city]) {
      citiesStats[club.city] = 0;
    }
    citiesStats[club.city]++;
  });

  console.log('\n📍 Распределение по городам:');
  Object.entries(citiesStats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([city, count]) => {
      console.log(`  ${city}: ${count} клубов`);
    });

  console.log(`\n✅ Результаты сохранены в: ${outputFile}`);

  // Примеры найденных клубов
  console.log('\n🏆 Примеры найденных клубов:');
  console.log('─'.repeat(50));
  finalClubs.slice(0, 5).forEach(club => {
    console.log(`\n${club.name}`);
    console.log(`  📍 ${club.address}`);
    if (club.coordinates) {
      console.log(`  🎯 Координаты: ${club.coordinates.latitude}, ${club.coordinates.longitude}`);
    }
    if (club.tags.length > 0) {
      console.log(`  🏷️  Теги: ${club.tags.join(', ')}`);
    }
  });
}

// Запускаем парсер
parsePadelClubsFromYandex().catch(console.error);