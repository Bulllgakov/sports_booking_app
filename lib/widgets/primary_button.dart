import 'package:flutter/material.dart';
import '../core/theme/colors.dart';
import '../core/theme/text_styles.dart';
import '../core/theme/spacing.dart';

class PrimaryButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final bool isLoading;
  final bool isExpanded;
  final IconData? icon;
  final String variant;

  const PrimaryButton({
    super.key,
    required this.text,
    required this.onPressed,
    this.isLoading = false,
    this.isExpanded = true,
    this.icon,
    this.variant = 'filled',
  });

  @override
  Widget build(BuildContext context) {
    final isOutline = variant == 'outline';
    
    final button = ElevatedButton(
      onPressed: isLoading ? null : onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: isOutline ? Colors.transparent : AppColors.primary,
        foregroundColor: isOutline ? AppColors.error : AppColors.white,
        disabledBackgroundColor: AppColors.lightGray,
        elevation: 0,
        minimumSize: Size(isExpanded ? double.infinity : AppSpacing.buttonMinWidth, AppSpacing.buttonHeight),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
          side: isOutline 
              ? BorderSide(color: AppColors.error, width: 1)
              : BorderSide.none,
        ),
      ),
      child: isLoading
          ? SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(
                  isOutline ? AppColors.error : AppColors.white,
                ),
              ),
            )
          : Row(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (icon != null) ...[
                  Icon(icon, size: AppSpacing.iconSm),
                  const SizedBox(width: AppSpacing.sm),
                ],
                Text(text, style: AppTextStyles.button),
              ],
            ),
    );

    return isExpanded ? button : button;
  }
}