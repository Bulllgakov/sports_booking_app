#!/bin/bash

# Скрипт для развертывания Cloud Functions через gcloud CLI
# После авторизации выполните этот скрипт

PROJECT_ID="sports-booking-app-1d7e5"
REGION="europe-west1"

echo "Setting project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

echo "Building functions..."
npm run build

echo "Deploying SMS Auth functions..."
gcloud functions deploy sendAuthSMSCode \
  --region=$REGION \
  --runtime=nodejs20 \
  --source=. \
  --entry-point=sendAuthSMSCode \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars FUNCTION_REGION=$REGION

gcloud functions deploy verifyAuthSMSCode \
  --region=$REGION \
  --runtime=nodejs20 \
  --source=. \
  --entry-point=verifyAuthSMSCode \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars FUNCTION_REGION=$REGION

echo "Deploying SMS Reminder cron job..."
gcloud functions deploy sendBookingReminders \
  --region=$REGION \
  --runtime=nodejs20 \
  --source=. \
  --entry-point=sendBookingReminders \
  --trigger-topic=booking-reminders \
  --set-env-vars FUNCTION_REGION=$REGION

# Создание Cloud Scheduler для cron job
gcloud scheduler jobs create pubsub sendBookingRemindersJob \
  --location=$REGION \
  --schedule="*/15 * * * *" \
  --topic=booking-reminders \
  --message-body="{}" \
  --time-zone="Europe/Moscow"

echo "Deploying manual reminder function..."
gcloud functions deploy sendBookingReminderManual \
   \
  --region=$REGION \
  --runtime=nodejs20 \
  --source=. \
  --entry-point=sendBookingReminderManual \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars FUNCTION_REGION=$REGION

echo "Deploying booking update function..."
gcloud functions deploy updateBooking \
   \
  --region=$REGION \
  --runtime=nodejs20 \
  --source=. \
  --entry-point=updateBooking \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars FUNCTION_REGION=$REGION

echo "Deploying SMS settings functions..."
gcloud functions deploy getSMSSettings \
   \
  --region=$REGION \
  --runtime=nodejs20 \
  --source=. \
  --entry-point=getSMSSettings \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars FUNCTION_REGION=$REGION

gcloud functions deploy updateSMSSettings \
   \
  --region=$REGION \
  --runtime=nodejs20 \
  --source=. \
  --entry-point=updateSMSSettings \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars FUNCTION_REGION=$REGION

echo "Deploying SMS templates functions..."
gcloud functions deploy getSMSTemplates \
   \
  --region=$REGION \
  --runtime=nodejs20 \
  --source=. \
  --entry-point=getSMSTemplates \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars FUNCTION_REGION=$REGION

gcloud functions deploy updateSMSTemplates \
   \
  --region=$REGION \
  --runtime=nodejs20 \
  --source=. \
  --entry-point=updateSMSTemplates \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars FUNCTION_REGION=$REGION

echo "Deployment complete!"
echo "Functions deployed to $REGION in project $PROJECT_ID"