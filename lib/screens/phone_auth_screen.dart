import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';
import '../theme/app_spacing.dart';

class PhoneAuthScreen extends StatefulWidget {
  final Function(String phoneNumber, String userId)? onSuccess;
  final bool isModal;

  const PhoneAuthScreen({
    Key? key,
    this.onSuccess,
    this.isModal = false,
  }) : super(key: key);

  @override
  State<PhoneAuthScreen> createState() => _PhoneAuthScreenState();
}

class _PhoneAuthScreenState extends State<PhoneAuthScreen> {
  final _phoneController = TextEditingController();
  final _codeController = TextEditingController();
  final _nameController = TextEditingController();
  
  bool _isLoading = false;
  bool _codeSent = false;
  String _verificationId = '';
  String? _errorMessage;
  bool _isNewUser = false;

  @override
  void dispose() {
    _phoneController.dispose();
    _codeController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  String _formatPhoneNumber(String phone) {
    // Убираем все нецифровые символы
    phone = phone.replaceAll(RegExp(r'[^\d]'), '');
    
    // Если номер начинается с 8, заменяем на 7
    if (phone.startsWith('8')) {
      phone = '7' + phone.substring(1);
    }
    
    // Если номер не начинается с 7, добавляем
    if (!phone.startsWith('7')) {
      phone = '7' + phone;
    }
    
    // Добавляем +
    return '+' + phone;
  }

  Future<void> _sendCode() async {
    final phone = _phoneController.text.trim();
    if (phone.isEmpty) {
      setState(() {
        _errorMessage = 'Введите номер телефона';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final formattedPhone = _formatPhoneNumber(phone);
      
      // В тестовом режиме просто показываем поле для кода
      // В продакшене здесь будет реальная отправка SMS через Firebase Auth
      setState(() {
        _codeSent = true;
        _isLoading = false;
        _verificationId = 'test_verification_id'; // Временно для тестирования
      });
      
      // Показываем сообщение
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Код отправлен на $formattedPhone'),
            backgroundColor: AppColors.primary,
          ),
        );
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Ошибка отправки кода: $e';
      });
    }
  }

  Future<void> _verifyCode() async {
    final code = _codeController.text.trim();
    if (code.isEmpty) {
      setState(() {
        _errorMessage = 'Введите код из SMS';
      });
      return;
    }

    // Временная проверка - принимаем код 1234
    if (code != '1234') {
      setState(() {
        _errorMessage = 'Неверный код';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final formattedPhone = _formatPhoneNumber(_phoneController.text);
      
      // Проверяем, существует ли пользователь
      final usersQuery = await FirebaseFirestore.instance
          .collection('users')
          .where('phoneNumber', isEqualTo: formattedPhone)
          .limit(1)
          .get();
      
      if (usersQuery.docs.isEmpty) {
        // Новый пользователь - показываем поле для имени
        setState(() {
          _isNewUser = true;
          _isLoading = false;
        });
      } else {
        // Существующий пользователь
        final userData = usersQuery.docs.first.data();
        final userId = usersQuery.docs.first.id;
        final userName = userData['displayName'] ?? 'Пользователь';
        
        // Сохраняем данные пользователя локально
        await _saveUserSession(userId, userName, formattedPhone);
        
        setState(() {
          _isLoading = false;
        });
        
        if (widget.onSuccess != null) {
          widget.onSuccess!(formattedPhone, userId);
        }
        
        if (widget.isModal) {
          Navigator.pop(context, {'phone': formattedPhone, 'userId': userId, 'name': userName});
        } else {
          Navigator.pushReplacementNamed(context, '/home');
        }
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Ошибка проверки кода: $e';
      });
    }
  }

  Future<void> _createUser() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      setState(() {
        _errorMessage = 'Введите ваше имя';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final formattedPhone = _formatPhoneNumber(_phoneController.text);
      
      // Создаем нового пользователя
      final userDoc = await FirebaseFirestore.instance.collection('users').add({
        'phoneNumber': formattedPhone,
        'displayName': name,
        'createdAt': FieldValue.serverTimestamp(),
        'lastLoginAt': FieldValue.serverTimestamp(),
        'bookings': [],
      });
      
      final userId = userDoc.id;
      
      // Сохраняем данные пользователя локально
      await _saveUserSession(userId, name, formattedPhone);
      
      setState(() {
        _isLoading = false;
      });
      
      if (widget.onSuccess != null) {
        widget.onSuccess!(formattedPhone, userId);
      }
      
      if (widget.isModal) {
        Navigator.pop(context, {'phone': formattedPhone, 'userId': userId, 'name': name});
      } else {
        Navigator.pushReplacementNamed(context, '/home');
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Ошибка создания профиля: $e';
      });
    }
  }

  Future<void> _saveUserSession(String userId, String userName, String phone) async {
    // Здесь можно использовать shared_preferences для сохранения сессии
    // Пока просто сохраняем в памяти
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: widget.isModal ? AppBar(
        backgroundColor: AppColors.white,
        elevation: 0,
        title: Text(
          'Вход в приложение',
          style: AppTextStyles.h3.copyWith(color: AppColors.dark),
        ),
        leading: IconButton(
          icon: const Icon(Icons.close, color: AppColors.dark),
          onPressed: () => Navigator.pop(context),
        ),
      ) : null,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.screenPadding),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (!widget.isModal) ...[
                const SizedBox(height: AppSpacing.xxl),
                Text(
                  'Добро пожаловать!',
                  style: AppTextStyles.h1,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: AppSpacing.md),
                Text(
                  'Войдите, чтобы забронировать корт',
                  style: AppTextStyles.body.copyWith(color: AppColors.gray),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: AppSpacing.xxl),
              ],
              
              if (!_codeSent) ...[
                // Ввод телефона
                Text(
                  'Номер телефона',
                  style: AppTextStyles.bodyBold,
                ),
                const SizedBox(height: AppSpacing.sm),
                TextFormField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(11),
                  ],
                  decoration: InputDecoration(
                    hintText: '7 900 000 00 00',
                    prefixText: '+',
                    filled: true,
                    fillColor: AppColors.white,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: AppColors.divider),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: AppColors.divider),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: AppColors.primary, width: 2),
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                
                ElevatedButton(
                  onPressed: _isLoading ? null : _sendCode,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: _isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(AppColors.white),
                          ),
                        )
                      : Text(
                          'Получить код',
                          style: AppTextStyles.bodyBold.copyWith(color: AppColors.white),
                        ),
                ),
              ] else if (!_isNewUser) ...[
                // Ввод кода
                Text(
                  'Код из SMS',
                  style: AppTextStyles.bodyBold,
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  'Отправлен на ${_formatPhoneNumber(_phoneController.text)}',
                  style: AppTextStyles.caption.copyWith(color: AppColors.gray),
                ),
                const SizedBox(height: AppSpacing.md),
                TextFormField(
                  controller: _codeController,
                  keyboardType: TextInputType.number,
                  maxLength: 4,
                  textAlign: TextAlign.center,
                  style: AppTextStyles.h2,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(4),
                  ],
                  decoration: InputDecoration(
                    counterText: '',
                    filled: true,
                    fillColor: AppColors.white,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: AppColors.divider),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: AppColors.divider),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: AppColors.primary, width: 2),
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                
                ElevatedButton(
                  onPressed: _isLoading ? null : _verifyCode,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: _isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(AppColors.white),
                          ),
                        )
                      : Text(
                          'Войти',
                          style: AppTextStyles.bodyBold.copyWith(color: AppColors.white),
                        ),
                ),
                
                const SizedBox(height: AppSpacing.md),
                TextButton(
                  onPressed: () {
                    setState(() {
                      _codeSent = false;
                      _codeController.clear();
                    });
                  },
                  child: Text(
                    'Изменить номер',
                    style: AppTextStyles.body.copyWith(color: AppColors.primary),
                  ),
                ),
              ] else ...[
                // Ввод имени для нового пользователя
                Text(
                  'Как вас зовут?',
                  style: AppTextStyles.bodyBold,
                ),
                const SizedBox(height: AppSpacing.sm),
                TextFormField(
                  controller: _nameController,
                  keyboardType: TextInputType.name,
                  textCapitalization: TextCapitalization.words,
                  decoration: InputDecoration(
                    hintText: 'Имя Фамилия',
                    filled: true,
                    fillColor: AppColors.white,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: AppColors.divider),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: AppColors.divider),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: AppColors.primary, width: 2),
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                
                ElevatedButton(
                  onPressed: _isLoading ? null : _createUser,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: _isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(AppColors.white),
                          ),
                        )
                      : Text(
                          'Продолжить',
                          style: AppTextStyles.bodyBold.copyWith(color: AppColors.white),
                        ),
                ),
              ],
              
              if (_errorMessage != null) ...[
                const SizedBox(height: AppSpacing.md),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.error.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    _errorMessage!,
                    style: AppTextStyles.caption.copyWith(color: AppColors.error),
                    textAlign: TextAlign.center,
                  ),
                ),
              ],
              
              const Spacer(),
              
              if (!widget.isModal) ...[
                Text(
                  'Временно для тестирования:\nИспользуйте код 1234',
                  style: AppTextStyles.caption.copyWith(color: AppColors.gray),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: AppSpacing.md),
              ],
            ],
          ),
        ),
      ),
    );
  }
}