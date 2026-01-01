#!/bin/bash

echo "===================================="
echo "Настройка Git для gravity-flip"
echo "===================================="
echo ""

# Проверка наличия Git
if ! command -v git &> /dev/null; then
    echo "ОШИБКА: Git не установлен!"
    echo "Установите Git: sudo apt-get install git"
    exit 1
fi

echo "Проверка текущей конфигурации..."
echo ""

# Проверка remote
if ! git remote get-url origin &> /dev/null; then
    echo "Настройка remote для вашего репозитория..."
    git remote add origin https://github.com/ramay1243/gravity-flip.git
    echo "Remote настроен!"
else
    echo "Remote уже настроен:"
    git remote -v
    echo ""
    read -p "Хотите обновить remote? (y/n): " update
    if [ "$update" = "y" ] || [ "$update" = "Y" ]; then
        git remote set-url origin https://github.com/ramay1243/gravity-flip.git
        echo "Remote обновлен!"
    fi
fi

# Проверка branch
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)
if [ -z "$CURRENT_BRANCH" ]; then
    echo "Создание branch main..."
    git checkout -b main
else
    echo "Текущий branch: $CURRENT_BRANCH"
fi

echo ""
echo "===================================="
echo "Настройка завершена!"
echo "===================================="
echo ""
echo "Теперь вы можете использовать:"
echo "- ./auto-push.sh для загрузки изменений"
echo "- npm run watch для автоматического отслеживания"
echo ""

