import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:provider/provider.dart';
import '../core/theme/colors.dart';
import '../core/theme/text_styles.dart';
import '../core/theme/spacing.dart';
import '../widgets/primary_button.dart';
import '../services/auth_service.dart';
import 'dart:async';

class SMSVerificationScreen extends StatefulWidget {
  final String phoneNumber;
  
  const SMSVerificationScreen({
    super.key,
    required this.phoneNumber,
  });

  @override
  State<SMSVerificationScreen> createState() => _SMSVerificationScreenState();
}

class _SMSVerificationScreenState extends State<SMSVerificationScreen> {
  final List<TextEditingController> _codeControllers = List.generate(
    4,
    (index) => TextEditingController(),
  );
  final List<FocusNode> _focusNodes = List.generate(
    4,
    (index) => FocusNode(),
  );
  
  bool _isLoading = false;
  String? _errorMessage;
  int _secondsRemaining = 60;
  Timer? _timer;
  bool _canResend = false;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  @override
  void dispose() {
    for (var controller in _codeControllers) {
      controller.dispose();
    }
    for (var node in _focusNodes) {
      node.dispose();
    }
    _timer?.cancel();
    super.dispose();
  }

  void _startTimer() {
    _secondsRemaining = 60;
    _canResend = false;
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        if (_secondsRemaining > 0) {
          _secondsRemaining--;
        } else {
          _canResend = true;
          timer.cancel();
        }
      });
    });
  }

  String _getCode() {
    return _codeControllers.map((c) => c.text).join();
  }

  Future<void> _verifyCode() async {
    final code = _getCode();
    if (code.length != 4) {
      setState(() {
        _errorMessage = 'Введите 4-значный код';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final functions = FirebaseFunctions.instanceFor(region: 'europe-west1');
      final callable = functions.httpsCallable('verifySMSCode');
      
      final result = await callable.call({
        'phoneNumber': widget.phoneNumber,
        'code': code,
      });
      
      if (result.data['success'] == true) {
        // Авторизуем пользователя с помощью custom token
        final token = result.data['token'];
        final authService = context.read<AuthService>();
        
        await FirebaseAuth.instance.signInWithCustomToken(token);
        
        // Проверяем, новый ли это пользователь
        final isNewUser = result.data['isNewUser'] ?? false;
        
        final user = FirebaseAuth.instance.currentUser;
        if (user != null) {
          // Всегда обновляем или создаем документ пользователя с номером телефона
          final userDoc = await FirebaseFirestore.instance
              .collection('users')
              .doc(user.uid)
              .get();
          
          if (!userDoc.exists || isNewUser) {
            // Создаем новый документ
            await FirebaseFirestore.instance
                .collection('users')
                .doc(user.uid)
                .set({
              'uid': user.uid,
              'phoneNumber': widget.phoneNumber,
              'createdAt': FieldValue.serverTimestamp(),
              'displayName': '',
              'email': '',
            });
          } else {
            // Обновляем существующий документ, убеждаясь что phoneNumber актуален
            await FirebaseFirestore.instance
                .collection('users')
                .doc(user.uid)
                .update({
              'phoneNumber': widget.phoneNumber,
              'lastLogin': FieldValue.serverTimestamp(),
            });
          }
        }
        
        // Обновляем состояние в AuthService
        await authService.checkAuthStatus();
        
        if (mounted) {
          // Возвращаемся с результатом успешной авторизации
          Navigator.pop(context, true);
        }
      } else {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Неверный код подтверждения';
        });
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
        if (e.toString().contains('not-found')) {
          _errorMessage = 'Код не найден. Запросите новый код';
        } else if (e.toString().contains('deadline-exceeded')) {
          _errorMessage = 'Срок действия кода истек';
        } else if (e.toString().contains('permission-denied')) {
          _errorMessage = 'Слишком много попыток. Запросите новый код';
        } else if (e.toString().contains('invalid-argument')) {
          _errorMessage = 'Неверный код';
        } else {
          _errorMessage = 'Ошибка проверки кода';
        }
      });
    }
  }

  Future<void> _resendCode() async {
    if (!_canResend) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final functions = FirebaseFunctions.instanceFor(region: 'europe-west1');
      final callable = functions.httpsCallable('sendSMSCode');
      
      final result = await callable.call({
        'phoneNumber': widget.phoneNumber,
      });
      
      if (result.data['success'] == true) {
        setState(() {
          _isLoading = false;
        });
        _startTimer();
        
        // Очищаем поля ввода
        for (var controller in _codeControllers) {
          controller.clear();
        }
        _focusNodes[0].requestFocus();
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Код отправлен повторно'),
              backgroundColor: AppColors.success,
            ),
          );
        }
      } else {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Не удалось отправить код повторно';
        });
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Ошибка при отправке кода';
      });
    }
  }

  Widget _buildCodeInput(int index) {
    return Container(
      width: 60,
      height: 60,
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        border: Border.all(
          color: _focusNodes[index].hasFocus 
              ? AppColors.primary 
              : AppColors.extraLightGray,
          width: 2,
        ),
      ),
      child: TextField(
        controller: _codeControllers[index],
        focusNode: _focusNodes[index],
        textAlign: TextAlign.center,
        keyboardType: TextInputType.number,
        maxLength: 1,
        style: AppTextStyles.h2.copyWith(color: AppColors.dark),
        decoration: const InputDecoration(
          counterText: '',
          border: InputBorder.none,
        ),
        inputFormatters: [
          FilteringTextInputFormatter.digitsOnly,
        ],
        onChanged: (value) {
          if (value.isNotEmpty && index < 3) {
            _focusNodes[index + 1].requestFocus();
          } else if (value.isEmpty && index > 0) {
            _focusNodes[index - 1].requestFocus();
          }
          
          // Автоматически проверяем код, когда все цифры введены
          if (_getCode().length == 4) {
            _verifyCode();
          }
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.white,
        elevation: 0,
        leading: Container(
          margin: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: AppColors.divider,
            shape: BoxShape.circle,
          ),
          child: IconButton(
            icon: const Icon(Icons.arrow_back, color: AppColors.dark),
            onPressed: () => Navigator.pop(context),
          ),
        ),
        title: Text(
          'Подтверждение',
          style: AppTextStyles.h3.copyWith(color: AppColors.dark),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: AppSpacing.xl),
              
              // Заголовок
              Text(
                'Введите код из SMS',
                style: AppTextStyles.h2,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.sm),
              
              Text(
                'Код отправлен на номер\n${widget.phoneNumber}',
                style: AppTextStyles.body.copyWith(
                  color: AppColors.gray,
                ),
                textAlign: TextAlign.center,
              ),
              
              const SizedBox(height: AppSpacing.xl * 2),
              
              // Поля ввода кода
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  for (int i = 0; i < 4; i++) ...[
                    _buildCodeInput(i),
                    if (i < 3) const SizedBox(width: AppSpacing.sm),
                  ],
                ],
              ),
              
              if (_errorMessage != null) ...[
                const SizedBox(height: AppSpacing.md),
                Text(
                  _errorMessage!,
                  style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.error,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
              
              const SizedBox(height: AppSpacing.xl),
              
              // Кнопка подтверждения
              PrimaryButton(
                text: 'Подтвердить',
                onPressed: _isLoading ? null : _verifyCode,
                isLoading: _isLoading,
              ),
              
              const SizedBox(height: AppSpacing.lg),
              
              // Повторная отправка
              if (!_canResend) 
                Text(
                  'Отправить код повторно через $_secondsRemaining сек',
                  style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.gray,
                  ),
                  textAlign: TextAlign.center,
                )
              else
                TextButton(
                  onPressed: _isLoading ? null : _resendCode,
                  child: Text(
                    'Отправить код повторно',
                    style: AppTextStyles.body.copyWith(
                      color: AppColors.primary,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}