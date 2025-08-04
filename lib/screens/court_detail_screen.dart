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
                      const SizedBox(height: AppSpacing.xl),
                      Text(
                        'Доступные корты',
                        style: AppTextStyles.h3,
                      ),
                      const SizedBox(height: AppSpacing.md),
                      _buildCourtsList(provider),
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
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(
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
                const SizedBox(height: AppSpacing.sm),
                Text(
                  'Продолжая, соглашаюсь с политикой и соглашением',
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.textSecondary,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
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
                      court.getPriceRange().display,
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
    final now = DateTime.now();
    final formattedDate = '${now.day}.${now.month.toString().padLeft(2, '0')}.${now.year}';
    
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
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        Text(
                          'об оказании услуг по предоставлению спортивных площадок',
                          style: AppTextStyles.body.copyWith(color: AppColors.gray),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: AppSpacing.md),
                        Text(
                          'Дата публикации: $formattedDate',
                          style: AppTextStyles.caption.copyWith(color: AppColors.gray),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: AppSpacing.xl),
                        Text(
                          'Настоящее Пользовательское соглашение (далее – «Соглашение») регулирует отношения между ${venue.name} ${venue.organizationType != null ? '(${venue.organizationType})' : ''}, именуемым в дальнейшем «Исполнитель», с одной стороны, и физическим лицом, именуемым в дальнейшем «Заказчик», с другой стороны, совместно именуемые «Стороны», по поводу оказания услуг по предоставлению спортивных площадок для занятий спортом.',
                          style: AppTextStyles.body,
                        ),
                        const SizedBox(height: AppSpacing.xl),
                        Text(
                          '1. ТЕРМИНЫ И ОПРЕДЕЛЕНИЯ',
                          style: AppTextStyles.bodyBold,
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          '1.1. Клуб — спортивный комплекс, расположенный по адресу: ${venue.address}, управляемый Исполнителем.',
                          style: AppTextStyles.body,
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          '1.2. Корт/Площадка — специально оборудованная спортивная площадка для занятий теннисом, паделом, бадминтоном или иными видами спорта.',
                          style: AppTextStyles.body,
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          '1.3. Бронирование — резервирование Корта на определенную дату и время через мобильное приложение «Все Корты» или иным способом, предусмотренным Исполнителем.',
                          style: AppTextStyles.body,
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          '1.4. Услуги — предоставление Корта во временное пользование Заказчику для занятий спортом.',
                          style: AppTextStyles.body,
                        ),
                        const SizedBox(height: AppSpacing.xl),
                        Text(
                          '2. ПРЕДМЕТ СОГЛАШЕНИЯ',
                          style: AppTextStyles.bodyBold,
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          '2.1. Исполнитель обязуется предоставить Заказчику во временное пользование Корт для занятий спортом, а Заказчик обязуется оплатить Услуги в соответствии с условиями настоящего Соглашения.',
                          style: AppTextStyles.body,
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          '2.2. Конкретные условия предоставления Услуг (дата, время, продолжительность, стоимость) определяются при Бронировании.',
                          style: AppTextStyles.body,
                        ),
                        const SizedBox(height: AppSpacing.xl),
                        Text(
                          '3. ПОРЯДОК БРОНИРОВАНИЯ И ОПЛАТЫ',
                          style: AppTextStyles.bodyBold,
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          '3.1. Бронирование осуществляется через мобильное приложение «Все Корты», по телефону ${venue.phone ?? 'клуба'} или иным доступным способом.',
                          style: AppTextStyles.body,
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          '3.2. Оплата Услуг производится в соответствии с действующими тарифами Исполнителя одним из следующих способов:',
                          style: AppTextStyles.body,
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        Padding(
                          padding: const EdgeInsets.only(left: AppSpacing.md),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('• Онлайн-оплата банковской картой через приложение', style: AppTextStyles.body),
                              Text('• Оплата наличными в кассе Клуба', style: AppTextStyles.body),
                              Text('• Оплата банковской картой на месте', style: AppTextStyles.body),
                              Text('• Безналичный перевод по реквизитам Исполнителя', style: AppTextStyles.body),
                            ],
                          ),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          '3.3. Бронирование считается подтвержденным после получения оплаты или подтверждения от администратора Клуба.',
                          style: AppTextStyles.body,
                        ),
                        const SizedBox(height: AppSpacing.xl),
                        Text(
                          '4. ПРАВА И ОБЯЗАННОСТИ СТОРОН',
                          style: AppTextStyles.bodyBold,
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          '4.1. Исполнитель обязуется:',
                          style: AppTextStyles.bodyBold,
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        Padding(
                          padding: const EdgeInsets.only(left: AppSpacing.md),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('• Предоставить Корт в соответствии с Бронированием', style: AppTextStyles.body),
                              Text('• Обеспечить надлежащее состояние Корта и оборудования', style: AppTextStyles.body),
                              Text('• Предоставить раздевалки и душевые (при наличии)', style: AppTextStyles.body),
                              Text('• Обеспечить безопасность на территории Клуба', style: AppTextStyles.body),
                            ],
                          ),
                        ),
                        const SizedBox(height: AppSpacing.md),
                        Text(
                          '4.2. Заказчик обязуется:',
                          style: AppTextStyles.bodyBold,
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        Padding(
                          padding: const EdgeInsets.only(left: AppSpacing.md),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('• Своевременно оплатить Услуги', style: AppTextStyles.body),
                              Text('• Соблюдать правила поведения в Клубе', style: AppTextStyles.body),
                              Text('• Бережно относиться к имуществу Клуба', style: AppTextStyles.body),
                              Text('• Использовать спортивную обувь и форму', style: AppTextStyles.body),
                              Text('• Освободить Корт по истечении оплаченного времени', style: AppTextStyles.body),
                            ],
                          ),
                        ),
                        const SizedBox(height: AppSpacing.xl),
                        Text(
                          '5. ОТМЕНА И ПЕРЕНОС БРОНИРОВАНИЯ',
                          style: AppTextStyles.bodyBold,
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          '5.1. Заказчик вправе отменить или перенести Бронирование не позднее чем за 24 часа до начала оказания Услуг.',
                          style: AppTextStyles.body,
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          '5.2. При отмене Бронирования менее чем за 24 часа, внесенная предоплата не возвращается.',
                          style: AppTextStyles.body,
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          '5.3. Исполнитель вправе отменить Бронирование по техническим причинам с полным возвратом предоплаты.',
                          style: AppTextStyles.body,
                        ),
                        const SizedBox(height: AppSpacing.xl),
                        Text(
                          '6. ОТВЕТСТВЕННОСТЬ СТОРОН',
                          style: AppTextStyles.bodyBold,
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          '6.1. Исполнитель не несет ответственности за вред, причиненный жизни и здоровью Заказчика в результате нарушения им правил техники безопасности и правил поведения в Клубе.',
                          style: AppTextStyles.body,
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          '6.2. Заказчик несет материальную ответственность за ущерб, причиненный имуществу Клуба.',
                          style: AppTextStyles.body,
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          '6.3. Исполнитель не несет ответственности за сохранность личных вещей Заказчика.',
                          style: AppTextStyles.body,
                        ),
                        const SizedBox(height: AppSpacing.xl),
                        Text(
                          '7. ПЕРСОНАЛЬНЫЕ ДАННЫЕ',
                          style: AppTextStyles.bodyBold,
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          '7.1. Заказчик дает согласие на обработку своих персональных данных в соответствии с Федеральным законом «О персональных данных» №152-ФЗ.',
                          style: AppTextStyles.body,
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          '7.2. Исполнитель обязуется использовать персональные данные Заказчика исключительно для оказания Услуг и не передавать их третьим лицам без согласия Заказчика.',
                          style: AppTextStyles.body,
                        ),
                        const SizedBox(height: AppSpacing.xl),
                        Text(
                          '8. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ',
                          style: AppTextStyles.bodyBold,
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          '8.1. Настоящее Соглашение вступает в силу с момента акцепта Заказчиком его условий путем оформления Бронирования и действует до полного исполнения Сторонами своих обязательств.',
                          style: AppTextStyles.body,
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          '8.2. Все споры и разногласия решаются путем переговоров, а при невозможности достижения соглашения — в судебном порядке.',
                          style: AppTextStyles.body,
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          '8.3. Исполнитель вправе в одностороннем порядке изменять условия настоящего Соглашения, публикуя изменения на сайте и в приложении.',
                          style: AppTextStyles.body,
                        ),
                        const SizedBox(height: AppSpacing.xl),
                        Text(
                          '9. РЕКВИЗИТЫ ИСПОЛНИТЕЛЯ',
                          style: AppTextStyles.bodyBold,
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Container(
                          padding: const EdgeInsets.all(AppSpacing.md),
                          decoration: BoxDecoration(
                            color: AppColors.chipBackground,
                            borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                venue.name,
                                style: AppTextStyles.bodyBold,
                              ),
                              if (venue.inn != null) ...[
                                const SizedBox(height: AppSpacing.xs),
                                Text('ИНН: ${venue.inn}', style: AppTextStyles.body),
                              ],
                              if (venue.bankAccount != null) ...[
                                const SizedBox(height: AppSpacing.xs),
                                Text('Расчетный счет: ${venue.bankAccount}', style: AppTextStyles.body),
                              ],
                              const SizedBox(height: AppSpacing.xs),
                              Text('Адрес: ${venue.address}', style: AppTextStyles.body),
                              if (venue.phone != null) ...[
                                const SizedBox(height: AppSpacing.xs),
                                Text('Телефон: ${venue.phone}', style: AppTextStyles.body),
                              ],
                            ],
                          ),
                        ),
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