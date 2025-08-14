import 'package:flutter/material.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../core/theme/colors.dart';
import '../core/theme/text_styles.dart';
import '../core/theme/spacing.dart';
import '../widgets/primary_button.dart';
import '../widgets/custom_text_field.dart';
import 'sms_verification_screen.dart';

// Логотип Все Корты
class AllCourtsLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint();
    
    // Зеленый фон с закругленными углами
    paint.color = AppColors.primary;
    final backgroundRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(0, 0, size.width, size.height),
      Radius.circular(size.width * 0.2),
    );
    canvas.drawRRect(backgroundRect, paint);
    
    // Белые линии корта
    paint.color = Colors.white;
    paint.style = PaintingStyle.stroke;
    paint.strokeWidth = 3;
    
    // Внешний прямоугольник корта
    final courtRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(
        size.width * 0.167,
        size.height * 0.167,
        size.width * 0.666,
        size.height * 0.666,
      ),
      Radius.circular(size.width * 0.067),
    );
    canvas.drawRRect(courtRect, paint);
    
    // Горизонтальная линия
    canvas.drawLine(
      Offset(size.width * 0.167, size.height * 0.5),
      Offset(size.width * 0.833, size.height * 0.5),
      paint,
    );
    
    // Вертикальная линия
    canvas.drawLine(
      Offset(size.width * 0.5, size.height * 0.167),
      Offset(size.width * 0.5, size.height * 0.833),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _phoneController = TextEditingController(text: '+7');
  bool _isLoading = false;
  String? _errorMessage;


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
      final formattedPhone = _formatPhoneNumber(_phoneController.text);
      
      // Вызываем Cloud Function для отправки SMS через sms.ru
      final functions = FirebaseFunctions.instanceFor(region: 'europe-west1');
      final callable = functions.httpsCallable('sendSMSCode');
      
      final result = await callable.call({
        'phoneNumber': formattedPhone,
      });
      
      if (result.data['success'] == true) {
        setState(() {
          _isLoading = false;
        });
        
        // Переходим на экран ввода кода
        if (mounted) {
          final verificationResult = await Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => SMSVerificationScreen(
                phoneNumber: formattedPhone,
              ),
            ),
          );
          
          // Если авторизация успешна, закрываем экран логина
          if (verificationResult == true && mounted) {
            Navigator.pop(context, true);
          }
        }
      } else {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Не удалось отправить SMS. Попробуйте позже.';
        });
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
        if (e.toString().contains('invalid-argument')) {
          _errorMessage = 'Неверный формат номера телефона';
        } else if (e.toString().contains('too-many-requests')) {
          _errorMessage = 'Слишком много попыток. Попробуйте позже';
        } else {
          _errorMessage = 'Произошла ошибка при отправке SMS';
        }
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
                child: CustomPaint(
                  painter: AllCourtsLogoPainter(),
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