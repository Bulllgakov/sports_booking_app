# 🔧 Исправление прав для автоматических релизов

## Проблема
GitHub Actions не может создавать релизы из-за ограничений прав GITHUB_TOKEN.

## Решение 1: Добавить права в workflow

Добавьте в начало вашего workflow файла `.github/workflows/build-apk.yml`:

```yaml
name: Build APK

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
  workflow_dispatch:

# Добавьте эти права
permissions:
  contents: write
  packages: write

jobs:
  build:
    name: Build APK
    runs-on: ubuntu-latest
    # ... остальной код
```

## Решение 2: Настройки репозитория

1. Откройте https://github.com/Bulllgakov/sports_booking_app/settings/actions
2. Найдите раздел "Workflow permissions"
3. Выберите "Read and write permissions"
4. Отметьте "Allow GitHub Actions to create and approve pull requests"
5. Сохраните

## Решение 3: Использовать Personal Access Token

Вместо `${{ secrets.GITHUB_TOKEN }}` используйте свой PAT:

1. Создайте секрет в репозитории:
   - Settings → Secrets and variables → Actions
   - New repository secret
   - Name: `PAT_TOKEN`
   - Value: ваш personal access token

2. В workflow измените:
   ```yaml
   token: ${{ secrets.PAT_TOKEN }}
   ```

## Альтернатива: Создавать релизы вручную

Можно отключить автоматическое создание релизов и загружать APK вручную:
1. Скачайте APK из Artifacts
2. Создайте релиз вручную на GitHub
3. Прикрепите APK файлы