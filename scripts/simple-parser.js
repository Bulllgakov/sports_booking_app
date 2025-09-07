#!/usr/bin/env node

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Известные падел клубы Москвы (для начала)
const KNOWN_PADEL_CLUBS = [
  { name: 'SmartPadel Moscow', query: 'SmartPadel Moscow' },
  { name: 'Padel Pro', query: 'Padel Pro Москва' },
  { name: 'World Class Padel', query: 'World Class падел' },
  { name: 'Evolution Padel', query: 'Evolution Padel' },
  { name: 'Padel Club Moscow', query: 'Padel Club Moscow' },
  { name: 'X-Fit Padel', query: 'X-Fit падел' }
];

class SimplePadelParser {
  constructor() {
    this.browser = null;
    this.clubs = [];
    this.outputDir = path.join(__dirname, '../padel-data');
  }

  async init() {
    await fs.mkdir(this.outputDir, { recursive: true });
    
    console.log('🚀 Запускаем браузер...');
    this.browser = await puppeteer.launch({
      headless: true, // В фоне для скорости
      defaultViewport: null
    });
  }

  async searchClub(clubInfo) {
    const page = await this.browser.newPage();
    
    try {
      const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(clubInfo.query)}/@55.755826,37.617300,11z`;
      
      console.log(`\n🔍 Ищем: ${clubInfo.name}`);
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await this.delay(3000);
      
      // Кликаем на первый результат
      await page.evaluate(() => {
        const firstResult = document.querySelector('[role="article"]');
        if (firstResult) firstResult.click();
      });
      
      await this.delay(3000);
      
      // Получаем информацию
      const clubData = await page.evaluate(() => {
        const getName = () => {
          const h1 = document.querySelector('h1');
          return h1?.textContent || '';
        };
        
        const getAddress = () => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const addressBtn = buttons.find(btn => btn.getAttribute('data-item-id')?.includes('address'));
          return addressBtn?.getAttribute('aria-label')?.replace('Address: ', '') || '';
        };
        
        const getPhone = () => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const phoneBtn = buttons.find(btn => btn.getAttribute('data-item-id')?.includes('phone'));
          return phoneBtn?.getAttribute('aria-label')?.replace('Phone: ', '') || '';
        };
        
        const getWebsite = () => {
          const links = Array.from(document.querySelectorAll('a'));
          const websiteLink = links.find(link => link.getAttribute('data-item-id')?.includes('authority'));
          return websiteLink?.href || '';
        };
        
        const getRating = () => {
          const ratingSpan = document.querySelector('[role="img"][aria-label*="stars"]');
          const ratingText = ratingSpan?.getAttribute('aria-label') || '';
          const match = ratingText.match(/([\d.]+)\s+stars/);
          return match ? parseFloat(match[1]) : 0;
        };
        
        return {
          name: getName(),
          address: getAddress(),
          phone: getPhone(),
          website: getWebsite(),
          rating: getRating()
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
      
      if (clubData.name) {
        const club = {
          ...clubData,
          latitude,
          longitude,
          city: 'Москва',
          region: 'Москва',
          sports: ['padel'],
          source: 'Google Maps',
          parsedAt: new Date().toISOString()
        };
        
        console.log(`  ✅ Найден: ${club.name}`);
        console.log(`  📍 Координаты: ${latitude}, ${longitude}`);
        console.log(`  📞 Телефон: ${club.phone || 'не найден'}`);
        console.log(`  🌐 Сайт: ${club.website || 'не найден'}`);
        
        return club;
      }
      
    } catch (error) {
      console.error(`  ❌ Ошибка: ${error.message}`);
    } finally {
      await page.close();
    }
    
    return null;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async parseAll() {
    for (const clubInfo of KNOWN_PADEL_CLUBS) {
      const club = await this.searchClub(clubInfo);
      if (club) {
        this.clubs.push(club);
      }
      await this.delay(2000); // Пауза между запросами
    }
  }

  async saveResults() {
    const timestamp = new Date().toISOString().split('T')[0];
    
    // JSON файл
    const jsonPath = path.join(this.outputDir, `padel-clubs-moscow-${timestamp}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(this.clubs, null, 2));
    
    // CSV для Excel
    const csvContent = this.generateCSV();
    const csvPath = path.join(this.outputDir, `padel-clubs-moscow-${timestamp}.csv`);
    await fs.writeFile(csvPath, csvContent, 'utf8');
    
    console.log(`\n💾 Результаты сохранены:`);
    console.log(`   JSON: ${jsonPath}`);
    console.log(`   CSV: ${csvPath}`);
    
    // Статистика
    console.log(`\n📊 Статистика:`);
    console.log(`   Всего клубов: ${this.clubs.length}`);
    console.log(`   С координатами: ${this.clubs.filter(c => c.latitude && c.longitude).length}`);
    console.log(`   С телефонами: ${this.clubs.filter(c => c.phone).length}`);
    console.log(`   С сайтами: ${this.clubs.filter(c => c.website).length}`);
  }

  generateCSV() {
    const headers = ['Название', 'Адрес', 'Широта', 'Долгота', 'Телефон', 'Сайт', 'Рейтинг'];
    const rows = this.clubs.map(club => [
      club.name,
      club.address,
      club.latitude || '',
      club.longitude || '',
      club.phone || '',
      club.website || '',
      club.rating || ''
    ]);
    
    const csvRows = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ];
    
    return '\ufeff' + csvRows.join('\n');
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      console.log('🎾 ПРОСТОЙ ПАРСЕР ПАДЕЛ КЛУБОВ МОСКВЫ');
      console.log('=====================================\n');
      
      await this.init();
      await this.parseAll();
      await this.saveResults();
      
      console.log('\n✅ Парсинг завершен!');
      
    } catch (error) {
      console.error('❌ Критическая ошибка:', error);
    } finally {
      await this.close();
    }
  }
}

// Запуск
const parser = new SimplePadelParser();
parser.run().catch(console.error);