import 'package:go_router/go_router.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../screens/home_screen.dart';
import '../../screens/court_detail_screen.dart';
import '../../screens/time_selection_screen.dart';
import '../../screens/game_type_screen.dart';
import '../../screens/create_open_game_screen.dart';
import '../../screens/find_game_screen.dart';
import '../../screens/payment_screen.dart';
import '../../screens/my_bookings_screen.dart';
import '../../screens/profile_screen.dart';
import '../../screens/login_screen.dart';
import '../../screens/verify_phone_screen.dart';
import '../../screens/profile_setup_screen.dart';
import '../../widgets/app_shell.dart';

class AppRouter {
  static final GoRouter router = GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final isAuthenticated = FirebaseAuth.instance.currentUser != null;
      final isOnAuthPages = state.matchedLocation.startsWith('/login') || 
                           state.matchedLocation.startsWith('/verify-phone') ||
                           state.matchedLocation.startsWith('/profile-setup');
      
      // If not authenticated and not on auth pages, redirect to login
      if (!isAuthenticated && !isOnAuthPages) {
        return '/login';
      }
      
      // If authenticated and on auth pages, redirect to home
      if (isAuthenticated && isOnAuthPages) {
        return '/';
      }
      
      return null; // No redirect
    },
    routes: [
      ShellRoute(
        builder: (context, state, child) => AppShell(
          child: child,
          location: state.uri.path,
        ),
        routes: [
          GoRoute(
            path: '/',
            name: 'home',
            builder: (context, state) => const HomeScreen(),
          ),
          GoRoute(
            path: '/find-game',
            name: 'find-game',
            builder: (context, state) => const FindGameScreen(),
          ),
          GoRoute(
            path: '/my-bookings',
            name: 'my-bookings',
            builder: (context, state) => const MyBookingsScreen(),
          ),
          GoRoute(
            path: '/profile',
            name: 'profile',
            builder: (context, state) => const ProfileScreen(),
          ),
        ],
      ),
      GoRoute(
        path: '/court-detail',
        name: 'court-detail',
        builder: (context, state) => const CourtDetailScreen(),
      ),
      GoRoute(
        path: '/time-selection',
        name: 'time-selection',
        builder: (context, state) => const TimeSelectionScreen(),
      ),
      GoRoute(
        path: '/game-type',
        name: 'game-type',
        builder: (context, state) => const GameTypeScreen(),
      ),
      GoRoute(
        path: '/create-open-game',
        name: 'create-open-game',
        builder: (context, state) => const CreateOpenGameScreen(),
      ),
      GoRoute(
        path: '/payment',
        name: 'payment',
        builder: (context, state) => const PaymentScreen(),
      ),
      // Authentication routes
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/verify-phone',
        name: 'verify-phone',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>;
          return VerifyPhoneScreen(
            verificationId: extra['verificationId'],
            phoneNumber: extra['phoneNumber'],
            resendToken: extra['resendToken'],
          );
        },
      ),
      GoRoute(
        path: '/profile-setup',
        name: 'profile-setup',
        builder: (context, state) => const ProfileSetupScreen(),
      ),
    ],
  );
}