import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:geolocator/geolocator.dart';
import '../models/venue_model.dart';
import '../models/court_model.dart';
import 'location_service.dart';

class VenueService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final LocationService _locationService = LocationService();
  
  // Получить все клубы
  Stream<List<VenueModel>> getVenues() {
    return _firestore
        .collection('venues')
        .where('status', isEqualTo: 'active')
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) {
        final data = doc.data();
        data['id'] = doc.id;
        return VenueModel.fromMap(data);
      }).toList();
    });
  }
  
  // Получить клубы с расчетом расстояния
  Future<List<VenueModel>> getVenuesWithDistance(Position? userPosition) async {
    try {
      final snapshot = await _firestore
          .collection('venues')
          .where('status', isEqualTo: 'active')
          .get();
      
      List<VenueModel> venues = snapshot.docs.map((doc) {
        final data = doc.data();
        data['id'] = doc.id;
        return VenueModel.fromMap(data);
      }).toList();
      
      // Calculate distances if user position is available
      if (userPosition != null) {
        for (var venue in venues) {
          if (venue.location != null) {
            venue.distance = _locationService.calculateDistance(
              userPosition.latitude,
              userPosition.longitude,
              venue.location!.latitude,
              venue.location!.longitude,
            );
          }
        }
        
        // Sort by distance
        venues.sort((a, b) => 
          (a.distance ?? double.infinity).compareTo(b.distance ?? double.infinity)
        );
      }
      
      return venues;
    } catch (e) {
      print('Error getting venues with distance: $e');
      return [];
    }
  }
  
  // Получить клуб по ID
  Future<VenueModel?> getVenueById(String venueId) async {
    try {
      final doc = await _firestore.collection('venues').doc(venueId).get();
      if (doc.exists && doc.data() != null) {
        final data = doc.data()!;
        data['id'] = doc.id;
        return VenueModel.fromMap(data);
      }
      return null;
    } catch (e) {
      print('Error getting venue: $e');
      return null;
    }
  }
  
  // Получить корты клуба
  Stream<List<CourtModel>> getCourtsByVenueId(String venueId) {
    return _firestore
        .collection('venues')
        .doc(venueId)
        .collection('courts')
        // Временно убираем фильтр по статусу для отладки
        // .where('status', isEqualTo: 'active')
        .snapshots()
        .map((snapshot) {
      print('Получено кортов для клуба $venueId: ${snapshot.docs.length}');
      return snapshot.docs.map((doc) {
        final data = doc.data();
        data['id'] = doc.id;
        print('Корт: ${data['name']}, статус: ${data['status']}');
        return CourtModel.fromMap(data);
      }).toList();
    });
  }
  
  // Получить корт по ID
  Future<CourtModel?> getCourtById(String courtId) async {
    try {
      // Сначала нужно найти корт в любом клубе
      final venuesSnapshot = await _firestore.collection('venues').get();
      
      for (final venueDoc in venuesSnapshot.docs) {
        final courtDoc = await _firestore
            .collection('venues')
            .doc(venueDoc.id)
            .collection('courts')
            .doc(courtId)
            .get();
            
        if (courtDoc.exists && courtDoc.data() != null) {
          final data = courtDoc.data()!;
          data['id'] = courtDoc.id;
          data['venueId'] = venueDoc.id; // Добавляем venueId
          return CourtModel.fromMap(data);
        }
      }
      return null;
    } catch (e) {
      print('Error getting court: $e');
      return null;
    }
  }
  
  // Поиск клубов по названию или адресу
  Future<List<VenueModel>> searchVenues(String query) async {
    if (query.isEmpty) return [];
    
    try {
      final lowerQuery = query.toLowerCase();
      final snapshot = await _firestore
          .collection('venues')
          .where('status', isEqualTo: 'active')
          .get();
      
      return snapshot.docs
          .map((doc) {
            final data = doc.data();
            data['id'] = doc.id;
            return VenueModel.fromMap(data);
          })
          .where((venue) =>
              venue.name.toLowerCase().contains(lowerQuery) ||
              venue.address.toLowerCase().contains(lowerQuery))
          .toList();
    } catch (e) {
      print('Error searching venues: $e');
      return [];
    }
  }
}