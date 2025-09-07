import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";

const region = "europe-west1";

// API ключи (в продакшене лучше использовать Firebase Config)
const YANDEX_GEOSUGGEST_API_KEY = "d0d97670-3da8-4f53-b35f-11d9d886b0d8";
const YANDEX_GEOCODER_API_KEY = "cdaa996a-f885-475d-90a4-f1138876cebd";
const GOOGLE_PLACES_API_KEY = "AIzaSyD0MDiefjKY4bWaoRNalM1KHXBBcF6xJC4";

interface ParsedClub {
  id: string;
  name: string;
  city: string;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  } | null;
  tags: string[];
  uri: string;
  description: string;
  phones?: string[];
  website?: string;
  hours?: string;
  photoUrl?: string;
  logoUrl?: string;
  photos?: string[]; // Массив всех фотографий
}

/**
 * Поиск организаций через Яндекс Геосаджест
 */
async function searchYandexGeosuggest(query: string, city: any): Promise<ParsedClub[]> {
  try {
    const url = "https://suggest-maps.yandex.ru/v1/suggest";
    
    const response = await axios.get(url, {
      params: {
        apikey: YANDEX_GEOSUGGEST_API_KEY,
        text: query,
        ll: `${city.center.lng},${city.center.lat}`,
        spn: "0.3,0.3",
        bbox: city.bbox,
        types: "biz",
        results: 20,
        lang: "ru_RU",
        print_address: 1,
        strict_bounds: 1,
        attrs: "uri"
      },
      headers: {
        "Accept": "application/json"
      }
    });

    if (response.data && response.data.results) {
      return response.data.results.map((item: any) => ({
        id: item.uri || `${item.title}_${item.subtitle}`,
        name: item.title?.text || "",
        city: city.name,
        address: item.address?.formatted_address || "",
        coordinates: null, // Будем получать через геокодер
        tags: item.tags || [],
        uri: item.uri || "",
        description: item.subtitle?.text || "",
        phones: item.phones || [],
        website: item.website || null,
        hours: item.hours || null
      }));
    }

    return [];
  } catch (error: any) {
    console.error(`Ошибка Геосаджест API: ${error.message}`);
    return [];
  }
}

/**
 * Получение координат через Яндекс Геокодер
 */
async function getCoordinatesFromGeocoder(address: string, cityName: string) {
  if (!address) return null;

  try {
    const fullAddress = address.includes(cityName) ? address : `${cityName}, ${address}`;
    const url = "https://geocode-maps.yandex.ru/1.x/";
    
    const response = await axios.get(url, {
      params: {
        apikey: YANDEX_GEOCODER_API_KEY,
        geocode: fullAddress,
        format: "json",
        results: 1,
        lang: "ru_RU"
      }
    });

    const geoObject = response.data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
    
    if (geoObject) {
      const [lng, lat] = geoObject.Point.pos.split(" ").map(parseFloat);
      return {
        latitude: lat,
        longitude: lng
      };
    }
  } catch (error: any) {
    console.error(`Ошибка геокодирования: ${error.message}`);
  }

  return null;
}

/**
 * Получение всех фото места через Google Places API
 */
