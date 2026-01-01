// Простой скрипт для автоматической загрузки на GitHub
// Использование: node auto-push-simple.js

const { exec } = require('child_process');

console.log('====================================');
console.log('Загрузка изменений на GitHub');
console.log('====================================');
console.log('');

exec('git add .', (error, stdout, stderr) => {
    if (error) {
        console.error('Ошибка при добавлении файлов:', error.message);
        return;
    }

    const commitMsg = `Auto update: ${new Date().toLocaleString()}`;
    
    exec(`git commit -m "${commitMsg}"`, (error, stdout, stderr) => {
        if (error) {
            if (error.message.includes('nothing to commit')) {
                console.log('Нет изменений для коммита');
                return;
            }
            console.error('Ошибка при коммите:', error.message);
            return;
        }

        console.log('Коммит создан:', commitMsg);

        exec('git push origin main', (error, stdout, stderr) => {
            if (error) {
                console.error('Ошибка при загрузке на GitHub:', error.message);
                console.log('\nПроверьте:');
                console.log('1. Настроен ли remote: git remote -v');
                console.log('2. Есть ли доступ к репозиторию');
                console.log('3. Правильный ли branch (main)');
                return;
            }

            console.log('');
            console.log('====================================');
            console.log('УСПЕШНО! Изменения загружены на GitHub');
            console.log('====================================');
            console.log('GitHub Pages обновится автоматически через 1-2 минуты');
            console.log('');
        });
    });
});

