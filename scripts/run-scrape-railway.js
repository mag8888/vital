/**
 * Запуск скрапинга изображений через админку Railway
 * Использование: node scripts/run-scrape-railway.js
 */

import 'dotenv/config';

const ADMIN_URL = 'https://vital-production-82b0.up.railway.app';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

console.log('🚀 Запуск скрапинга изображений через админку Railway...\n');
console.log(`📡 URL: ${ADMIN_URL}\n`);

async function runScrape() {
  try {
    // Шаг 1: Авторизуемся в админке
    console.log('🔐 Авторизация в админке...');
    
    const loginResponse = await fetch(`${ADMIN_URL}/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        password: ADMIN_PASSWORD
      }),
      redirect: 'manual'
    });
    
    // Получаем cookies из ответа
    const cookies = loginResponse.headers.get('set-cookie');
    
    if (!cookies) {
      console.error('❌ Не удалось авторизоваться. Проверьте ADMIN_PASSWORD в .env');
      process.exit(1);
    }
    
    console.log('✅ Авторизация успешна!\n');
    
    // Шаг 2: Запускаем скрапинг
    console.log('🚀 Запуск скрапинга изображений...');
    
    const scrapeResponse = await fetch(`${ADMIN_URL}/admin/api/scrape-all-images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      }
    });
    
    const result = await scrapeResponse.json();
    
    if (result.success) {
      console.log('✅ Скрапинг запущен успешно!');
      console.log(`📝 ${result.message}\n`);
      console.log('💡 Проверьте логи Railway для отслеживания прогресса.');
      console.log('   Скрипт работает в фоновом режиме.');
      console.log('   Это может занять 10-20 минут для всех товаров.\n');
      console.log('📊 После завершения проверьте результаты через:');
      console.log('   railway run npm run verify-images');
    } else {
      console.error('❌ Ошибка запуска:', result.error || 'Неизвестная ошибка');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message || error);
    console.error('\n💡 Убедитесь, что:');
    console.error('   1. Сервер доступен по адресу:', ADMIN_URL);
    console.error('   2. Переменная ADMIN_PASSWORD установлена в .env');
    console.error('   3. Сетевое подключение работает');
    process.exit(1);
  }
}

runScrape();





