import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../core/theme/colors.dart';
import '../core/theme/text_styles.dart';
import '../core/theme/spacing.dart';
import '../providers/open_games_provider.dart';
import '../providers/location_provider.dart';
import '../services/firestore_service.dart';
import 'simple_booking_form_screen.dart';

class SimpleFindGameScreen extends StatefulWidget {
  const SimpleFindGameScreen({super.key});

  @override
  State<SimpleFindGameScreen> createState() => _SimpleFindGameScreenState();
}

class _SimpleFindGameScreenState extends State<SimpleFindGameScreen> {
  String selectedFilter = 'Все';
  List<Map<String, dynamic>> _games = [];
  bool _isLoading = true;
  
  final List<String> filters = ['Все', 'Теннис', 'Падел', 'Бадминтон'];
  final Map<String, String> sportTypeMap = {
    'Теннис': 'tennis',
    'Падел': 'padel',
    'Бадминтон': 'badminton',
  };
  
  @override
  void initState() {
    super.initState();
    _loadOpenGames();
    // Инициализируем местоположение если еще не инициализировано
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final locationProvider = context.read<LocationProvider>();
      if (locationProvider.currentPosition == null && !locationProvider.isLoading) {
        locationProvider.initializeLocation().then((_) {
          // Перезагружаем игры после получения геолокации
          if (locationProvider.currentPosition != null) {
            _loadOpenGames();
          }
        });
      }
    });
  }
  
  Future<void> _loadOpenGames() async {
    setState(() {
      _isLoading = true;
    });
    
    try {
      final provider = context.read<OpenGamesProvider>();
      await provider.loadOpenGames();
      
      // Преобразуем данные для отображения
      final games = provider.openGames.where((game) {
        if (selectedFilter == 'Все') return true;
        // TODO: Фильтрация по типу спорта корта
        return true;
      }).map((game) async {
        // Получаем информацию о бронировании и корте
        final bookingDoc = await FirestoreService.getDocument('bookings', game.bookingId);
        if (bookingDoc == null || !bookingDoc.exists) return null;
        
        final bookingData = bookingDoc.data() as Map<String, dynamic>;
        final venueDoc = await FirestoreService.getDocument('venues', bookingData['venueId']);
        
        if (venueDoc == null || !venueDoc.exists) return null;
        
        // Получаем корт из подколлекции venue
        final courtDoc = await FirebaseFirestore.instance
            .collection('venues')
            .doc(bookingData['venueId'])
            .collection('courts')
            .doc(bookingData['courtId'])
            .get();
            
        if (!courtDoc.exists) return null;
        
        final courtData = courtDoc.data() as Map<String, dynamic>;
        final venueData = venueDoc.data() as Map<String, dynamic>;
        
        // Фильтрация по типу спорта
        if (selectedFilter != 'Все') {
          final sportType = sportTypeMap[selectedFilter];
          if (courtData['type'] != sportType) return null;
        }
        
        // Рассчитываем расстояние если есть геолокация
        final locationProvider = context.read<LocationProvider>();
        double? distance;
        String distanceText = '';
        
        if (locationProvider.currentPosition != null && venueData['location'] != null) {
          final GeoPoint venueLocation = venueData['location'];
          distance = locationProvider.calculateDistanceToVenue(
            venueLocation.latitude,
            venueLocation.longitude,
          );
          distanceText = locationProvider.formatDistance(distance);
        }
        
        return {
          'id': game.id,
          'bookingId': game.bookingId,
          'venue': venueData['name'] ?? 'Неизвестный клуб',
          'venueLocation': venueData['location'],
          'time': _formatDateTime(bookingData['date'], bookingData['time']),
          'distance': distance,
          'distanceText': distanceText,
          'price': bookingData['price'] ?? 0,
          'pricePerPlayer': game.pricePerPlayer.toInt(),
          'organizer': 'Организатор', // TODO: Получить имя организатора
          'organizerLevel': game.playerLevel,
          'organizerRating': '4.5',
          'gameType': courtData['courtType'] == 'indoor' ? 'Крытый корт' : 'Открытый корт',
          'levelRange': _getLevelRange(game.playerLevel.toString().split('.').last),
          'playersCount': '${game.playersJoined.length} из ${game.playersNeeded} игроков',
          'avatarColor': AppColors.primary,
          'avatarText': 'ОИ',
          'sportType': courtData['type'],
          'bookingDate': bookingData['date'],
        };
      }).toList();
      
      // Ждем завершения всех промисов и фильтруем null значения
      final resolvedGames = await Future.wait(games);
      var filteredGames = resolvedGames.where((game) => game != null).cast<Map<String, dynamic>>().toList();
      
      // Сортируем игры
      final locationProvider = context.read<LocationProvider>();
      if (locationProvider.currentPosition != null) {
        // Сортируем по расстоянию если есть геолокация
        filteredGames.sort((a, b) {
          final distanceA = a['distance'] as double?;
          final distanceB = b['distance'] as double?;
          
          if (distanceA == null && distanceB == null) {
            // Если у обоих нет расстояния, сортируем по дате
            final dateA = a['bookingDate'] as Timestamp?;
            final dateB = b['bookingDate'] as Timestamp?;
            if (dateA != null && dateB != null) {
              return dateA.compareTo(dateB);
            }
            return 0;
          }
          if (distanceA == null) return 1;
          if (distanceB == null) return -1;
          return distanceA.compareTo(distanceB);
        });
      } else {
        // Если нет геолокации, сортируем по дате и времени
        filteredGames.sort((a, b) {
          final dateA = a['bookingDate'] as Timestamp?;
          final dateB = b['bookingDate'] as Timestamp?;
          if (dateA != null && dateB != null) {
            return dateA.compareTo(dateB);
          }
          return 0;
        });
      }
      
      setState(() {
        _games = filteredGames;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Ошибка загрузки игр: ${e.toString()}')),
        );
      }
    }
  }
  
  String _formatDateTime(dynamic date, String time) {
    final DateTime dateTime = date is Timestamp ? date.toDate() : date as DateTime;
    final now = DateTime.now();
    final isToday = dateTime.year == now.year && dateTime.month == now.month && dateTime.day == now.day;
    final isTomorrow = dateTime.year == now.year && dateTime.month == now.month && dateTime.day == now.day + 1;
    
    String dateStr;
    if (isToday) {
      dateStr = 'Сегодня';
    } else if (isTomorrow) {
      dateStr = 'Завтра';
    } else {
      dateStr = '${dateTime.day}.${dateTime.month.toString().padLeft(2, '0')}';
    }
    
    return '$dateStr, $time';
  }
  
  String _getLevelRange(String level) {
    switch (level) {
      case 'beginner':
        return 'Начинающий';
      case 'intermediate':
        return 'Средний';
      case 'advanced':
        return 'Продвинутый';
      case 'professional':
        return 'Профессионал';
      case 'amateur':
        return 'Любитель';
      case 'pro':
        return 'Профессионал';
      default:
        return 'Все уровни';
    }
  }
  
  String _getGamesWord(int count) {
    if (count % 10 == 1 && count % 100 != 11) {
      return 'открытая игра';
    } else if ([2, 3, 4].contains(count % 10) && ![12, 13, 14].contains(count % 100)) {
      return 'открытые игры';
    } else {
      return 'открытых игр';
    }
  }
  
  String _getWaitWord(int count) {
    if (count % 10 == 1 && count % 100 != 11) {
      return 'ждет';
    } else {
      return 'ждут';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.all(AppSpacing.headerPadding),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Найти игру',
                    style: AppTextStyles.h1,
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    'Присоединитесь к открытым играм',
                    style: AppTextStyles.body.copyWith(color: AppColors.gray),
                  ),
                ],
              ),
            ),
            
            // Location permission banner
            Consumer<LocationProvider>(
              builder: (context, locationProvider, _) {
                if (!locationProvider.hasLocationPermission && !locationProvider.isLoading) {
                  return Container(
                    margin: const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
                    padding: const EdgeInsets.all(AppSpacing.sm),
                    decoration: BoxDecoration(
                      color: AppColors.warning.withOpacity(0.1),
                      border: Border.all(color: AppColors.warning.withOpacity(0.3)),
                      borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.location_off,
                          size: AppSpacing.iconSizeSm,
                          color: AppColors.warning,
                        ),
                        const SizedBox(width: AppSpacing.xs),
                        Expanded(
                          child: Text(
                            'Включите геолокацию для показа ближайших игр',
                            style: AppTextStyles.tiny.copyWith(
                              color: AppColors.dark,
                            ),
                          ),
                        ),
                        TextButton(
                          onPressed: () => locationProvider.openAppSettings(),
                          child: Text(
                            'Включить',
                            style: AppTextStyles.tinyBold.copyWith(
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                }
                return const SizedBox.shrink();
              },
            ),
            
            // Info banner
            Container(
              margin: const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
              padding: const EdgeInsets.all(AppSpacing.sm),
              decoration: BoxDecoration(
                color: AppColors.chipBackground,
                border: Border.all(color: const Color(0xFFBBF7D0)),
                borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
              ),
              child: Text(
                _games.isEmpty 
                    ? 'Пока нет открытых игр' 
                    : '${_games.length} ${_getGamesWord(_games.length)} ${_getWaitWord(_games.length)} партнёров',
                style: AppTextStyles.tiny.copyWith(
                  color: AppColors.primaryDark,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.cardPadding),
            
            // Filter chips
            SizedBox(
              height: AppSpacing.chipHeight,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
                itemCount: filters.length,
                itemBuilder: (context, index) {
                  final filter = filters[index];
                  final isSelected = selectedFilter == filter;
                  return Padding(
                    padding: const EdgeInsets.only(right: AppSpacing.sm),
                    child: GestureDetector(
                      onTap: () {
                        setState(() {
                          selectedFilter = filter;
                        });
                        _loadOpenGames();
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.xl,
                          vertical: AppSpacing.sm,
                        ),
                        decoration: BoxDecoration(
                          color: isSelected ? AppColors.primary : AppColors.white,
                          borderRadius: BorderRadius.circular(AppSpacing.radiusXl),
                          border: Border.all(
                            color: isSelected ? AppColors.primary : AppColors.extraLightGray,
                            width: 1,
                          ),
                        ),
                        child: Text(
                          filter,
                          style: AppTextStyles.tinyBold.copyWith(
                            color: isSelected ? AppColors.white : AppColors.dark,
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
            
            // Games list
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _games.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.sports_tennis,
                                size: 64,
                                color: AppColors.lightGray,
                              ),
                              const SizedBox(height: AppSpacing.md),
                              Text(
                                'Нет открытых игр',
                                style: AppTextStyles.h3.copyWith(color: AppColors.gray),
                              ),
                              const SizedBox(height: AppSpacing.xs),
                              Text(
                                selectedFilter == 'Все' 
                                    ? 'Создайте свою игру или попробуйте позже'
                                    : 'Попробуйте выбрать другой вид спорта',
                                style: AppTextStyles.body.copyWith(color: AppColors.gray),
                                textAlign: TextAlign.center,
                              ),
                            ],
                          ),
                        )
                      : RefreshIndicator(
                          onRefresh: _loadOpenGames,
                          child: ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
                            itemCount: _games.length,
                            itemBuilder: (context, index) {
                              final game = _games[index];
                              return Padding(
                                padding: const EdgeInsets.only(bottom: AppSpacing.cardPadding),
                                child: _buildGameCard(game),
                              );
                            },
                          ),
                        ),
            ),
          ],
        ),
      ),
    );
  }
  
  Future<void> _handleJoinGame(Map<String, dynamic> game) async {
    try {
      // Получаем информацию о бронировании
      final bookingDoc = await FirestoreService.getDocument('bookings', game['bookingId']);
      if (bookingDoc == null || !bookingDoc.exists) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Ошибка: бронирование не найдено')),
          );
        }
        return;
      }

      final bookingData = bookingDoc.data() as Map<String, dynamic>;
      
      // Получаем информацию о корте из подколлекции venue
      final courtDoc = await FirebaseFirestore.instance
          .collection('venues')
          .doc(bookingData['venueId'])
          .collection('courts')
          .doc(bookingData['courtId'])
          .get();
          
      if (!courtDoc.exists) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Ошибка: корт не найден')),
          );
        }
        return;
      }
      
      // Переходим на страницу оформления
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => SimpleBookingFormScreen(
            venueId: bookingData['venueId'],
            courtId: bookingData['courtId'],
            date: (bookingData['date'] as Timestamp).toDate(),
            time: bookingData['time'],
            duration: bookingData['duration'],
            price: game['price'].toInt(),
            pricePerPlayer: game['pricePerPlayer'].toInt(),
            gameType: 'open_join', // Специальный тип для присоединения
            playersCount: bookingData['playersCount'] ?? 4,
            openGameId: game['id'], // ID открытой игры
          ),
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Ошибка: ${e.toString()}')),
        );
      }
    }
  }

  Widget _buildGameCard(Map<String, dynamic> game) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.cardPadding),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 5,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    game['venue'],
                    style: AppTextStyles.bodySmallBold,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    game['distanceText'].isNotEmpty 
                        ? '${game['time']} • ${game['distanceText']}' 
                        : game['time'],
                    style: AppTextStyles.tiny.copyWith(color: AppColors.gray),
                  ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${game['price']} ₽',
                    style: AppTextStyles.priceSmall,
                  ),
                  Text(
                    'с человека',
                    style: AppTextStyles.caption.copyWith(color: AppColors.gray),
                  ),
                ],
              ),
            ],
          ),
          
          // Divider
          Container(
            margin: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
            height: 1,
            color: AppColors.divider,
          ),
          
          // Organizer info
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: game['avatarColor'],
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    game['avatarText'],
                    style: AppTextStyles.tinyBold.copyWith(
                      color: AppColors.white,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      game['organizer'],
                      style: AppTextStyles.bodySmallBold,
                    ),
                    Text(
                      'Уровень ${game['organizerLevel']} • ⭐ ${game['organizerRating']}',
                      style: AppTextStyles.caption.copyWith(color: AppColors.gray),
                    ),
                  ],
                ),
              ),
              ElevatedButton(
                onPressed: () => _handleJoinGame(game),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.md,
                    vertical: AppSpacing.xs,
                  ),
                  minimumSize: const Size(0, 30),
                ),
                child: Text(
                  'Присоединиться',
                  style: AppTextStyles.captionBold.copyWith(color: AppColors.white),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          
          // Game info tags
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.sm,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFFDBEAFE),
                  borderRadius: BorderRadius.circular(AppSpacing.radiusXl),
                ),
                child: Text(
                  game['gameType'],
                  style: AppTextStyles.caption.copyWith(
                    color: const Color(0xFF1E40AF),
                    fontWeight: FontWeight.w600,
                    fontSize: 9,
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.xs),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.sm,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(AppSpacing.radiusXl),
                ),
                child: Text(
                  game['levelRange'],
                  style: AppTextStyles.caption.copyWith(
                    color: const Color(0xFF92400E),
                    fontWeight: FontWeight.w600,
                    fontSize: 9,
                  ),
                ),
              ),
              const Spacer(),
              Text(
                game['playersCount'],
                style: AppTextStyles.caption.copyWith(color: AppColors.gray),
              ),
            ],
          ),
        ],
      ),
    );
  }
}