#!/usr/bin/env python3

import subprocess
import os

print("Для авторизации gcloud CLI:")
print("1. Запустите команду: gcloud auth login")
print("2. Откроется браузер - войдите в Google аккаунт")
print("3. Скопируйте код и введите его когда появится запрос")
print("\nПосле авторизации запустите:")
print("gcloud config set project sports-booking-app-1d7e5")
print("cd functions && ./gcloud-deploy.sh")

# Альтернативный метод через переменные окружения
print("\n\nАльтернатива - использовать Firebase Admin SDK:")
print("export GOOGLE_APPLICATION_CREDENTIALS='path/to/service-account-key.json'")