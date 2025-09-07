import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Grid,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip
} from '@mui/material';
import { Search, Add, Check, LocationOn, Phone, Language, Schedule, Place, CameraAlt } from '@mui/icons-material';
import { httpsCallable } from 'firebase/functions';
import { functions, db } from '../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

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
  photos?: string[];
  isRegistered?: boolean;
}

// Список городов для парсинга
const CITIES = [
  { value: 'Казань', label: 'Казань', bbox: '48.802752,55.625578~49.448442,55.913057', center: { lat: 55.796127, lng: 49.106405 } },
  { value: 'Москва', label: 'Москва', bbox: '36.803267,55.142221~38.234218,56.021276', center: { lat: 55.755826, lng: 37.617300 } },
  { value: 'Санкт-Петербург', label: 'Санкт-Петербург', bbox: '29.438891,59.684476~31.261872,60.241194', center: { lat: 59.931226, lng: 30.359909 } },
  { value: 'Нижний Новгород', label: 'Нижний Новгород', bbox: '43.767255,56.196689~44.115164,56.381065', center: { lat: 56.296504, lng: 43.936059 } },
  { value: 'Екатеринбург', label: 'Екатеринбург', bbox: '60.384186,56.706139~60.840607,56.950140', center: { lat: 56.838011, lng: 60.597474 } },
  { value: 'Новосибирск', label: 'Новосибирск', bbox: '82.707184,54.901582~83.174820,55.184899', center: { lat: 55.008838, lng: 82.935733 } },
  { value: 'Самара', label: 'Самара', bbox: '50.044656,53.092896~50.358154,53.320475', center: { lat: 53.195878, lng: 50.100193 } },
  { value: 'Краснодар', label: 'Краснодар', bbox: '38.869095,45.001469~39.081459,45.138085', center: { lat: 45.035470, lng: 38.975313 } },
  { value: 'Сочи', label: 'Сочи', bbox: '39.532990,43.388969~39.791107,43.685066', center: { lat: 43.585525, lng: 39.723062 } }
];

// Список видов спорта для парсинга
const SPORTS = [
  { value: 'padel', label: 'Падел', keywords: ['падел', 'padel', 'падел клуб', 'padel club', 'падел корт'] },
  { value: 'tennis', label: 'Теннис', keywords: ['теннис', 'tennis', 'теннисный клуб', 'теннисный корт', 'tennis club'] },
  { value: 'badminton', label: 'Бадминтон', keywords: ['бадминтон', 'badminton', 'бадминтонный клуб', 'бадминтонный корт'] }
];

