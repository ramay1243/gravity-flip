// Игровые переменные
let canvas, ctx;
let gameState = 'menu'; // menu, playing, paused, gameover
let score = 0;
let highScore = 0;
let lives = 3;
let gameSpeed = 1.2; // Уменьшена начальная скорость
let gravityDirection = 0; // 0: down, 1: up, 2: left, 3: right
let gameTime = 0; // Время игры для прогрессивной сложности
let gravityDirections = [
    { x: 0, y: 1, name: 'down' },
    { x: 0, y: -1, name: 'up' },
    { x: -1, y: 0, name: 'left' },
    { x: 1, y: 0, name: 'right' }
];

// Игровые объекты
let ball = {
    x: 0,
    y: 0,
    radius: 15,
    vx: 0,
    vy: 0,
    color: '#00f5ff'
};

let stars = [];
let obstacles = [];
let particles = [];
let bonuses = [];

// Бонусы
let activeBonuses = {
    shield: false,
    magnet: false,
    slowMotion: false
};

let bonusTimers = {
    shield: 0,
    magnet: 0,
    slowMotion: 0
};

// Инициализация
function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    
    // Установка размера canvas
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Загрузка сохранений
    loadGameData();
    
    // Обработчики событий
    setupEventListeners();
    
    // Инициализация игры
    resetGame();
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Пересчет позиций при изменении размера
    if (gameState === 'playing') {
        ball.x = canvas.width / 2;
        ball.y = canvas.height / 2;
    }
}

function setupEventListeners() {
    // Кнопки меню
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('shop-btn').addEventListener('click', () => showScreen('shop'));
    document.getElementById('leaderboard-btn').addEventListener('click', () => showScreen('leaderboard'));
    document.getElementById('shop-back-btn').addEventListener('click', () => showScreen('menu'));
    document.getElementById('leaderboard-back-btn').addEventListener('click', () => showScreen('menu'));
    document.getElementById('share-btn').addEventListener('click', shareScore);
    document.getElementById('resume-btn').addEventListener('click', resumeGame);
    document.getElementById('menu-btn').addEventListener('click', () => {
        pauseGame();
        showScreen('menu');
    });
    document.getElementById('restart-btn').addEventListener('click', startGame);
    document.getElementById('gameover-menu-btn').addEventListener('click', () => showScreen('menu'));
    
    // Управление игрой
    canvas.addEventListener('click', handleGameClick);
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleGameClick(e);
    });
    
    // Покупки в магазине
    document.querySelectorAll('.btn-buy').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.dataset.item;
            const price = parseInt(btn.dataset.price);
            purchaseItem(item, price);
        });
    });
    
    // Пауза при потере фокуса
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && gameState === 'playing') {
            pauseGame();
        }
    });
}

function handleGameClick(e) {
    if (gameState === 'playing') {
        flipGravity();
        createFlipParticles();
    }
}

function flipGravity() {
    gravityDirection = (gravityDirection + 1) % 4;
    
    // Эффект вибрации (если доступно)
    if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
    }
}

function startGame() {
    resetGame();
    gameState = 'playing';
    showScreen('game');
    
    // Создаем несколько начальных звезд для легкого старта
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            createStar();
        }, i * 200);
    }
    
    gameLoop();
}

function resetGame() {
    score = 0;
    lives = 3;
    gameSpeed = 1.2; // Уменьшена начальная скорость
    gameTime = 0; // Сброс времени
    gravityDirection = 0;
    stars = [];
    obstacles = [];
    particles = [];
    bonuses = [];
    activeBonuses = { shield: false, magnet: false, slowMotion: false };
    bonusTimers = { shield: 0, magnet: 0, slowMotion: 0 };
    
    // Позиция шарика
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.vx = 0;
    ball.vy = 0;
    
    // Восстановление жизней из покупок
    if (window.gameData?.extraLives) {
        lives += window.gameData.extraLives;
        window.gameData.extraLives = 0;
    }
    
    updateUI();
}

