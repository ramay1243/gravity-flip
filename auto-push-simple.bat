@echo off
echo ====================================
echo Автоматическая загрузка на GitHub
echo ====================================
echo.

REM Проверка наличия Git
git --version >nul 2>&1
if errorlevel 1 (
    echo ОШИБКА: Git не установлен!
    echo Установите Git с https://git-scm.com/
    pause
    exit /b 1
)

REM Добавление всех изменений
echo Добавление изменений...
git add .

REM Проверка наличия изменений
git diff --cached --quiet
if errorlevel 1 (
    echo Изменения обнаружены!
    
    REM Простое сообщение коммита (всегда работает)
    echo Создание коммита...
    git commit -m "Auto update"
    
    REM Пуш на GitHub
    echo Загрузка на GitHub...
    git push origin main
    
    if errorlevel 1 (
        echo.
        echo ОШИБКА: Не удалось загрузить на GitHub!
        echo Проверьте:
        echo 1. Настроен ли remote: git remote -v
        echo 2. Есть ли доступ к репозиторию
        echo 3. Правильный ли branch (main)
        pause
        exit /b 1
    )
    
    echo.
    echo ====================================
    echo УСПЕШНО! Изменения загружены на GitHub
    echo ====================================
    echo GitHub Pages обновится автоматически через 1-2 минуты
    echo.
) else (
    echo Нет изменений для загрузки.
)

pause