async function getPlacePhotos(name: string, address: string, coordinates: any): Promise<string[]> {
  if (!GOOGLE_PLACES_API_KEY) return [];

  try {
    // Сначала ищем место по названию и адресу
    const searchUrl = "https://maps.googleapis.com/maps/api/place/findplacefromtext/json";
    const searchResponse = await axios.get(searchUrl, {
      params: {
        key: GOOGLE_PLACES_API_KEY,
        input: `${name} ${address}`,
        inputtype: "textquery",
        fields: "place_id",
        locationbias: coordinates ? `point:${coordinates.latitude},${coordinates.longitude}` : undefined,
        language: "ru"
      }
    });

    const candidates = searchResponse.data?.candidates;
    if (!candidates || candidates.length === 0) return [];

    const placeId = candidates[0].place_id;

    // Теперь получаем детали места включая все фотографии
    const detailsUrl = "https://maps.googleapis.com/maps/api/place/details/json";
    const detailsResponse = await axios.get(detailsUrl, {
      params: {
        key: GOOGLE_PLACES_API_KEY,
        place_id: placeId,
        fields: "photos",
        language: "ru"
      }
    });

    const photos = detailsResponse.data?.result?.photos;
    if (!photos || photos.length === 0) return [];

    // Получаем URL для всех фотографий (максимум 12)
    const photoUrls: string[] = [];
    const maxPhotos = Math.min(photos.length, 12);
    
    for (let i = 0; i < maxPhotos; i++) {
      const photoReference = photos[i].photo_reference;
      const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photoreference=${photoReference}&key=${GOOGLE_PLACES_API_KEY}`;
      photoUrls.push(photoUrl);
    }

    console.log(`Найдено ${photoUrls.length} фотографий для ${name}`);
    return photoUrls;
  } catch (error: any) {
    console.error(`Ошибка получения фото через Google Places: ${error.message}`);
  }

  return [];
}

// Удалены функции getStreetViewImage и getStaticMapImage
// Они вызывали CORB ошибки в браузере

/**
 * Парсинг изображений с сайта клуба
 */
async function getPhotosFromWebsite(websiteUrl: string): Promise<string[]> {
  if (!websiteUrl || websiteUrl === "") return [];
  
  const photos: string[] = [];
  
  try {
    // Нормализуем URL
    let url = websiteUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    
    console.log(`Парсинг фото с сайта: ${url}`);
    
    // Делаем запрос к сайту
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      },
      maxRedirects: 5
    });
    
    const html = response.data;
    
    // 1. Open Graph изображения (og:image)
    const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
    if (ogImageMatch && ogImageMatch[1]) {
      const ogImage = makeAbsoluteUrl(ogImageMatch[1], url);
      if (ogImage && isValidImageUrl(ogImage)) {
        photos.push(ogImage);
      }
    }
    
    // 2. Twitter Card изображения
    const twitterImageMatch = html.match(/<meta\s+name="twitter:image"\s+content="([^"]+)"/i);
    if (twitterImageMatch && twitterImageMatch[1]) {
      const twitterImage = makeAbsoluteUrl(twitterImageMatch[1], url);
      if (twitterImage && isValidImageUrl(twitterImage) && !photos.includes(twitterImage)) {
        photos.push(twitterImage);
      }
    }
    
    // 3. Логотип (различные варианты)
    const logoPatterns = [
      /<img[^>]+class="[^"]*logo[^"]*"[^>]+src="([^"]+)"/gi,
      /<img[^>]+id="[^"]*logo[^"]*"[^>]+src="([^"]+)"/gi,
      /<img[^>]+src="([^"]+)"[^>]+class="[^"]*logo[^"]*"/gi,
      /<img[^>]+src="([^"]+)"[^>]+alt="[^"]*logo[^"]*"/gi,
      /logo[^"]*\.(?:jpg|jpeg|png|svg|webp)/gi
    ];
    
    for (const pattern of logoPatterns) {
      const matches = html.matchAll(pattern);
      for (const match of matches) {
        const logoUrl = match[1] || match[0];
        const absoluteUrl = makeAbsoluteUrl(logoUrl, url);
        if (absoluteUrl && isValidImageUrl(absoluteUrl) && !photos.includes(absoluteUrl)) {
          photos.push(absoluteUrl);
          break; // Берем только первый найденный логотип
        }
      }
    }
    
    // 4. Изображения из галереи или слайдера (ищем крупные изображения)
    const imgPattern = /<img[^>]+src="([^"]+)"[^>]*>/gi;
    const imgMatches = html.matchAll(imgPattern);
    
    for (const match of imgMatches) {
      if (photos.length >= 12) break; // Максимум 12 фото
      
      const imgUrl = match[1];
      const absoluteUrl = makeAbsoluteUrl(imgUrl, url);
      
      // Фильтруем мелкие изображения и иконки
      if (absoluteUrl && 
          isValidImageUrl(absoluteUrl) && 
          !photos.includes(absoluteUrl) &&
          !absoluteUrl.includes("icon") &&
          !absoluteUrl.includes("favicon") &&
          !absoluteUrl.includes("placeholder") &&
          !absoluteUrl.includes("loading")) {
        
        // Проверяем размер изображения по URL (если указан)
        const sizeMatch = absoluteUrl.match(/[-_](\d+)x(\d+)[.-]/);
        if (sizeMatch) {
          const width = parseInt(sizeMatch[1]);
          const height = parseInt(sizeMatch[2]);
          // Пропускаем мелкие изображения
          if (width < 200 || height < 200) continue;
        }
        
        photos.push(absoluteUrl);
      }
    }
    
    console.log(`Найдено ${photos.length} фото на сайте ${url}`);
    return photos.slice(0, 12); // Максимум 12 фото
    
  } catch (error: any) {
    console.error(`Ошибка парсинга сайта ${websiteUrl}: ${error.message}`);
    return [];
  }
}

/**
 * Преобразование относительного URL в абсолютный
 */
function makeAbsoluteUrl(url: string, baseUrl: string): string {
  if (!url) return "";
  
  // Уже абсолютный URL
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  
  // Протокол-относительный URL
  if (url.startsWith("//")) {
    return "https:" + url;
  }
  
  // Парсим базовый URL
  try {
    const base = new URL(baseUrl);
    
    // Абсолютный путь от корня
    if (url.startsWith("/")) {
      return base.origin + url;
    }
    
    // Относительный путь
    const currentPath = base.pathname.endsWith("/") ? base.pathname : base.pathname + "/";
    return base.origin + currentPath + url;
  } catch {
    return "";
  }
}

/**
 * Проверка валидности URL изображения
 */
function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  
  // Проверяем расширение файла
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i;
  if (imageExtensions.test(url)) return true;
  
  // Проверяем популярные CDN и сервисы изображений
  const imageServices = [
    "cloudinary.com",
    "imgix.net",
    "amazonaws.com",
    "googleusercontent.com",
    "wp.com",
    "instagram.com",
    "cdninstagram.com"
  ];
  
  return imageServices.some(service => url.includes(service));
}

/**
 * Cloud Function для парсинга клубов
 */
export const parseClubs = functions.region(region).https.onCall(async (data, context) => {
  // Проверяем, что пользователь - суперадмин
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Требуется авторизация"
    );
  }

  // Получаем данные пользователя из коллекции admins
  const adminSnapshot = await admin.firestore()
    .collection("admins")
    .where("email", "==", context.auth.token.email)
    .limit(1)
    .get();

  if (adminSnapshot.empty) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Пользователь не найден в системе"
    );
  }

  const adminData = adminSnapshot.docs[0].data();
  if (adminData.role !== "superadmin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Доступ запрещен. Требуются права суперадминистратора"
    );
  }

  const { city, bbox, center, sport, keywords } = data;

  if (!city || !bbox || !center || !sport) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Не указаны обязательные параметры: city, bbox, center, sport"
    );
  }

  console.log(`Парсинг ${sport} клубов в городе ${city}`);

  // Используем переданные ключевые слова или дефолтные
  const searchQueries = keywords || [
    sport,
    `${sport} клуб`,
    `${sport} корт`,
    `спортивный клуб ${sport}`
  ];

  const uniqueClubs = new Map<string, ParsedClub>();

  // Поиск по каждому ключевому слову
  for (const query of searchQueries) {
    const results = await searchYandexGeosuggest(query, { name: city, bbox, center });
    
    // Фильтруем и обрабатываем результаты
    for (const result of results) {
      // Адаптируем фильтр под вид спорта
      const sportLower = sport.toLowerCase();
      const sportKeywords = {
        padel: ["падел", "padel"],
        tennis: ["теннис", "tennis"],
        badminton: ["бадминтон", "badminton"]
      };

      const relevantKeywords = sportKeywords[sportLower as keyof typeof sportKeywords] || [sportLower];
      
      const isRelevant = 
        relevantKeywords.some(keyword => 
          result.name.toLowerCase().includes(keyword) ||
          result.description?.toLowerCase().includes(keyword)
        ) ||
        (sportLower === "padel" && result.name.toLowerCase().includes("артен")) || // АРТЕН - падел клуб
        result.name.toLowerCase().includes("спорт") ||
        result.tags.some((tag: string) => 
          tag.includes("спорт") || 
          tag.includes("фитнес") ||
          relevantKeywords.some(keyword => tag.includes(keyword))
        );

      if (isRelevant) {
        const clubKey = `${result.name}_${result.address}`;
        
        if (!uniqueClubs.has(clubKey)) {
          // Получаем координаты
          const coordinates = await getCoordinatesFromGeocoder(result.address, city);
          
          if (coordinates) {
            // Проверяем, что координаты в пределах города
            const [minLng, minLat, maxLng, maxLat] = bbox.split(/[,~]/).map(Number);
            const isInCity = 
              coordinates.latitude >= minLat && 
              coordinates.latitude <= maxLat &&
              coordinates.longitude >= minLng && 
              coordinates.longitude <= maxLng;
            
            if (isInCity) {
              result.coordinates = coordinates;
              
              // Шаг 1: Пробуем получить фото из Google Places
              let realPhotos = await getPlacePhotos(result.name, result.address, coordinates);
              
              // Шаг 2: Если нет фото из Google Places и есть сайт - ОБЯЗАТЕЛЬНО парсим сайт
              if (realPhotos.length === 0 && result.website) {
                console.log(`Нет Google Places фото для ${result.name}, парсим сайт: ${result.website}`);
                const websitePhotos = await getPhotosFromWebsite(result.website);
                if (websitePhotos.length > 0) {
                  realPhotos = websitePhotos;
                  console.log(`Найдено ${websitePhotos.length} фото на сайте ${result.website}`);
                }
              }
              
              // Шаг 3: Используем полученные реальные фото или фоллбэки
              if (realPhotos.length > 0) {
                // Есть реальные фото (из Places или с сайта)
                result.photos = realPhotos;
                result.photoUrl = realPhotos[0];
                result.logoUrl = realPhotos[0];
              } else {
                // Нет реальных фото - не отправляем Google Maps URLs на клиент
                // Они вызывают CORB ошибки и не работают в браузере
                result.photos = [];
                result.photoUrl = undefined;
                result.logoUrl = undefined;
              }
            }
          }
          
          uniqueClubs.set(clubKey, result);
        }
      }
    }
    
    // Задержка между запросами
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  const finalClubs = Array.from(uniqueClubs.values());
  
  console.log(`Найдено ${finalClubs.length} клубов в городе ${city}`);
  
  // Логируем первый клуб для отладки
  if (finalClubs.length > 0) {
    const firstClub = finalClubs[0];
    console.log('Пример клуба:', {
      name: firstClub.name,
      hasPhotos: firstClub.photos && firstClub.photos.length > 0,
      photoUrl: firstClub.photoUrl ? 'есть' : 'нет',
      isGoogleMapsUrl: firstClub.photoUrl ? firstClub.photoUrl.includes('googleapis.com') : false
    });
  }
  
  return { clubs: finalClubs };
});

/**
 * Загружает изображение по URL в Firebase Storage
 */
async function uploadImageToStorage(imageUrl: string, venueId: string, index: number): Promise<string | null> {
  try {
    // Скачиваем изображение
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AllCourtsParser/1.0)'
      }
    });
    
    if (!response.data) {
      console.error(`Не удалось скачать изображение: ${imageUrl}`);
      return null;
    }

    // Определяем тип контента
    const contentType = response.headers['content-type'] || 'image/jpeg';
    
    // Генерируем имя файла
    const timestamp = Date.now();
    const extension = contentType.includes('png') ? 'png' : 'jpg';
    const fileName = `clubs/${venueId}/photos/photo_${timestamp}_${index}.${extension}`;
    
    // Создаем файл в Firebase Storage (используем дефолтный bucket)
    const bucket = admin.storage().bucket();
    const file = bucket.file(fileName);
    
    // Загружаем файл
    await file.save(Buffer.from(response.data), {
      metadata: {
        contentType: contentType,
        metadata: {
          source: 'parser',
          originalUrl: imageUrl
        }
      }
    });
    
    // Получаем публичный URL с токеном
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: '03-09-2491' // Долгосрочная ссылка
    });
    
    console.log(`Изображение загружено: ${signedUrl}`);
    
    return signedUrl;
  } catch (error: any) {
    console.error(`Ошибка загрузки изображения ${imageUrl}:`, error.message);
    return null;
  }
}

/**
 * Cloud Function для регистрации клуба из парсера
 */
export const registerClubFromParser = functions.region(region).https.onCall(async (data, context) => {
  // Проверяем, что пользователь - суперадмин
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Требуется авторизация"
    );
  }

  // Получаем данные пользователя
  const adminSnapshot = await admin.firestore()
    .collection("admins")
    .where("email", "==", context.auth.token.email)
    .limit(1)
    .get();

  if (adminSnapshot.empty) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Пользователь не найден в системе"
    );
  }

  const adminData = adminSnapshot.docs[0].data();
  if (adminData.role !== "superadmin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Доступ запрещен. Требуются права суперадминистратора"
    );
  }

  const { name, city, address, coordinates, description, phones, website, tags, uri, photoUrl, photos, sportType } = data;

  console.log(`Получены данные для регистрации клуба ${name}:`, {
    hasCoordinates: !!coordinates,
    coordinates: coordinates || 'не переданы',
    coordinatesType: coordinates ? typeof coordinates : 'undefined',
    coordinatesDetails: coordinates ? {
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      hasLatitude: 'latitude' in (coordinates || {}),
      hasLongitude: 'longitude' in (coordinates || {})
    } : null
  });

  if (!name || !city || !address) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Не указаны обязательные параметры: name, city, address"
    );
  }

  try {
    // Проверяем, нет ли уже такого клуба
    const existingVenues = await admin.firestore()
      .collection("venues")
      .where("city", "==", city)
      .get();

    for (const doc of existingVenues.docs) {
      const venue = doc.data();
      
      // Проверка по адресу
      if (venue.address && address) {
        const normalizedVenueAddress = venue.address.toLowerCase().trim();
        const normalizedClubAddress = address.toLowerCase().trim();
        if (normalizedVenueAddress === normalizedClubAddress) {
          throw new functions.https.HttpsError(
            "already-exists",
            `Клуб с адресом "${address}" уже зарегистрирован`
          );
        }
      }
      
      // Проверка по координатам (с погрешностью ~100м)
      if (venue.coordinates && coordinates) {
        const latDiff = Math.abs(venue.coordinates.latitude - coordinates.latitude);
        const lngDiff = Math.abs(venue.coordinates.longitude - coordinates.longitude);
        if (latDiff < 0.001 && lngDiff < 0.001) {
          throw new functions.https.HttpsError(
            "already-exists",
            `Клуб с такими координатами уже зарегистрирован`
          );
        }
      }
    }

    // Сначала создаем документ клуба для получения ID
    const venueRef = admin.firestore().collection("venues").doc();
    const venueId = venueRef.id;
    
    // Загружаем фотографии в Firebase Storage
    const uploadedPhotos: string[] = [];
    
    if (photos && photos.length > 0) {
      console.log(`Загружаем ${photos.length} фотографий для клуба ${name}`);
      
      for (let i = 0; i < Math.min(photos.length, 12); i++) {
        const photoUrl = photos[i];
        const uploadedUrl = await uploadImageToStorage(photoUrl, venueId, i);
        
        if (uploadedUrl) {
          uploadedPhotos.push(uploadedUrl);
        }
      }
      
      console.log(`Загружено ${uploadedPhotos.length} из ${photos.length} фотографий`);
    } else if (photoUrl) {
      // Если есть только одно фото
      const uploadedUrl = await uploadImageToStorage(photoUrl, venueId, 0);
      if (uploadedUrl) {
        uploadedPhotos.push(uploadedUrl);
      }
    }
    
    // Создаем данные клуба
    const venueData: any = {
      name,
      city,
      address,
      description: description || "",
      phone: phones?.[0] || "",
      website: website || "",
      email: "", // Email будет добавлен позже владельцем
      sportTypes: tags.some((tag: string) => tag.toLowerCase().includes("падел") || tag.toLowerCase().includes("padel"))
        ? ["padel"] 
        : tags.some((tag: string) => tag.toLowerCase().includes("теннис") || tag.toLowerCase().includes("tennis"))
        ? ["tennis"]
        : tags.some((tag: string) => tag.toLowerCase().includes("бадминтон") || tag.toLowerCase().includes("badminton"))
        ? ["badminton"]
        : ["other"],
      status: "pending", // Требует модерации перед активацией
      source: "parser",
      parserData: {
        uri,
        tags,
        phones: phones || [],
        originalPhotos: photos || [], // Сохраняем оригинальные URL для истории
        parsedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Добавляем загруженные фотографии
    if (uploadedPhotos.length > 0) {
      venueData.photos = uploadedPhotos; // Массив всех загруженных фотографий
      venueData.imageUrl = uploadedPhotos[0]; // Первое фото как основное
      venueData.logoUrl = uploadedPhotos[0]; // Используем первое фото как логотип
    }

    // Добавляем координаты в правильном формате для Firestore
    if (coordinates && coordinates.latitude && coordinates.longitude) {
      console.log(`Сохраняем координаты для ${name}:`, {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        type: typeof coordinates.latitude
      });
      venueData.latitude = Number(coordinates.latitude);
      venueData.longitude = Number(coordinates.longitude);
      venueData.coordinates = {
        latitude: Number(coordinates.latitude),
        longitude: Number(coordinates.longitude)
      }; // Сохраняем и объект для совместимости
    } else {
      console.log(`Координаты не переданы или неполные для клуба ${name}:`, coordinates);
    }

    // Сохраняем клуб
    await venueRef.set(venueData);

    // Создаем бесплатную подписку
    await admin.firestore().collection("subscriptions").add({
      venueId: venueRef.id,
      plan: "basic",
      status: "active",
      startDate: admin.firestore.FieldValue.serverTimestamp(),
      endDate: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      usage: {
        courtsCount: 1, // Изменяем на 1, так как создаем корт
        bookingsThisMonth: 0,
        smsEmailsSent: 0,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      }
    });

    // Создаем первый корт автоматически
    const courtRef = venueRef.collection("courts").doc();
    await courtRef.set({
      name: "Корт 1",
      venueId: venueRef.id, // Добавляем ссылку на клуб
      type: sportType || "padel", // Используем поле type вместо sportType для совместимости с существующей базой
      sportType: sportType || "padel", // Дублируем для обратной совместимости
      surface: sportType === "tennis" ? "Хард" : sportType === "badminton" ? "Синтетический ковер" : "Искусственная трава",
      indoor: true, // По умолчанию крытый корт
      courtType: "indoor", // Добавляем courtType для совместимости
      pricePerHour: sportType === "padel" ? 3000 : sportType === "tennis" ? 2500 : 1500, // Базовые цены
      priceWeekday: sportType === "padel" ? 3000 : sportType === "tennis" ? 2500 : 1500,
      priceWeekend: sportType === "padel" ? 3500 : sportType === "tennis" ? 3000 : 2000,
      description: `Основной ${sportType === "padel" ? "падел" : sportType === "tennis" ? "теннисный" : "бадминтонный"} корт`,
      maxPlayers: sportType === "padel" ? 4 : sportType === "badminton" ? 4 : 2,
      amenities: ["lighting", "equipment_rental"], // Базовые удобства
      status: "active",
      availability: {
        monday: { start: "07:00", end: "23:00" },
        tuesday: { start: "07:00", end: "23:00" },
        wednesday: { start: "07:00", end: "23:00" },
        thursday: { start: "07:00", end: "23:00" },
        friday: { start: "07:00", end: "23:00" },
        saturday: { start: "08:00", end: "22:00" },
        sunday: { start: "08:00", end: "22:00" }
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Клуб "${name}" успешно зарегистрирован с ID: ${venueRef.id}`);
    console.log(`Создан корт "Корт 1" с видом спорта: ${sportType || "padel"}`);

    return {
      success: true,
      venueId: venueRef.id,
      courtId: courtRef.id,
      message: `Клуб "${name}" успешно зарегистрирован с кортом "${sportType || "padel"}"`
    };
  } catch (error: any) {
    console.error("Ошибка регистрации клуба:", error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      "internal",
      `Ошибка при регистрации клуба: ${error.message}`
    );
  }
});