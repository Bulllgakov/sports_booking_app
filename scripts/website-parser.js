#!/usr/bin/env node

/**
 * Парсер сайтов падел клубов для извлечения юридической информации
 * Ищет ИНН, ОГРН, юридическое название компании, email
 */

import puppeteer from 'puppeteer';
import axios from 'axios';
import { URL } from 'url';

class WebsiteParser {
  constructor() {
    this.browser = null;
    this.patterns = {
      inn: [
        /ИНН[\s:]*(\d{10,12})/gi,
        /инн[\s:]*(\d{10,12})/gi,
        /\bИНН\b[^\d]*(\d{10,12})/gi,
        /(?:ИНН|INN)[\s:]*(\d{10,12})/gi,
        /(\d{10}|\d{12})(?=.*(?:ИНН|инн))/gi
      ],
      ogrn: [
        /ОГРН[\s:]*(\d{13,15})/gi,
        /огрн[\s:]*(\d{13,15})/gi,
        /\bОГРН\b[^\d]*(\d{13,15})/gi,
        /ОГРНИП[\s:]*(\d{15})/gi,
        /(\d{13}|\d{15})(?=.*(?:ОГРН|огрн))/gi
      ],
      email: [
        /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
        /(?:email|e-mail|емайл|почта)[\s:]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
        /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi
      ],
      company: [
        /(?:ООО|ОАО|ЗАО|ПАО|АО|ИП)\s*[«"'"]?([^»"'"]+)[»"'"]?/gi,
        /(?:Общество с ограниченной ответственностью)\s*[«"'"]?([^»"'"]+)[»"'"]?/gi,
        /(?:Индивидуальный предприниматель)\s+([А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+)/gi,
        /юридическое название[\s:]*([^\n\r]+)/gi,
        /наименование организации[\s:]*([^\n\r]+)/gi
      ]
    };
  }

  async init() {
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-extensions'
      ]
    });
  }

  async parseSite(url) {
    if (!url || url.length === 0) {
      return null;
    }

    const result = {
      url,
      inn: '',
      ogrn: '',
      emails: [],
      companyNames: [],
      foundPages: [],
      content: '',
      error: null
    };

    try {
      console.log(`\n🔍 Парсинг сайта: ${url}`);
      
      // Нормализуем URL
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }

      const page = await this.browser.newPage();
      
      // Установка User-Agent для имитации реального браузера
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Блокируем загрузку изображений для ускорения
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (req.resourceType() === 'image' || req.resourceType() === 'stylesheet' || req.resourceType() === 'font') {
          req.abort();
        } else {
          req.continue();
        }
      });

      // Загружаем главную страницу
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Получаем содержимое главной страницы
      const mainContent = await page.content();
      const mainText = await page.evaluate(() => document.body.innerText);
      
      // Сохраняем контент для анализа координат
      result.content = mainContent;
      
      // Извлекаем данные с главной страницы
      this.extractData(mainContent + ' ' + mainText, result);

      // Ищем ссылки на важные страницы
      const importantLinks = await page.evaluate(() => {
        const links = [];
        const anchors = document.querySelectorAll('a[href]');
        const patterns = [
          /контакт/i, /contact/i, /about/i, /о нас/i, /о компании/i,
          /реквизит/i, /правовая/i, /legal/i, /privacy/i, /policy/i,
          /договор/i, /оферта/i, /политика/i, /документ/i
        ];
        
        anchors.forEach(anchor => {
          const href = anchor.href;
          const text = (anchor.textContent || '').toLowerCase();
          const isImportant = patterns.some(pattern => 
            pattern.test(text) || pattern.test(href)
          );
          
          if (isImportant && !links.includes(href)) {
            links.push(href);
          }
        });
        
        return links.slice(0, 5); // Максимум 5 страниц
      });

      // Парсим важные страницы
      for (const link of importantLinks) {
        try {
          console.log(`   📄 Проверка страницы: ${new URL(link).pathname}`);
          
          await page.goto(link, { 
            waitUntil: 'networkidle2',
            timeout: 20000 
          });
          
          const pageContent = await page.content();
          const pageText = await page.evaluate(() => document.body.innerText);
          
          this.extractData(pageContent + ' ' + pageText, result);
          
          if (result.inn || result.ogrn) {
            result.foundPages.push(link);
          }
          
          // Задержка между запросами
          await this.delay(1000);
        } catch (err) {
          console.log(`   ⚠️ Не удалось загрузить: ${link}`);
        }
      }

      await page.close();
      
      // Очищаем и нормализуем результаты
      result.emails = [...new Set(result.emails)].filter(email => 
        !email.includes('example.com') && !email.includes('test.com')
      );
      result.companyNames = [...new Set(result.companyNames)].slice(0, 3);

      console.log(`   ✅ Парсинг завершен`);
      if (result.inn) console.log(`   📋 ИНН: ${result.inn}`);
      if (result.ogrn) console.log(`   📋 ОГРН: ${result.ogrn}`);
      if (result.emails.length) console.log(`   📧 Email: ${result.emails.join(', ')}`);
      if (result.companyNames.length) console.log(`   🏢 Компания: ${result.companyNames[0]}`);

    } catch (error) {
      result.error = error.message;
      console.log(`   ❌ Ошибка парсинга: ${error.message}`);
    }

    return result;
  }

  extractData(content, result) {
    // Извлекаем ИНН
    if (!result.inn) {
      for (const pattern of this.patterns.inn) {
        const matches = content.match(pattern);
        if (matches && matches.length > 0) {
          const inn = matches[0].replace(/\D/g, '').match(/(\d{10,12})/);
          if (inn && this.validateINN(inn[1])) {
            result.inn = inn[1];
            break;
          }
        }
      }
    }

    // Извлекаем ОГРН
    if (!result.ogrn) {
      for (const pattern of this.patterns.ogrn) {
        const matches = content.match(pattern);
        if (matches && matches.length > 0) {
          const ogrn = matches[0].replace(/\D/g, '').match(/(\d{13,15})/);
          if (ogrn) {
            result.ogrn = ogrn[1];
            break;
          }
        }
      }
    }

    // Извлекаем email
    for (const pattern of this.patterns.email) {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(email => {
          // Очищаем email от лишних символов
          email = email.replace(/mailto:/gi, '').toLowerCase();
          if (this.validateEmail(email) && !result.emails.includes(email)) {
            result.emails.push(email);
          }
        });
      }
    }

    // Извлекаем названия компаний
    for (const pattern of this.patterns.company) {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          // Очищаем название
          const company = match
            .replace(/(?:ООО|ОАО|ЗАО|ПАО|АО|ИП)\s*/gi, '')
            .replace(/[«»"'"]/g, '')
            .trim();
          
          if (company.length > 3 && company.length < 100 && !result.companyNames.includes(company)) {
            result.companyNames.push(company);
          }
        });
      }
    }
  }

  validateINN(inn) {
    if (!inn || (inn.length !== 10 && inn.length !== 12)) {
      return false;
    }
    
    // Простая проверка на валидность ИНН
    const checkDigit = (inn, coefficients) => {
      let n = 0;
      for (let i = 0; i < coefficients.length; i++) {
        n += coefficients[i] * parseInt(inn[i]);
      }
      return parseInt(n % 11 % 10);
    };
    
    if (inn.length === 10) {
      const n10 = checkDigit(inn, [2, 4, 10, 3, 5, 9, 4, 6, 8]);
      return n10 === parseInt(inn[9]);
    }
    
    if (inn.length === 12) {
      const n11 = checkDigit(inn, [7, 2, 4, 10, 3, 5, 9, 4, 6, 8]);
      const n12 = checkDigit(inn, [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]);
      return n11 === parseInt(inn[10]) && n12 === parseInt(inn[11]);
    }
    
    return false;
  }

  validateEmail(email) {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
  }

  async enrichWithDaData(inn, apiKey, secret) {
    if (!inn || !apiKey || !secret) {
      return null;
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
        type: 'LEGAL'
      }, { headers });

      if (response.data.suggestions && response.data.suggestions.length > 0) {
        const org = response.data.suggestions[0].data;
        
        return {
          legalName: org.name?.full_with_opf || org.name?.short_with_opf || '',
          inn: org.inn || '',
          ogrn: org.ogrn || '',
          kpp: org.kpp || '',
          okved: org.okved || '',
          okvedType: org.okved_type || '',
          legalAddress: org.address?.value || '',
          managementName: org.management?.name || '',
          managementPost: org.management?.post || '',
          foundedDate: org.state?.registration_date || '',
          organizationStatus: org.state?.status || '',
          organizationType: org.opf?.type || '',
          capital: org.capital?.value || null,
          employeeCount: org.employee_count || null,
          branchCount: org.branch_count || null,
          emails: org.emails?.map(e => e.value) || [],
          phones: org.phones?.map(p => p.value) || []
        };
      }
    } catch (error) {
      console.error(`   ⚠️ Ошибка DaData: ${error.message}`);
    }

    return null;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

export default WebsiteParser;