/**
 * Тестовый скрипт для проверки работы endpoint скрапинга
 */

import 'dotenv/config';

const ADMIN_URL = process.env.WEBAPP_URL || process.env.ADMIN_URL || 'http://localhost:3000';
const ENDPOINT = `${ADMIN_URL}/admin/api/scrape-all-images`;

console.log('🧪 Тестирование endpoint скрапинга изображений...\n');
console.log(`📡 URL: ${ENDPOINT}\n`);

async function testEndpoint() {
  try {
    // Пробуем отправить запрос
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const data = await response.json();
    
    console.log(`✅ Статус: ${response.status}`);
    console.log(`📝 Ответ:`, data);
    
    if (response.status === 401) {
      console.log('\n⚠️  Требуется авторизация. Endpoint работает, но нужны права админа.');
      console.log('💡 Запустите скрапинг через интерфейс админки или авторизуйтесь.');
    } else if (response.status === 200) {
      console.log('\n✅ Endpoint доступен и готов к работе!');
      console.log('🚀 Скрапинг запущен в фоновом режиме.');
    }
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.log('\n💡 Возможно, сервер не запущен или URL неверный.');
    console.log(`   Проверьте, что сервер доступен по адресу: ${ADMIN_URL}`);
  }
}

testEndpoint();





