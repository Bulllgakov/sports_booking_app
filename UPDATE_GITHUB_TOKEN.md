# 🔐 Как обновить GitHub Token для полного доступа

## Проблема
Текущий токен не имеет прав на изменение GitHub Actions workflows (`.github/workflows/*`).

## Решение - Создать новый токен

### Шаг 1: Откройте настройки токенов
1. Перейдите на https://github.com/settings/tokens
2. Или: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)

### Шаг 2: Создайте новый токен
1. Нажмите **"Generate new token"** → **"Generate new token (classic)"**
2. Дайте название: `sports_booking_app_full`
3. Выберите срок действия (рекомендую 90 дней)

### Шаг 3: Выберите права доступа
Отметьте галочками следующие разделы:

✅ **repo** (полный доступ к репозиториям)
- ✅ repo:status
- ✅ repo_deployment
- ✅ public_repo
- ✅ repo:invite
- ✅ security_events

✅ **workflow** (управление GitHub Actions)
- Это ключевое право для изменения workflows!

✅ **write:packages** (опционально, для packages)
✅ **delete:packages** (опционально)

### Шаг 4: Создайте токен
1. Прокрутите вниз и нажмите **"Generate token"**
2. **ВАЖНО**: Скопируйте токен сразу! Он показывается только один раз
3. Сохраните его в безопасном месте

### Шаг 5: Обновите удаленный репозиторий
```bash
# Обновите URL с новым токеном
git remote set-url origin https://Bulllgakov:НОВЫЙ_ТОКЕН@github.com/Bulllgakov/sports_booking_app.git
```

Замените `НОВЫЙ_ТОКЕН` на ваш новый токен.

## Альтернативный способ - SSH ключи

Если не хотите использовать токены, можно настроить SSH:

### 1. Создайте SSH ключ
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

### 2. Добавьте ключ в ssh-agent
```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

### 3. Скопируйте публичный ключ
```bash
cat ~/.ssh/id_ed25519.pub
```

### 4. Добавьте в GitHub
1. GitHub → Settings → SSH and GPG keys
2. New SSH key
3. Вставьте скопированный ключ

### 5. Измените remote URL на SSH
```bash
git remote set-url origin git@github.com:Bulllgakov/sports_booking_app.git
```

## Проверка прав токена

После создания нового токена вы сможете:
- ✅ Изменять файлы в `.github/workflows/`
- ✅ Создавать новые workflows
- ✅ Управлять GitHub Actions
- ✅ Создавать релизы автоматически

## Безопасность

⚠️ **Важно**:
- Никогда не публикуйте токен в коде
- Не отправляйте токен в коммиты
- Регулярно обновляйте токены
- Используйте минимально необходимые права

## Текущий статус

Сейчас у вас есть ограничения:
- ❌ Нельзя изменять workflows
- ❌ Нельзя создавать релизы через Actions

С новым токеном с правом `workflow`:
- ✅ Полный контроль над CI/CD
- ✅ Автоматические релизы
- ✅ Изменение любых файлов