/**
 * Запуск скрапинга через API endpoint админки
 * Использование: node scripts/trigger-scrape-via-api.js
 * 
 * Требуется: админка должна быть запущена и доступна
 */

import 'dotenv/config';

const ADMIN_URL = process.env.ADMIN_URL || 'http://localhost:3000';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

async function triggerScrape() {
  console.log('🚀 Запуск скрапинга через API админки...\n');
  
  try {
    // Сначала логинимся
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
    
    const cookies = loginResponse.headers.get('set-cookie');
    if (!cookies) {
      throw new Error('Не удалось авторизоваться. Проверьте ADMIN_PASSWORD.');
    }
    
    // Запускаем скрапинг
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
      console.log(`📝 ${result.message}`);
      console.log('\n💡 Проверьте логи сервера для отслеживания прогресса.');
    } else {
      console.error('❌ Ошибка запуска:', result.error || 'Неизвестная ошибка');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Ошибка:', error.message || error);
    console.error('\n💡 Убедитесь, что:');
    console.error('   1. Админка запущена и доступна');
    console.error('   2. Переменная ADMIN_PASSWORD установлена правильно');
    console.error('   3. Переменная ADMIN_URL указывает на правильный адрес');
    process.exit(1);
  }
}

triggerScrape();

