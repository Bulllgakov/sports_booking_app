import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/open_game_model.dart';
import '../models/user_model.dart';
import '../services/firestore_service.dart';

class OpenGamesProvider extends ChangeNotifier {
  List<OpenGameModel> _openGames = [];
  List<OpenGameModel> get openGames => _openGames;

  List<OpenGameModel> _userGames = [];
  List<OpenGameModel> get userGames => _userGames;

  OpenGameModel? _selectedGame;
  OpenGameModel? get selectedGame => _selectedGame;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _error;
  String? get error => _error;

  // Filters
  PlayerLevel? _levelFilter;
  PlayerLevel? get levelFilter => _levelFilter;

  GeoPoint? _userLocation;
  GeoPoint? get userLocation => _userLocation;

  double _maxDistance = 10.0;
  double get maxDistance => _maxDistance;

  // Load open games
  Future<void> loadOpenGames() async {
    _setLoading(true);
    _setError(null);

    try {
      _openGames = await FirestoreService.getOpenGames(
        playerLevel: _levelFilter,
        center: _userLocation,
        radiusKm: _maxDistance,
      );
      notifyListeners();
    } catch (e) {
      _setError('Ошибка загрузки открытых игр: $e');
    } finally {
      _setLoading(false);
    }
  }

  // Create open game
  Future<bool> createOpenGame({
    required String organizerId,
    required String bookingId,
    required PlayerLevel playerLevel,
    required int playersNeeded,
    required String description,
    required double pricePerPlayer,
  }) async {
    _setLoading(true);
    _setError(null);

    try {
      final openGame = OpenGameModel(
        id: '', // Will be set by Firestore
        organizerId: organizerId,
        bookingId: bookingId,
        playerLevel: playerLevel,
        playersNeeded: playersNeeded,
        playersJoined: [organizerId], // Organizer is automatically joined
        description: description,
        pricePerPlayer: pricePerPlayer,
        status: OpenGameStatus.open,
      );

      await FirestoreService.createOpenGame(openGame);
      
      // Reload games
      await loadOpenGames();
      
      return true;
    } catch (e) {
      _setError('Ошибка создания игры: $e');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Join open game
  Future<bool> joinGame(String gameId, String playerId) async {
    _setLoading(true);
    _setError(null);

    try {
      await FirestoreService.joinOpenGame(gameId, playerId);
      
      // Update local game if it exists
      final index = _openGames.indexWhere((game) => game.id == gameId);
      if (index != -1) {
        final game = _openGames[index];
        if (!game.playersJoined.contains(playerId) && !game.isFull) {
          final updatedPlayers = [...game.playersJoined, playerId];
          final newStatus = updatedPlayers.length >= game.playersNeeded 
              ? OpenGameStatus.full 
              : OpenGameStatus.open;
          
          _openGames[index] = game.copyWith(
            playersJoined: updatedPlayers,
            status: newStatus,
          );
          notifyListeners();
        }
      }
      
      return true;
    } catch (e) {
      _setError('Ошибка присоединения к игре: $e');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Leave open game
  Future<bool> leaveGame(String gameId, String playerId) async {
    _setLoading(true);
    _setError(null);

    try {
      await FirestoreService.leaveOpenGame(gameId, playerId);
      
      // Update local game if it exists
      final index = _openGames.indexWhere((game) => game.id == gameId);
      if (index != -1) {
        final game = _openGames[index];
        if (game.playersJoined.contains(playerId)) {
          final updatedPlayers = game.playersJoined.where((id) => id != playerId).toList();
          
          _openGames[index] = game.copyWith(
            playersJoined: updatedPlayers,
            status: OpenGameStatus.open,
          );
          notifyListeners();
        }
      }
      
      return true;
    } catch (e) {
      _setError('Ошибка выхода из игры: $e');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Set filters
  void setLevelFilter(PlayerLevel? level) {
    _levelFilter = level;
    loadOpenGames();
  }

  void setUserLocation(GeoPoint location) {
    _userLocation = location;
    loadOpenGames();
  }

  void setMaxDistance(double distance) {
    _maxDistance = distance;
    loadOpenGames();
  }

  // Clear filters
  void clearFilters() {
    _levelFilter = null;
    _maxDistance = 10.0;
    loadOpenGames();
  }

  // Select game
  void selectGame(OpenGameModel game) {
    _selectedGame = game;
    notifyListeners();
  }

  // Clear selected game
  void clearSelectedGame() {
    _selectedGame = null;
    notifyListeners();
  }

  // Get games user is participating in
  List<OpenGameModel> getUserParticipatingGames(String userId) {
    return _openGames.where((game) => 
        game.playersJoined.contains(userId)).toList();
  }

  // Get games user is organizing
  List<OpenGameModel> getUserOrganizingGames(String userId) {
    return _openGames.where((game) => 
        game.organizerId == userId).toList();
  }

  // Get available games (user can join)
  List<OpenGameModel> getAvailableGames(String userId) {
    return _openGames.where((game) => 
        !game.playersJoined.contains(userId) && 
        !game.isFull && 
        game.status == OpenGameStatus.open).toList();
  }

  // Get filtered games
  List<OpenGameModel> get filteredGames {
    List<OpenGameModel> filtered = List.from(_openGames);

    if (_levelFilter != null) {
      filtered = filtered.where((game) => 
          game.playerLevel == _levelFilter).toList();
    }

    // Only show open games
    filtered = filtered.where((game) => 
        game.status == OpenGameStatus.open).toList();

    return filtered;
  }

  // Check if user can join game
  bool canUserJoinGame(OpenGameModel game, String userId) {
    return !game.playersJoined.contains(userId) && 
           !game.isFull && 
           game.status == OpenGameStatus.open &&
           game.organizerId != userId;
  }

  // Check if user is in game
  bool isUserInGame(OpenGameModel game, String userId) {
    return game.playersJoined.contains(userId);
  }

  // Check if user is organizer
  bool isUserOrganizer(OpenGameModel game, String userId) {
    return game.organizerId == userId;
  }

  // Helper methods
  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void _setError(String? error) {
    _error = error;
    notifyListeners();
  }

  // Get game statistics
  Map<String, int> getGameStats(String userId) {
    final participating = getUserParticipatingGames(userId).length;
    final organizing = getUserOrganizingGames(userId).length;
    final available = getAvailableGames(userId).length;

    return {
      'participating': participating,
      'organizing': organizing,
      'available': available,
    };
  }
}