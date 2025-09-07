import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import Header from '../../components/showcase/Header';
import ClubsList from '../../components/showcase/ClubsList';
import ClubPage from '../../components/showcase/ClubPage';
import LandingSection from '../../components/showcase/LandingSection';
import Footer from '../../components/showcase/Footer';
import { Venue } from '../../types/venue';
import './App.css';

interface Sport {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const SPORTS: Sport[] = [
  { id: 'all', name: 'Все виды', icon: '🏆', color: '#00D632' },
  { id: 'padel', name: 'Падел', icon: '🎾', color: '#3B82F6' },
  { id: 'tennis', name: 'Теннис', icon: '🎾', color: '#00D632' },
  { id: 'badminton', name: 'Бадминтон', icon: '🏸', color: '#F59E0B' },
];

const CITIES = [
  { id: 'all', name: 'Вся Россия', lat: 55.7558, lng: 37.6173, radius: 10000 }, // 10000 км - вся страна
  { id: 'moscow', name: 'Москва', lat: 55.7558, lng: 37.6173, radius: 50 }, // 50 км - Москва и область
  { id: 'spb', name: 'Санкт-Петербург', lat: 59.9311, lng: 30.3609, radius: 40 }, // 40 км - СПб и окрестности
  { id: 'kazan', name: 'Казань', lat: 55.8304, lng: 49.0661, radius: 30 }, // 30 км
  { id: 'ekb', name: 'Екатеринбург', lat: 56.8389, lng: 60.6057, radius: 30 }, // 30 км
  { id: 'nn', name: 'Нижний Новгород', lat: 56.2965, lng: 43.9361, radius: 30 }, // 30 км
  { id: 'nsk', name: 'Новосибирск', lat: 55.0084, lng: 82.9357, radius: 30 }, // 30 км
  { id: 'neftekamsk', name: 'Нефтекамск', lat: 56.0920, lng: 54.2481, radius: 30 }, // 30 км
];

function HomePage() {
  const navigate = useNavigate();
  const { city: cityParam, sport: sportParam } = useParams<{ city?: string; sport?: string }>();
  
  const [clubs, setClubs] = useState<Venue[]>([]);
  const [filteredClubs, setFilteredClubs] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState(cityParam || 'all');
  const [selectedSport, setSelectedSport] = useState(sportParam || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Получение геолокации пользователя
  useEffect(() => {
    if (navigator.geolocation && !cityParam) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          // Определить ближайший город
          const nearestCity = findNearestCity(
            position.coords.latitude,
            position.coords.longitude
          );
          if (nearestCity && nearestCity.id !== 'all') {
            setSelectedCity(nearestCity.id);
          }
        },
        (error) => {
          // Геолокация недоступна - это нормально, используем "Вся Россия"
          if (!cityParam) {
            setSelectedCity('all');
          }
        }
      );
    } else if (!cityParam) {
      // Если нет геолокации и параметра города, устанавливаем "Вся Россия"
      setSelectedCity('all');
    }
  }, [cityParam]);

  // Загрузка клубов
  useEffect(() => {
    const loadClubs = async () => {
      setLoading(true);
      try {
        // Загружаем все venues (пока не используем фильтр public, так как его может не быть)
        const snapshot = await getDocs(collection(db, 'venues'));
        const venuesData = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const venueData = {
              id: doc.id,
              ...doc.data()
            } as Venue;
            
            // Загружаем корты для каждого клуба чтобы определить виды спорта
            try {
              const courtsSnapshot = await getDocs(
                collection(db, 'venues', doc.id, 'courts')
              );
              
              // Собираем уникальные виды спорта из кортов
              const sportTypes = new Set<string>();
              courtsSnapshot.docs.forEach(courtDoc => {
                const courtData = courtDoc.data();
                // Проверяем оба поля: type (старое) и sportType (новое)
                const sportType = courtData.sportType || courtData.type;
                if (sportType) {
                  // Приводим к нижнему регистру для унификации
                  sportTypes.add(sportType.toLowerCase());
                }
              });
              
              // Добавляем информацию о видах спорта из кортов
              venueData.courtSportTypes = Array.from(sportTypes);
              venueData.hasCourts = courtsSnapshot.docs.length > 0;
            } catch (error) {
              console.error(`Error loading courts for venue ${doc.id}:`, error);
              venueData.courtSportTypes = [];
              venueData.hasCourts = false;
            }
            
            return venueData;
          })
        );

        // Сортировка по расстоянию если есть геолокация
        if (userLocation) {
          venuesData.sort((a, b) => {
            const distA = calculateDistance(
              userLocation.lat,
              userLocation.lng,
              a.latitude || 0,
              a.longitude || 0
            );
            const distB = calculateDistance(
              userLocation.lat,
              userLocation.lng,
              b.latitude || 0,
              b.longitude || 0
            );
            return distA - distB;
          });
        }

        setClubs(venuesData);
      } catch (error) {
        console.error('Ошибка загрузки клубов:', error);
      } finally {
        setLoading(false);
      }
    };

    loadClubs();
  }, [userLocation]);

  // Фильтрация клубов
  useEffect(() => {
    let filtered = [...clubs];

    // Фильтрация по виду спорта
    if (selectedSport && selectedSport !== 'all') {
      filtered = filtered.filter(venue => {
        // Проверяем только виды спорта из кортов
        // Клубы без кортов не показываются при фильтрации по спорту
        return venue.courtSportTypes?.includes(selectedSport);
      });
    }

    // Фильтрация по поиску
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(venue => {
        const nameMatch = venue.name?.toLowerCase().includes(query);
        const addressMatch = venue.address?.toLowerCase().includes(query);
        const descMatch = venue.description?.toLowerCase().includes(query);
        return nameMatch || addressMatch || descMatch;
      });
    }

    // Фильтрация по городу через координаты
    if (selectedCity && selectedCity !== 'all') {
      const city = CITIES.find(c => c.id === selectedCity);
      if (city) {
        filtered = filtered.filter(venue => {
          // Проверяем наличие координат у клуба
          if (!venue.latitude || !venue.longitude) {
            return false; // Не показываем клубы без координат при фильтрации по городу
          }
          
          // Вычисляем расстояние от центра города до клуба
          const distance = calculateDistance(
            city.lat,
            city.lng,
            venue.latitude,
            venue.longitude
          );
          
          // Включаем клуб, если он находится в пределах радиуса города
          return distance <= city.radius;
        });
      }
    }

    setFilteredClubs(filtered);
  }, [clubs, selectedSport, searchQuery, selectedCity]);

  // URL обновление при изменении фильтров
  useEffect(() => {
    const city = selectedCity || 'all';
    const sport = selectedSport || 'all';
    
    if (city === 'all' && sport === 'all') {
      navigate('/');
    } else if (sport === 'all') {
      navigate(`/${city}`);
    } else if (city === 'all') {
      navigate(`/all/${sport}`);
    } else {
      navigate(`/${city}/${sport}`);
    }
  }, [selectedCity, selectedSport, navigate]);

  // Обновление meta тегов для SEO
  useEffect(() => {
    const title = getPageTitle();
    const description = getMetaDescription();
    
    // Обновляем title
    document.title = `${title} - AllCourt`;
    
    // Обновляем meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', description);
    
    // Обновляем OG tags
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute('content', `${title} - AllCourt`);
    
    let ogDescription = document.querySelector('meta[property="og:description"]');
    if (!ogDescription) {
      ogDescription = document.createElement('meta');
      ogDescription.setAttribute('property', 'og:description');
      document.head.appendChild(ogDescription);
    }
    ogDescription.setAttribute('content', description);
  }, [selectedCity, selectedSport]);

  const findNearestCity = (lat: number, lng: number) => {
    let minDistance = Infinity;
    let nearestCity = CITIES.find(c => c.id === 'moscow'); // default to Moscow

    CITIES.forEach(city => {
      if (city.id === 'all') return; // Пропускаем "Вся Россия"
      
      const distance = calculateDistance(lat, lng, city.lat, city.lng);
      if (distance < minDistance) {
        minDistance = distance;
        nearestCity = city;
      }
    });

    return nearestCity;
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // Радиус Земли в км
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getPageTitle = () => {
    const city = CITIES.find(c => c.id === selectedCity);
    const sport = SPORTS.find(s => s.id === selectedSport);
    
    if (selectedCity === 'all') {
      if (selectedSport === 'all') {
        return 'Корты рядом с вами';
      } else if (sport) {
        if (selectedSport === 'padel') return 'Падел корты рядом с вами';
        if (selectedSport === 'tennis') return 'Теннисные корты рядом с вами';
        if (selectedSport === 'badminton') return 'Корты для бадминтона рядом с вами';
      }
    } else if (city) {
      if (selectedSport === 'all') {
        return `Корты в ${city.name === 'Москва' ? 'Москве' : 
                         city.name === 'Санкт-Петербург' ? 'Санкт-Петербурге' :
                         city.name === 'Казань' ? 'Казани' :
                         city.name === 'Екатеринбург' ? 'Екатеринбурге' :
                         city.name === 'Нижний Новгород' ? 'Нижнем Новгороде' :
                         city.name === 'Новосибирск' ? 'Новосибирске' :
                         city.name}`;
      } else if (sport) {
        const cityInCase = city.name === 'Москва' ? 'Москве' : 
                          city.name === 'Санкт-Петербург' ? 'Санкт-Петербурге' :
                          city.name === 'Казань' ? 'Казани' :
                          city.name === 'Екатеринбург' ? 'Екатеринбурге' :
                          city.name === 'Нижний Новгород' ? 'Нижнем Новгороде' :
                          city.name === 'Новосибирск' ? 'Новосибирске' :
                          city.name;
        
        if (selectedSport === 'padel') return `Падел корты в ${cityInCase}`;
        if (selectedSport === 'tennis') return `Теннисные корты в ${cityInCase}`;
        if (selectedSport === 'badminton') return `Корты для бадминтона в ${cityInCase}`;
      }
    }
    
    return 'Спортивные клубы';
  };

  const getMetaDescription = () => {
    const city = CITIES.find(c => c.id === selectedCity);
    const sport = SPORTS.find(s => s.id === selectedSport);
    
    if (selectedCity === 'all') {
      if (selectedSport === 'all') {
        return 'Найдите и забронируйте корт рядом с вами. Теннис, падел, бадминтон. Онлайн бронирование 24/7.';
      } else if (sport) {
        return `Найдите и забронируйте ${sport.name.toLowerCase()} корт рядом с вами. Онлайн бронирование 24/7.`;
      }
    } else if (city) {
      if (selectedSport === 'all') {
        return `Бронирование кортов в ${city.name === 'Москва' ? 'Москве' : city.name}. Теннис, падел, бадминтон. Лучшие клубы города.`;
      } else if (sport) {
        return `Бронирование ${sport.name.toLowerCase()} кортов в ${city.name === 'Москва' ? 'Москве' : city.name}. Лучшие клубы, онлайн бронирование 24/7.`;
      }
    }
    
    return 'Бронирование спортивных кортов онлайн. 500+ клубов по всей России.';
  };

  return (
    <div className="showcase-app">
      <Header 
        cities={CITIES}
        selectedCity={selectedCity}
        onCityChange={setSelectedCity}
        sports={SPORTS}
        selectedSport={selectedSport}
        onSportChange={setSelectedSport}
        onSearch={setSearchQuery}
        clubs={filteredClubs}
      />
      
      <main className="showcase-main">
        <ClubsList 
          clubs={filteredClubs}
          loading={loading}
          userLocation={userLocation}
          title={getPageTitle()}
        />
        
        <LandingSection />
      </main>
      
      <Footer />
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/:city" element={<HomePage />} />
        <Route path="/:city/:sport" element={<HomePage />} />
        <Route path="/venue/:clubId" element={<ClubPage />} />
      </Routes>
    </Router>
  );
}

export default App;