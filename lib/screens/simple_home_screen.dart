import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme/colors.dart';
import '../core/theme/text_styles.dart';
import '../core/theme/spacing.dart';
import '../providers/venues_provider.dart';
import '../providers/location_provider.dart';
import '../models/venue_model.dart';
import 'court_detail_screen.dart';
import 'map_screen.dart';

class SimpleHomeScreen extends StatefulWidget {
  const SimpleHomeScreen({super.key});

  @override
  State<SimpleHomeScreen> createState() => _SimpleHomeScreenState();
}

class _SimpleHomeScreenState extends State<SimpleHomeScreen> {
  final TextEditingController _searchController = TextEditingController();
  String selectedSport = 'padel';
  
  // Convert string to SportType enum
  SportType? _getSportType(String? sportId) {
    switch (sportId) {
      case 'padel':
        return SportType.padel;
      case 'tennis':
        return SportType.tennis;
      case 'badminton':
        return SportType.badminton;
      default:
        return null;
    }
  }

  
  @override
  void initState() {
    super.initState();
    // Initialize location and load venues when screen loads
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final locationProvider = context.read<LocationProvider>();
      await locationProvider.initializeLocation();
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
                Consumer<LocationProvider>(
                  builder: (context, locationProvider, _) {
                    if (locationProvider.currentCity != null) {
                      return Text(
                        'Найдём корт в ${locationProvider.currentCity}?',
                        style: AppTextStyles.body.copyWith(color: AppColors.gray),
                      );
                    }
                    return Text(
                      'Найдём корт для игры?',
                      style: AppTextStyles.body.copyWith(color: AppColors.gray),
                    );
                  },
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
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 5,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: TextField(
          controller: _searchController,
          onChanged: (value) {
            context.read<VenuesProvider>().searchVenues(value);
          },
          decoration: InputDecoration(
            hintText: 'Поиск клубов...',
            hintStyle: AppTextStyles.body.copyWith(color: AppColors.gray),
            prefixIcon: const Icon(Icons.search, color: AppColors.gray),
            border: InputBorder.none,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.md,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFilterChips() {
    final sports = [
      {'id': 'padel', 'name': 'Падел'},
      {'id': 'tennis', 'name': 'Теннис'},
      {'id': 'badminton', 'name': 'Бадминтон'},
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
      child: Row(
        children: sports.map((sport) {
          final isSelected = selectedSport == sport['id'];
          return Padding(
            padding: const EdgeInsets.only(right: AppSpacing.sm),
            child: ChoiceChip(
              label: Text(sport['name']!),
              selected: isSelected,
              onSelected: (selected) {
                setState(() {
                  selectedSport = sport['id']!;
                });
                context.read<VenuesProvider>().setSportFilter(_getSportType(sport['id']));
              },
              selectedColor: AppColors.primary,
              backgroundColor: AppColors.white,
              labelStyle: TextStyle(
                color: isSelected ? AppColors.white : AppColors.dark,
                fontWeight: FontWeight.w500,
              ),
              side: BorderSide(
                color: isSelected ? AppColors.primary : AppColors.lightGray,
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildSectionTitle() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
      child: Consumer<VenuesProvider>(
        builder: (context, provider, _) {
          return Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                provider.searchQuery.isEmpty ? 'Рядом с вами' : 'Результаты поиска',
                style: AppTextStyles.h2,
              ),
              if (provider.searchQuery.isEmpty)
                TextButton.icon(
                  onPressed: () {
                    if (context.mounted) {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const MapScreen(),
                        ),
                      );
                    }
                  },
                  icon: const Icon(Icons.map_outlined, size: 18),
                  label: const Text('Показать на карте'),
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    textStyle: AppTextStyles.caption.copyWith(fontWeight: FontWeight.w600),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildVenuesList() {
    return Consumer<VenuesProvider>(
      builder: (context, provider, _) {
        if (provider.isLoading) {
          return const Center(
            child: CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
            ),
          );
        }

        if (provider.error != null) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.xl),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.error_outline,
                    size: 64,
                    color: AppColors.gray,
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    provider.error!,
                    style: AppTextStyles.body.copyWith(color: AppColors.gray),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  ElevatedButton(
                    onPressed: () => provider.loadVenues(),
                    child: const Text('Попробовать снова'),
                  ),
                ],
              ),
            ),
          );
        }

        final venues = provider.filteredVenues;

        if (venues.isEmpty) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.xl),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.search_off,
                    size: 64,
                    color: AppColors.gray,
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    provider.searchQuery.isEmpty
                        ? 'Нет доступных клубов'
                        : 'Ничего не найдено',
                    style: AppTextStyles.h3.copyWith(color: AppColors.gray),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    provider.searchQuery.isEmpty
                        ? 'Попробуйте изменить фильтры'
                        : 'Попробуйте изменить поисковый запрос',
                    style: AppTextStyles.body.copyWith(color: AppColors.gray),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
          itemCount: venues.length,
          itemBuilder: (context, index) {
            return _buildVenueCard(venues[index]);
          },
        );
      },
    );
  }

  Widget _buildVenueCard(VenueModel venue) {
    return GestureDetector(
      onTap: () async {
        await context.read<VenuesProvider>().selectVenue(venue);
        if (mounted) {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => const CourtDetailScreen(),
            ),
          );
        }
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: AppSpacing.md),
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
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image
            ClipRRect(
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(AppSpacing.radiusMd),
              ),
              child: AspectRatio(
                aspectRatio: AppSpacing.imageAspectRatio,
                child: venue.photos.isNotEmpty
                    ? Image.network(
                        venue.photos.first,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) {
                          return Container(
                            color: AppColors.extraLightGray,
                            child: const Icon(
                              Icons.sports_tennis,
                              size: 64,
                              color: AppColors.gray,
                            ),
                          );
                        },
                      )
                    : Container(
                        color: AppColors.extraLightGray,
                        child: const Icon(
                          Icons.sports_tennis,
                          size: 64,
                          color: AppColors.gray,
                        ),
                      ),
              ),
            ),
            // Content
            Padding(
              padding: const EdgeInsets.all(AppSpacing.cardPadding),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          venue.name,
                          style: AppTextStyles.h3,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Row(
                        children: [
                          const Icon(
                            Icons.star,
                            size: AppSpacing.iconSizeSm,
                            color: AppColors.warning,
                          ),
                          const SizedBox(width: AppSpacing.xxs),
                          Text(
                            venue.rating.toStringAsFixed(1),
                            style: AppTextStyles.caption.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Row(
                    children: [
                      const Icon(
                        Icons.location_on_outlined,
                        size: AppSpacing.iconSizeSm,
                        color: AppColors.gray,
                      ),
                      const SizedBox(width: AppSpacing.xxs),
                      Expanded(
                        child: Text(
                          venue.address,
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.gray,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Consumer<LocationProvider>(
                        builder: (context, locationProvider, _) {
                          if (venue.location != null && locationProvider.currentPosition != null) {
                            final distance = locationProvider.calculateDistanceToVenue(
                              venue.location!.latitude,
                              venue.location!.longitude,
                            );
                            if (distance != null) {
                              return Container(
                                margin: const EdgeInsets.only(left: AppSpacing.xs),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: AppSpacing.xs,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.primaryLight,
                                  borderRadius: BorderRadius.circular(AppSpacing.radiusXs),
                                ),
                                child: Text(
                                  locationProvider.formatDistance(distance),
                                  style: AppTextStyles.tiny.copyWith(
                                    color: AppColors.primary,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              );
                            }
                          }
                          return const SizedBox.shrink();
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  // Amenities
                  if (venue.amenities.isNotEmpty)
                    Wrap(
                      spacing: AppSpacing.xs,
                      runSpacing: AppSpacing.xs,
                      children: venue.amenities.take(3).map((amenity) {
                        return Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.sm,
                            vertical: AppSpacing.xxs,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.primaryLight,
                            borderRadius: BorderRadius.circular(AppSpacing.radiusXs),
                          ),
                          child: Text(
                            venue.getAmenityName(amenity),
                            style: AppTextStyles.caption.copyWith(
                              color: AppColors.primary,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}