import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../core/theme/colors.dart';
import '../core/theme/text_styles.dart';
import '../core/theme/spacing.dart';
import '../widgets/court_card.dart';
import '../widgets/custom_text_field.dart';
import '../widgets/loading_widget.dart';
import '../providers/venues_provider.dart';
import '../services/auth_service.dart';
import '../models/venue_model.dart';

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
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildHeader(),
              const SizedBox(height: AppSpacing.lg),
              _buildSearchBar(),
              const SizedBox(height: AppSpacing.lg),
              _buildFilterChips(),
              const SizedBox(height: AppSpacing.lg),
              Expanded(child: _buildVenuesList()),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Consumer<AuthService>(
      builder: (context, authService, child) {
        final userName = authService.currentUserModel?.displayName ?? 'Гость';
        
        return Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(
                'Привет, $userName! Найдём корт для игры?',
                style: AppTextStyles.h2,
              ),
            ),
            IconButton(
              icon: const Icon(Icons.notifications_outlined),
              onPressed: () {},
            ),
          ],
        );
      },
    );
  }

  Widget _buildSearchBar() {
    return Consumer<VenuesProvider>(
      builder: (context, venuesProvider, child) {
        return CustomTextField(
          controller: _searchController,
          hint: 'Поиск кортов...',
          prefixIcon: const Icon(Icons.search),
          suffixIcon: IconButton(
            icon: const Icon(Icons.tune),
            onPressed: _showFilters,
          ),
          onChanged: (value) {
            if (value.isEmpty) {
              venuesProvider.loadVenues();
            } else {
              venuesProvider.searchVenues(value);
            }
          },
        );
      },
    );
  }

  Widget _buildFilterChips() {
    return Consumer<VenuesProvider>(
      builder: (context, venuesProvider, child) {
        return SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              _buildSportChip('Все', null, venuesProvider),
              const SizedBox(width: AppSpacing.sm),
              _buildSportChip('Теннис', SportType.tennis, venuesProvider),
              const SizedBox(width: AppSpacing.sm),
              _buildSportChip('Падел', SportType.padel, venuesProvider),
              const SizedBox(width: AppSpacing.sm),
              _buildSportChip('Бадминтон', SportType.badminton, venuesProvider),
            ],
          ),
        );
      },
    );
  }

  Widget _buildSportChip(String label, SportType? sport, VenuesProvider provider) {
    final isSelected = provider.selectedSport == sport;
    
    return FilterChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (selected) {
        provider.setSportFilter(selected ? sport : null);
      },
      selectedColor: AppColors.primaryLight,
      checkmarkColor: AppColors.primary,
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
            itemCount: venues.length,
            itemBuilder: (context, index) {
              final venue = venues[index];
              return CourtCard(
                name: venue.name,
                address: venue.address,
                price: '2000 ₽/час', // TODO: Calculate from courts
                rating: venue.rating,
                distance: '${(index + 1) * 0.5} км', // TODO: Calculate real distance
                onTap: () {
                  venuesProvider.selectVenue(venue);
                  context.push('/court-detail');
                },
              );
            },
          ),
        );
      },
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