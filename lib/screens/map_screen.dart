import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:provider/provider.dart';
import '../providers/venues_provider.dart';
import '../providers/location_provider.dart';
import '../models/venue_model.dart';
import '../services/map_service.dart';
import '../core/theme/colors.dart';
import '../core/theme/text_styles.dart';
import '../core/theme/spacing.dart';
import 'court_detail_screen.dart';

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  GoogleMapController? _controller;
  final MapService _mapService = MapService();
  Set<Marker> _markers = {};
  Set<Circle> _circles = {};
  bool _isLoading = true;
  String _selectedSport = 'all';

  // Стартовая позиция - центр Москвы
  static const CameraPosition _initialPosition = CameraPosition(
    target: LatLng(55.7558, 37.6173),
    zoom: 11.0,
  );

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initializeMap();
    });
  }

  Future<void> _initializeMap() async {
    final locationProvider = context.read<LocationProvider>();
    final venuesProvider = context.read<VenuesProvider>();
    
    setState(() => _isLoading = true);
    
    try {
      // Получаем текущую позицию
      await locationProvider.getCurrentLocation();
      
      // Загружаем клубы
      await venuesProvider.loadVenues();
      
      // Обновляем камеру на текущую позицию
      if (locationProvider.currentPosition != null && _controller != null) {
        _controller!.animateCamera(
          CameraUpdate.newLatLngZoom(
            LatLng(
              locationProvider.currentPosition!.latitude,
              locationProvider.currentPosition!.longitude,
            ),
            14.0,
          ),
        );
        
        // Добавляем круг вокруг текущей позиции
        _updateUserLocation(locationProvider);
      }
      
      // Создаем маркеры для клубов
      _createMarkers(venuesProvider.venues);
      
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _updateUserLocation(LocationProvider locationProvider) {
    if (locationProvider.currentPosition == null) return;
    
    setState(() {
      _circles = {
        Circle(
          circleId: const CircleId('userLocation'),
          center: LatLng(
            locationProvider.currentPosition!.latitude,
            locationProvider.currentPosition!.longitude,
          ),
          radius: 50,
          fillColor: AppColors.primary.withOpacity(0.15),
          strokeColor: AppColors.primary,
          strokeWidth: 2,
        ),
      };
    });
  }

  void _createMarkers(List<VenueModel> venues) {
    // Фильтруем только клубы с координатами
    final venuesWithLocation = venues.where((v) => v.location != null).toList();
    
    setState(() {
      _markers = venuesWithLocation.map((venue) {
        return Marker(
          markerId: MarkerId(venue.id),
          position: LatLng(
            venue.location!.latitude,
            venue.location!.longitude,
          ),
          infoWindow: InfoWindow(
            title: venue.name,
            snippet: venue.address,
            onTap: () => _onMarkerTap(venue),
          ),
          icon: BitmapDescriptor.defaultMarkerWithHue(
            _getMarkerHue(_getSportType(venue)),
          ),
        );
      }).toSet();
    });
  }

  String _getSportType(VenueModel venue) {
    // Пока возвращаем основной тип спорта
    // В будущем можно добавить поле sports в VenueModel
    if (venue.name.toLowerCase().contains('падел')) return 'padel';
    if (venue.name.toLowerCase().contains('теннис')) return 'tennis';
    if (venue.name.toLowerCase().contains('бадминтон')) return 'badminton';
    return 'tennis'; // По умолчанию
  }

  double _getMarkerHue(String sport) {
    switch (sport) {
      case 'tennis':
        return BitmapDescriptor.hueGreen;
      case 'padel':
        return BitmapDescriptor.hueBlue;
      case 'badminton':
        return BitmapDescriptor.hueOrange;
      default:
        return BitmapDescriptor.hueRed;
    }
  }

  void _onMarkerTap(VenueModel venue) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => _VenueBottomSheet(venue: venue),
    );
  }

  void _onSportFilterChanged(String sport) {
    setState(() => _selectedSport = sport);
    final venuesProvider = context.read<VenuesProvider>();
    
    if (sport == 'all') {
      _createMarkers(venuesProvider.venues);
    } else {
      // Фильтруем по типу спорта
      final filtered = venuesProvider.venues.where((venue) {
        final sportType = _getSportType(venue);
        return sportType == sport;
      }).toList();
      _createMarkers(filtered);
    }
  }

  @override
  Widget build(BuildContext context) {
    final locationProvider = context.watch<LocationProvider>();
    
    return Scaffold(
      body: Stack(
        children: [
          GoogleMap(
            mapType: MapType.normal,
            initialCameraPosition: _initialPosition,
            onMapCreated: (GoogleMapController controller) {
              _controller = controller;
              _controller!.setMapStyle(_mapService.mapStyle);
              if (locationProvider.currentPosition != null) {
                _controller!.animateCamera(
                  CameraUpdate.newLatLngZoom(
                    LatLng(
                      locationProvider.currentPosition!.latitude,
                      locationProvider.currentPosition!.longitude,
                    ),
                    14.0,
                  ),
                );
              }
            },
            markers: _markers,
            circles: _circles,
            myLocationEnabled: true,
            myLocationButtonEnabled: false,
            zoomControlsEnabled: false,
            mapToolbarEnabled: false,
          ),
          
          // Фильтры по видам спорта
          Positioned(
            top: MediaQuery.of(context).padding.top + AppSpacing.md,
            left: AppSpacing.md,
            right: AppSpacing.md,
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _FilterChip(
                    label: 'Все',
                    isSelected: _selectedSport == 'all',
                    onTap: () => _onSportFilterChanged('all'),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  _FilterChip(
                    label: 'Падел',
                    isSelected: _selectedSport == 'padel',
                    onTap: () => _onSportFilterChanged('padel'),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  _FilterChip(
                    label: 'Теннис',
                    isSelected: _selectedSport == 'tennis',
                    onTap: () => _onSportFilterChanged('tennis'),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  _FilterChip(
                    label: 'Бадминтон',
                    isSelected: _selectedSport == 'badminton',
                    onTap: () => _onSportFilterChanged('badminton'),
                  ),
                ],
              ),
            ),
          ),
          
          // Кнопка центрирования на текущей позиции
          Positioned(
            right: AppSpacing.md,
            bottom: AppSpacing.xxl + 80, // Учитываем bottom navigation
            child: FloatingActionButton(
              mini: true,
              backgroundColor: AppColors.white,
              foregroundColor: AppColors.primary,
              onPressed: () {
                if (locationProvider.currentPosition != null && _controller != null) {
                  _controller!.animateCamera(
                    CameraUpdate.newLatLngZoom(
                      LatLng(
                        locationProvider.currentPosition!.latitude,
                        locationProvider.currentPosition!.longitude,
                      ),
                      14.0,
                    ),
                  );
                }
              },
              child: const Icon(Icons.my_location),
            ),
          ),
          
          if (_isLoading)
            Container(
              color: Colors.black26,
              child: const Center(
                child: CircularProgressIndicator(),
              ),
            ),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _FilterChip({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.sm,
        ),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : AppColors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Text(
          label,
          style: AppTextStyles.bodyMedium.copyWith(
            color: isSelected ? AppColors.white : AppColors.textPrimary,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
          ),
        ),
      ),
    );
  }
}

class _VenueBottomSheet extends StatelessWidget {
  final VenueModel venue;

  const _VenueBottomSheet({required this.venue});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      venue.name,
                      style: AppTextStyles.headlineSmall,
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      venue.address,
                      style: AppTextStyles.bodyMedium.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.all(AppSpacing.sm),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.directions,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          
          Row(
            children: [
              if (venue.rating > 0)
                _InfoChip(
                  icon: Icons.star,
                  label: venue.rating.toString(),
                ),
              if (venue.rating > 0)
                const SizedBox(width: AppSpacing.md),
              if (venue.distance != null)
                _InfoChip(
                  icon: Icons.location_on,
                  label: '${venue.distance!.toStringAsFixed(1)} км',
                ),
            ],
          ),
          
          const SizedBox(height: AppSpacing.lg),
          
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => CourtDetailScreen(
                      venueId: venue.id,
                      venueName: venue.name,
                    ),
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: Text(
                'Посмотреть корты',
                style: AppTextStyles.button.copyWith(color: AppColors.white),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;

  const _InfoChip({
    required this.icon,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 16, color: AppColors.textSecondary),
        const SizedBox(width: AppSpacing.xs),
        Text(
          label,
          style: AppTextStyles.bodySmall.copyWith(
            color: AppColors.textSecondary,
          ),
        ),
      ],
    );
  }
}