function gameLoop() {
    if (gameState !== 'playing') return;
    
    update();
    render();
    
    requestAnimationFrame(gameLoop);
}

function update() {
    const dt = activeBonuses.slowMotion ? 0.5 : 1;
    const currentGravity = gravityDirections[gravityDirection];
    
    // Применение гравитации
    ball.vx += currentGravity.x * gameSpeed * dt * 0.1;
    ball.vy += currentGravity.y * gameSpeed * dt * 0.1;
    
    // Ограничение скорости (уменьшено для более плавного управления)
    const maxSpeed = 6; // Было 8
    ball.vx = Math.max(-maxSpeed, Math.min(maxSpeed, ball.vx));
    ball.vy = Math.max(-maxSpeed, Math.min(maxSpeed, ball.vy));
    
    // Обновление позиции
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    
    // Границы экрана (с отскоком, без урона на старте)
    if (ball.x < ball.radius) {
        ball.x = ball.radius;
        ball.vx *= -0.5;
        // Урон от границ только после 10 секунд игры
        if (gameTime > 600) {
            hitObstacle();
        }
    }
    if (ball.x > canvas.width - ball.radius) {
        ball.x = canvas.width - ball.radius;
        ball.vx *= -0.5;
        if (gameTime > 600) {
            hitObstacle();
        }
    }
    if (ball.y < ball.radius) {
        ball.y = ball.radius;
        ball.vy *= -0.5;
        if (gameTime > 600) {
            hitObstacle();
        }
    }
    if (ball.y > canvas.height - ball.radius) {
        ball.y = canvas.height - ball.radius;
        ball.vy *= -0.5;
        if (gameTime > 600) {
            hitObstacle();
        }
    }
    
    // Увеличение времени игры
    gameTime++;
    
    // Генерация звезд (увеличена частота)
    if (Math.random() < 0.05) {
        createStar();
    }
    
    // Генерация препятствий (только после 5 секунд игры, реже на старте)
    const obstacleChance = gameTime < 300 ? 0.002 : (gameTime < 600 ? 0.005 : 0.01);
    if (Math.random() < obstacleChance) {
        createObstacle();
    }
    
    // Генерация бонусов
    if (Math.random() < 0.005) {
        createBonus();
    }
    
    // Обновление звезд (добавлено движение к центру для легкости сбора)
    stars.forEach((star, index) => {
        // Движение звезд к центру экрана (легче собирать)
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const dxToCenter = centerX - star.x;
        const dyToCenter = centerY - star.y;
        const distToCenter = Math.sqrt(dxToCenter * dxToCenter + dyToCenter * dyToCenter);
        
        if (distToCenter > 50) {
            star.x += (dxToCenter / distToCenter) * 0.3;
            star.y += (dyToCenter / distToCenter) * 0.3;
        }
        
        // Магнит бонус
        if (activeBonuses.magnet) {
            const dx = ball.x - star.x;
            const dy = ball.y - star.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) {
                star.x += (dx / dist) * 4;
                star.y += (dy / dist) * 4;
            }
        }
        
        // Проверка сбора звезды
        const dist = Math.sqrt(
            Math.pow(ball.x - star.x, 2) + Math.pow(ball.y - star.y, 2)
        );
        if (dist < ball.radius + star.radius) {
            score += 10;
            createStarParticles(star.x, star.y);
            stars.splice(index, 1);
            updateUI();
            
            // Вибрация при сборе
            if (window.Telegram?.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
            }
        }
    });
    
    // Обновление препятствий
    obstacles.forEach((obstacle, index) => {
        const dist = Math.sqrt(
            Math.pow(ball.x - obstacle.x, 2) + Math.pow(ball.y - obstacle.y, 2)
        );
        if (dist < ball.radius + obstacle.radius && !activeBonuses.shield) {
            hitObstacle();
            obstacles.splice(index, 1);
        }
    });
    
    // Обновление бонусов
    bonuses.forEach((bonus, index) => {
        const dist = Math.sqrt(
            Math.pow(ball.x - bonus.x, 2) + Math.pow(ball.y - bonus.y, 2)
        );
        if (dist < ball.radius + bonus.radius) {
            activateBonus(bonus.type);
            bonuses.splice(index, 1);
        }
    });
    
    // Обновление частиц
    particles.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life--;
        particle.alpha = particle.life / particle.maxLife;
        if (particle.life <= 0) {
            particles.splice(index, 1);
        }
    });
    
    // Обновление таймеров бонусов
    Object.keys(bonusTimers).forEach(bonus => {
        if (bonusTimers[bonus] > 0) {
            bonusTimers[bonus]--;
            if (bonusTimers[bonus] <= 0) {
                activeBonuses[bonus] = false;
            }
        }
    });
    
    // Увеличение сложности (более плавное)
    gameSpeed = 1.2 + (score / 800) + (gameTime / 2000);
    
    // Удаление объектов за пределами экрана
    stars = stars.filter(star => 
        star.x > -50 && star.x < canvas.width + 50 &&
        star.y > -50 && star.y < canvas.height + 50
    );
    
    obstacles = obstacles.filter(obstacle => 
        obstacle.x > -100 && obstacle.x < canvas.width + 100 &&
        obstacle.y > -100 && obstacle.y < canvas.height + 100
    );
}

function render() {
    // Очистка экрана
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Фоновые звезды
    drawBackgroundStars();
    
    // Отрисовка звезд
    stars.forEach(star => {
        drawStar(star.x, star.y, star.radius, star.color);
    });
    
    // Отрисовка препятствий
    obstacles.forEach(obstacle => {
        drawObstacle(obstacle.x, obstacle.y, obstacle.radius, obstacle.color);
    });
    
    // Отрисовка бонусов
    bonuses.forEach(bonus => {
        drawBonus(bonus.x, bonus.y, bonus.radius, bonus.type);
    });
    
    // Отрисовка шарика
    if (activeBonuses.shield) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00ff00';
    }
    drawBall(ball.x, ball.y, ball.radius, ball.color);
    ctx.shadowBlur = 0;
    
    // Отрисовка частиц
    particles.forEach(particle => {
        ctx.globalAlpha = particle.alpha;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
    
    // Индикатор направления гравитации
    drawGravityIndicator();
}

function drawBall(x, y, radius, color) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0, 245, 255, 0.3)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Обводка
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawStar(x, y, radius, color) {
    // Внешнее свечение
    ctx.shadowBlur = 15;
    ctx.shadowColor = color;
    
    // Градиент для звезды
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, '#fff');
    gradient.addColorStop(0.5, color);
    gradient.addColorStop(1, 'rgba(255, 215, 0, 0.3)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Обводка
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.shadowBlur = 0;
    
    // Внутренний блик
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
}

function drawObstacle(x, y, radius, color) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(255, 0, 0, 0.3)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Шипы
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        const x1 = x + Math.cos(angle) * radius;
        const y1 = y + Math.sin(angle) * radius;
        const x2 = x + Math.cos(angle) * (radius + 5);
        const y2 = y + Math.sin(angle) * (radius + 5);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
}

