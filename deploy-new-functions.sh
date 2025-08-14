#!/bin/bash

# Список всех функций для деплоя, исключая проблемные
FUNCTIONS=(
    "sendWelcomeEmail"
    "sendVerificationCode"
    "verifyCode"
    "createClubAfterRegistration"
    "createClub"
    "createClubHttp"
    "initSubscriptionPayment"
    "initBookingPayment"
    "sendBookingPaymentSMS"
    "processBookingRefund"
    "testPaymentConnection"
    "tbankWebhook"
    "yookassaWebhook"
    "processRecurringPayment"
    "monthlyBilling"
    "cancelExpiredBookings"
    "cancelExpiredBookingsManual"
    "scheduleBookingCancellation"
    "cancelSpecificBooking"
    "cancelScheduledCancellation"
    "sendBookingNotifications"
    "resendBookingNotification"
    "cleanupExpiredBookings"
    "manualCleanupExpiredBookings"
    "cleanupWebBookings"
    "processUserRefund"
    "testEmailSending"
    "fixAdminAccess"
    "createTestOpenGames"
    "processEmailQueueManual"
    "fixRefundStatus"
    "manualRefundUpdate"
    "sendSMSCode"
    "verifySMSCode"
    "getSMSSettings"
    "updateSMSSettings"
    "testSMSSending"
    "getSMSStats"
    "initializeSMSSettings"
    "getSMSTemplates"
    "updateSMSTemplates"
    "cleanupExpiredAuthCodes"
)

# Создаем строку с функциями
FUNCTIONS_STRING=""
for func in "${FUNCTIONS[@]}"; do
    if [ -z "$FUNCTIONS_STRING" ]; then
        FUNCTIONS_STRING="functions:$func"
    else
        FUNCTIONS_STRING="$FUNCTIONS_STRING,functions:$func"
    fi
done

echo "Deploying functions (excluding problematic ones)..."
firebase deploy --only "$FUNCTIONS_STRING"