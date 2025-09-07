import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Venue } from '../../types/venue';
import './ClubPage.css';

const ClubPage: React.FC = () => {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const [club, setClub] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    const loadClub = async () => {
      if (!clubId) return;

      setLoading(true);
      try {
        const venueDoc = await getDoc(doc(db, 'venues', clubId));
        if (venueDoc.exists()) {
          setClub({ id: venueDoc.id, ...venueDoc.data() } as Venue);
        } else {
          navigate('/');
        }
      } catch (error) {
        console.error('Ошибка загрузки клуба:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    loadClub();
  }, [clubId, navigate]);

  if (loading) {
    return (
      <div className="club-page-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!club) {
    return null;
  }

  const getSportIcons = () => {
    const sports = club.sports || [];
    const icons: { [key: string]: { icon: string; name: string } } = {
      padel: { icon: '🎾', name: 'Падел' },
      tennis: { icon: '🎾', name: 'Теннис' },
      badminton: { icon: '🏸', name: 'Бадминтон' },
    };
    
    return sports.map(sport => icons[sport] || { icon: '🏆', name: sport });
  };

  const handleBooking = () => {
    // Переход на страницу бронирования в админке
    window.location.href = `/club/${clubId}`;
  };

  return (
    <div className="club-page">
      <header className="club-page-header">
        <div className="header-container">
          <button className="back-button" onClick={() => navigate(-1)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M19 12H5M5 12L12 19M5 12L12 5" />
            </svg>
            Назад
          </button>
        </div>
      </header>

      <div className="club-page-content">
        <div className="club-gallery">
          {club.photos && club.photos.length > 0 ? (
            <>
              <div className="gallery-main">
                <img src={club.photos[selectedImage]} alt={club.name} />
              </div>
              {club.photos.length > 1 && (
                <div className="gallery-thumbs">
                  {club.photos.map((photo, index) => (
                    <button
                      key={index}
                      className={`thumb ${index === selectedImage ? 'active' : ''}`}
                      onClick={() => setSelectedImage(index)}
                    >
                      <img src={photo} alt={`${club.name} ${index + 1}`} />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="gallery-placeholder">
              <img src="/showcase/images/default-club.jpg" alt={club.name} />
            </div>
          )}
        </div>

        <div className="club-info">
          <div className="club-info-header">
            <h1>{club.name}</h1>
            <div className="club-sports">
              {getSportIcons().map((sport, index) => (
                <span key={index} className="sport-badge">
                  <span className="sport-icon">{sport.icon}</span>
                  <span className="sport-name">{sport.name}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="club-details">
            <div className="detail-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <div>
                <div className="detail-label">Адрес</div>
                <div className="detail-value">{club.address || 'Адрес не указан'}</div>
              </div>
            </div>

            <div className="detail-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              <div>
                <div className="detail-label">Время работы</div>
                <div className="detail-value">
                  {club.openTime && club.closeTime 
                    ? `${club.openTime} - ${club.closeTime}` 
                    : '07:00 - 23:00'}
                </div>
              </div>
            </div>

            {club.phone && (
              <div className="detail-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <div>
                  <div className="detail-label">Телефон</div>
                  <a href={`tel:${club.phone}`} className="detail-value">{club.phone}</a>
                </div>
              </div>
            )}
          </div>

          {club.description && (
            <div className="club-description">
              <h2>О клубе</h2>
              <p>{club.description}</p>
            </div>
          )}

          {club.features && club.features.length > 0 && (
            <div className="club-features">
              <h2>Удобства</h2>
              <div className="features-grid">
                {club.features.map((feature, index) => (
                  <div key={index} className="feature-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="club-actions">
            <button className="book-button" onClick={handleBooking}>
              Забронировать корт
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClubPage;