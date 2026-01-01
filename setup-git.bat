@echo off
echo ====================================
echo Настройка Git для gravity-flip
echo ====================================
echo.

REM Проверка наличия Git
git --version >nul 2>&1
if errorlevel 1 (
    echo ОШИБКА: Git не установлен!
    echo Установите Git с https://git-scm.com/download/win
    pause
    exit /b 1
)

echo Проверка текущей конфигурации...
echo.

REM Проверка remote
git remote -v >nul 2>&1
if errorlevel 1 (
    echo Настройка remote для вашего репозитория...
    git remote add origin https://github.com/ramay1243/gravity-flip.git
    echo Remote настроен!
) else (
    echo Remote уже настроен:
    git remote -v
    echo.
    echo Хотите обновить remote? (Y/N)
    set /p update="> "
    if /i "%update%"=="Y" (
        git remote set-url origin https://github.com/ramay1243/gravity-flip.git
        echo Remote обновлен!
    )
)

REM Проверка branch
git branch --show-current >nul 2>&1
if errorlevel 1 (
    echo Создание branch main...
    git checkout -b main
) else (
    echo Текущий branch:
    git branch --show-current
)

echo.
echo ====================================
echo Настройка завершена!
echo ====================================
echo.
echo Теперь вы можете использовать:
echo - auto-push.bat для загрузки изменений
echo - npm run watch для автоматического отслеживания
echo.
pause

