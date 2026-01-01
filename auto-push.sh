#!/bin/bash

echo "===================================="
echo "Автоматическая загрузка на GitHub"
echo "===================================="
echo ""

# Проверка наличия Git
if ! command -v git &> /dev/null; then
    echo "ОШИБКА: Git не установлен!"
    echo "Установите Git: sudo apt-get install git"
    exit 1
fi

# Добавление всех изменений
echo "Добавление изменений..."
git add .

# Проверка наличия изменений
if git diff --cached --quiet; then
    echo "Нет изменений для загрузки."
    exit 0
fi

echo "Изменения обнаружены!"

# Коммит с текущей датой и временем
COMMIT_MSG="Auto update: $(date '+%Y-%m-%d %H:%M:%S')"
echo "Создание коммита..."
git commit -m "$COMMIT_MSG"

# Пуш на GitHub
echo "Загрузка на GitHub..."
git push origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "===================================="
    echo "УСПЕШНО! Изменения загружены на GitHub"
    echo "===================================="
    echo "GitHub Pages обновится автоматически через 1-2 минуты"
    echo ""
else
    echo ""
    echo "ОШИБКА: Не удалось загрузить на GitHub!"
    echo "Проверьте:"
    echo "1. Настроен ли remote: git remote -v"
    echo "2. Есть ли доступ к репозиторию"
    echo "3. Правильный ли branch (main)"
    exit 1
fi