export default function Parser() {
  const { admin } = useAuth();
  const navigate = useNavigate();
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedSport, setSelectedSport] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [parsedClubs, setParsedClubs] = useState<ParsedClub[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isCheckingClubs, setIsCheckingClubs] = useState(false);

  // Проверка доступа - только для суперадминов
  useEffect(() => {
    if (admin?.role !== 'superadmin') {
      navigate('/admin');
    }
  }, [admin, navigate]);

  // Запуск парсера
  const handleStartParsing = async () => {
    if (!selectedCity) {
      setError('Выберите город для парсинга');
      return;
    }

    if (!selectedSport) {
      setError('Выберите вид спорта для парсинга');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');
    setParsedClubs([]);

    try {
      const parseClubs = httpsCallable(functions, 'parseClubs');
      const cityData = CITIES.find(c => c.value === selectedCity);
      const sportData = SPORTS.find(s => s.value === selectedSport);
      
      const result = await parseClubs({ 
        city: selectedCity,
        bbox: cityData?.bbox,
        center: cityData?.center,
        sport: selectedSport,
        keywords: sportData?.keywords,
        timestamp: Date.now() // Добавляем timestamp для избежания кеширования
      });
      
      const data = result.data as { clubs: ParsedClub[] };
      
      // Логируем результаты для отладки
      console.log('Получены клубы от сервера:', data.clubs?.length);
      if (data.clubs && data.clubs.length > 0) {
        console.log('Первый клуб:', {
          name: data.clubs[0].name,
          photoUrl: data.clubs[0].photoUrl,
          hasGoogleMapsUrl: data.clubs[0].photoUrl?.includes('googleapis.com')
        });
        
        // Функция для проверки Google Maps URLs (исключаем только staticmap и streetview, но НЕ place/photo!)
        const isGoogleMapsUrl = (url: string) => {
          if (!url) return false;
          // Исключаем только Maps Static API и Street View, но оставляем Places Photos
          return (url.includes('maps.googleapis.com/maps/api/staticmap') || 
                  url.includes('maps.googleapis.com/maps/api/streetview') ||
                  url.includes('/staticmap') ||
                  url.includes('/streetview')) &&
                 !url.includes('/place/photo'); // НЕ фильтруем Google Places Photos
        };
        
        // Фильтруем Google Maps URLs на клиенте (на случай если старая версия функции)
        const filteredClubs = data.clubs.map(club => {
          // Проверяем и логируем Google Maps URLs
          if (isGoogleMapsUrl(club.photoUrl)) {
            console.warn(`Обнаружен Google Maps URL в photoUrl для клуба ${club.name}:`, club.photoUrl);
          }
          if (club.photos?.some((p: string) => isGoogleMapsUrl(p))) {
            console.warn(`Обнаружены Google Maps URLs в photos для клуба ${club.name}:`, 
              club.photos.filter((p: string) => isGoogleMapsUrl(p)));
          }
          
          return {
            ...club,
            // Удаляем только Google Maps API URLs, но оставляем Firebase Storage URLs
            photoUrl: isGoogleMapsUrl(club.photoUrl) ? undefined : club.photoUrl,
            logoUrl: isGoogleMapsUrl(club.logoUrl) ? undefined : club.logoUrl,
            photos: club.photos?.filter((p: string) => !isGoogleMapsUrl(p)) || []
          };
        });
        
        // Проверяем какие клубы уже зарегистрированы
        await checkExistingClubs(filteredClubs);
        const sportLabel = SPORTS.find(s => s.value === selectedSport)?.label || selectedSport;
        setSuccess(`Найдено ${data.clubs.length} ${sportLabel.toLowerCase()} клубов в городе ${selectedCity}`);
      } else {
        const sportLabel = SPORTS.find(s => s.value === selectedSport)?.label || selectedSport;
        setError(`${sportLabel} клубы не найдены в городе ${selectedCity}`);
      }
    } catch (err: any) {
      console.error('Ошибка парсинга:', err);
      setError(err.message || 'Ошибка при запуске парсера');
    } finally {
      setIsLoading(false);
    }
  };

  // Проверка существующих клубов
  const checkExistingClubs = async (clubs: ParsedClub[]) => {
    setIsCheckingClubs(true);
    
    try {
      const venuesRef = collection(db, 'venues');
      const allVenues = await getDocs(venuesRef);
      
      const updatedClubs = clubs.map(club => {
        let isRegistered = false;
        
        // Проверяем по адресу и координатам
        allVenues.forEach(doc => {
          const venue = doc.data();
          
          // Проверка по адресу
          if (venue.address && club.address) {
            const normalizedVenueAddress = venue.address.toLowerCase().trim();
            const normalizedClubAddress = club.address.toLowerCase().trim();
            if (normalizedVenueAddress === normalizedClubAddress) {
              isRegistered = true;
              return;
            }
          }
          
          // Проверка по координатам (с погрешностью ~100м)
          if (venue.coordinates && club.coordinates) {
            const latDiff = Math.abs(venue.coordinates.latitude - club.coordinates.latitude);
            const lngDiff = Math.abs(venue.coordinates.longitude - club.coordinates.longitude);
            if (latDiff < 0.001 && lngDiff < 0.001) {
              isRegistered = true;
              return;
            }
          }
        });
        
        return { ...club, isRegistered };
      });
      
      setParsedClubs(updatedClubs);
    } catch (err) {
      console.error('Ошибка проверки клубов:', err);
    } finally {
      setIsCheckingClubs(false);
    }
  };

  // Регистрация клуба на платформе
  const handleRegisterClub = async (club: ParsedClub) => {
    if (club.isRegistered) {
      return;
    }

    try {
      setError('');
      const registerClub = httpsCallable(functions, 'registerClubFromParser');
      
      // Логируем данные для отладки
      console.log('Отправляем данные клуба:', {
        name: club.name,
        coordinates: club.coordinates,
        hasCoordinates: !!club.coordinates,
        coordinatesDetails: club.coordinates ? {
          latitude: club.coordinates.latitude,
          longitude: club.coordinates.longitude
        } : null,
        photos: club.photos?.length || 0
      });
      
      // Используем ту же функцию проверки Google Maps URLs
      const isGoogleMapsUrl = (url: string) => {
        if (!url) return false;
        // Исключаем только Maps Static API и Street View, но оставляем Places Photos
        return (url.includes('maps.googleapis.com/maps/api/staticmap') || 
                url.includes('maps.googleapis.com/maps/api/streetview') ||
                url.includes('/staticmap') ||
                url.includes('/streetview')) &&
               !url.includes('/place/photo'); // НЕ фильтруем Google Places Photos
      };
      
      const cleanPhotoUrl = isGoogleMapsUrl(club.photoUrl) ? undefined : club.photoUrl;
      const cleanLogoUrl = isGoogleMapsUrl(club.logoUrl) ? undefined : club.logoUrl;
      const cleanPhotos = club.photos?.filter((p: string) => !isGoogleMapsUrl(p)) || [];
      
      const result = await registerClub({
        name: club.name,
        city: club.city,
        address: club.address,
        coordinates: club.coordinates,
        description: club.description,
        phones: club.phones || [],
        website: club.website || '',
        tags: club.tags,
        uri: club.uri,
        photoUrl: cleanPhotoUrl,
        logoUrl: cleanLogoUrl,
        photos: cleanPhotos,
        sportType: selectedSport // Передаем выбранный вид спорта из фильтра
      });
      
      console.log('Результат регистрации:', result);
      
      // Проверяем, что вернулось из функции
      if (result && result.data) {
        const venueId = (result.data as any).venueId;
        if (venueId) {
          console.log(`Клуб зарегистрирован с ID: ${venueId}`);
        }
      }
      
      setSuccess(`✅ Клуб "${club.name}" успешно зарегистрирован на платформе с кортом "${selectedSport}"!`);
      
      // Обновляем статус клуба
      setParsedClubs(prev => 
        prev.map(c => c.id === club.id ? { ...c, isRegistered: true } : c)
      );
      
      // Прокручиваем к уведомлению
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Ошибка регистрации:', err);
      setError(`❌ Ошибка регистрации клуба: ${err.message || 'Неизвестная ошибка'}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        🔍 Парсер клубов
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Этот инструмент позволяет находить спортивные клубы через Яндекс.Карты и регистрировать их на платформе.
      </Alert>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <FormControl fullWidth required>
                <InputLabel>Город *</InputLabel>
                <Select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  label="Город *"
                  disabled={isLoading}
                >
                  {CITIES.map(city => (
                    <MenuItem key={city.value} value={city.value}>
                      {city.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth required>
                <InputLabel>Вид спорта *</InputLabel>
                <Select
                  value={selectedSport}
                  onChange={(e) => setSelectedSport(e.target.value)}
                  label="Вид спорта *"
                  disabled={isLoading}
                >
                  {SPORTS.map(sport => (
                    <MenuItem key={sport.value} value={sport.value}>
                      {sport.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleStartParsing}
                disabled={!selectedCity || !selectedSport || isLoading}
                startIcon={isLoading ? <CircularProgress size={20} /> : <Search />}
                fullWidth
                size="large"
              >
                {isLoading ? 'Поиск...' : 'Начать поиск'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {isCheckingClubs && (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Проверка существующих клубов...</Typography>
        </Box>
      )}

      {parsedClubs.length > 0 && !isCheckingClubs && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Фото</TableCell>
                <TableCell>Название</TableCell>
                <TableCell>Адрес</TableCell>
                <TableCell>Координаты</TableCell>
                <TableCell>Теги</TableCell>
                <TableCell align="center">Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {parsedClubs.map((club, index) => (
                <TableRow 
                  key={club.id || index}
                  sx={{ 
                    backgroundColor: club.isRegistered ? 'action.hover' : 'inherit',
                    opacity: club.isRegistered ? 0.7 : 1
                  }}
                >
                  <TableCell>
                    <Box sx={{ width: 100, height: 80, position: 'relative' }}>
                      {club.photoUrl && !club.photoUrl.includes('/staticmap') && !club.photoUrl.includes('/streetview') ? (
                        <>
                          <img 
                            src={club.photoUrl} 
                            alt={club.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              borderRadius: '8px',
                              border: '1px solid #e0e0e0'
                            }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              // Если изображение не загрузилось, показываем заглушку
                              target.style.display = 'none';
                              // Показываем родительский элемент с заглушкой
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f5f5f5;border-radius:8px;border:1px solid #e0e0e0"><svg width="32" height="32" viewBox="0 0 24 24" fill="#999"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg></div>`;
                              }
                            }}
                          />
                          {/* Индикатор фото с сайта */}
                          {club.photoUrl && (
                            <Chip 
                              label="Сайт" 
                              size="small" 
                              sx={{ 
                                position: 'absolute', 
                                bottom: 4, 
                                left: 4,
                                fontSize: '10px',
                                height: '16px',
                                backgroundColor: 'rgba(76, 175, 80, 0.8)',
                                color: 'white'
                              }} 
                            />
                          )}
                          {/* Показываем количество фотографий */}
                          {club.photos && club.photos.length > 1 && (
                            <Chip 
                              label={`+${club.photos.length - 1}`} 
                              size="small" 
                              sx={{ 
                                position: 'absolute', 
                                top: 4, 
                                right: 4,
                                fontSize: '10px',
                                height: '16px',
                                backgroundColor: 'rgba(0,0,0,0.7)',
                                color: 'white'
                              }} 
                            />
                          )}
                        </>
                      ) : (
                        // Заглушка для клубов без фото или с Google API фото
                        <Box sx={{
                          width: '100%',
                          height: '100%',
                          backgroundColor: '#f5f5f5',
                          borderRadius: '8px',
                          border: '1px solid #e0e0e0',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 0.5
                        }}>
                          {(club.photoUrl?.includes('/staticmap') || club.photoUrl?.includes('/streetview')) ? (
                            // Если есть Google Maps API фото (карта или Street View)
                            <>
                              <Place sx={{ color: 'text.disabled', fontSize: 24 }} />
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>
                                {club.photoUrl.includes('streetview') ? 'Street View' : 'Карта'}
                              </Typography>
                            </>
                          ) : club.coordinates ? (
                            // Если нет фото, но есть координаты
                            <>
                              <Place sx={{ color: 'text.disabled', fontSize: 24 }} />
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>
                                Карта
                              </Typography>
                            </>
                          ) : (
                            // Если нет ничего
                            <>
                              <CameraAlt sx={{ color: 'text.disabled', fontSize: 24 }} />
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>
                                Нет фото
                              </Typography>
                            </>
                          )}
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {club.name}
                      </Typography>
                      {club.description && (
                        <Typography variant="body2" color="text.secondary">
                          {club.description}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <LocationOn fontSize="small" color="action" />
                        <Typography variant="body2">
                          {club.address}
                        </Typography>
                      </Box>
                      {club.website && (
                        <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                          <Language fontSize="small" color="action" />
                          <Typography 
                            variant="caption" 
                            color="primary"
                            component="a"
                            href={club.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ 
                              textDecoration: 'none',
                              '&:hover': { textDecoration: 'underline' }
                            }}
                          >
                            {club.website}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {club.coordinates ? (
                      <Tooltip title="Открыть на карте">
                        <Chip
                          size="small"
                          label={`${club.coordinates.latitude.toFixed(4)}, ${club.coordinates.longitude.toFixed(4)}`}
                          onClick={() => window.open(
                            `https://yandex.ru/maps/?ll=${club.coordinates?.longitude},${club.coordinates?.latitude}&z=17`,
                            '_blank'
                          )}
                        />
                      </Tooltip>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Не определены
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={0.5} flexWrap="wrap">
                      {club.tags.map(tag => (
                        <Chip 
                          key={tag} 
                          label={tag} 
                          size="small" 
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    {club.isRegistered ? (
                      <Chip 
                        icon={<Check />}
                        label="Зарегистрирован"
                        color="success"
                        variant="filled"
                      />
                    ) : (
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        startIcon={<Add />}
                        onClick={() => handleRegisterClub(club)}
                      >
                        Зарегистрировать
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}