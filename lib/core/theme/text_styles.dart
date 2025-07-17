import 'package:flutter/material.dart';
import 'colors.dart';

class AppTextStyles {
  // Заголовки
  static const TextStyle h1 = TextStyle(
    fontSize: 24,
    fontWeight: FontWeight.w700,
    color: AppColors.dark,
    height: 1.2,
  );
  
  static const TextStyle h2 = TextStyle(
    fontSize: 20,
    fontWeight: FontWeight.w700,
    color: AppColors.dark,
    height: 1.3,
  );
  
  static const TextStyle h3 = TextStyle(
    fontSize: 18,
    fontWeight: FontWeight.w700,
    color: AppColors.dark,
    height: 1.3,
  );
  
  // Текст
  static const TextStyle body = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w400,
    color: AppColors.dark,
    height: 1.5,
  );
  
  static const TextStyle bodyBold = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w600,
    color: AppColors.dark,
    height: 1.5,
  );
  
  static const TextStyle bodySmall = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    color: AppColors.gray,
    height: 1.5,
  );
  
  static const TextStyle bodySmallBold = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w600,
    color: AppColors.dark,
    height: 1.5,
  );
  
  // Мелкий текст
  static const TextStyle caption = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.w400,
    color: AppColors.gray,
    height: 1.4,
  );
  
  static const TextStyle captionBold = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.w600,
    color: AppColors.dark,
    height: 1.4,
  );
  
  static const TextStyle tiny = TextStyle(
    fontSize: 11,
    fontWeight: FontWeight.w400,
    color: AppColors.gray,
    height: 1.3,
  );
  
  static const TextStyle tinyBold = TextStyle(
    fontSize: 11,
    fontWeight: FontWeight.w600,
    color: AppColors.dark,
    height: 1.3,
  );
  
  static const TextStyle micro = TextStyle(
    fontSize: 10,
    fontWeight: FontWeight.w400,
    color: AppColors.gray,
    height: 1.2,
  );
  
  static const TextStyle microBold = TextStyle(
    fontSize: 10,
    fontWeight: FontWeight.w600,
    color: AppColors.dark,
    height: 1.2,
  );
  
  // Кнопки и действия
  static const TextStyle button = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w600,
    color: AppColors.white,
    height: 1.2,
  );
  
  static const TextStyle buttonSmall = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.w600,
    color: AppColors.white,
    height: 1.2,
  );
  
  static const TextStyle buttonTiny = TextStyle(
    fontSize: 11,
    fontWeight: FontWeight.w600,
    color: AppColors.white,
    height: 1.2,
  );
  
  static const TextStyle link = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w500,
    color: AppColors.primary,
    decoration: TextDecoration.none,
    height: 1.5,
  );
  
  static const TextStyle linkSmall = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.w500,
    color: AppColors.primary,
    decoration: TextDecoration.none,
    height: 1.4,
  );
  
  // Специальные стили
  static const TextStyle price = TextStyle(
    fontSize: 20,
    fontWeight: FontWeight.w700,
    color: AppColors.primary,
    height: 1.2,
  );
  
  static const TextStyle priceSmall = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w700,
    color: AppColors.primary,
    height: 1.2,
  );
  
  static const TextStyle navLabel = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.w600,
    height: 1.2,
  );
}