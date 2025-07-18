import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'dart:math' as math;
import 'package:flutter/services.dart';
import 'package:flutter/material.dart';

class MapService {
  // Стиль карты для темной темы
  static const String _darkMapStyle = '''[
    {
      "elementType": "geometry",
      "stylers": [{"color": "#242f3e"}]
    },
    {
      "elementType": "labels.text.stroke",
      "stylers": [{"color": "#242f3e"}]
    },
    {
      "elementType": "labels.text.fill",
      "stylers": [{"color": "#746855"}]
    },
    {
      "featureType": "administrative.locality",
      "elementType": "labels.text.fill",
      "stylers": [{"color": "#d59563"}]
    },
    {
      "featureType": "poi",
      "elementType": "labels.text.fill",
      "stylers": [{"color": "#d59563"}]
    },
    {
      "featureType": "poi.park",
      "elementType": "geometry",
      "stylers": [{"color": "#263c3f"}]
    },
    {
      "featureType": "poi.park",
      "elementType": "labels.text.fill",
      "stylers": [{"color": "#6b9a76"}]
    },
    {
      "featureType": "road",
      "elementType": "geometry",
      "stylers": [{"color": "#38414e"}]
    },
    {
      "featureType": "road",
      "elementType": "geometry.stroke",
      "stylers": [{"color": "#212a37"}]
    },
    {
      "featureType": "road",
      "elementType": "labels.text.fill",
      "stylers": [{"color": "#9ca2a0"}]
    },
    {
      "featureType": "road.highway",
      "elementType": "geometry",
      "stylers": [{"color": "#746855"}]
    },
    {
      "featureType": "road.highway",
      "elementType": "geometry.stroke",
      "stylers": [{"color": "#1f2835"}]
    },
    {
      "featureType": "road.highway",
      "elementType": "labels.text.fill",
      "stylers": [{"color": "#f3d19c"}]
    },
    {
      "featureType": "transit",
      "elementType": "geometry",
      "stylers": [{"color": "#2f3948"}]
    },
    {
      "featureType": "transit.station",
      "elementType": "labels.text.fill",
      "stylers": [{"color": "#d59563"}]
    },
    {
      "featureType": "water",
      "elementType": "geometry",
      "stylers": [{"color": "#17263c"}]
    },
    {
      "featureType": "water",
      "elementType": "labels.text.fill",
      "stylers": [{"color": "#515c6d"}]
    },
    {
      "featureType": "water",
      "elementType": "labels.text.stroke",
      "stylers": [{"color": "#17263c"}]
    }
  ]''';

  // Стиль карты для светлой темы
  static const String _lightMapStyle = '''[
    {
      "featureType": "poi.business",
      "stylers": [{"visibility": "off"}]
    },
    {
      "featureType": "poi.park",
      "elementType": "labels.text",
      "stylers": [{"visibility": "off"}]
    }
  ]''';

  // Получить стиль карты в зависимости от темы
  String get mapStyle => _lightMapStyle;

  // Расчет расстояния между двумя точками (формула Haversine)
  double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
    const double earthRadius = 6371; // Радиус Земли в километрах
    double dLat = _degreesToRadians(lat2 - lat1);
    double dLon = _degreesToRadians(lon2 - lon1);
    
    double a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(_degreesToRadians(lat1)) *
        math.cos(_degreesToRadians(lat2)) *
        math.sin(dLon / 2) *
        math.sin(dLon / 2);
    
    double c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
    return earthRadius * c;
  }

  double _degreesToRadians(double degrees) {
    return degrees * (math.pi / 180);
  }

  // Получить границы для набора маркеров
  LatLngBounds getBoundsFromMarkers(List<Marker> markers) {
    if (markers.isEmpty) {
      // Возвращаем дефолтные границы (Москва)
      return LatLngBounds(
        southwest: const LatLng(55.5, 37.3),
        northeast: const LatLng(55.9, 37.9),
      );
    }

    double minLat = markers.first.position.latitude;
    double maxLat = markers.first.position.latitude;
    double minLng = markers.first.position.longitude;
    double maxLng = markers.first.position.longitude;

    for (var marker in markers) {
      minLat = math.min(minLat, marker.position.latitude);
      maxLat = math.max(maxLat, marker.position.latitude);
      minLng = math.min(minLng, marker.position.longitude);
      maxLng = math.max(maxLng, marker.position.longitude);
    }

    return LatLngBounds(
      southwest: LatLng(minLat, minLng),
      northeast: LatLng(maxLat, maxLng),
    );
  }

  // Получить уровень зума для отображения всех маркеров
  double getZoomLevel(LatLngBounds bounds, double mapWidth, double mapHeight) {
    const double worldDimension = 256;
    const double zoomMax = 21;
    
    double latRad(double lat) {
      double sinValue = math.sin(lat * math.pi / 180);
      double radValue = math.log((1 + sinValue) / (1 - sinValue)) / 2;
      return math.max(math.min(radValue, math.pi), -math.pi) / 2;
    }

    double zoom(double mapPx, double worldPx, double fraction) {
      return (math.log(mapPx / worldPx / fraction) / math.ln2).floorToDouble();
    }

    final LatLng ne = bounds.northeast;
    final LatLng sw = bounds.southwest;

    double latFraction = (latRad(ne.latitude) - latRad(sw.latitude)) / math.pi;
    double lngDiff = ne.longitude - sw.longitude;
    double lngFraction = ((lngDiff < 0) ? (lngDiff + 360) : lngDiff) / 360;

    double latZoom = zoom(mapHeight, worldDimension, latFraction);
    double lngZoom = zoom(mapWidth, worldDimension, lngFraction);

    double result = math.min(latZoom, lngZoom);
    return math.min(result, zoomMax);
  }

  // Форматирование расстояния для отображения
  String formatDistance(double distanceInKm) {
    if (distanceInKm < 1) {
      return '${(distanceInKm * 1000).round()} м';
    } else {
      return '${distanceInKm.toStringAsFixed(1)} км';
    }
  }

  // Получить цвет маркера по типу спорта
  BitmapDescriptor getMarkerColor(String sportType) {
    switch (sportType.toLowerCase()) {
      case 'tennis':
        return BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen);
      case 'padel':
        return BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue);
      case 'badminton':
        return BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange);
      default:
        return BitmapDescriptor.defaultMarker;
    }
  }

  // Проверка, находится ли точка в радиусе
  bool isWithinRadius(LatLng point1, LatLng point2, double radiusInKm) {
    double distance = calculateDistance(
      point1.latitude,
      point1.longitude,
      point2.latitude,
      point2.longitude,
    );
    return distance <= radiusInKm;
  }

  // Создание кастомного маркера с иконкой
  Future<BitmapDescriptor> createCustomMarker(String sportType) async {
    // В будущем здесь можно добавить кастомные иконки для разных видов спорта
    switch (sportType) {
      case 'tennis':
        return BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen);
      case 'padel':
        return BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue);
      case 'badminton':
        return BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange);
      default:
        return BitmapDescriptor.defaultMarker;
    }
  }
}

// Модель для хранения информации о маркере
class MapMarker {
  final String id;
  final LatLng position;
  final String title;
  final String snippet;
  final String sportType;

  MapMarker({
    required this.id,
    required this.position,
    required this.title,
    required this.snippet,
    required this.sportType,
  });
}