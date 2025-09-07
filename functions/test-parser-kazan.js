const axios = require('axios');

// Эмулируем запрос из админки к Cloud Function
async function testParser() {
  console.log('Тестируем парсер для Казани (падел)...\n');
  
  try {
    // Параметры как в админке
    const requestData = {
      city: 'Казань',
      sport: 'padel',
      bbox: '48.95,55.65,49.35,55.95',
      center: '49.106911,55.796129'
    };
    
    // Вызываем локальную версию парсера
    const response = await callLocalParser(requestData);
    
    console.log(`Найдено клубов: ${response.clubs.length}\n`);
    
    response.clubs.forEach((club, index) => {
      console.log(`${index + 1}. ${club.name}`);
      console.log(`   Адрес: ${club.address}`);
      console.log(`   Сайт: ${club.website || 'НЕТ САЙТА'}`);
      console.log(`   Телефоны: ${club.phones?.join(', ') || 'НЕТ'}`);
      console.log(`   Фото: ${club.photos?.length || 0} шт.`);
      if (club.photos && club.photos.length > 0) {
        console.log(`   Первое фото: ${club.photos[0].substring(0, 50)}...`);
      }
      console.log(`   Теги: ${club.tags?.slice(0, 3).join(', ') || 'НЕТ'}`);
      console.log('---\n');
    });
    
  } catch (error) {
    console.error('Ошибка:', error.message);
  }
}

// Локальная версия парсера (копия из clubParser.ts)
async function callLocalParser(data) {
  const YANDEX_GEOSUGGEST_API_KEY = "d0d97670-3da8-4f53-b35f-11d9d886b0d8";
  const GOOGLE_PLACES_API_KEY = "AIzaSyD0MDiefjKY4bWaoRNalM1KHXBBcF6xJC4";
  
  const { city, bbox, center, sport } = data;
  
  // Ключевые слова для падела
  const searchQueries = [
    'падел',
    'padel', 
    'падел клуб',
    'padel club'
  ];
  
  const uniqueClubs = new Map();
  
  for (const query of searchQueries) {
    const url = "https://suggest-maps.yandex.ru/v1/suggest";
    
    try {
      const response = await axios.get(url, {
        params: {
          apikey: YANDEX_GEOSUGGEST_API_KEY,
          text: query,
          ll: center,
          spn: '0.5,0.5',
          types: 'biz',
          results: 50,
          lang: 'ru_RU'
        }
      });
      
      if (response.data && response.data.results) {
        const results = response.data.results.filter(item => item.type === 'business');
        
        for (const item of results) {
          const name = item.title?.text || '';
          const address = item.subtitle?.text || '';
          const tags = item.tags || [];
          
          // Фильтруем по релевантности для падела
          const isRelevant = 
            name.toLowerCase().includes('падел') ||
            name.toLowerCase().includes('padel') ||
            tags.some(tag => tag.includes('падел') || tag.includes('padel')) ||
            name.toLowerCase().includes('артен'); // АРТЕН - падел клуб в Казани
          
          if (isRelevant) {
            const clubKey = `${name}_${address}`;
            
            if (!uniqueClubs.has(clubKey)) {
              // Извлекаем данные о клубе
              const club = {
                id: item.uri,
                name: name,
                city: city,
                address: address,
                tags: tags,
                uri: item.uri,
                description: item.subtitle?.text || '',
                phones: extractPhones(item),
                website: extractWebsite(item),
                photos: [],
                coordinates: null
              };
              
              // Пытаемся найти координаты
              if (item.distance && item.distance.value) {
                // Яндекс может давать координаты в другом формате
                // Нужно проверить структуру ответа
              }
              
              // Для теста - добавляем Street View фото по координатам центра
              if (center) {
                const [lng, lat] = center.split(',');
                const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${lat},${lng}&fov=90&heading=0&pitch=0&key=${GOOGLE_PLACES_API_KEY}`;
                club.photos = [streetViewUrl];
              }
              
              uniqueClubs.set(clubKey, club);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Ошибка поиска: ${error.message}`);
    }
  }
  
  return { clubs: Array.from(uniqueClubs.values()) };
}

function extractPhones(item) {
  // Пытаемся найти телефоны в данных
  if (item.business_context?.telephone) {
    return [item.business_context.telephone];
  }
  return [];
}

function extractWebsite(item) {
  // Проверяем разные поля для сайта
  if (item.business_context?.url) {
    return item.business_context.url;
  }
  
  // Иногда сайт может быть в тегах
  if (item.tags) {
    for (const tag of item.tags) {
      if (tag.includes('http://') || tag.includes('https://') || tag.includes('.ru') || tag.includes('.com')) {
        return tag;
      }
    }
  }
  
  // Проверяем links если есть
  if (item.links) {
    for (const link of item.links) {
      if (link.type === 'website' || link.type === 'social') {
        return link.url || link.uri;
      }
    }
  }
  
  return null;
}

testParser();