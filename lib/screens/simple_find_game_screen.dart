import 'package:flutter/material.dart';
import '../core/theme/colors.dart';
import '../core/theme/text_styles.dart';
import '../core/theme/spacing.dart';

class SimpleFindGameScreen extends StatefulWidget {
  const SimpleFindGameScreen({super.key});

  @override
  State<SimpleFindGameScreen> createState() => _SimpleFindGameScreenState();
}

class _SimpleFindGameScreenState extends State<SimpleFindGameScreen> {
  String selectedFilter = 'Все';
  
  final List<String> filters = ['Все', 'Теннис', 'Падель', 'Мой уровень'];
  
  final List<Map<String, dynamic>> games = [
    {
      'venue': 'Теннис Клуб "Олимп"',
      'time': 'Сегодня, 14:00',
      'distance': '1.2 км',
      'price': 375,
      'organizer': 'Александр К.',
      'organizerLevel': '4.0',
      'organizerRating': '4.8',
      'gameType': 'Парная игра',
      'levelRange': 'Уровень 3.5-4.5',
      'playersCount': '2 из 4 игроков',
      'avatarColor': AppColors.primary,
      'avatarText': 'АК',
    },
    {
      'venue': 'Спорткомплекс "Динамо"',
      'time': 'Сегодня, 18:00',
      'distance': '2.5 км',
      'price': 500,
      'organizer': 'Елена П.',
      'organizerLevel': '3.0',
      'organizerRating': '5.0',
      'gameType': 'Одиночная',
      'levelRange': 'Уровень 2.5-3.5',
      'playersCount': '1 из 2 игроков',
      'avatarColor': AppColors.warning,
      'avatarText': 'ЕП',
    },
  ];

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
                '12 открытых игр ждут партнёров',
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
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
                itemCount: games.length,
                itemBuilder: (context, index) {
                  final game = games[index];
                  return Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.cardPadding),
                    child: _buildGameCard(game),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildGameCard(Map<String, dynamic> game) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.cardPadding),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
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
                    '${game['time']} • ${game['distance']}',
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
                onPressed: () {},
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