#!/usr/bin/env node

/**
 * HTTP тестирование Т-Банк API через Cloud Function
 * Вызов: curl https://europe-west1-sports-booking-app-1d7e5.cloudfunctions.net/testTbankHttp
 */

const functions = require('firebase-functions');
const axios = require('axios');
const crypto = require('crypto');

// Генерация токена
function generateToken(params, password) {
  const paramsWithPassword = { ...params, Password: password };
  const sortedKeys = Object.keys(paramsWithPassword).sort();
  const concatenated = sortedKeys.map(key => paramsWithPassword[key]).join('');
  return crypto.createHash('sha256').update(concatenated).digest('hex');
}

exports.testTbankHttp = functions
  .region('europe-west1')
  .runWith({
    vpcConnector: 'firebase-connector',
    vpcConnectorEgressSettings: 'ALL_TRAFFIC'
  })
  .https.onRequest(async (req, res) => {
    // CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    
    const config = {
      terminalKeyE2C: '1755339010178E2C',
      password: 'D7SfdvJY5zq7fm=W',
      apiUrl: 'https://rest-api-test.tinkoff.ru/v2/'
    };
    
    const results = {
      timestamp: new Date().toISOString(),
      staticIP: '34.14.97.72',
      tests: []
    };
    
    try {
      // 1. Проверка доступности API
      console.log('Testing API availability...');
      const healthCheck = await axios.get(config.apiUrl, {
        timeout: 10000,
        validateStatus: () => true
      });
      
      results.tests.push({
        test: 'API Availability',
        status: healthCheck.status,
        statusText: healthCheck.statusText,
        success: healthCheck.status !== 403
      });
      
      // 2. Проверка внешнего IP
      console.log('Checking external IP...');
      const ipCheck = await axios.get('https://api.ipify.org?format=json', {
        timeout: 5000
      });
      
      results.externalIP = ipCheck.data.ip;
      results.ipMatch = ipCheck.data.ip === '34.14.97.72';
      
      // 3. Тестовый платеж
      console.log('Testing payment initialization...');
      const paymentData = {
        TerminalKey: config.terminalKeyE2C,
        Amount: 100, // 1 рубль
        OrderId: `test_${Date.now()}`,
        Description: 'Test payment from Cloud Function'
      };
      
      const token = generateToken({
        TerminalKey: paymentData.TerminalKey,
        Amount: paymentData.Amount,
        OrderId: paymentData.OrderId
      }, config.password);
      
      const initResponse = await axios.post(
        `${config.apiUrl}Init`,
        { ...paymentData, Token: token },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
          validateStatus: () => true
        }
      );
      
      results.tests.push({
        test: 'Payment Init',
        status: initResponse.status,
        statusText: initResponse.statusText,
        data: initResponse.data,
        success: initResponse.status === 200 && initResponse.data.Success
      });
      
      // Анализ результатов
      if (results.tests.some(t => t.status === 403)) {
        results.analysis = {
          problem: '403 Forbidden - IP not whitelisted',
          solution: 'Please ensure IP 34.14.97.72 is whitelisted by T-Bank',
          currentIP: results.externalIP
        };
      } else if (results.tests.every(t => t.success)) {
        results.analysis = {
          status: 'SUCCESS',
          message: 'All tests passed successfully!'
        };
      }
      
    } catch (error) {
      results.error = {
        message: error.message,
        response: error.response?.data
      };
    }
    
    res.status(200).json(results);
  });