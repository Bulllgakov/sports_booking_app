const axios = require('axios');

// API ключи
const YANDEX_GEOSUGGEST_API_KEY = "d0d97670-3da8-4f53-b35f-11d9d886b0d8";

async function searchYandexGeosuggest(query, location) {
  const url = "https://suggest-maps.yandex.ru/v1/suggest";
  
  try {
    const response = await axios.get(url, {
      params: {
        apikey: YANDEX_GEOSUGGEST_API_KEY,
        text: query,
        ll: location.center,
        spn: "0.5,0.5",
        types: "biz",
        results: 50,
        lang: "ru_RU"
      }
    });

    if (!response.data || !response.data.results) {
      return [];
    }

    const results = response.data.results
      .filter(item => item.type === "business")
      .map(item => ({
        id: item.uri,
        name: item.title?.text || "",
        address: item.subtitle?.text || "",
        tags: item.tags || [],
        uri: item.uri,
        description: item.subtitle?.text || "",
        distance: item.distance?.value,
        website: extractWebsite(item)
      }));

    return results;
  } catch (error) {
    console.error(`Ошибка поиска Yandex Geosuggest: ${error.message}`);
    return [];
  }
}

function extractWebsite(item) {
  // Ищем сайт в разных местах ответа
  if (item.business_context?.url) {
    return item.business_context.url;
  }
  
  // Проверяем теги на наличие URL
  if (item.tags && Array.isArray(item.tags)) {
    for (const tag of item.tags) {
      if (tag.includes('http://') || tag.includes('https://') || tag.includes('www.')) {
        return tag;
      }
    }
  }
  
  return null;
}

async function testKazanPadel() {
  const kazanLocation = {
    name: "Казань",
    center: "49.106911,55.796129",
    bbox: "48.95,55.65~49.35,55.95"
  };

  console.log("Поиск падел клубов в Казани...\n");
  
  const queries = ["падел", "padel", "падел клуб", "padel club"];
  const allResults = new Map();
  
  for (const query of queries) {
    const results = await searchYandexGeosuggest(query, kazanLocation);
    
    for (const result of results) {
      if (!allResults.has(result.id)) {
        // Проверяем релевантность
        const isRelevant = 
          result.name.toLowerCase().includes("падел") ||
          result.name.toLowerCase().includes("padel") ||
          result.tags.some(tag => tag.includes("падел") || tag.includes("padel"));
        
        if (isRelevant) {
          allResults.set(result.id, result);
        }
      }
    }
  }
  
  console.log(`Найдено ${allResults.size} падел клубов:\n`);
  
  let i = 1;
  for (const [id, club] of allResults) {
    console.log(`${i}. ${club.name}`);
    console.log(`   Адрес: ${club.address}`);
    console.log(`   Сайт: ${club.website || 'НЕТ САЙТА'}`);
    console.log(`   Теги: ${club.tags.join(', ')}`);
    console.log(`   URI: ${club.uri}`);
    console.log('---');
    i++;
  }
}

testKazanPadel();