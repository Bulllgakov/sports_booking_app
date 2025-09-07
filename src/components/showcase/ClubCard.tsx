import React, { useState } from 'react';
import { Venue } from '../../types/venue';
import './ClubCard.css';

interface ClubCardProps {
  club: Venue;
  distance: string | null;
  onClick: () => void;
}

const ClubCard: React.FC<ClubCardProps> = ({ club, distance, onClick }) => {
  const [imageError, setImageError] = useState(false);
  
  const getSportIcons = () => {
    const sports = club.sports || [];
    const icons: { [key: string]: string } = {
      padel: '🎾',
      tennis: '🎾',
      badminton: '🏸',
    };
    
    return sports.map(sport => icons[sport] || '🏆').join(' ');
  };

  const getWorkingHours = () => {
    if (club.openTime && club.closeTime) {
      return `${club.openTime} - ${club.closeTime}`;
    }
    return '07:00 - 23:00';
  };

  const getPrice = () => {
    // Здесь можно вычислить минимальную цену из прайс-листа
    if (club.minPrice) {
      return `от ${club.minPrice} ₽/час`;
    }
    return 'Уточняйте цены';
  };

  const getImageUrl = () => {
    if (imageError) {
      return '/showcase/images/default-club.jpg';
    }
    if (club.photos && club.photos.length > 0) {
      return club.photos[0];
    }
    if (club.photoUrl) {
      return club.photoUrl;
    }
    return '/showcase/images/default-club.jpg';
  };
  
  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div className="club-card" onClick={onClick}>
      <div className="club-card-image">
        <img 
          src={getImageUrl()} 
          alt={club.name}
          onError={handleImageError}
          loading="lazy"
        />
        {distance && (
          <div className="club-card-distance">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {distance}
          </div>
        )}
        <div className="club-card-sports">
          {getSportIcons()}
        </div>
      </div>

      <div className="club-card-content">
        <h3 className="club-card-title">{club.name}</h3>
        
        <div className="club-card-info">
          <div className="club-card-address">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{club.address || 'Адрес не указан'}</span>
          </div>

          <div className="club-card-hours">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span>{getWorkingHours()}</span>
          </div>

          {club.features && club.features.length > 0 && (
            <div className="club-card-features">
              {club.features.slice(0, 3).map((feature, index) => (
                <span key={index} className="feature-tag">{feature}</span>
              ))}
            </div>
          )}
        </div>

        <div className="club-card-footer">
          <div className="club-card-price">{getPrice()}</div>
          <button 
            className="club-card-book"
            onClick={(e) => {
              e.stopPropagation();
              window.location.href = `/club/${club.id}`;
            }}
          >
            Забронировать
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClubCard;