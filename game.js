// Игровые переменные
let canvas, ctx;
let gameState = 'menu'; // menu, playing, paused, gameover
let score = 0;
let highScore = 0;
let lives = 3;
let gameSpeed = 1.2;
let gravityDirection = 0; // 0: down, 1: up, 2: left, 3: right
let gameTime = 0;
let lastFrameTime = 0; // Время последнего кадра для delta time
let deltaTime = 0; // Разница времени между кадрами
let combo = 0; // Комбо система
let comboMultiplier = 1; // Мультипликатор очков
let lastStarTime = 0; // Время последней собранной звезды
let scoreAnimations = []; // Анимации очков
let targetFPS = 60; // Целевой FPS
let frameTime = 1000 / targetFPS; // Время одного кадра в миллисекундах
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
let enemies = []; // Враги, которые преследуют игрока
let particles = [];
let bonuses = [];
let screenEffects = []; // Визуальные эффекты экрана
let lastGravityFlip = 0; // Время последнего переворота

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
    if (!canvas) {
        console.error('Canvas не найден!');
        return;
    }
    
    ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Не удалось получить контекст canvas!');
        return;
    }
    
    // Оптимизация для мобильных устройств
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
        // Уменьшаем количество частиц и эффектов на мобильных
        targetFPS = 30; // Снижаем целевую частоту кадров для мобильных
        frameTime = 1000 / targetFPS;
        
        // Отключаем некоторые эффекты для лучшей производительности
        window.mobileMode = true;
    } else {
        window.mobileMode = false;
    }
    
    // Установка размера canvas
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Загрузка сохранений
    loadGameData();
    
    // Обработчики событий
    setupEventListeners();
    
    // Инициализация игры
    resetGame();
    
    console.log('Игра инициализирована успешно');
}

function resizeCanvas() {
    if (!canvas) return;
    
    // Получаем размеры с учетом Telegram Web App или обычного окна
    const width = window.innerWidth || document.documentElement.clientWidth || 800;
    const height = window.innerHeight || document.documentElement.clientHeight || 600;
    
    canvas.width = width;
    canvas.height = height;
    
    // Устанавливаем размеры для отображения
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    
    // Пересчет позиций при изменении размера
    if (gameState === 'playing' && ball) {
        ball.x = Math.min(ball.x, canvas.width - ball.radius);
        ball.y = Math.min(ball.y, canvas.height - ball.radius);
        ball.x = Math.max(ball.x, ball.radius);
        ball.y = Math.max(ball.y, ball.radius);
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
    lastGravityFlip = gameTime;
    
    // Визуальный эффект переворота
    createGravityFlipEffect();
    
    // Отталкивание врагов при перевороте
    enemies.forEach(enemy => {
        const dx = enemy.x - ball.x;
        const dy = enemy.y - ball.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200) {
            enemy.x += (dx / dist) * 30;
            enemy.y += (dy / dist) * 30;
        }
    });
    
    // Эффект вибрации
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
    gameSpeed = 1.2;
    gameTime = 0;
    lastFrameTime = 0; // Сброс времени кадра
    deltaTime = 0;
    combo = 0;
    comboMultiplier = 1;
    lastStarTime = 0;
    lastGravityFlip = 0;
    scoreAnimations = [];
    screenEffects = [];
    gravityDirection = 0;
    stars = [];
    obstacles = [];
    enemies = [];
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

function gameLoop(currentTime) {
    if (gameState !== 'playing') return;
    
    // Расчет delta time для синхронизации скорости
    const now = currentTime || performance.now();
    
    if (lastFrameTime === 0) {
        lastFrameTime = now;
    }
    
    deltaTime = now - lastFrameTime;
    lastFrameTime = now;
    
    // Ограничение delta time для предотвращения больших скачков
    // На мобильных устройствах ограничиваем сильнее
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const maxDelta = isMobile ? 33 : 100; // 33ms = ~30 FPS минимум на мобильных
    deltaTime = Math.min(deltaTime, maxDelta);
    
    // Нормализация к целевому FPS
    const normalizedDelta = deltaTime / frameTime;
    
    // Дополнительная проверка для предотвращения слишком больших значений
    // На мобильных еще больше ограничиваем
    const maxSpeed = isMobile ? 1.5 : 2;
    const safeDelta = Math.min(normalizedDelta, maxSpeed);
    
    update(safeDelta);
    render();
    
    requestAnimationFrame(gameLoop);
}

function update(dt = 1) {
    // Применение замедления времени бонуса
    const timeScale = activeBonuses.slowMotion ? 0.5 : 1;
    
    // Ограничиваем dt для предотвращения слишком больших скачков
    const limitedDt = Math.min(dt, 2); // Максимум 2x скорость
    const adjustedDt = limitedDt * timeScale;
    
    // Обновление игрового времени (в кадрах, но синхронизировано)
    // Используем фиксированное значение для стабильности
    gameTime += adjustedDt;
    
    const currentGravity = gravityDirections[gravityDirection];
    
    // УПРОЩЕННОЕ УПРАВЛЕНИЕ - более отзывчивое, меньше инерции
    // Прямое применение гравитации без накопления скорости
    const gravityStrength = gameSpeed * 0.15; // Уменьшена сила гравитации
    ball.vx = currentGravity.x * gravityStrength * 8; // Прямое управление
    ball.vy = currentGravity.y * gravityStrength * 8;
    
    // Ограничение скорости
    const maxSpeed = 5; // Еще больше уменьшено
    ball.vx = Math.max(-maxSpeed, Math.min(maxSpeed, ball.vx));
    ball.vy = Math.max(-maxSpeed, Math.min(maxSpeed, ball.vy));
    
    // Обновление позиции с учетом delta time
    ball.x += ball.vx * adjustedDt;
    ball.y += ball.vy * adjustedDt;
    
    // Обновление комбо (сброс если долго не собирали звезды)
    // 180 кадров при 60 FPS = 3 секунды
    if (gameTime - lastStarTime > 180) {
        combo = 0;
        comboMultiplier = 1;
    }
    
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
    
    // gameTime обновляется в начале функции update через adjustedDt
    
    // Генерация звезд (частота зависит от delta time для синхронизации)
    // На мобильных реже генерируем
    const starChance = window.mobileMode ? 0.08 : 0.12;
    if (Math.random() < starChance * adjustedDt) {
        createStar();
    }
    
    // Генерация специальных звезд (редкие, больше очков)
    // На мобильных еще реже
    const specialStarChance = window.mobileMode ? 0.003 : 0.005;
    if (Math.random() < specialStarChance * adjustedDt) {
        createSpecialStar();
    }
    
    // Ритмичные эффекты - только на ПК
    if (!window.mobileMode && Math.floor(gameTime) % 60 === 0 && Math.floor(gameTime) !== Math.floor(gameTime - adjustedDt)) {
        createRhythmEffect();
    }
    
    // Генерация препятствий (только после 5 секунд игры, реже на старте)
    // На мобильных реже генерируем препятствия
    let obstacleChance = gameTime < 300 ? 0.002 : (gameTime < 600 ? 0.005 : 0.01);
    if (window.mobileMode) {
        obstacleChance *= 0.7; // На 30% реже на мобильных
    }
    if (Math.random() < obstacleChance * adjustedDt) {
        createObstacle();
    }
    
    // Генерация врагов (после 10 секунд, реже на мобильных)
    let enemyChance = 0.003;
    if (window.mobileMode) {
        enemyChance = 0.002; // Реже на мобильных
    }
    if (gameTime > 600 && Math.random() < enemyChance * adjustedDt) {
        createEnemy();
    }
    
    // Обновление врагов
    enemies.forEach((enemy, index) => {
        // Враги преследуют игрока
        const dx = ball.x - enemy.x;
        const dy = ball.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
            enemy.x += (dx / dist) * enemy.speed * adjustedDt;
            enemy.y += (dy / dist) * enemy.speed * adjustedDt;
        }
        
        // Вращение (синхронизировано с delta time)
        enemy.angle += 0.1 * adjustedDt;
        
        // Проверка столкновения
        const collisionDist = Math.sqrt(
            Math.pow(ball.x - enemy.x, 2) + Math.pow(ball.y - enemy.y, 2)
        );
        if (collisionDist < ball.radius + enemy.radius && !activeBonuses.shield) {
            hitObstacle();
            enemies.splice(index, 1);
        }
        
        // Удаление за пределами экрана
        if (enemy.x < -50 || enemy.x > canvas.width + 50 ||
            enemy.y < -50 || enemy.y > canvas.height + 50) {
            enemies.splice(index, 1);
        }
    });
    
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
            // Комбо система
            combo++;
            lastStarTime = gameTime;
            
            // Мультипликатор растет с комбо
            if (combo > 5) comboMultiplier = 2;
            if (combo > 10) comboMultiplier = 3;
            if (combo > 20) comboMultiplier = 4;
            if (combo > 30) comboMultiplier = 5;
            
            // Очки зависят от типа звезды
            const basePoints = star.points || 10;
            const points = Math.floor(basePoints * comboMultiplier);
            score += points;
            
            // Анимация очков
            createScoreAnimation(star.x, star.y, points, comboMultiplier > 1);
            createStarParticles(star.x, star.y, star.color || '#ffd700');
            
            // Визуальный эффект при сборе специальной звезды
            if (star.type !== 'normal') {
                createWaveEffect(star.x, star.y, star.color);
                screenEffects.push({
                    color: star.color,
                    life: 8,
                    maxLife: 8,
                    alpha: 0.3
                });
            }
            
            stars.splice(index, 1);
            updateUI();
            
            // Вибрация при сборе (сильнее для специальных звезд)
            if (window.Telegram?.WebApp?.HapticFeedback) {
                if (star.type !== 'normal') {
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                } else {
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
                }
            }
        }
    });
    
    // Обновление препятствий (теперь они движутся!)
    obstacles.forEach((obstacle, index) => {
        // Движение препятствия (синхронизировано с delta time)
        obstacle.x += obstacle.vx * adjustedDt;
        obstacle.y += obstacle.vy * adjustedDt;
        obstacle.rotation += obstacle.rotationSpeed * adjustedDt;
        
        // Проверка столкновения
        const dist = Math.sqrt(
            Math.pow(ball.x - obstacle.x, 2) + Math.pow(ball.y - obstacle.y, 2)
        );
        if (dist < ball.radius + obstacle.radius && !activeBonuses.shield) {
            hitObstacle();
            obstacles.splice(index, 1);
        }
        
        // Удаление за пределами экрана
        if (obstacle.x < -100 || obstacle.x > canvas.width + 100 ||
            obstacle.y < -100 || obstacle.y > canvas.height + 100) {
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
    
    // Обновление частиц (синхронизировано с delta time)
    // Ограничение количества частиц на мобильных устройствах
    const maxParticles = window.mobileMode ? 30 : 200; // Еще меньше на мобильных
    
    if (particles.length > maxParticles) {
        // Удаляем старые частицы
        particles.splice(0, particles.length - maxParticles);
    }
    
    particles.forEach((particle, index) => {
        particle.x += particle.vx * adjustedDt;
        particle.y += particle.vy * adjustedDt;
        particle.life -= adjustedDt;
        particle.alpha = particle.life / particle.maxLife;
        if (particle.life <= 0) {
            particles.splice(index, 1);
        }
    });
    
    // Обновление анимаций очков (синхронизировано с delta time)
    scoreAnimations.forEach((anim, index) => {
        anim.y -= 2 * adjustedDt;
        anim.life -= adjustedDt;
        anim.alpha = anim.life / anim.maxLife;
        if (anim.life <= 0) {
            scoreAnimations.splice(index, 1);
        }
    });
    
    // Обновление эффектов экрана (синхронизировано с delta time)
    screenEffects.forEach((effect, index) => {
        effect.life -= adjustedDt;
        effect.alpha = effect.life / effect.maxLife;
        if (effect.life <= 0) {
            screenEffects.splice(index, 1);
        }
    });
    
    // Обновление таймеров бонусов (синхронизировано с delta time)
    Object.keys(bonusTimers).forEach(bonus => {
        if (bonusTimers[bonus] > 0) {
            bonusTimers[bonus] -= adjustedDt;
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
        // Пульсация для специальных звезд (синхронизировано с реальным временем)
        if (star.type !== 'normal') {
            const pulse = Math.sin((gameTime / 60) * 0.2) * 2; // gameTime в кадрах, делим на 60 для секунд
            drawStar(star.x, star.y, star.radius + pulse, star.color);
        } else {
            drawStar(star.x, star.y, star.radius, star.color);
        }
    });
    
    // Отрисовка препятствий
    obstacles.forEach(obstacle => {
        drawObstacle(obstacle.x, obstacle.y, obstacle.radius, obstacle.color, obstacle.rotation);
    });
    
    // Отрисовка врагов
    enemies.forEach(enemy => {
        drawEnemy(enemy.x, enemy.y, enemy.radius, enemy.angle);
    });
    
    // Отрисовка эффектов экрана
    screenEffects.forEach(effect => {
        ctx.globalAlpha = effect.alpha * 0.3;
        ctx.fillStyle = effect.color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
    });
    
    // Отрисовка бонусов
    bonuses.forEach(bonus => {
        drawBonus(bonus.x, bonus.y, bonus.radius, bonus.type);
    });
    
    // Отрисовка шарика с эффектом переворота
    if (activeBonuses.shield) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00ff00';
    } else {
        // Эффект свечения при недавнем перевороте
        if (gameTime - lastGravityFlip < 20) {
            const colors = ['#00f5ff', '#ff00ff', '#00ff00', '#ffff00'];
            ctx.shadowBlur = 25;
            ctx.shadowColor = colors[gravityDirection];
        } else {
            ctx.shadowBlur = 10;
            ctx.shadowColor = ball.color;
        }
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
    
    // Отрисовка анимаций очков
    scoreAnimations.forEach(anim => {
        ctx.globalAlpha = anim.alpha;
        ctx.fillStyle = anim.color;
        ctx.font = `bold ${anim.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(anim.text, anim.x, anim.y);
        ctx.fillText(anim.text, anim.x, anim.y);
        ctx.globalAlpha = 1;
    });
    
    // Отрисовка комбо
    if (combo > 0) {
        ctx.fillStyle = comboMultiplier > 1 ? '#ff00ff' : '#00f5ff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const comboText = `COMBO x${comboMultiplier} (${combo})`;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeText(comboText, 15, 60);
        ctx.fillText(comboText, 15, 60);
    }
    
    // Индикатор направления гравитации
    drawGravityIndicator();
}

function drawBall(x, y, radius, color) {
    // Пульсация шарика (синхронизировано с реальным временем)
    const pulse = Math.sin((gameTime / 60) * 0.3) * 2; // gameTime в кадрах, делим на 60 для секунд
    const currentRadius = radius + pulse;
    
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, currentRadius);
    gradient.addColorStop(0, '#fff');
    gradient.addColorStop(0.3, color);
    gradient.addColorStop(1, 'rgba(0, 245, 255, 0.2)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Обводка
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Внутренний блик
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(x - currentRadius * 0.3, y - currentRadius * 0.3, currentRadius * 0.4, 0, Math.PI * 2);
    ctx.fill();
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

function drawObstacle(x, y, radius, color, rotation = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(255, 0, 0, 0.3)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Шипы
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        const x1 = Math.cos(angle) * radius;
        const y1 = Math.sin(angle) * radius;
        const x2 = Math.cos(angle) * (radius + 5);
        const y2 = Math.sin(angle) * (radius + 5);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
    
    ctx.restore();
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
    // Меньше фоновых звезд на мобильных
    const starCount = window.mobileMode ? 25 : 50;
    for (let i = 0; i < starCount; i++) {
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
        radius: 12,
        color: '#ffd700',
        points: 10,
        type: 'normal'
    });
}

function createSpecialStar() {
    // Специальные звезды с большим количеством очков
    const types = [
        { color: '#ff00ff', points: 50, radius: 16, type: 'rare' },
        { color: '#00ff00', points: 30, radius: 14, type: 'good' },
        { color: '#ff6b00', points: 25, radius: 13, type: 'orange' }
    ];
    
    const starType = types[Math.floor(Math.random() * types.length)];
    const side = Math.floor(Math.random() * 4);
    let x, y;
    
    switch(side) {
        case 0:
            x = Math.random() * canvas.width;
            y = -20;
            break;
        case 1:
            x = canvas.width + 20;
            y = Math.random() * canvas.height;
            break;
        case 2:
            x = Math.random() * canvas.width;
            y = canvas.height + 20;
            break;
        case 3:
            x = -20;
            y = Math.random() * canvas.height;
            break;
    }
    
    stars.push({
        x: x,
        y: y,
        radius: starType.radius,
        color: starType.color,
        points: starType.points,
        type: starType.type
    });
}

function createObstacle() {
    const side = Math.floor(Math.random() * 4);
    let x, y, vx, vy;
    
    switch(side) {
        case 0:
            x = Math.random() * canvas.width;
            y = -30;
            vx = (Math.random() - 0.5) * 2;
            vy = 1 + Math.random() * 2;
            break;
        case 1:
            x = canvas.width + 30;
            y = Math.random() * canvas.height;
            vx = -1 - Math.random() * 2;
            vy = (Math.random() - 0.5) * 2;
            break;
        case 2:
            x = Math.random() * canvas.width;
            y = canvas.height + 30;
            vx = (Math.random() - 0.5) * 2;
            vy = -1 - Math.random() * 2;
            break;
        case 3:
            x = -30;
            y = Math.random() * canvas.height;
            vx = 1 + Math.random() * 2;
            vy = (Math.random() - 0.5) * 2;
            break;
    }
    
    obstacles.push({
        x: x,
        y: y,
        vx: vx,
        vy: vy,
        radius: 20 + Math.random() * 15,
        color: '#ff0000',
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.1
    });
}

function createEnemy() {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    
    switch(side) {
        case 0:
            x = Math.random() * canvas.width;
            y = -40;
            break;
        case 1:
            x = canvas.width + 40;
            y = Math.random() * canvas.height;
            break;
        case 2:
            x = Math.random() * canvas.width;
            y = canvas.height + 40;
            break;
        case 3:
            x = -40;
            y = Math.random() * canvas.height;
            break;
    }
    
    enemies.push({
        x: x,
        y: y,
        radius: 18,
        speed: 0.8 + Math.random() * 0.4,
        angle: 0,
        color: '#ff0066'
    });
}

function drawEnemy(x, y, radius, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    
    // Градиент
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    gradient.addColorStop(0, '#ff0066');
    gradient.addColorStop(0.5, '#ff0044');
    gradient.addColorStop(1, 'rgba(255, 0, 102, 0.3)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Глаза
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-radius * 0.3, -radius * 0.3, radius * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(radius * 0.3, -radius * 0.3, radius * 0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Рот
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, radius * 0.2, radius * 0.3, 0, Math.PI);
    ctx.stroke();
    
    // Свечение
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff0066';
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    ctx.restore();
}

function createGravityFlipEffect() {
    // Визуальный эффект при перевороте гравитации
    const colors = ['#00f5ff', '#ff00ff', '#00ff00', '#ffff00'];
    
    // На мобильных упрощаем эффекты
    if (!window.mobileMode) {
        screenEffects.push({
            color: colors[gravityDirection],
            life: 15,
            maxLife: 15,
            alpha: 1
        });
    }
    
    // Частицы переворота (намного меньше на мобильных)
    const particleCount = window.mobileMode ? 10 : 50;
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: ball.x,
            y: ball.y,
            vx: (Math.random() - 0.5) * 20,
            vy: (Math.random() - 0.5) * 20,
            size: Math.random() * 6 + 3,
            color: colors[gravityDirection],
            life: 50,
            maxLife: 50,
            alpha: 1
        });
    }
    
    // Волновой эффект от шарика (только на ПК)
    if (!window.mobileMode) {
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                createWaveEffect(ball.x, ball.y, colors[gravityDirection]);
            }, i * 5);
        }
    }
}

function createWaveEffect(x, y, color) {
    const particleCount = window.mobileMode ? 5 : 20; // Еще меньше на мобильных
    
    for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * 8,
            vy: Math.sin(angle) * 8,
            size: 4,
            color: color,
            life: 30,
            maxLife: 30,
            alpha: 1
        });
    }
}

function createRhythmEffect() {
    // Ритмичные визуальные эффекты
    const rhythmColors = ['#00f5ff', '#ff00ff', '#00ff00'];
    const color = rhythmColors[Math.floor(Math.random() * rhythmColors.length)];
    
    screenEffects.push({
        color: color,
        life: 5,
        maxLife: 5,
        alpha: 0.2
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
    
    // Обновление комбо
    const comboDisplay = document.getElementById('combo-display');
    if (combo > 0) {
        comboDisplay.classList.remove('hidden');
        document.getElementById('combo-multiplier').textContent = comboMultiplier;
        document.getElementById('combo-count').textContent = combo;
    } else {
        comboDisplay.classList.add('hidden');
    }
}

function createFlipParticles() {
    const particleCount = window.mobileMode ? 5 : 20; // Еще меньше на мобильных
    
    for (let i = 0; i < particleCount; i++) {
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

function createStarParticles(x, y, color = '#ffd700') {
    const particleCount = window.mobileMode ? 5 : 20; // Еще меньше на мобильных
    
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            size: Math.random() * 4 + 2,
            color: color,
            life: 25,
            maxLife: 25,
            alpha: 1
        });
    }
}

function createScoreAnimation(x, y, points, isCombo) {
    scoreAnimations.push({
        x: x,
        y: y,
        text: `+${points}`,
        size: isCombo ? 28 : 22,
        color: isCombo ? '#ff00ff' : '#00f5ff',
        life: 60,
        maxLife: 60,
        alpha: 1
    });
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

// Инициализация будет вызвана из index.html
// Функция init доступна глобально для вызова из HTML
window.init = init;

// Также пробуем инициализировать сразу, если DOM готов
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(init, 100);
} else {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(init, 100);
    });
}

