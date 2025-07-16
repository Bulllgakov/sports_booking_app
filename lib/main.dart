import 'package:flutter/material.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Все Корты',
      theme: ThemeData(
        primarySwatch: Colors.green,
        primaryColor: const Color(0xFF00A86B),
        useMaterial3: true,
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF00A86B),
          foregroundColor: Colors.white,
          elevation: 0,
        ),
      ),
      home: const HomePage(),
      debugShowCheckedModeBanner: false,
    );
  }
}

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Все Корты'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Логотип и приветствие
          Column(
            children: const [
              Icon(
                Icons.sports_tennis,
                size: 80,
                color: Color(0xFF00A86B),
              ),
              SizedBox(height: 16),
              Text(
                'Добро пожаловать!',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              SizedBox(height: 8),
              Text(
                'Бронируйте спортивные корты\nв вашем городе',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.grey,
                ),
              ),
            ],
          ),
          const SizedBox(height: 32),
          
          // Функциональные кнопки
          _buildMenuCard(
            context,
            icon: Icons.search,
            title: 'Найти корт',
            subtitle: 'Поиск доступных кортов рядом',
            onTap: () => _showComingSoon(context),
          ),
          _buildMenuCard(
            context,
            icon: Icons.calendar_today,
            title: 'Мои бронирования',
            subtitle: 'История и активные брони',
            onTap: () => _showComingSoon(context),
          ),
          _buildMenuCard(
            context,
            icon: Icons.group,
            title: 'Найти игру',
            subtitle: 'Присоединиться к открытой игре',
            onTap: () => _showComingSoon(context),
          ),
          _buildMenuCard(
            context,
            icon: Icons.person,
            title: 'Профиль',
            subtitle: 'Настройки и личные данные',
            onTap: () => _showComingSoon(context),
          ),
          _buildMenuCard(
            context,
            icon: Icons.info_outline,
            title: 'О приложении',
            subtitle: 'Информация и контакты',
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const AboutPage()),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildMenuCard(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: const Color(0xFF00A86B).withOpacity(0.1),
          child: Icon(icon, color: const Color(0xFF00A86B)),
        ),
        title: Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.arrow_forward_ios, size: 16),
        onTap: onTap,
      ),
    );
  }

  void _showComingSoon(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Эта функция скоро будет доступна!'),
        backgroundColor: Color(0xFF00A86B),
      ),
    );
  }
}

// Экран "О приложении"
class AboutPage extends StatelessWidget {
  const AboutPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('О приложении'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: const [
                    Icon(
                      Icons.sports_tennis,
                      size: 64,
                      color: Color(0xFF00A86B),
                    ),
                    SizedBox(height: 16),
                    Text(
                      'Все Корты',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 8),
                    Text(
                      'Версия 1.0.0',
                      style: TextStyle(
                        color: Colors.grey,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text(
                      'О платформе',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 12),
                    Text(
                      'Все Корты - это удобная платформа для бронирования спортивных кортов в вашем городе. '
                      'Мы объединяем спортивные клубы и любителей активного отдыха.',
                    ),
                    SizedBox(height: 16),
                    Text(
                      'Функции приложения:',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                    SizedBox(height: 8),
                    Text('• Поиск кортов рядом с вами'),
                    Text('• Онлайн бронирование'),
                    Text('• Поиск партнеров для игры'),
                    Text('• История бронирований'),
                    Text('• Оплата через приложение'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Контакты',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),
                    ListTile(
                      leading: const Icon(Icons.email, color: Color(0xFF00A86B)),
                      title: const Text('support@allcourt.ru'),
                      subtitle: const Text('Служба поддержки'),
                      onTap: () {},
                    ),
                    ListTile(
                      leading: const Icon(Icons.phone, color: Color(0xFF00A86B)),
                      title: const Text('+7 (800) 123-45-67'),
                      subtitle: const Text('Горячая линия'),
                      onTap: () {},
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}