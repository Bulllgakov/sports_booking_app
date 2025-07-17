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
      "stylers": [{"color": "#9ca5b3"}]
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
      "featureType": "poi",
      "elementType": "labels.text",
      "stylers": [{"visibility": "off"}]
    },
    {
      "featureType": "poi.business",
      "stylers": [{"visibility": "off"}]
    },
    {
      "featureType": "road",
      "elementType": "labels.icon",
      "stylers": [{"visibility": "off"}]
    },
    {
      "featureType": "transit",
      "stylers": [{"visibility": "off"}]
    }
  ]''';

  String get mapStyle => _lightMapStyle;

  // Расчет расстояния между двумя точками (формула Haversine)
  double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
    const double earthRadius = 6371; // Радиус Земли в километрах
    
    double dLat = _toRadians(lat2 - lat1);
    double dLon = _toRadians(lon2 - lon1);
    
    double a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(_toRadians(lat1)) * math.cos(_toRadians(lat2)) *
        math.sin(dLon / 2) * math.sin(dLon / 2);
    
    double c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
    
    return earthRadius * c;
  }
  
  double _toRadians(double degree) {
    return degree * (math.pi / 180);
  }

  // Форматирование расстояния
  String formatDistance(double distance) {
    if (distance < 1) {
      return '${(distance * 1000).round()} м';
    } else {
      return '${distance.toStringAsFixed(1)} км';
    }
  }

  // Получение границ для набора маркеров
  LatLngBounds boundsFromLatLngList(List<LatLng> list) {
    assert(list.isNotEmpty);
    double x0 = list.first.latitude;
    double x1 = list.first.latitude;
    double y0 = list.first.longitude;
    double y1 = list.first.longitude;
    
    for (LatLng latLng in list) {
      if (latLng.latitude > x1) x1 = latLng.latitude;
      if (latLng.latitude < x0) x0 = latLng.latitude;
      if (latLng.longitude > y1) y1 = latLng.longitude;
      if (latLng.longitude < y0) y0 = latLng.longitude;
    }
    
    return LatLngBounds(
      northeast: LatLng(x1, y1),
      southwest: LatLng(x0, y0),
    );
  }

  // Создание кастомного маркера из изображения
  Future<BitmapDescriptor> createCustomMarker(String assetPath, {int width = 100}) async {
    final ByteData data = await rootBundle.load(assetPath);
    final Uint8List bytes = data.buffer.asUint8List();
    
    // Здесь можно добавить изменение размера изображения
    return BitmapDescriptor.fromBytes(bytes);
  }

  // Получение цвета маркера по типу спорта
  BitmapDescriptor getMarkerIcon(String sportType) {
    switch (sportType) {
      case 'tennis':
        return BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen);
      case 'padel':
        return BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue);
      case 'badminton':
        return BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange);
      default:
        return BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed);
    }
  }

  // Создание полилинии для маршрута
  Polyline createRoute({
    required String routeId,
    required List<LatLng> points,
    Color color = Colors.blue,
    int width = 5,
  }) {
    return Polyline(
      polylineId: PolylineId(routeId),
      color: color,
      width: width,
      points: points,
      patterns: [], // Можно добавить пунктирную линию
    );
  }

  // Проверка, находится ли точка в радиусе
  bool isPointInRadius(LatLng center, LatLng point, double radiusInKm) {
    double distance = calculateDistance(
      center.latitude,
      center.longitude,
      point.latitude,
      point.longitude,
    );
    return distance <= radiusInKm;
  }

  // Группировка маркеров для кластеризации
  List<List<MapMarker>> clusterMarkers(List<MapMarker> markers, double zoomLevel) {
    // Простая кластеризация на основе расстояния
    double clusterRadius = _getClusterRadius(zoomLevel);
    List<List<MapMarker>> clusters = [];
    List<bool> clustered = List.filled(markers.length, false);

    for (int i = 0; i < markers.length; i++) {
      if (clustered[i]) continue;

      List<MapMarker> cluster = [markers[i]];
      clustered[i] = true;

      for (int j = i + 1; j < markers.length; j++) {
        if (clustered[j]) continue;

        double distance = calculateDistance(
          markers[i].position.latitude,
          markers[i].position.longitude,
          markers[j].position.latitude,
          markers[j].position.longitude,
        );

        if (distance <= clusterRadius) {
          cluster.add(markers[j]);
          clustered[j] = true;
        }
      }

      clusters.add(cluster);
    }

    return clusters;
  }

  double _getClusterRadius(double zoom) {
    // Радиус кластеризации в зависимости от уровня зума
    if (zoom < 10) return 50;
    if (zoom < 12) return 30;
    if (zoom < 14) return 20;
    if (zoom < 16) return 10;
    return 5;
  }

  // Центр кластера
  LatLng getClusterCenter(List<MapMarker> markers) {
    double lat = 0;
    double lng = 0;
    
    for (var marker in markers) {
      lat += marker.position.latitude;
      lng += marker.position.longitude;
    }
    
    return LatLng(lat / markers.length, lng / markers.length);
  }
}

// Модель для маркера карты
class MapMarker {
  final String id;
  final LatLng position;
  final String title;
  final String? snippet;
  final String type;

  MapMarker({
    required this.id,
    required this.position,
    required this.title,
    this.snippet,
    required this.type,
  });
}