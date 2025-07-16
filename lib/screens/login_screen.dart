import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../core/theme/colors.dart';
import '../core/theme/text_styles.dart';
import '../core/theme/spacing.dart';
import '../widgets/primary_button.dart';
import '../widgets/custom_text_field.dart';
import '../services/auth_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _phoneController = TextEditingController();
  bool _isLoading = false;
  String? _errorMessage;

  String _verificationId = '';
  int? _resendToken;

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  String _formatPhoneNumber(String phone) {
    // Remove all non-digit characters
    String digitsOnly = phone.replaceAll(RegExp(r'\D'), '');
    
    // Add +7 prefix if not present
    if (digitsOnly.startsWith('8')) {
      digitsOnly = '7${digitsOnly.substring(1)}';
    }
    if (!digitsOnly.startsWith('7')) {
      digitsOnly = '7$digitsOnly';
    }
    
    return '+$digitsOnly';
  }

  bool _isValidPhoneNumber(String phone) {
    String digitsOnly = phone.replaceAll(RegExp(r'\D'), '');
    return digitsOnly.length == 11 || digitsOnly.length == 10;
  }

  Future<void> _sendVerificationCode() async {
    if (!_isValidPhoneNumber(_phoneController.text)) {
      setState(() {
        _errorMessage = 'Введите корректный номер телефона';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final authService = context.read<AuthService>();
      final formattedPhone = _formatPhoneNumber(_phoneController.text);

      await authService.verifyPhoneNumber(
        phoneNumber: formattedPhone,
        verificationCompleted: (PhoneAuthCredential credential) async {
          // Auto-verification completed
          await authService.signInWithCredential(credential);
          if (mounted) {
            context.go('/profile-setup');
          }
        },
        verificationFailed: (FirebaseAuthException e) {
          setState(() {
            _isLoading = false;
            if (e.code == 'invalid-phone-number') {
              _errorMessage = 'Неверный формат номера телефона';
            } else if (e.code == 'too-many-requests') {
              _errorMessage = 'Слишком много попыток. Попробуйте позже';
            } else {
              _errorMessage = 'Ошибка: ${e.message}';
            }
          });
        },
        codeSent: (String verificationId, int? resendToken) {
          setState(() {
            _isLoading = false;
            _verificationId = verificationId;
            _resendToken = resendToken;
          });
          
          // Navigate to verification screen
          context.push('/verify-phone', extra: {
            'verificationId': verificationId,
            'phoneNumber': formattedPhone,
            'resendToken': resendToken,
          });
        },
        codeAutoRetrievalTimeout: (String verificationId) {
          _verificationId = verificationId;
        },
      );
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Произошла ошибка: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(),
              
              // Logo/Title
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Center(
                  child: Text(
                    'ВК',
                    style: TextStyle(
                      fontSize: 36,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              
              Text(
                'Все Корты',
                style: AppTextStyles.h1,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.sm),
              
              Text(
                'Все корты города в твоем смартфоне',
                style: AppTextStyles.bodySmall.copyWith(
                  color: AppColors.lightGray,
                ),
                textAlign: TextAlign.center,
              ),
              
              const SizedBox(height: AppSpacing.xl * 2),
              
              // Phone input
              Text(
                'Введите номер телефона',
                style: AppTextStyles.h3,
              ),
              const SizedBox(height: AppSpacing.md),
              
              CustomTextField(
                controller: _phoneController,
                hint: '+7 (999) 123-45-67',
                keyboardType: TextInputType.phone,
                prefixIcon: const Icon(Icons.phone),
                enabled: !_isLoading,
              ),
              
              if (_errorMessage != null) ...[
                const SizedBox(height: AppSpacing.sm),
                Text(
                  _errorMessage!,
                  style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.error,
                  ),
                ),
              ],
              
              const SizedBox(height: AppSpacing.lg),
              
              // Send code button
              PrimaryButton(
                text: 'Отправить код',
                onPressed: _isLoading ? null : _sendVerificationCode,
                isLoading: _isLoading,
              ),
              
              const SizedBox(height: AppSpacing.md),
              
              // Terms and conditions
              Text(
                'Продолжая, вы соглашаетесь с условиями использования и политикой конфиденциальности',
                style: AppTextStyles.bodySmall.copyWith(
                  color: AppColors.lightGray,
                ),
                textAlign: TextAlign.center,
              ),
              
              const Spacer(),
            ],
          ),
        ),
      ),
    );
  }
}