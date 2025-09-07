import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { searchCities } from '../../data/russianCities';
import './Header.css';

interface City {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface Sport {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface HeaderProps {
  cities: City[];
  selectedCity: string;
  onCityChange: (cityId: string) => void;
  sports: Sport[];
  selectedSport: string;
  onSportChange: (sportId: string) => void;
  onSearch: (query: string) => void;
  clubs?: any[]; // Для подсказок в поиске
}

const Header: React.FC<HeaderProps> = ({
  cities,
  selectedCity,
  onCityChange,
  sports,
  selectedSport,
  onSportChange,
  onSearch,
  clubs = [],
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [citySuggestions, setCitySuggestions] = useState<any[]>([]);
  const [suggestionType, setSuggestionType] = useState<'clubs' | 'cities'>('clubs');
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentCity = cities.find(c => c.id === selectedCity) || cities[0];

  // Инициализация поля поиска с городом
  useEffect(() => {
    if (currentCity) {
      if (currentCity.id === 'all') {
        setSearchQuery('Россия, ');
      } else {
        setSearchQuery(`${currentCity.name}, `);
      }
    } else {
      setSearchQuery('');
    }
  }, [currentCity]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Извлекаем город и поисковый запрос
    const parts = searchQuery.split(',').map(p => p.trim());
    
    if (parts.length > 1) {
      // Есть город и запрос
      const cityName = parts[0];
      const query = parts.slice(1).join(', ');
      
      // Проверяем, если это "Россия"
      if (cityName.toLowerCase() === 'россия') {
        if (selectedCity !== 'all') {
          onCityChange('all');
        }
      } else {
        // Находим город по имени
        const city = cities.find(c => c.name.toLowerCase() === cityName.toLowerCase());
        if (city && city.id !== selectedCity) {
          onCityChange(city.id);
        }
      }
      onSearch(query);
    } else {
      // Только поисковый запрос
      onSearch(searchQuery);
    }
    
    setShowSuggestions(false);
  };

  // Обработка изменения поиска
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    
    // Генерируем подсказки
    if (value.length > 1) {
      const parts = value.split(',').map(p => p.trim());
      
      if (parts.length === 1) {
        // Если нет запятой, ищем города
        const cityQuery = parts[0];
        const cities = searchCities(cityQuery, 5);
        
        if (cities.length > 0) {
          setCitySuggestions(cities);
          setSuggestionType('cities');
          setShowSuggestions(true);
        } else {
          // Если города не найдены, ищем клубы
          const filtered = clubs.filter(club => 
            club.name?.toLowerCase().includes(cityQuery.toLowerCase()) ||
            club.address?.toLowerCase().includes(cityQuery.toLowerCase())
          ).slice(0, 5);
          
          setSuggestions(filtered);
          setSuggestionType('clubs');
          setShowSuggestions(filtered.length > 0);
        }
      } else if (parts.length > 1) {
        // Если есть запятая, ищем клубы
        const query = parts[parts.length - 1].toLowerCase();
        
        if (query) {
          const filtered = clubs.filter(club => 
            club.name?.toLowerCase().includes(query) ||
            club.address?.toLowerCase().includes(query)
          ).slice(0, 5);
          
          setSuggestions(filtered);
          setSuggestionType('clubs');
          setShowSuggestions(filtered.length > 0);
        } else {
          setShowSuggestions(false);
        }
      }
    } else {
      setShowSuggestions(false);
    }
  };

  // Обработка фокуса на поле поиска
  const handleSearchFocus = () => {
    if (currentCity && !searchQuery) {
      const cityText = currentCity.id === 'all' ? 'Россия' : currentCity.name;
      setSearchQuery(`${cityText}, `);
      // Устанавливаем курсор после запятой
      setTimeout(() => {
        if (inputRef.current) {
          const cursorPos = cityText.length + 2;
          inputRef.current.setSelectionRange(cursorPos, cursorPos);
        }
      }, 0);
    }
  };

  // Выбор подсказки клуба
  const handleClubSuggestionClick = (club: any) => {
    const parts = searchQuery.split(',');
    if (parts.length > 1) {
      setSearchQuery(`${parts[0]}, ${club.name}`);
    } else {
      setSearchQuery(club.name);
    }
    setShowSuggestions(false);
    onSearch(club.name);
  };

  // Выбор подсказки города
  const handleCitySuggestionClick = (city: any) => {
    setSearchQuery(`${city.name}, `);
    setShowSuggestions(false);
    
    // Обновляем выбранный город
    const foundCity = cities.find(c => c.name === city.name);
    if (foundCity) {
      onCityChange(foundCity.id);
    } else {
      // Если города нет в основном списке, используем "all"
      onCityChange('all');
    }
    
    // Устанавливаем курсор после запятой
    setTimeout(() => {
      if (inputRef.current) {
        const newLength = `${city.name}, `.length;
        inputRef.current.setSelectionRange(newLength, newLength);
        inputRef.current.focus();
      }
    }, 0);
  };

  // Закрытие подсказок при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="showcase-header">
      <div className="header-container">
        <div className="header-top">
          <Link to="/" className="logo">
            <img src="/showcase/logo/allcourts_logo.svg" alt="AllCourt" className="logo-icon" />
            <span className="logo-text">AllCourt</span>
          </Link>

          <form className="search-form" onSubmit={handleSearch}>
            <div className="search-container" ref={searchRef}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="search-icon">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                className="search-input"
                placeholder="Город, название клуба или адрес..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={handleSearchFocus}
              />
              
              {showSuggestions && (
                <div className="search-suggestions">
                  {suggestionType === 'cities' ? (
                    // Подсказки городов
                    citySuggestions.map((city, index) => (
                      <div
                        key={index}
                        className="suggestion-item city-suggestion"
                        onClick={() => handleCitySuggestionClick(city)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="suggestion-icon">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <div className="suggestion-name">{city.name}</div>
                      </div>
                    ))
                  ) : (
                    // Подсказки клубов
                    suggestions.map((club, index) => (
                      <div
                        key={index}
                        className="suggestion-item"
                        onClick={() => handleClubSuggestionClick(club)}
                      >
                        <div className="suggestion-name">{club.name}</div>
                        <div className="suggestion-address">{club.address}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </form>

          <div className="header-actions">
            <a href="/business" className="business-link">
              Для бизнеса
            </a>
          </div>
        </div>

        <div className="sports-filter">
          {sports.map(sport => (
            <button
              key={sport.id}
              className={`sport-button ${sport.id === selectedSport ? 'active' : ''}`}
              onClick={() => onSportChange(sport.id)}
              style={{
                '--sport-color': sport.color,
                backgroundColor: sport.id === selectedSport ? sport.color : undefined,
              } as React.CSSProperties}
            >
              <span className="sport-icon">{sport.icon}</span>
              <span className="sport-name">{sport.name}</span>
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};

export default Header;