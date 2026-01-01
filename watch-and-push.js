// Автоматическое отслеживание изменений и загрузка на GitHub
// Требует: npm install chokidar

const { exec } = require('child_process');
const chokidar = require('chokidar');
const path = require('path');

// Файлы для отслеживания
const watchFiles = [
    '*.html',
    '*.css',
    '*.js',
    '*.md'
];

// Игнорируемые файлы
const ignoredFiles = [
    'node_modules/**',
    '.git/**',
    '*.log'
];

console.log('====================================');
console.log('Автоматическое отслеживание изменений');
console.log('====================================');
console.log('Отслеживаемые файлы:', watchFiles.join(', '));
console.log('Нажмите Ctrl+C для остановки');
console.log('');

let isPushing = false;
let changeTimeout = null;

// Функция для загрузки на GitHub
function pushToGitHub() {
    if (isPushing) {
        console.log('Загрузка уже выполняется, пропускаем...');
        return;
    }

    isPushing = true;
    console.log('\n[', new Date().toLocaleTimeString(), '] Обнаружены изменения, загружаю на GitHub...');

    exec('git add .', (error, stdout, stderr) => {
        if (error) {
            console.error('Ошибка при добавлении файлов:', error);
            isPushing = false;
            return;
        }

        const commitMsg = `Auto update: ${new Date().toLocaleString()}`;
        
        exec(`git commit -m "${commitMsg}"`, (error, stdout, stderr) => {
            if (error) {
                // Возможно, нет изменений для коммита
                if (error.message.includes('nothing to commit')) {
                    console.log('Нет изменений для коммита');
                    isPushing = false;
                    return;
                }
                console.error('Ошибка при коммите:', error);
                isPushing = false;
                return;
            }

            exec('git push origin main', (error, stdout, stderr) => {
                if (error) {
                    console.error('Ошибка при загрузке на GitHub:', error);
                    isPushing = false;
                    return;
                }

                console.log('✓ Успешно загружено на GitHub!');
                console.log('GitHub Pages обновится автоматически через 1-2 минуты\n');
                isPushing = false;
            });
        });
    });
}

// Настройка отслеживания файлов
const watcher = chokidar.watch(watchFiles, {
    ignored: ignoredFiles,
    persistent: true,
    ignoreInitial: true
});

watcher
    .on('change', (filePath) => {
        console.log('[', new Date().toLocaleTimeString(), '] Изменен файл:', filePath);
        
        // Задержка перед загрузкой (чтобы не загружать при каждом сохранении)
        if (changeTimeout) {
            clearTimeout(changeTimeout);
        }
        
        changeTimeout = setTimeout(() => {
            pushToGitHub();
        }, 2000); // Ждем 2 секунды после последнего изменения
    })
    .on('add', (filePath) => {
        console.log('[', new Date().toLocaleTimeString(), '] Добавлен файл:', filePath);
        
        if (changeTimeout) {
            clearTimeout(changeTimeout);
        }
        
        changeTimeout = setTimeout(() => {
            pushToGitHub();
        }, 2000);
    })
    .on('error', (error) => {
        console.error('Ошибка отслеживания:', error);
    });

console.log('Отслеживание запущено. Ожидание изменений...\n');

