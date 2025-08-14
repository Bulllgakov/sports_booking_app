import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import '../models/user_model.dart';
import 'firestore_service.dart';

class AuthService extends ChangeNotifier {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  
  User? get currentUser => _auth.currentUser;
  bool get isAuthenticated => currentUser != null;
  
  UserModel? _currentUserModel;
  UserModel? get currentUserModel => _currentUserModel;

  AuthService() {
    _auth.authStateChanges().listen(_onAuthStateChanged);
  }

  void _onAuthStateChanged(User? user) async {
    if (user != null) {
      await _loadUserModel(user.uid);
    } else {
      _currentUserModel = null;
    }
    notifyListeners();
  }

  Future<void> _loadUserModel(String uid) async {
    try {
      _currentUserModel = await FirestoreService.getUser(uid);
      notifyListeners();
    } catch (e) {
      debugPrint('Error loading user model: $e');
    }
  }

  // Phone Authentication
  Future<void> verifyPhoneNumber({
    required String phoneNumber,
    required Function(PhoneAuthCredential) verificationCompleted,
    required Function(FirebaseAuthException) verificationFailed,
    required Function(String, int?) codeSent,
    required Function(String) codeAutoRetrievalTimeout,
  }) async {
    await _auth.verifyPhoneNumber(
      phoneNumber: phoneNumber,
      verificationCompleted: verificationCompleted,
      verificationFailed: verificationFailed,
      codeSent: codeSent,
      codeAutoRetrievalTimeout: codeAutoRetrievalTimeout,
      timeout: const Duration(seconds: 60),
    );
  }

  Future<UserCredential?> signInWithCredential(PhoneAuthCredential credential) async {
    try {
      final result = await _auth.signInWithCredential(credential);
      return result;
    } catch (e) {
      debugPrint('Error signing in with credential: $e');
      rethrow;
    }
  }

  Future<PhoneAuthCredential> createCredential({
    required String verificationId,
    required String smsCode,
  }) async {
    return PhoneAuthProvider.credential(
      verificationId: verificationId,
      smsCode: smsCode,
    );
  }

  // Create user profile after authentication
  Future<void> createUserProfile({
    required String displayName,
    required PlayerLevel playerLevel,
    String? photoURL,
  }) async {
    if (currentUser == null) throw Exception('No authenticated user');

    final userModel = UserModel(
      uid: currentUser!.uid,
      displayName: displayName,
      phoneNumber: currentUser!.phoneNumber ?? '',
      photoURL: photoURL,
      playerLevel: playerLevel,
      gamesPlayed: 0,
      hoursOnCourt: 0,
      favoriteVenues: [],
      createdAt: DateTime.now(),
    );

    await FirestoreService.createUser(userModel);
    _currentUserModel = userModel;
    notifyListeners();
  }

  // Update user profile
  Future<void> updateUserProfile(UserModel updatedUser) async {
    if (currentUser == null) throw Exception('No authenticated user');

    await FirestoreService.updateUser(updatedUser);
    _currentUserModel = updatedUser;
    notifyListeners();
  }

  // Sign out
  Future<void> signOut() async {
    await _auth.signOut();
    _currentUserModel = null;
    notifyListeners();
  }

  // Delete account
  Future<void> deleteAccount() async {
    if (currentUser == null) throw Exception('No authenticated user');

    // Delete user data from Firestore first
    // Note: You might want to implement a more sophisticated deletion strategy
    // that handles user's bookings, payments, etc.
    
    await currentUser!.delete();
    _currentUserModel = null;
    notifyListeners();
  }

  // Update FCM token for push notifications
  Future<void> updateFCMToken(String token) async {
    if (currentUser == null || _currentUserModel == null) return;

    final updatedUser = _currentUserModel!.copyWith(fcmToken: token);
    await updateUserProfile(updatedUser);
  }

  // Check if user profile is complete
  bool get isProfileComplete {
    return _currentUserModel != null && 
           _currentUserModel!.displayName.isNotEmpty;
  }

  // Refresh user data
  Future<void> refreshUserData() async {
    if (currentUser != null) {
      await _loadUserModel(currentUser!.uid);
    }
  }
  
  // Check auth status and load user data
  Future<void> checkAuthStatus() async {
    if (currentUser != null) {
      await _loadUserModel(currentUser!.uid);
    }
    notifyListeners();
  }
}