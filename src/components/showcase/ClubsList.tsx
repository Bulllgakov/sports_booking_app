import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Venue } from '../../types/venue';
import ClubCard from './ClubCard';
import './ClubsList.css';

interface ClubsListProps {
  clubs: Venue[];
  loading: boolean;
  userLocation: { lat: number; lng: number } | null;
  title?: string;
}

const ClubsList: React.FC<ClubsListProps> = ({ clubs, loading, userLocation, title }) => {
  const navigate = useNavigate();

  const calculateDistance = (lat: number, lng: number) => {
    if (!userLocation) return null;
    
    const R = 6371; // Радиус Земли в км
    const dLat = (lat - userLocation.lat) * Math.PI / 180;
    const dLng = (lng - userLocation.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(userLocation.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    if (distance < 1) {
      return `${Math.round(distance * 1000)} м`;
    }
    return `${distance.toFixed(1)} км`;
  };

  if (loading) {
    return (
      <div className="clubs-loading">
        <div className="loading-spinner"></div>
        <p>Загружаем клубы...</p>
      </div>
    );
  }

  if (clubs.length === 0) {
    return (
      <div className="clubs-empty">
        <div className="empty-icon">🏸</div>
        <h2>Клубы не найдены</h2>
        <p>Попробуйте изменить фильтры или выбрать другой город</p>
      </div>
    );
  }

  return (
    <div className="clubs-container">
      <div className="clubs-header">
        <h1>{title || 'Спортивные клубы'}</h1>
        <p className="clubs-count">Найдено {clubs.length} {clubs.length === 1 ? 'клуб' : clubs.length < 5 ? 'клуба' : 'клубов'}</p>
      </div>

      <div className="clubs-grid">
        {clubs.map(club => (
          <ClubCard
            key={club.id}
            club={club}
            distance={calculateDistance(club.latitude || 0, club.longitude || 0)}
            onClick={() => navigate(`/venue/${club.id}`)}
          />
        ))}
      </div>
    </div>
  );
};

export default ClubsList;