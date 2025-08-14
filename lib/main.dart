import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:provider/provider.dart';
import 'firebase_options.dart';
import 'core/theme/colors.dart';
import 'core/theme/text_styles.dart';
import 'core/theme/spacing.dart';
import 'providers/venues_provider.dart';
import 'providers/location_provider.dart';
import 'providers/open_games_provider.dart';
import 'services/auth_service.dart';
import 'screens/simple_home_screen.dart';
import 'screens/simple_find_game_screen.dart';
import 'screens/simple_my_bookings_screen.dart';
import 'screens/simple_profile_screen_v2.dart';
import 'screens/login_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => LocationProvider()),
        ChangeNotifierProvider(create: (_) => VenuesProvider()),
        ChangeNotifierProvider(create: (_) => OpenGamesProvider()),
        ChangeNotifierProvider(create: (_) => AuthService()),
      ],
      child: MaterialApp(
        title: 'Все Корты',
        theme: ThemeData(
          primaryColor: AppColors.primary,
          colorScheme: ColorScheme.fromSeed(seedColor: AppColors.primary),
          useMaterial3: true,
          fontFamily: 'Inter',
          elevatedButtonTheme: ElevatedButtonThemeData(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: AppColors.white,
              textStyle: AppTextStyles.button,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
              ),
              minimumSize: const Size(double.infinity, AppSpacing.buttonHeight),
            ),
          ),
        ),
        home: const MainScreen(),
        debugShowCheckedModeBanner: false,
      ),
    );
  }
}

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _selectedIndex = 0;
  
  final List<Widget> _screens = [
    const SimpleHomeScreen(),
    const SimpleFindGameScreen(),
    const SimpleMyBookingsScreen(),
    const SimpleProfileScreenV2(),
  ];

  void _onItemTapped(int index) async {
    // Проверяем авторизацию для вкладок "Мои брони" и "Профиль"
    if (index == 2 || index == 3) {
      final authService = context.read<AuthService>();
      if (!authService.isAuthenticated) {
        // Показываем диалог с предложением войти
        final shouldLogin = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Требуется авторизация'),
            content: Text(
              index == 2 
                ? 'Для просмотра ваших бронирований необходимо войти в приложение'
                : 'Для доступа к профилю необходимо войти в приложение'
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('Отмена'),
              ),
              ElevatedButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text('Войти'),
              ),
            ],
          ),
        );
        
        if (shouldLogin == true && mounted) {
          final result = await Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => const LoginScreen(),
            ),
          );
          
          // Если пользователь успешно авторизовался, переходим на выбранную вкладку
          if (result == true && mounted) {
            setState(() {
              _selectedIndex = index;
            });
          }
        }
        return; // Не меняем вкладку если пользователь не авторизовался
      }
    }
    
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_selectedIndex],
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: AppColors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.1),
              blurRadius: 10,
              offset: const Offset(0, -2),
            ),
          ],
          borderRadius: const BorderRadius.vertical(
            top: Radius.circular(30),
          ),
        ),
        child: ClipRRect(
          borderRadius: const BorderRadius.vertical(
            top: Radius.circular(30),
          ),
          child: BottomNavigationBar(
            currentIndex: _selectedIndex,
            onTap: _onItemTapped,
            type: BottomNavigationBarType.fixed,
            backgroundColor: AppColors.white,
            selectedItemColor: AppColors.primary,
            unselectedItemColor: AppColors.gray,
            selectedLabelStyle: AppTextStyles.caption.copyWith(
              fontWeight: FontWeight.w600,
            ),
            unselectedLabelStyle: AppTextStyles.caption,
            items: const [
              BottomNavigationBarItem(
                icon: Icon(Icons.home_outlined),
                activeIcon: Icon(Icons.home),
                label: 'Главная',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.sports_tennis_outlined),
                activeIcon: Icon(Icons.sports_tennis),
                label: 'Найти игру',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.calendar_today_outlined),
                activeIcon: Icon(Icons.calendar_today),
                label: 'Мои брони',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.person_outline),
                activeIcon: Icon(Icons.person),
                label: 'Профиль',
              ),
            ],
          ),
        ),
      ),
    );
  }
}