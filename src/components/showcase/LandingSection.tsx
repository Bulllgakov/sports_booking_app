import React from 'react';
import './LandingSection.css';

const LandingSection: React.FC = () => {
  return (
    <>
      {/* Блок для игроков */}
      <section className="landing-section players-section">
        <div className="section-container">
          <div className="section-content">
            <div className="section-text">
              <h2>AllCourt для игроков</h2>
              <p className="section-subtitle">
                Находите корты, партнёров и открытые игры в вашем городе
              </p>
              
              <div className="features-list">
                <div className="feature-item">
                  <div className="feature-icon">🎯</div>
                  <div className="feature-content">
                    <h3>Поиск партнёров для игры</h3>
                    <p>Присоединяйтесь к открытым играм с игроками вашего уровня или создавайте свои</p>
                  </div>
                </div>
                
                <div className="feature-item">
                  <div className="feature-icon">📍</div>
                  <div className="feature-content">
                    <h3>Корты рядом с вами</h3>
                    <p>500+ спортивных клубов по всей России. Теннис, падел, бадминтон</p>
                  </div>
                </div>
                
                <div className="feature-item">
                  <div className="feature-icon">⚡</div>
                  <div className="feature-content">
                    <h3>Бронирование в два клика</h3>
                    <p>Забронируйте корт онлайн 24/7 без звонков и ожидания</p>
                  </div>
                </div>
                
                <div className="feature-item">
                  <div className="feature-icon">💰</div>
                  <div className="feature-content">
                    <h3>Лучшие цены</h3>
                    <p>Прямые цены от клубов без наценок и комиссий</p>
                  </div>
                </div>
              </div>

              <div className="section-buttons">
                <a href="/moscow" className="btn btn-primary">Найти корт</a>
                <a href="#" className="btn btn-secondary">Скачать приложение</a>
              </div>
            </div>
            
            <div className="section-image">
              <div className="phone-mockup">
                <div className="phone-screen">
                  <div className="app-header">
                    <h3 style={{ fontSize: '20px' }}>Привет, Анна!</h3>
                    <span style={{ fontSize: '24px' }}>🔔</span>
                  </div>
                  <p style={{ color: '#6b7280', marginBottom: '16px' }}>📍 Москва</p>
                  <h4 style={{ marginBottom: '16px' }}>Рядом с вами</h4>
                  <div className="venue-card">
                    <div className="venue-card-header">
                      <h4>SmartPadel</h4>
                      <span className="price">от 2000₽</span>
                    </div>
                    <p className="address">ул. Профсоюзная, 69 • 2.3 км</p>
                  </div>
                  <div className="venue-card">
                    <div className="venue-card-header">
                      <h4>Теннисный клуб Олимп</h4>
                      <span className="price">от 1500₽</span>
                    </div>
                    <p className="address">Ленинский пр-т, 123 • 3.7 км</p>
                  </div>
                  <div className="venue-card">
                    <div className="venue-card-header">
                      <h4>BadmintonPro</h4>
                      <span className="price">от 800₽</span>
                    </div>
                    <p className="address">ул. Вавилова, 45 • 4.2 км</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Блок для клубов */}
      <section className="landing-section clubs-section">
        <div className="section-container">
          <div className="section-content reverse">
            <div className="section-image">
              <div className="dashboard-mockup">
                <h3 style={{ fontSize: '24px', marginBottom: '24px' }}>Админ-панель с полным контролем</h3>
                <div className="stats-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4>Сегодняшняя статистика</h4>
                    <span style={{ color: '#00D632', fontWeight: 600 }}>+23%</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                    <div>
                      <div style={{ color: '#6b7280', fontSize: '14px' }}>Бронирований</div>
                      <div style={{ fontSize: '24px', fontWeight: 700 }}>47</div>
                    </div>
                    <div>
                      <div style={{ color: '#6b7280', fontSize: '14px' }}>Доход</div>
                      <div style={{ fontSize: '24px', fontWeight: 700 }}>94,500₽</div>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div className="admin-button active">
                    Календарь
                  </div>
                  <div className="admin-button">
                    Клиенты
                  </div>
                  <div className="admin-button">
                    Отчеты
                  </div>
                </div>
              </div>
            </div>
            
            <div className="section-text">
              <h2>AllCourt для клубов</h2>
              <p className="section-subtitle">
                Автоматизация бронирования и управление клубом в одной системе
              </p>
              
              <div className="features-list">
                <div className="feature-item">
                  <div className="feature-icon">🚀</div>
                  <div className="feature-content">
                    <h3>Увеличение загрузки кортов</h3>
                    <p>Привлекайте новых клиентов через нашу витрину и мобильное приложение</p>
                  </div>
                </div>
                
                <div className="feature-item">
                  <div className="feature-icon">🤖</div>
                  <div className="feature-content">
                    <h3>Автоматизация бронирования</h3>
                    <p>Клиенты бронируют корты сами 24/7, оплата онлайн, никаких звонков</p>
                  </div>
                </div>
                
                <div className="feature-item">
                  <div className="feature-icon">📊</div>
                  <div className="feature-content">
                    <h3>Аналитика и отчёты</h3>
                    <p>Контролируйте загрузку, выручку и эффективность в реальном времени</p>
                  </div>
                </div>
                
                <div className="feature-item">
                  <div className="feature-icon">🎁</div>
                  <div className="feature-content">
                    <h3>Бесплатный старт</h3>
                    <p>Начните без вложений. Платите только когда растёт ваш бизнес</p>
                  </div>
                </div>
              </div>

              <div className="section-buttons">
                <a href="/business" className="btn btn-primary">Подключить клуб</a>
                <a href="/demo" className="btn btn-secondary">Демо версия</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Блок отзывов */}
      <section className="landing-section testimonials-section">
        <div className="section-container">
          <h2>Они говорят о нас</h2>
          <p className="section-subtitle">Отзывы игроков и владельцев клубов</p>
          
          <div className="testimonials-grid">
            <div className="testimonial-card">
              <div className="testimonial-header">
                <div className="testimonial-avatar">АК</div>
                <div className="testimonial-info">
                  <h4>Александр Кузнецов</h4>
                  <p>Игрок в падел</p>
                </div>
              </div>
              <div className="testimonial-content">
                <div className="stars">⭐⭐⭐⭐⭐</div>
                <p>"Отличное приложение! Теперь не нужно звонить в клубы - всё можно забронировать онлайн. Особенно нравится функция поиска партнёров для игры."</p>
              </div>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-header">
                <div className="testimonial-avatar">МП</div>
                <div className="testimonial-info">
                  <h4>Мария Петрова</h4>
                  <p>Владелец клуба "Ace Tennis"</p>
                </div>
              </div>
              <div className="testimonial-content">
                <div className="stars">⭐⭐⭐⭐⭐</div>
                <p>"С AllCourt загрузка кортов выросла на 30%. Клиенты довольны удобством бронирования, а мы экономим время на администрировании."</p>
              </div>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-header">
                <div className="testimonial-avatar">ДС</div>
                <div className="testimonial-info">
                  <h4>Дмитрий Соколов</h4>
                  <p>Любитель тенниса</p>
                </div>
              </div>
              <div className="testimonial-content">
                <div className="stars">⭐⭐⭐⭐⭐</div>
                <p>"Удобно что можно сразу видеть свободные слоты и цены. Больше не трачу время на обзвон клубов. Рекомендую всем!"</p>
              </div>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-header">
                <div className="testimonial-avatar">ЕВ</div>
                <div className="testimonial-info">
                  <h4>Елена Волкова</h4>
                  <p>Директор "Badminton Pro"</p>
                </div>
              </div>
              <div className="testimonial-content">
                <div className="stars">⭐⭐⭐⭐⭐</div>
                <p>"Система AllCourt помогла нам полностью автоматизировать процесс бронирования. Теперь администратор может заниматься более важными задачами."</p>
              </div>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-header">
                <div className="testimonial-avatar">ИГ</div>
                <div className="testimonial-info">
                  <h4>Игорь Громов</h4>
                  <p>Организатор турниров</p>
                </div>
              </div>
              <div className="testimonial-content">
                <div className="stars">⭐⭐⭐⭐⭐</div>
                <p>"Функция открытых игр - это гениально! Легко собрать компанию для игры, даже если друзья заняты. Играю теперь в 2 раза чаще."</p>
              </div>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-header">
                <div className="testimonial-avatar">НР</div>
                <div className="testimonial-info">
                  <h4>Наталья Романова</h4>
                  <p>Управляющий "Padel Moscow"</p>
                </div>
              </div>
              <div className="testimonial-content">
                <div className="stars">⭐⭐⭐⭐⭐</div>
                <p>"Отличная поддержка и постоянные обновления. Система развивается, учитывает наши пожелания. Это редкость для российских сервисов."</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default LandingSection;