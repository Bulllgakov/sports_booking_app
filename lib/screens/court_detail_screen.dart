import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme/colors.dart';
import '../core/theme/text_styles.dart';
import '../core/theme/spacing.dart';
import '../providers/venues_provider.dart';
import '../models/venue_model.dart';
import '../models/court_model.dart';
import 'simple_time_selection_screen.dart';

class CourtDetailScreen extends StatelessWidget {
  final VenueModel? venue;
  final CourtModel? court;
  
  const CourtDetailScreen({
    super.key,
    this.venue,
    this.court,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer<VenuesProvider>(
      builder: (context, provider, _) {
        final venue = this.venue ?? provider.selectedVenue;
        // ignore: unused_local_variable
        final court = this.court ?? provider.selectedCourt;
        
        if (venue == null) {
          return Scaffold(
            appBar: AppBar(),
            body: const Center(
              child: Text('Клуб не выбран'),
            ),
          );
        }
        
        return Scaffold(
          backgroundColor: AppColors.background,
          body: CustomScrollView(
            slivers: [
              SliverAppBar(
                expandedHeight: 250,
                pinned: true,
                backgroundColor: AppColors.white,
                leading: Padding(
                  padding: const EdgeInsets.all(10.0),
                  child: Container(
                    decoration: BoxDecoration(
                      color: AppColors.white,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.1),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: IconButton(
                      icon: const Icon(Icons.arrow_back, color: AppColors.dark),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ),
                ),
                flexibleSpace: FlexibleSpaceBar(
                  background: venue.photos.isNotEmpty
                      ? Image.network(
                          venue.photos.first,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) {
                            return Container(
                              color: AppColors.extraLightGray,
                              child: const Center(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.camera_alt_outlined,
                                      size: 40,
                                      color: AppColors.lightGray,
                                    ),
                                    SizedBox(height: 8),
                                    Text(
                                      'Фото клуба',
                                      style: TextStyle(color: AppColors.lightGray),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        )
                      : Container(
                          color: AppColors.extraLightGray,
                          child: const Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.camera_alt_outlined,
                                  size: 40,
                                  color: AppColors.lightGray,
                                ),
                                SizedBox(height: 8),
                                Text(
                                  'Фото клуба',
                                  style: TextStyle(color: AppColors.lightGray),
                                ),
                              ],
                            ),
                          ),
                        ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.screenPadding),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        venue.name,
                        style: AppTextStyles.h2,
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Row(
                        children: [
                          Icon(
                            Icons.location_on_outlined,
                            size: AppSpacing.iconSizeSm,
                            color: AppColors.gray,
                          ),
                          const SizedBox(width: AppSpacing.xxs),
                          Expanded(
                            child: Text(
                              venue.address,
                              style: AppTextStyles.bodySmall.copyWith(color: AppColors.gray),
                            ),
                          ),
                        ],
                      ),
                      if (venue.phone != null) ...[
                        const SizedBox(height: AppSpacing.xs),
                        Row(
                          children: [
                            Icon(
                              Icons.phone_outlined,
                              size: AppSpacing.iconSizeSm,
                              color: AppColors.gray,
                            ),
                            const SizedBox(width: AppSpacing.xxs),
                            Text(
                              venue.phone!,
                              style: AppTextStyles.bodySmall.copyWith(color: AppColors.gray),
                            ),
                          ],
                        ),
                      ],
                      const SizedBox(height: AppSpacing.lg),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.md,
                              vertical: AppSpacing.xs,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.chipBackground,
                              borderRadius: BorderRadius.circular(AppSpacing.radiusXl),
                            ),
                            child: Row(
                              children: [
                                const Icon(
                                  Icons.star,
                                  size: AppSpacing.iconSizeSm,
                                  color: AppColors.warning,
                                ),
                                const SizedBox(width: AppSpacing.xxs),
                                Text(
                                  venue.rating.toStringAsFixed(1),
                                  style: AppTextStyles.captionBold.copyWith(color: AppColors.primaryDark),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      if (venue.description.isNotEmpty) ...[
                        const SizedBox(height: AppSpacing.xl),
                        Container(
                          padding: const EdgeInsets.all(AppSpacing.md),
                          decoration: BoxDecoration(
                            color: AppColors.white,
                            borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Описание',
                                style: AppTextStyles.bodyBold,
                              ),
                              const SizedBox(height: AppSpacing.sm),
                              Text(
                                venue.description,
                                style: AppTextStyles.body.copyWith(color: AppColors.gray),
                              ),
                            ],
                          ),
                        ),
                      ],
                      if (venue.amenities.isNotEmpty) ...[
                        const SizedBox(height: AppSpacing.md),
                        Container(
                          padding: const EdgeInsets.all(AppSpacing.md),
                          decoration: BoxDecoration(
                            color: AppColors.white,
                            borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Удобства',
                                style: AppTextStyles.bodyBold,
                              ),
                              const SizedBox(height: AppSpacing.sm),
                              Wrap(
                                spacing: AppSpacing.lg,
                                runSpacing: AppSpacing.sm,
                                children: venue.amenities.map((amenity) {
                                  return Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        Icons.check_circle_outline,
                                        size: AppSpacing.iconSizeSm,
                                        color: AppColors.success,
                                      ),
                                      const SizedBox(width: AppSpacing.xxs),
                                      Text(
                                        venue.getAmenityName(amenity),
                                        style: AppTextStyles.body,
                                      ),
                                    ],
                                  );
                                }).toList(),
                              ),
                            ],
                          ),
                        ),
                      ],
                      const SizedBox(height: AppSpacing.xl),
                      Text(
                        'Доступные корты',
                        style: AppTextStyles.h3,
                      ),
                      const SizedBox(height: AppSpacing.md),
                      _buildCourtsList(provider),
                    ],
                  ),
                ),
              ),
            ],
          ),
          bottomNavigationBar: Container(
            padding: const EdgeInsets.all(AppSpacing.cardPadding),
            decoration: BoxDecoration(
              color: AppColors.white,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(AppSpacing.radiusLg)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.1),
                  blurRadius: 20,
                  offset: const Offset(0, -4),
                ),
              ],
            ),
            child: SizedBox(
              height: AppSpacing.buttonHeight,
              child: ElevatedButton(
                onPressed: provider.selectedCourt != null
                    ? () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (context) => const SimpleTimeSelectionScreen()),
                        );
                      }
                    : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                  ),
                ),
                child: Text(
                  provider.selectedCourt != null
                      ? 'Выбрать время для ${provider.selectedCourt!.name}'
                      : 'Выберите корт',
                  style: AppTextStyles.button.copyWith(color: AppColors.white),
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildCourtsList(VenuesProvider provider) {
    if (provider.courts.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(AppSpacing.xl),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        ),
        child: Center(
          child: Column(
            children: [
              Icon(
                Icons.sports_tennis,
                size: 48,
                color: AppColors.lightGray,
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                'Нет доступных кортов',
                style: AppTextStyles.body.copyWith(color: AppColors.gray),
              ),
            ],
          ),
        ),
      );
    }

    return Column(
      children: provider.courts.map((court) {
        final isSelected = provider.selectedCourt?.id == court.id;
        
        return GestureDetector(
          onTap: () => provider.selectCourt(court),
          child: Container(
            margin: const EdgeInsets.only(bottom: AppSpacing.sm),
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              color: isSelected ? AppColors.primaryLight : AppColors.white,
              borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
              border: Border.all(
                color: isSelected ? AppColors.primary : AppColors.extraLightGray,
                width: isSelected ? 2 : 1,
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        court.name,
                        style: AppTextStyles.bodyBold,
                      ),
                      const SizedBox(height: AppSpacing.xxs),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.xs,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: _getSportColor(court.type),
                              borderRadius: BorderRadius.circular(AppSpacing.radiusXs),
                            ),
                            child: Text(
                              court.sportLabel,
                              style: AppTextStyles.tiny.copyWith(
                                color: AppColors.white,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          const SizedBox(width: AppSpacing.xs),
                          Text(
                            court.courtTypeText,
                            style: AppTextStyles.caption.copyWith(color: AppColors.gray),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '${court.priceWeekday.toInt()}₽',
                      style: AppTextStyles.bodyBold.copyWith(color: AppColors.primary),
                    ),
                    Text(
                      '/час',
                      style: AppTextStyles.caption.copyWith(color: AppColors.gray),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  Color _getSportColor(String sport) {
    switch (sport) {
      case 'tennis':
        return AppColors.tennis;
      case 'padel':
        return AppColors.padel;
      case 'badminton':
        return AppColors.badminton;
      default:
        return AppColors.primary;
    }
  }
}