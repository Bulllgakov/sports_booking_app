import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import './Footer.css';

interface CompanyDetails {
  companyType: string;
  fullName: string;
  inn: string;
  ogrn: string;
  contacts: {
    phone: string;
    email: string;
  };
}

const Footer: React.FC = () => {
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails | null>(null);

  useEffect(() => {
    loadCompanyDetails();
  }, []);

  const loadCompanyDetails = async () => {
    try {
      const docRef = doc(db, 'settings', 'company');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setCompanyDetails(docSnap.data() as CompanyDetails);
      }
    } catch (error) {
      console.error('Error loading company details:', error);
    }
  };

  return (
    <footer className="showcase-footer">
      <div className="footer-container">
        <div className="footer-content">
          {/* О компании */}
          <div className="footer-section">
            <div className="footer-logo">
              <img src="/showcase/logo/allcourts_logo.svg" alt="AllCourt" />
              <span>AllCourt</span>
            </div>
            <p className="footer-description">
              Платформа для бронирования спортивных кортов и поиска партнёров для игры
            </p>
            <div className="footer-social">
              <a href="#" aria-label="Telegram">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.56c-.21 2.27-1.13 7.75-1.6 10.28-.2 1.07-.59 1.43-.97 1.46-.82.07-1.45-.54-2.24-.99-1.24-.71-1.94-1.15-3.14-1.84-1.39-.79-.49-1.23.3-1.94.21-.19 3.85-3.52 3.92-3.82.01-.04.01-.17-.06-.25s-.18-.05-.26-.03c-.11.03-1.79 1.14-5.06 3.35-.48.33-.91.49-1.3.48-.43-.01-1.25-.24-1.86-.44-.75-.24-1.35-.37-1.3-.79.03-.23.32-.46.89-.69 3.52-1.53 5.87-2.54 7.05-3.03 3.36-1.39 4.06-1.63 4.51-1.64.1 0 .32.02.47.15.12.1.15.23.17.34-.01.06-.01.24-.02.38z"/>
                </svg>
              </a>
              <a href="#" aria-label="VK">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5.04 14.29c-.44-.44-1.14-1.04-1.9-1.46.45-.59.91-1.23 1.13-1.64.32-.58.36-.91.12-1.15-.24-.24-.57-.2-1.15.12-.41.22-1.05.68-1.64 1.13-.42-.76-1.02-1.46-1.46-1.9-.31-.31-.66-.46-1.02-.46s-.71.15-1.02.46c-.44.44-1.04 1.14-1.46 1.9-.59-.45-1.23-.91-1.64-1.13-.58-.32-.91-.36-1.15-.12s-.2.57.12 1.15c.22.41.68 1.05 1.13 1.64-.76.42-1.46 1.02-1.9 1.46-.62.62-.62 1.42 0 2.04.44.44 1.14 1.04 1.9 1.46-.45.59-.91 1.23-1.13 1.64-.32.58-.36.91-.12 1.15.15.15.33.22.54.22.21 0 .45-.07.61-.1.41-.22 1.05-.68 1.64-1.13.42.76 1.02 1.46 1.46 1.9.31.31.66.46 1.02.46s.71-.15 1.02-.46c.44-.44 1.04-1.14 1.46-1.9.59.45 1.23.91 1.64 1.13.16.03.4.1.61.1.21 0 .39-.07.54-.22.24-.24.2-.57-.12-1.15-.22-.41-.68-1.05-1.13-1.64.76-.42 1.46-1.02 1.9-1.46.62-.62.62-1.42 0-2.04z"/>
                </svg>
              </a>
              <a href="#" aria-label="Instagram">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Для игроков */}
          <div className="footer-section">
            <h3>Для игроков</h3>
            <ul>
              <li><a href="/moscow">Найти корт</a></li>
              <li><a href="#">Открытые игры</a></li>
              <li><a href="#">Поиск партнёров</a></li>
              <li><a href="#">Мобильное приложение</a></li>
              <li><a href="#">Как это работает</a></li>
            </ul>
          </div>

          {/* Для клубов */}
          <div className="footer-section">
            <h3>Для клубов</h3>
            <ul>
              <li><a href="/business">Подключить клуб</a></li>
              <li><a href="/demo">Демо версия</a></li>
              <li><a href="/business#pricing">Тарифы</a></li>
              <li><a href="/business#features">Возможности</a></li>
              <li><a href="/admin">Вход в админку</a></li>
            </ul>
          </div>

          {/* Контакты */}
          <div className="footer-section">
            <h3>Контакты</h3>
            <div className="contact-info">
              <div className="contact-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                <a href={`tel:${companyDetails?.contacts?.phone || '+79268680440'}`}>
                  {companyDetails?.contacts?.phone || '+7 (926) 868-04-40'}
                </a>
              </div>
              
              <div className="contact-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <a href={`mailto:${companyDetails?.contacts?.email || 'info@allcourt.ru'}`}>
                  {companyDetails?.contacts?.email || 'info@allcourt.ru'}
                </a>
              </div>

              <div className="contact-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <span>Москва, Россия</span>
              </div>
            </div>
          </div>
        </div>

        {/* Нижняя часть */}
        <div className="footer-bottom">
          <div className="footer-legal">
            <p>&copy; 2024 {companyDetails?.fullName || 'ИП Хаметов Булат Маратович'}</p>
            <p>
              ИНН: {companyDetails?.inn || '026401027275'} | 
              {companyDetails?.companyType === 'ИП' ? 'ОГРНИП' : 'ОГРН'}: {companyDetails?.ogrn || '323028000185206'}
            </p>
          </div>
          <div className="footer-links">
            <a href="/privacy">Политика конфиденциальности</a>
            <a href="/offer">Договор оферты</a>
            <a href="/terms">Пользовательское соглашение</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;