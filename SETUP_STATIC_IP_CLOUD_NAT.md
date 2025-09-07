# Настройка статического IP для Firebase Functions через Cloud NAT

## Регион Firebase Functions
**europe-west1** (Бельгия) - ближайший к Москве регион с хорошей задержкой

## Шаги настройки статического IP

### 1. Активация необходимых API в Google Cloud Console

```bash
gcloud services enable compute.googleapis.com
gcloud services enable vpcaccess.googleapis.com
```

### 2. Создание VPC коннектора для Firebase Functions

```bash
gcloud compute networks vpc-access connectors create firebase-connector \
  --region=europe-west1 \
  --subnet=firebase-subnet \
  --subnet-project=sports-booking-app-1d7e5 \
  --min-instances=2 \
  --max-instances=10 \
  --machine-type=f1-micro
```

### 3. Резервирование статического IP адреса

```bash
gcloud compute addresses create tbank-multiaccounts-ip \
  --region=europe-west1
```

Получить зарезервированный IP:
```bash
gcloud compute addresses describe tbank-multiaccounts-ip \
  --region=europe-west1 \
  --format="value(address)"
```

### 4. Создание Cloud Router

```bash
gcloud compute routers create tbank-router \
  --network=default \
  --region=europe-west1
```

### 5. Создание Cloud NAT с статическим IP

```bash
gcloud compute routers nats create tbank-nat \
  --router=tbank-router \
  --region=europe-west1 \
  --nat-custom-subnet-ip-ranges=firebase-subnet \
  --nat-external-ip-pool=tbank-multiaccounts-ip
```

### 6. Обновление Firebase Functions для использования VPC коннектора

Добавьте в `functions/src/index.ts` для каждой функции, которая обращается к Т-Банку:

```typescript
import * as functions from 'firebase-functions';

const region = 'europe-west1';

// Для функций с API вызовами к Т-Банку
export const initBookingPayment = functions
  .region(region)
  .runWith({
    vpcConnector: 'firebase-connector',
    vpcConnectorEgressSettings: 'ALL_TRAFFIC'
  })
  .https.onCall(async (data, context) => {
    // код функции
  });

export const tbankMultiaccountsWebhook = functions
  .region(region)
  .runWith({
    vpcConnector: 'firebase-connector',
    vpcConnectorEgressSettings: 'ALL_TRAFFIC'
  })
  .https.onRequest(async (req, res) => {
    // код webhook
  });

export const processDailyPayouts = functions
  .region(region)
  .runWith({
    vpcConnector: 'firebase-connector',
    vpcConnectorEgressSettings: 'ALL_TRAFFIC'
  })
  .pubsub.schedule('0 10 * * *')
  .timeZone('Europe/Moscow')
  .onRun(async (context) => {
    // код функции
  });
```

### 7. Деплой обновленных функций

```bash
firebase deploy --only functions
```

## Альтернативный вариант (проще, но дороже)

### Использование Cloud Run со статическим IP

1. Создать Cloud Run сервис для webhook'ов:
```bash
gcloud run deploy tbank-webhook \
  --image=gcr.io/sports-booking-app-1d7e5/tbank-webhook \
  --region=europe-west1 \
  --platform=managed \
  --allow-unauthenticated
```

2. Настроить Load Balancer со статическим IP:
```bash
gcloud compute addresses create tbank-webhook-ip --global
```

3. Настроить SSL сертификат и домен

## Стоимость решений

### Cloud NAT (рекомендуется)
- Статический IP: ~$7/месяц
- Cloud NAT: ~$45/месяц + $0.045 за ГБ трафика
- VPC Connector: ~$36/месяц
- **Итого: ~$88/месяц + трафик**

### Cloud Run + Load Balancer
- Статический IP: ~$7/месяц
- Load Balancer: ~$18/месяц
- Cloud Run: ~$0.00002400 за vCPU-секунду
- **Итого: ~$25/месяц + вычисления**

## Временное решение для тестирования

Пока настраивается статический IP, можно использовать прокси-сервис:

1. Арендовать VPS с статическим IP (например, на reg.ru или timeweb)
2. Настроить nginx как reverse proxy
3. Направить запросы от Firebase Functions через этот прокси

Пример конфигурации nginx:
```nginx
server {
    listen 443 ssl;
    server_name api-proxy.allcourt.ru;
    
    ssl_certificate /etc/ssl/certs/allcourt.crt;
    ssl_certificate_key /etc/ssl/private/allcourt.key;
    
    location /tbank/ {
        proxy_pass https://rest-api-test.tinkoff.ru/v2/;
        proxy_set_header Host rest-api-test.tinkoff.ru;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Что сообщить Т-Банку сейчас

1. **Webhook URL (NotificationURL):** 
   ```
   https://allcourt.ru/api/webhooks/tbank-multiaccounts
   ```

2. **Временное решение:**
   - Мы настраиваем Cloud NAT со статическим IP
   - Процесс займет 1-2 дня
   - После настройки сообщим точный IP адрес

3. **Для срочного тестирования:**
   - Можем быстро настроить прокси через VPS
   - IP будет готов в течение нескольких часов

## Команды для проверки текущей конфигурации

```bash
# Проверить регион функций
firebase functions:list

# Проверить текущие IP адреса (если есть)
gcloud compute addresses list --regions=europe-west1

# Проверить VPC коннекторы
gcloud compute networks vpc-access connectors list --region=europe-west1
```