#!/usr/bin/env node

/**
 * Тестовый парсер - только Москва
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PadelTestParser {
  constructor() {
    this.browser = null;
    this.outputDir = path.join(__dirname, '../padel-data-test');
  }

  async init() {
    await fs.mkdir(this.outputDir, { recursive: true });
    
    console.log('🚀 Запускаем браузер...');
    this.browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: [
        '--start-maximized',
        '--disable-blink-features=AutomationControlled'
      ]
    });
  }

  async parseYandexMoscow() {
    const page = await this.browser.newPage();
    const clubs = [];
    
    try {
      const url = 'https://yandex.ru/maps/moscow/search/падел%20клуб/';
      console.log('🔍 Ищем падел клубы в Москве на Яндекс.Картах...');
      
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      await this.delay(3000);
      
      // Ждем загрузки результатов
      await page.waitForSelector('.search-snippet-view', { timeout: 10000 }).catch(() => {
        console.log('⚠️  Результаты поиска не найдены');
      });
      
      // Прокручиваем для загрузки всех результатов
      console.log('📜 Загружаем все результаты...');
      for (let i = 0; i < 3; i++) {
        await page.evaluate(() => {
          const searchResults = document.querySelector('.search-list-view__list');
          if (searchResults) searchResults.scrollTop = searchResults.scrollHeight;
        });
        await this.delay(2000);
      }
      
      // Собираем базовую информацию
      const searchResults = await page.evaluate(() => {
        const results = [];
        const items = document.querySelectorAll('.search-snippet-view');
        
        items.forEach((item, index) => {
          try {
            const name = item.querySelector('.search-business-snippet-view__title')?.textContent?.trim();
            const address = item.querySelector('.search-business-snippet-view__address')?.textContent?.trim();
            const category = item.querySelector('.search-business-snippet-view__category')?.textContent?.trim();
            
            if (name) {
              results.push({
                index,
                name,
                address: address || '',
                category: category || ''
              });
            }
          } catch (e) {
            console.error('Ошибка парсинга элемента:', e);
          }
        });
        
        return results;
      });
      
      console.log(`📋 Найдено ${searchResults.length} результатов`);
      
      // Фильтруем только падел клубы
      const padelClubs = searchResults.filter(r => 
        r.name.toLowerCase().includes('падел') || 
        r.name.toLowerCase().includes('padel') ||
        r.category.toLowerCase().includes('падел')
      );
      
      console.log(`🎾 Из них падел клубов: ${padelClubs.length}`);
      
      // Для каждого клуба получаем детальную информацию
      for (const club of padelClubs.slice(0, 5)) { // Берем только первые 5 для теста
        console.log(`\n  📍 Обрабатываем: ${club.name}`);
        
        // Кликаем на клуб
        await page.evaluate((index) => {
          const items = document.querySelectorAll('.search-snippet-view');
          if (items[index]) {
            items[index].click();
          }
        }, club.index);
        
        await this.delay(3000);
        
        // Получаем координаты из URL
        const currentUrl = page.url();
        const coordMatch = currentUrl.match(/ll=([\d.]+)%2C([\d.]+)/);
        let latitude = null, longitude = null;
        
        if (coordMatch) {
          longitude = parseFloat(coordMatch[1]);
          latitude = parseFloat(coordMatch[2]);
          console.log(`     ✅ Координаты: ${latitude}, ${longitude}`);
        } else {
          console.log(`     ⚠️  Координаты не найдены`);
        }
        
        // Получаем детальную информацию
        const details = await page.evaluate(() => {
          const card = document.querySelector('.business-card-view');
          if (!card) return {};
          
          // Телефоны
          const phoneElements = card.querySelectorAll('.card-phones-view__phone-number');
          const phones = Array.from(phoneElements).map(el => el.textContent.trim());
          
          // Сайт
          const websiteElement = card.querySelector('.business-urls-view__link');
          const website = websiteElement?.href;
          
          // Время работы
          const hoursElements = card.querySelectorAll('.business-working-hours-view__item');
          const workingHours = [];
          hoursElements.forEach(item => {
            const day = item.querySelector('.business-working-hours-view__day')?.textContent;
            const hours = item.querySelector('.business-working-hours-view__time')?.textContent;
            if (day && hours) workingHours.push(`${day}: ${hours}`);
          });
          
          // Рейтинг
          const ratingElement = card.querySelector('.business-summary-rating-badge-view__rating');
          const rating = ratingElement?.textContent;
          
          return {
            phone: phones[0] || '',
            website: website || '',
            workingHours: workingHours.join(', '),
            rating: rating || ''
          };
        });
        
        clubs.push({
          name: club.name,
          address: club.address,
          latitude,
          longitude,
          phone: details.phone,
          website: details.website,
          workingHours: details.workingHours,
          rating: details.rating,
          city: 'Москва',
          region: 'Москва',
          sports: ['padel'],
          source: 'Yandex.Maps',
          parsedAt: new Date().toISOString()
        });
        
        console.log(`     📞 Телефон: ${details.phone || 'не найден'}`);
        console.log(`     🌐 Сайт: ${details.website || 'не найден'}`);
      }
      
    } catch (error) {
      console.error('❌ Ошибка:', error.message);
    } finally {
      await page.close();
    }
    
    return clubs;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async saveResults(clubs) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // JSON файл
    const jsonPath = path.join(this.outputDir, `test-moscow-${timestamp}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(clubs, null, 2));
    
    console.log(`\n💾 Результаты сохранены в:`);
    console.log(`   ${jsonPath}`);
    
    // Статистика
    console.log(`\n📊 Статистика:`);
    console.log(`   Всего клубов: ${clubs.length}`);
    console.log(`   С координатами: ${clubs.filter(c => c.latitude && c.longitude).length}`);
    console.log(`   С телефонами: ${clubs.filter(c => c.phone).length}`);
    console.log(`   С сайтами: ${clubs.filter(c => c.website).length}`);
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      console.log('🎾 ТЕСТОВЫЙ ПАРСЕР ПАДЕЛ КЛУБОВ');
      console.log('=====================================');
      console.log('📍 Город: Москва\n');
      
      await this.init();
      const clubs = await this.parseYandexMoscow();
      await this.saveResults(clubs);
      
      console.log('\n✅ Парсинг завершен!');
      
    } catch (error) {
      console.error('❌ Критическая ошибка:', error);
    } finally {
      await this.close();
    }
  }
}

// Запуск
const parser = new PadelTestParser();
parser.run().catch(console.error);