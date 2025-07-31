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
                      const SizedBox(height: AppSpacing.md),
                      // User agreement link
                      GestureDetector(
                        onTap: () {
                          _showUserAgreementDialog(context, venue);
                        },
                        child: Container(
                          padding: const EdgeInsets.all(AppSpacing.md),
                          decoration: BoxDecoration(
                            color: AppColors.white,
                            borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                            border: Border.all(
                              color: AppColors.extraLightGray,
                              width: 1,
                            ),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                Icons.description_outlined,
                                size: AppSpacing.iconSizeSm,
                                color: AppColors.gray,
                              ),
                              const SizedBox(width: AppSpacing.sm),
                              Expanded(
                                child: Text(
                                  'Пользовательское соглашение',
                                  style: AppTextStyles.body.copyWith(
                                    color: AppColors.primary,
                                    decoration: TextDecoration.underline,
                                  ),
                                ),
                              ),
                              Icon(
                                Icons.arrow_forward_ios,
                                size: AppSpacing.iconSizeXs,
                                color: AppColors.gray,
                              ),
                            ],
                          ),
                        ),
                      ),
                      // Bottom padding to avoid bottomNavigationBar overlap
                      const SizedBox(height: 100),
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
                          MaterialPageRoute(
                            builder: (context) => SimpleTimeSelectionScreen(
                              venueId: provider.selectedVenue?.id ?? '',
                              courtId: provider.selectedCourt!.id,
                              venue: provider.selectedVenue,
                              court: provider.selectedCourt,
                            ),
                          ),
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
    if (provider.isLoading) {
      return Container(
        padding: const EdgeInsets.all(AppSpacing.xl),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        ),
        child: const Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (provider.error != null) {
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
                Icons.error_outline,
                size: 48,
                color: AppColors.error,
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                provider.error!,
                style: AppTextStyles.body.copyWith(color: AppColors.error),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

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
                      '${court.priceWeekday?.toInt() ?? 0}₽',
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

  void _showUserAgreementDialog(BuildContext context, VenueModel venue) {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (BuildContext context) {
        return Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          ),
          child: Container(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.8,
              maxWidth: MediaQuery.of(context).size.width * 0.9,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(AppSpacing.cardPadding),
                  decoration: const BoxDecoration(
                    color: AppColors.white,
                    borderRadius: BorderRadius.vertical(
                      top: Radius.circular(AppSpacing.radiusMd),
                    ),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          'Пользовательское соглашение',
                          style: AppTextStyles.h3,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1),
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(AppSpacing.cardPadding),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'ПОЛЬЗОВАТЕЛЬСКОЕ СОГЛАШЕНИЕ',
                          style: AppTextStyles.h3,
                        ),
                        const SizedBox(height: AppSpacing.md),
                        Text(
                          'г. Москва • ${DateTime.now().day}.${DateTime.now().month.toString().padLeft(2, '0')}.${DateTime.now().year}',
                          style: AppTextStyles.body.copyWith(color: AppColors.gray),
                        ),
                        const SizedBox(height: AppSpacing.xl),
                        Text(
                          '1. ОБЩИЕ ПОЛОЖЕНИЯ',
                          style: AppTextStyles.bodyBold,
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          '1.1. Настоящее Пользовательское соглашение (далее – Соглашение) регулирует отношения между владельцем спортивного клуба "${venue.name}" (далее – Клуб) и пользователем приложения "Все Корты" (далее – Пользователь).',
                          style: AppTextStyles.body,
                        ),
                        const SizedBox(height: AppSpacing.md),
                        Text(
                          '1.2. Используя приложение для бронирования кортов, Пользователь соглашается с условиями данного Соглашения.',
                          style: AppTextStyles.body,
                        ),
                        const SizedBox(height: AppSpacing.xl),
                        Text(
                          '2. ПРАВИЛА БРОНИРОВАНИЯ',
                          style: AppTextStyles.bodyBold,
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          '2.1. Бронирование корта осуществляется через мобильное приложение "Все Корты".',
                          style: AppTextStyles.body,
                        ),
                        const SizedBox(height: AppSpacing.md),
                        Text(
                          '2.2. Оплата производится в момент бронирования через платежные системы Тбанк или Юкасса.',
                          style: AppTextStyles.body,
                        ),
                        const SizedBox(height: AppSpacing.md),
                        Text(
                          '2.3. Бронирование считается подтвержденным только после успешной оплаты.',
                          style: AppTextStyles.body,
                        ),
                        const SizedBox(height: AppSpacing.xl),
                        Text(
                          '3. ОТМЕНА БРОНИРОВАНИЯ',
                          style: AppTextStyles.bodyBold,
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          '3.1. Отмена бронирования возможна не позднее чем за 24 часа до начала игры.',
                          style: AppTextStyles.body,
                        ),
                        const SizedBox(height: AppSpacing.md),
                        Text(
                          '3.2. При отмене бронирования менее чем за 24 часа, оплата не возвращается.',
                          style: AppTextStyles.body,
                        ),
                        const SizedBox(height: AppSpacing.xl),
                        Text(
                          '4. ПРАВИЛА ПОВЕДЕНИЯ НА КОРТЕ',
                          style: AppTextStyles.bodyBold,
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          '4.1. На территории клуба запрещено курение и употребление алкоголя.',
                          style: AppTextStyles.body,
                        ),
                        const SizedBox(height: AppSpacing.md),
                        Text(
                          '4.2. Игроки обязаны соблюдать спортивный дресс-код.',
                          style: AppTextStyles.body,
                        ),
                        const SizedBox(height: AppSpacing.md),
                        Text(
                          '4.3. Запрещается использование корта для иных целей, кроме игры.',
                          style: AppTextStyles.body,
                        ),
                        const SizedBox(height: AppSpacing.xl),
                        Text(
                          '5. ОТВЕТСТВЕННОСТЬ',
                          style: AppTextStyles.bodyBold,
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          '5.1. Клуб не несет ответственности за травмы, полученные во время игры.',
                          style: AppTextStyles.body,
                        ),
                        const SizedBox(height: AppSpacing.md),
                        Text(
                          '5.2. Пользователь несет ответственность за сохранность инвентаря и оборудования.',
                          style: AppTextStyles.body,
                        ),
                        const SizedBox(height: AppSpacing.xl),
                        Text(
                          '6. КОНТАКТНАЯ ИНФОРМАЦИЯ',
                          style: AppTextStyles.bodyBold,
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        if (venue.organizationType != null) ...[
                          Text(
                            'Организация: ${venue.organizationType}',
                            style: AppTextStyles.body,
                          ),
                          const SizedBox(height: AppSpacing.xs),
                        ],
                        if (venue.inn != null) ...[
                          Text(
                            'ИНН: ${venue.inn}',
                            style: AppTextStyles.body,
                          ),
                          const SizedBox(height: AppSpacing.xs),
                        ],
                        if (venue.bankAccount != null) ...[
                          Text(
                            'Расчетный счет: ${venue.bankAccount}',
                            style: AppTextStyles.body,
                          ),
                          const SizedBox(height: AppSpacing.xs),
                        ],
                        Text(
                          'Адрес: ${venue.address}',
                          style: AppTextStyles.body,
                        ),
                        if (venue.phone != null) ...[
                          const SizedBox(height: AppSpacing.xs),
                          Text(
                            'Телефон: ${venue.phone}',
                            style: AppTextStyles.body,
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.all(AppSpacing.cardPadding),
                  decoration: const BoxDecoration(
                    color: AppColors.background,
                    borderRadius: BorderRadius.vertical(
                      bottom: Radius.circular(AppSpacing.radiusMd),
                    ),
                  ),
                  child: SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => Navigator.pop(context),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                        ),
                      ),
                      child: Text(
                        'Закрыть',
                        style: AppTextStyles.button.copyWith(color: AppColors.white),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}