function drawBonus(x, y, radius, type) {
    let color, symbol;
    switch(type) {
        case 'shield':
            color = '#00ff00';
            symbol = '🛡️';
            break;
        case 'magnet':
            color = '#ffd700';
            symbol = '🧲';
            break;
        case 'slowMotion':
            color = '#00f5ff';
            symbol = '⏱️';
            break;
    }
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Символ
    ctx.font = `${radius}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, x, y);
}

function drawGravityIndicator() {
    const currentGravity = gravityDirections[gravityDirection];
    const centerX = canvas.width / 2;
    const centerY = 50;
    const arrowLength = 30;
    
    ctx.strokeStyle = '#00f5ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
        centerX + currentGravity.x * arrowLength,
        centerY + currentGravity.y * arrowLength
    );
    ctx.stroke();
    
    // Стрелка
    const angle = Math.atan2(currentGravity.y, currentGravity.x);
    ctx.beginPath();
    ctx.moveTo(
        centerX + currentGravity.x * arrowLength,
        centerY + currentGravity.y * arrowLength
    );
    ctx.lineTo(
        centerX + currentGravity.x * arrowLength - Math.cos(angle - Math.PI / 6) * 10,
        centerY + currentGravity.y * arrowLength - Math.sin(angle - Math.PI / 6) * 10
    );
    ctx.lineTo(
        centerX + currentGravity.x * arrowLength - Math.cos(angle + Math.PI / 6) * 10,
        centerY + currentGravity.y * arrowLength - Math.sin(angle + Math.PI / 6) * 10
    );
    ctx.closePath();
    ctx.fill();
    
    // Текст направления
    ctx.fillStyle = '#00f5ff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
        `Гравитация: ${currentGravity.name.toUpperCase()}`,
        centerX,
        centerY + 40
    );
}

function drawBackgroundStars() {
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 50; i++) {
        const x = (i * 137.5) % canvas.width;
        const y = (i * 197.3) % canvas.height;
        const size = Math.random() * 2;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function createStar() {
    // На старте игры звезды появляются ближе к центру
    const isEarlyGame = gameTime < 300;
    let x, y;
    
    if (isEarlyGame && Math.random() < 0.5) {
        // Звезды появляются ближе к центру на старте
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const angle = Math.random() * Math.PI * 2;
        const distance = 100 + Math.random() * 150;
        x = centerX + Math.cos(angle) * distance;
        y = centerY + Math.sin(angle) * distance;
        
        // Ограничение границами
        x = Math.max(20, Math.min(canvas.width - 20, x));
        y = Math.max(20, Math.min(canvas.height - 20, y));
    } else {
        // Обычная генерация с краев
        const side = Math.floor(Math.random() * 4);
        switch(side) {
            case 0: // top
                x = Math.random() * canvas.width;
                y = -20;
                break;
            case 1: // right
                x = canvas.width + 20;
                y = Math.random() * canvas.height;
                break;
            case 2: // bottom
                x = Math.random() * canvas.width;
                y = canvas.height + 20;
                break;
            case 3: // left
                x = -20;
                y = Math.random() * canvas.height;
                break;
        }
    }
    
    stars.push({
        x: x,
        y: y,
        radius: 12, // Увеличен размер для лучшей видимости
        color: '#ffd700'
    });
}

function createObstacle() {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    
    switch(side) {
        case 0:
            x = Math.random() * canvas.width;
            y = -30;
            break;
        case 1:
            x = canvas.width + 30;
            y = Math.random() * canvas.height;
            break;
        case 2:
            x = Math.random() * canvas.width;
            y = canvas.height + 30;
            break;
        case 3:
            x = -30;
            y = Math.random() * canvas.height;
            break;
    }
    
    obstacles.push({
        x: x,
        y: y,
        radius: 20 + Math.random() * 15,
        color: '#ff0000'
    });
}

function createBonus() {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    
    switch(side) {
        case 0:
            x = Math.random() * canvas.width;
            y = -30;
            break;
        case 1:
            x = canvas.width + 30;
            y = Math.random() * canvas.height;
            break;
        case 2:
            x = Math.random() * canvas.width;
            y = canvas.height + 30;
            break;
        case 3:
            x = -30;
            y = Math.random() * canvas.height;
            break;
    }
    
    const types = ['shield', 'magnet', 'slowMotion'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    bonuses.push({
        x: x,
        y: y,
        radius: 15,
        type: type
    });
}

function activateBonus(type) {
    activeBonuses[type] = true;
    bonusTimers[type] = 300; // 5 секунд при 60 FPS
    
    if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
}

function hitObstacle() {
    if (activeBonuses.shield) {
        activeBonuses.shield = false;
        bonusTimers.shield = 0;
        return;
    }
    
    lives--;
    createHitParticles();
    updateUI();
    
    if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
    }
    
    if (lives <= 0) {
        gameOver();
    }
}

function gameOver() {
    gameState = 'gameover';
    
    if (score > highScore) {
        highScore = score;
        saveGameData();
    }
    
    document.getElementById('final-score').textContent = score;
    showScreen('gameover');
    
    // Отправка результата в Telegram
    if (window.sendScoreToTelegram) {
        window.sendScoreToTelegram(score);
    }
}

function pauseGame() {
    if (gameState === 'playing') {
        gameState = 'paused';
        document.getElementById('pause-overlay').classList.remove('hidden');
    }
}

function resumeGame() {
    if (gameState === 'paused') {
        gameState = 'playing';
        document.getElementById('pause-overlay').classList.add('hidden');
        gameLoop();
    }
}

function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    const screens = {
        'menu': 'main-menu',
        'game': 'game-screen',
        'shop': 'shop-screen',
        'leaderboard': 'leaderboard-screen',
        'gameover': 'gameover-screen'
    };
    
    document.getElementById(screens[screenName]).classList.add('active');
    
    if (screenName === 'leaderboard') {
        updateLeaderboard();
    }
}

function updateUI() {
    document.getElementById('current-score').textContent = score;
    document.getElementById('lives-count').textContent = lives;
    document.getElementById('high-score-value').textContent = highScore;
}

function createFlipParticles() {
    for (let i = 0; i < 20; i++) {
        particles.push({
            x: ball.x,
            y: ball.y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            size: Math.random() * 4 + 2,
            color: '#00f5ff',
            life: 30,
            maxLife: 30,
            alpha: 1
        });
    }
}

function createStarParticles(x, y) {
    for (let i = 0; i < 15; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            size: Math.random() * 3 + 2,
            color: '#ffd700',
            life: 20,
            maxLife: 20,
            alpha: 1
        });
    }
}

function createHitParticles() {
    for (let i = 0; i < 25; i++) {
        particles.push({
            x: ball.x,
            y: ball.y,
            vx: (Math.random() - 0.5) * 12,
            vy: (Math.random() - 0.5) * 12,
            size: Math.random() * 5 + 3,
            color: '#ff0000',
            life: 40,
            maxLife: 40,
            alpha: 1
        });
    }
}

function shareScore() {
    if (window.shareToTelegram) {
        window.shareToTelegram(score);
    } else {
        const text = `Я набрал ${score} очков в Gravity Flip! Попробуй побить мой результат! 🎮`;
        if (navigator.share) {
            navigator.share({ text: text });
        } else {
            navigator.clipboard.writeText(text);
            alert('Текст скопирован в буфер обмена!');
        }
    }
}

function purchaseItem(item, price) {
    if (window.purchaseWithTelegramStars) {
        window.purchaseWithTelegramStars(item, price);
    } else {
        alert(`Покупка ${item} за ${price} звезд (демо режим)`);
    }
}

function loadGameData() {
    const saved = localStorage.getItem('gravityFlipData');
    if (saved) {
        const data = JSON.parse(saved);
        highScore = data.highScore || 0;
        if (data.premium) {
            window.gameData = { premium: true };
        }
    }
    updateUI();
}

function saveGameData() {
    const data = {
        highScore: highScore,
        premium: window.gameData?.premium || false
    };
    localStorage.setItem('gravityFlipData', JSON.stringify(data));
}

// Инициализация при загрузке
if (document.readyState === 'loading') {
    window.addEventListener('load', init);
} else {
    // DOM уже загружен
    init();
}

