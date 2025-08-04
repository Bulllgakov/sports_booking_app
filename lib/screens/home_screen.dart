import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../core/theme/colors.dart';
import '../core/theme/text_styles.dart';
import '../core/theme/spacing.dart';
import '../widgets/loading_widget.dart';
import '../providers/venues_provider.dart';
import '../services/auth_service.dart';
import '../models/venue_model.dart';
import 'map_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<VenuesProvider>().loadVenues();
    });
  }

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
            Expanded(
              child: ListView(
                children: [
                  _buildNearbySection(),
                  const SizedBox(height: AppSpacing.xl),
                  _buildFilterChips(),
                  const SizedBox(height: AppSpacing.xl),
                  _buildSectionTitle(),
                  const SizedBox(height: AppSpacing.md),
                  _buildVenuesList(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.all(AppSpacing.headerPadding),
      child: Consumer<AuthService>(
        builder: (context, authService, child) {
          final firstName = authService.currentUserModel?.displayName?.split(' ').first ?? 'Гость';
          
          return Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Привет, $firstName!',
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
          );
        },
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
              color: Colors.black.withValues(alpha: 0.05),
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
                onChanged: (value) {
                  final provider = context.read<VenuesProvider>();
                  if (value.isEmpty) {
                    provider.loadVenues();
                  } else {
                    provider.searchVenues(value);
                  }
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNearbySection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Рядом с вами',
                style: AppTextStyles.h3,
              ),
              GestureDetector(
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const MapScreen(),
                    ),
                  );
                },
                child: Text(
                  'Показать на карте',
                  style: AppTextStyles.body.copyWith(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        Consumer<VenuesProvider>(
          builder: (context, venuesProvider, child) {
            if (venuesProvider.isLoading) {
              return const Center(
                child: Padding(
                  padding: EdgeInsets.all(AppSpacing.xl),
                  child: CircularProgressIndicator(),
                ),
              );
            }

            // Берем первые 3 ближайших клуба
            final nearbyVenues = venuesProvider.venues
                .where((v) => v.distance != null)
                .toList()
              ..sort((a, b) => (a.distance ?? 0).compareTo(b.distance ?? 0));
            
            final topVenues = nearbyVenues.take(3).toList();

            if (topVenues.isEmpty) {
              return const Center(
                child: Padding(
                  padding: EdgeInsets.all(AppSpacing.xl),
                  child: Text('Нет доступных клубов поблизости'),
                ),
              );
            }

            return SizedBox(
              height: 120,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
                itemCount: topVenues.length,
                itemBuilder: (context, index) {
                  final venue = topVenues[index];
                  return Container(
                    width: 280,
                    margin: EdgeInsets.only(
                      right: index < topVenues.length - 1 ? AppSpacing.md : 0,
                    ),
                    child: _buildNearbyCard(venue),
                  );
                },
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildNearbyCard(VenueModel venue) {
    return GestureDetector(
      onTap: () {
        context.push('/courts', extra: venue);
      },
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
              ),
              child: Icon(
                Icons.sports_tennis,
                color: AppColors.primary,
                size: 40,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    venue.name,
                    style: AppTextStyles.bodyLarge.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  if (venue.distance != null)
                    Text(
                      '${venue.distance!.toStringAsFixed(1)} км',
                      style: AppTextStyles.body.copyWith(
                        color: AppColors.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  const SizedBox(height: AppSpacing.xs),
                  Row(
                    children: [
                      Icon(
                        Icons.star,
                        size: 16,
                        color: AppColors.warning,
                      ),
                      const SizedBox(width: AppSpacing.xxs),
                      Text(
                        venue.rating.toString(),
                        style: AppTextStyles.bodySmall.copyWith(
                          color: AppColors.gray,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChips() {
    return Consumer<VenuesProvider>(
      builder: (context, venuesProvider, child) {
        return SizedBox(
          height: AppSpacing.chipHeight,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
            children: [
              _buildSportChip('Теннис', SportType.tennis, venuesProvider),
              const SizedBox(width: AppSpacing.sm),
              _buildSportChip('Падель', SportType.padel, venuesProvider),
              const SizedBox(width: AppSpacing.sm),
              _buildSportChip('Сквош', SportType.badminton, venuesProvider),
            ],
          ),
        );
      },
    );
  }
  
  Widget _buildSectionTitle() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            'Доступные корты',
            style: AppTextStyles.h3,
          ),
          GestureDetector(
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const MapScreen(),
                ),
              );
            },
            child: Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.sm,
              ),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.map,
                    size: AppSpacing.iconSm,
                    color: AppColors.primary,
                  ),
                  const SizedBox(width: AppSpacing.xs),
                  Text(
                    'Карта',
                    style: AppTextStyles.body.copyWith(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSportChip(String label, SportType? sport, VenuesProvider provider) {
    final isSelected = provider.selectedSport == sport;
    
    return GestureDetector(
      onTap: () {
        provider.setSportFilter(isSelected ? null : sport);
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
    return Consumer<VenuesProvider>(
      builder: (context, venuesProvider, child) {
        if (venuesProvider.isLoading) {
          return const Center(child: LoadingWidget(message: 'Загружаем корты...'));
        }

        if (venuesProvider.error != null) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  venuesProvider.error!,
                  style: AppTextStyles.body,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: AppSpacing.md),
                ElevatedButton(
                  onPressed: () => venuesProvider.loadVenues(),
                  child: const Text('Повторить'),
                ),
              ],
            ),
          );
        }

        final venues = venuesProvider.filteredVenues;

        if (venues.isEmpty) {
          return Center(
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
                  'Корты не найдены',
                  style: AppTextStyles.h3,
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  'Попробуйте изменить фильтры поиска',
                  style: AppTextStyles.bodySmall,
                ),
              ],
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () => venuesProvider.loadVenues(),
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
            itemCount: venues.length,
            itemBuilder: (context, index) {
              final venue = venues[index];
              return Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.cardPadding),
                child: _buildVenueCard(venue, index, venuesProvider),
              );
            },
          ),
        );
      },
    );
  }

  Widget _buildVenueCard(VenueModel venue, int index, VenuesProvider provider) {
    final minPrice = venue.courts.isNotEmpty 
        ? venue.courts.map((c) => c.getPriceRange().min).reduce((a, b) => a < b ? a : b)
        : 1500;
    final availableSlots = 5 - (index % 3); // TODO: Calculate real available slots
    final distance = ((index + 1) * 0.6 + 0.6).toStringAsFixed(1);
    
    return GestureDetector(
      onTap: () {
        provider.selectVenue(venue);
        context.push('/court-detail');
      },
      child: Container(
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
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    venue.name,
                    style: AppTextStyles.bodySmallBold,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Text(
                  'от $minPrice₽',
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
                    venue.address,
                    style: AppTextStyles.tiny,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Text(
                  ' • $distance км',
                  style: AppTextStyles.tiny,
                ),
                Text(
                  ' • ⭐ ${venue.rating.toStringAsFixed(1)}',
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
                    '$availableSlots слотов',
                    style: AppTextStyles.captionBold.copyWith(
                      color: AppColors.primaryDark,
                    ),
                  ),
                ),
                SizedBox(
                  height: AppSpacing.buttonHeightSm,
                  child: ElevatedButton(
                    onPressed: () {
                      provider.selectVenue(venue);
                      context.push('/court-detail');
                    },
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.xl,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                      ),
                    ),
                    child: Text(
                      'Забронировать',
                      style: AppTextStyles.buttonSmall,
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

  void _showFilters() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppSpacing.radiusLg)),
      ),
      builder: (context) {
        return Consumer<VenuesProvider>(
          builder: (context, venuesProvider, child) {
            return Container(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Фильтры', style: AppTextStyles.h2),
                  const SizedBox(height: AppSpacing.lg),
                  Text('Максимальное расстояние: ${venuesProvider.maxDistance.toInt()} км'),
                  Slider(
                    value: venuesProvider.maxDistance,
                    min: 1,
                    max: 50,
                    divisions: 49,
                    onChanged: (value) {
                      venuesProvider.setMaxDistance(value);
                    },
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () {
                            venuesProvider.clearFilters();
                            Navigator.pop(context);
                          },
                          child: const Text('Сбросить'),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () => Navigator.pop(context),
                          child: const Text('Применить'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}