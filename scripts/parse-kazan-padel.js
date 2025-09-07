#!/usr/bin/env node

/**
 * Парсинг падел клубов Казани с извлечением юридической информации
 * и обогащением через DaData API
 */

import WebsiteParser from './website-parser.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

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
    address: 'Казань',
    phone: '+7 (800) 234-50-50',
    description: 'Крупнейшая сеть падел клубов'
  },
  {
    name: 'Padel Time',
    website: 'https://padeltime.ru',
    address: 'Санкт-Петербург, поселок Репино',
    phone: '+7 (812) 670-00-00',
    description: 'Сеть падел клубов'
  },
  {
    name: 'Федерация Падел России',
    website: 'https://federationpadel.ru',
    address: 'Москва',
    phone: '+7 (495) 000-00-00',
    description: 'Официальная федерация падела'
  }
];

async function parseKazanPadelClubs() {
  const parser = new WebsiteParser();
  const results = [];
  
  try {
    console.log('🎾 Начинаем парсинг падел клубов Казани...\n');
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Проверяем наличие API ключей DaData
    const DADATA_API_KEY = process.env.DADATA_API_KEY;
    const DADATA_SECRET = process.env.DADATA_SECRET;
    
    if (!DADATA_API_KEY || !DADATA_SECRET) {
      console.log('⚠️  Внимание: API ключи DaData не найдены в .env файле');
      console.log('   Будет выполнен только парсинг сайтов без обогащения данных\n');
    } else {
      console.log('✅ API ключи DaData найдены, будет выполнено обогащение данных\n');
    }
    
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
          parseError: parseResult.error
        };
        
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
            console.log(`   📍 Юр. адрес: ${enrichedData.legalAddress}`);
            if (enrichedData.managementName) {
              console.log(`   👤 Руководитель: ${enrichedData.managementName}`);
            }
          }
        }
        
        results.push(clubData);
      } else {
        results.push({
          ...club,
          parsedData: null,
          enrichedData: null,
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
    const outputFile = path.join(outputDir, `kazan-padel-clubs-${timestamp}.json`);
    
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(outputFile, JSON.stringify(results, null, 2), 'utf8');
    
    // Выводим итоговую статистику
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log('─'.repeat(50));
    console.log(`Всего клубов обработано: ${results.length}`);
    console.log(`Найдено ИНН: ${results.filter(r => r.parsedData?.inn).length}`);
    console.log(`Найдено ОГРН: ${results.filter(r => r.parsedData?.ogrn).length}`);
    console.log(`Найдено email: ${results.filter(r => r.parsedData?.emails?.length > 0).length}`);
    console.log(`Обогащено через DaData: ${results.filter(r => r.enrichedData).length}`);
    console.log(`С ошибками парсинга: ${results.filter(r => r.parseError).length}`);
    console.log('');
    console.log(`✅ Результаты сохранены в: ${outputFile}`);
    
    // Выводим сводку по найденным данным
    console.log('\n📋 НАЙДЕННАЯ ИНФОРМАЦИЯ:');
    console.log('─'.repeat(50));
    
    results.forEach(club => {
      if (club.parsedData?.inn || club.enrichedData) {
        console.log(`\n${club.name}:`);
        if (club.parsedData?.inn) {
          console.log(`  ИНН: ${club.parsedData.inn}`);
        }
        if (club.enrichedData?.legalName) {
          console.log(`  Юр. название: ${club.enrichedData.legalName}`);
        }
        if (club.enrichedData?.legalAddress) {
          console.log(`  Юр. адрес: ${club.enrichedData.legalAddress}`);
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