// Интеграция с Telegram Web App API

let tg = window.Telegram?.WebApp;

// Инициализация Telegram Web App
function initTelegram() {
    if (!tg) {
        console.log('Telegram Web App API не доступен. Запуск в демо режиме.');
        return;
    }
    
    tg.ready();
    tg.expand();
    
    // Настройка темы
    if (tg.colorScheme === 'dark') {
        document.body.style.background = 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)';
    }
    
    // Инициализация данных пользователя
    initUserData();
    
    // Загрузка баланса звезд
    loadStarsBalance();
    
    // Обновление UI
    updateTelegramUI();
}

// Инициализация данных пользователя
function initUserData() {
    if (!tg?.initDataUnsafe?.user) return;
    
    const user = tg.initDataUnsafe.user;
    window.userData = {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        username: user.username
    };
    
    console.log('Пользователь:', window.userData);
}

// Загрузка баланса Telegram Stars
function loadStarsBalance() {
    if (!tg?.CloudStorage) {
        // Демо режим
        window.starsBalance = 0;
        updateStarsDisplay();
        return;
    }
    
    // В реальном приложении здесь будет запрос к Telegram API
    // Для демо используем localStorage
    const saved = localStorage.getItem('telegramStars');
    window.starsBalance = saved ? parseInt(saved) : 0;
    updateStarsDisplay();
}

// Обновление отображения баланса звезд
function updateStarsDisplay() {
    const balanceEl = document.getElementById('stars-balance');
    if (balanceEl) {
        balanceEl.textContent = window.starsBalance || 0;
    }
}

// Покупка через Telegram Stars
window.purchaseWithTelegramStars = function(item, price) {
    if (!tg) {
        alert(`Демо: Покупка ${item} за ${price} звезд`);
        return;
    }
    
    if (window.starsBalance < price) {
        tg.showAlert('Недостаточно звезд!');
        return;
    }
    
    // Показ диалога подтверждения
    tg.showConfirm(`Купить за ${price} ⭐?`, (confirmed) => {
        if (confirmed) {
            processPurchase(item, price);
        }
    });
};

// Обработка покупки
function processPurchase(item, price) {
    // В реальном приложении здесь будет запрос к Telegram API
    // Для демо используем localStorage
    
    window.starsBalance -= price;
    localStorage.setItem('telegramStars', window.starsBalance.toString());
    updateStarsDisplay();
    
    // Применение покупки
    applyPurchase(item);
    
    if (tg) {
        tg.showAlert('Покупка успешна!');
        tg.HapticFeedback.notificationOccurred('success');
    }
}

// Применение покупки
function applyPurchase(item) {
    if (!window.gameData) {
        window.gameData = {};
    }
    
    switch(item) {
        case 'remove-ads':
            window.gameData.noAds = true;
            tg?.showAlert('Реклама отключена навсегда!');
            break;
            
        case 'lives':
            if (!window.gameData.extraLives) {
                window.gameData.extraLives = 0;
            }
            window.gameData.extraLives += 3;
            tg?.showAlert('Добавлено 3 жизни!');
            break;
            
        case 'bonus-pack':
            // Бонусы будут применены при следующем запуске игры
            if (!window.gameData.bonusPacks) {
                window.gameData.bonusPacks = 0;
            }
            window.gameData.bonusPacks += 1;
            tg?.showAlert('Бонус-пак добавлен!');
            break;
            
        case 'premium':
            window.gameData.premium = true;
            window.gameData.noAds = true;
            tg?.showAlert('Premium активирован!');
            break;
    }
    
    saveGameData();
}

// Отправка результата в Telegram
window.sendScoreToTelegram = function(score) {
    if (!tg) return;
    
    // Сохранение результата в Cloud Storage
    if (tg.CloudStorage) {
        const key = `score_${window.userData?.id || 'guest'}`;
        tg.CloudStorage.setItem(key, score.toString(), (error) => {
            if (error) {
                console.error('Ошибка сохранения:', error);
            }
        });
    }
    
    // Обновление таблицы лидеров
    updateLeaderboard();
}

// Обновление таблицы лидеров
function updateLeaderboard() {
    const leaderboardEl = document.getElementById('leaderboard-list');
    if (!leaderboardEl) return;
    
    // В реальном приложении здесь будет запрос к серверу
    // Для демо используем localStorage
    
    let leaderboard = [];
    
    // Сбор результатов из localStorage (демо)
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('score_')) {
            const score = parseInt(localStorage.getItem(key));
            const userId = key.replace('score_', '');
            leaderboard.push({
                userId: userId,
                name: userId === (window.userData?.id?.toString() || 'guest') 
                    ? (window.userData?.firstName || 'Вы') 
                    : `Игрок ${userId}`,
                score: score
            });
        }
    }
    
    // Добавление текущего результата
    if (window.userData) {
        const currentScore = parseInt(document.getElementById('current-score')?.textContent || 0);
        if (currentScore > 0) {
            leaderboard.push({
                userId: window.userData.id.toString(),
                name: window.userData.firstName || 'Вы',
                score: currentScore
            });
        }
    }
    
    // Сортировка по очкам
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 10); // Топ 10
    
    // Отрисовка
    leaderboardEl.innerHTML = '';
    
    if (leaderboard.length === 0) {
        leaderboardEl.innerHTML = '<p style="text-align: center; color: #aaa; padding: 20px;">Пока нет результатов</p>';
        return;
    }
    
    leaderboard.forEach((entry, index) => {
        const isCurrentUser = entry.userId === (window.userData?.id?.toString() || 'guest');
        const item = document.createElement('div');
        item.className = `leaderboard-item ${isCurrentUser ? 'current-user' : ''}`;
        item.innerHTML = `
            <span class="leaderboard-rank">${index + 1}</span>
            <span class="leaderboard-name">${entry.name}</span>
            <span class="leaderboard-score">${entry.score}</span>
        `;
        leaderboardEl.appendChild(item);
    });
}

// Поделиться результатом
window.shareToTelegram = function(score) {
    if (!tg) {
        shareScore();
        return;
    }
    
    const text = `🎮 Я набрал ${score} очков в Gravity Flip!\n\nПопробуй побить мой результат! 🚀`;
    
    // Использование Telegram Share API
    if (tg.shareUrl) {
        // В реальном приложении здесь будет ссылка на игру
        const url = window.location.href;
        tg.openLink(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`);
    } else {
        // Fallback
        if (navigator.share) {
            navigator.share({
                title: 'Gravity Flip',
                text: text,
                url: window.location.href
            });
        } else {
            navigator.clipboard.writeText(text + '\n' + window.location.href);
            tg.showAlert('Ссылка скопирована!');
        }
    }
}

// Обновление UI для Telegram
function updateTelegramUI() {
    // Скрытие кнопки "Назад" если это Telegram
    if (tg) {
        const backButton = document.querySelector('.tg-back-button');
        if (backButton) {
            backButton.style.display = 'none';
        }
        
        // Настройка главной кнопки
        if (tg.MainButton) {
            tg.MainButton.setText('ИГРАТЬ');
            tg.MainButton.onClick(() => {
                if (document.getElementById('main-menu').classList.contains('active')) {
                    document.getElementById('start-btn').click();
                }
            });
            tg.MainButton.show();
        }
    }
}

// Инициализация при загрузке
function initTelegramOnLoad() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTelegram);
    } else {
        initTelegram();
    }
}

// Запуск инициализации
initTelegramOnLoad();

// Экспорт функций для использования в game.js
window.initTelegram = initTelegram;
window.updateLeaderboard = updateLeaderboard;

