# ✅ СТАТИЧЕСКИЙ IP НАСТРОЕН И ГОТОВ

## Для передачи Т-Банку:

### 1. Статический IP адрес
```
34.14.97.72
```

### 2. Webhook URL (NotificationURL)
```
https://allcourt.ru/api/webhooks/tbank-multiaccounts
```

### 3. Регион
```
europe-west1 (Бельгия)
```

## Что было сделано:

1. ✅ **Зарезервирован статический IP адрес**
   - IP: 34.14.97.72
   - Регион: europe-west1

2. ✅ **Настроен Cloud NAT**
   - Router: tbank-router
   - NAT: tbank-nat
   - Все исходящие запросы будут идти с IP: 34.14.97.72

3. ✅ **Создан VPC коннектор**
   - Имя: firebase-connector
   - Статус: READY
   - IP диапазон: 10.8.0.0/28

4. ✅ **Обновлены Firebase Functions**
   - initBookingPayment
   - processDailyPayouts  
   - tbankMultiaccountsWebhook
   - registerClubInMultiaccounts
   - Все функции используют VPC коннектор и статический IP

## Следующие шаги:

### 1. Деплой функций (наша сторона)
```bash
firebase deploy --only functions:initBookingPayment,functions:processDailyPayouts,functions:tbankMultiaccountsWebhook,functions:registerClubInMultiaccounts
```

### 2. Для Т-Банка
Пожалуйста, добавьте в белый список:
- **IP адрес:** 34.14.97.72
- **Webhook URL:** https://allcourt.ru/api/webhooks/tbank-multiaccounts

### 3. Тестирование
После добавления IP в белый список, запустите:
```bash
cd functions && node test-multiaccounts.js
```

## Проверка конфигурации:

```bash
# Проверить статус VPC коннектора
gcloud compute networks vpc-access connectors describe firebase-connector --region=europe-west1

# Проверить статический IP
gcloud compute addresses describe tbank-multiaccounts-ip --region=europe-west1

# Проверить NAT конфигурацию
gcloud compute routers nats describe tbank-nat --router=tbank-router --region=europe-west1
```

## Важно:

- Все запросы от Firebase Functions к API Т-Банка теперь будут идти с IP: **34.14.97.72**
- Этот IP постоянный и не изменится
- Webhook будет доступен по адресу: https://allcourt.ru/api/webhooks/tbank-multiaccounts

---

**Статус: ГОТОВО К ИСПОЛЬЗОВАНИЮ**

IP адрес может быть передан Т-Банку для добавления в белый список.