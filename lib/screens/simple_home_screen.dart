import 'package:flutter/material.dart';
import '../core/theme/colors.dart';
import '../core/theme/text_styles.dart';
import '../core/theme/spacing.dart';
import 'court_detail_screen.dart';

class SimpleHomeScreen extends StatefulWidget {
  const SimpleHomeScreen({super.key});

  @override
  State<SimpleHomeScreen> createState() => _SimpleHomeScreenState();
}

class _SimpleHomeScreenState extends State<SimpleHomeScreen> {
  final TextEditingController _searchController = TextEditingController();
  String selectedSport = 'Теннис';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(),
            const SizedBox(height: AppSpacing.lg),
            _buildSearchBar(),
            const SizedBox(height: AppSpacing.cardPadding),
            _buildFilterChips(),
            const SizedBox(height: AppSpacing.xl),
            _buildSectionTitle(),
            const SizedBox(height: AppSpacing.md),
            Expanded(child: _buildVenuesList()),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.all(AppSpacing.headerPadding),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Привет, Александр!',
                  style: AppTextStyles.h1,
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'Найдём корт для игры?',
                  style: AppTextStyles.body.copyWith(color: AppColors.gray),
                ),
              ],
            ),
          ),
          Container(
            width: AppSpacing.notificationBellSize,
            height: AppSpacing.notificationBellSize,
            decoration: BoxDecoration(
              color: AppColors.extraLightGray,
              borderRadius: BorderRadius.circular(AppSpacing.radiusCircle),
            ),
            child: IconButton(
              icon: const Icon(Icons.notifications_outlined),
              onPressed: () {},
              color: AppColors.dark,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
      child: Container(
        height: AppSpacing.searchBarHeight,
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
        child: Row(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
              child: Icon(
                Icons.search,
                color: AppColors.lightGray,
                size: AppSpacing.iconMd,
              ),
            ),
            Expanded(
              child: TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  hintText: 'Поиск кортов...',
                  hintStyle: AppTextStyles.body.copyWith(color: AppColors.lightGray),
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.zero,
                ),
                style: AppTextStyles.body,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChips() {
    return SizedBox(
      height: AppSpacing.chipHeight,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
        children: [
          _buildSportChip('Теннис'),
          const SizedBox(width: AppSpacing.sm),
          _buildSportChip('Падель'),
          const SizedBox(width: AppSpacing.sm),
          _buildSportChip('Сквош'),
        ],
      ),
    );
  }
  
  Widget _buildSectionTitle() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
      child: Text(
        'Рядом с вами',
        style: AppTextStyles.h3,
      ),
    );
  }

  Widget _buildSportChip(String label) {
    final isSelected = selectedSport == label;
    
    return GestureDetector(
      onTap: () {
        setState(() {
          selectedSport = label;
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
          label,
          style: AppTextStyles.tinyBold.copyWith(
            color: isSelected ? AppColors.white : AppColors.dark,
          ),
        ),
      ),
    );
  }

  Widget _buildVenuesList() {
    final venues = [
      {
        'name': 'Теннис Клуб "Олимп"',
        'address': 'ул. Спортивная, 15',
        'distance': '1.2',
        'rating': '4.8',
        'price': 1500,
        'slots': 5,
      },
      {
        'name': 'Спорткомплекс "Динамо"',
        'address': 'пр. Победы, 45',
        'distance': '2.5',
        'rating': '4.6',
        'price': 2000,
        'slots': 3,
      },
    ];

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
      itemCount: venues.length,
      itemBuilder: (context, index) {
        final venue = venues[index];
        return Padding(
          padding: const EdgeInsets.only(bottom: AppSpacing.cardPadding),
          child: _buildVenueCard(venue),
        );
      },
    );
  }

  Widget _buildVenueCard(Map<String, dynamic> venue) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const CourtDetailScreen()),
        );
      },
      child: Container(
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
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    venue['name'],
                    style: AppTextStyles.bodySmallBold,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Text(
                  'от ${venue['price']}₽',
                  style: AppTextStyles.priceSmall,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            Row(
              children: [
                const Icon(
                  Icons.location_on_outlined,
                  size: AppSpacing.iconXs,
                  color: AppColors.gray,
                ),
                const SizedBox(width: AppSpacing.xs),
                Expanded(
                  child: Text(
                    venue['address'],
                    style: AppTextStyles.tiny,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Text(
                  ' • ${venue['distance']} км',
                  style: AppTextStyles.tiny,
                ),
                Text(
                  ' • ⭐ ${venue['rating']}',
                  style: AppTextStyles.tiny,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.md,
                    vertical: AppSpacing.xs + 2,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    borderRadius: BorderRadius.circular(AppSpacing.radiusXl),
                  ),
                  child: Text(
                    '${venue['slots']} слотов',
                    style: AppTextStyles.captionBold.copyWith(
                      color: AppColors.primaryDark,
                    ),
                  ),
                ),
                SizedBox(
                  height: AppSpacing.buttonHeightSm,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (context) => const CourtDetailScreen()),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.xl,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                      ),
                    ),
                    child: Text(
                      'Забронировать',
                      style: AppTextStyles.buttonSmall.copyWith(color: AppColors.white),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}