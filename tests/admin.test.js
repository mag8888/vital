/**
 * Автотесты для админ-панели
 * Запуск: node tests/admin.test.js
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';

// Конфигурация
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Утилиты для HTTP запросов
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...options.headers,
        ...(options.cookies ? { 'Cookie': options.cookies } : {}),
      },
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          cookies: res.headers['set-cookie'] || [],
        });
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Извлечение cookies из ответа
function extractCookies(response) {
  const cookies = [];
  if (response.cookies) {
    response.cookies.forEach(cookie => {
      const [nameValue] = cookie.split(';');
      cookies.push(nameValue);
    });
  }
  return cookies.join('; ');
}

// Тесты
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log(`${colors.cyan}╔═══════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║${colors.reset}  ${colors.blue}Запуск автотестов для админ-панели${colors.reset}                    ${colors.cyan}║${colors.reset}`);
    console.log(`${colors.cyan}╚═══════════════════════════════════════════════════════════╝${colors.reset}\n`);

    for (const test of this.tests) {
      try {
        process.stdout.write(`${colors.yellow}▶${colors.reset} ${test.name}... `);
        await test.fn();
        console.log(`${colors.green}✓ ПРОЙДЕН${colors.reset}`);
        this.passed++;
      } catch (error) {
        console.log(`${colors.red}✗ ПРОВАЛЕН${colors.reset}`);
        console.log(`  ${colors.red}Ошибка:${colors.reset} ${error.message}`);
        if (error.stack) {
          console.log(`  ${error.stack.split('\n')[1]}`);
        }
        this.failed++;
      }
    }

    console.log(`\n${colors.cyan}╔═══════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║${colors.reset}  ${colors.blue}Результаты тестирования${colors.reset}                              ${colors.cyan}║${colors.reset}`);
    console.log(`${colors.cyan}╚═══════════════════════════════════════════════════════════════╝${colors.reset}`);
    console.log(`${colors.green}✓ Пройдено:${colors.reset} ${this.passed}`);
    console.log(`${colors.red}✗ Провалено:${colors.reset} ${this.failed}`);
    console.log(`${colors.cyan}Всего тестов:${colors.reset} ${this.tests.length}`);
    
    const successRate = ((this.passed / this.tests.length) * 100).toFixed(1);
    console.log(`\n${colors.cyan}Успешность:${colors.reset} ${successRate}%`);
    
    if (this.failed === 0) {
      console.log(`\n${colors.green}🎉 Все тесты пройдены успешно!${colors.reset}`);
    } else {
      console.log(`\n${colors.red}⚠️  Есть проваленные тесты${colors.reset}`);
      process.exit(1);
    }
  }
}

const runner = new TestRunner();
let adminCookies = '';

// Тест 1: Проверка доступности страницы логина
runner.test('Страница логина доступна', async () => {
  const response = await makeRequest(`${BASE_URL}/admin/login`);
  if (response.statusCode !== 200) {
    throw new Error(`Ожидался статус 200, получен ${response.statusCode}`);
  }
  if (!response.body.includes('Vital Bot Admin Panel')) {
    throw new Error('Страница логина не содержит ожидаемый контент');
  }
});

// Тест 2: Неверный пароль отклоняется
runner.test('Неверный пароль отклоняется', async () => {
  const response = await makeRequest(`${BASE_URL}/admin/login`, {
    method: 'POST',
    body: 'password=wrongpassword',
  });
  if (response.statusCode !== 302 || !response.headers.location?.includes('/admin/login?error')) {
    throw new Error('Неверный пароль должен приводить к редиректу с ошибкой');
  }
});

// Тест 3: Правильный пароль принимается
runner.test('Правильный пароль принимается', async () => {
  const response = await makeRequest(`${BASE_URL}/admin/login`, {
    method: 'POST',
    body: `password=${ADMIN_PASSWORD}`,
  });
  if (response.statusCode !== 302 || !response.headers.location?.includes('/admin')) {
    throw new Error('Правильный пароль должен приводить к редиректу на /admin');
  }
  adminCookies = extractCookies(response);
  if (!adminCookies) {
    throw new Error('Сессионные cookies не установлены');
  }
});

// Тест 4: Доступ к главной странице админки без авторизации
runner.test('Доступ к админке без авторизации блокируется', async () => {
  const response = await makeRequest(`${BASE_URL}/admin`);
  if (response.statusCode !== 302 || !response.headers.location?.includes('/admin/login')) {
    throw new Error('Неавторизованный доступ должен блокироваться');
  }
});

// Тест 5: Доступ к главной странице админки с авторизацией
runner.test('Доступ к админке с авторизацией разрешен', async () => {
  if (!adminCookies) {
    // Повторная авторизация если cookies потеряны
    const loginResponse = await makeRequest(`${BASE_URL}/admin/login`, {
      method: 'POST',
      body: `password=${ADMIN_PASSWORD}`,
    });
    adminCookies = extractCookies(loginResponse);
  }
  
  const response = await makeRequest(`${BASE_URL}/admin`, {
    cookies: adminCookies,
  });
  if (response.statusCode !== 200) {
    throw new Error(`Ожидался статус 200, получен ${response.statusCode}`);
  }
  if (!response.body.includes('Vital Bot Admin Panel') && !response.body.includes('Управление')) {
    throw new Error('Страница админки не содержит ожидаемый контент');
  }
});

// Тест 6: Доступ к странице товаров
runner.test('Страница товаров доступна', async () => {
  if (!adminCookies) {
    const loginResponse = await makeRequest(`${BASE_URL}/admin/login`, {
      method: 'POST',
      body: `password=${ADMIN_PASSWORD}`,
    });
    adminCookies = extractCookies(loginResponse);
  }
  
  const response = await makeRequest(`${BASE_URL}/admin/products`, {
    cookies: adminCookies,
  });
  if (response.statusCode !== 200) {
    throw new Error(`Ожидался статус 200, получен ${response.statusCode}`);
  }
  if (!response.body.includes('Управление товарами') && !response.body.includes('product')) {
    throw new Error('Страница товаров не содержит ожидаемый контент');
  }
});

// Тест 7: Проверка наличия кнопок редактирования на странице товаров
runner.test('На странице товаров есть кнопки редактирования', async () => {
  if (!adminCookies) {
    const loginResponse = await makeRequest(`${BASE_URL}/admin/login`, {
      method: 'POST',
      body: `password=${ADMIN_PASSWORD}`,
    });
    adminCookies = extractCookies(loginResponse);
  }
  
  const response = await makeRequest(`${BASE_URL}/admin/products`, {
    cookies: adminCookies,
  });
  if (response.statusCode !== 200) {
    throw new Error(`Ожидался статус 200, получен ${response.statusCode}`);
  }
  // Проверяем наличие кнопок редактирования или класса edit-btn
  if (!response.body.includes('edit-btn') && !response.body.includes('Редактировать') && !response.body.includes('editProduct')) {
    throw new Error('На странице товаров не найдены кнопки редактирования');
  }
});

// Тест 8: Проверка наличия JavaScript функций для редактирования
runner.test('JavaScript функции редактирования определены', async () => {
  if (!adminCookies) {
    const loginResponse = await makeRequest(`${BASE_URL}/admin/login`, {
      method: 'POST',
      body: `password=${ADMIN_PASSWORD}`,
    });
    adminCookies = extractCookies(loginResponse);
  }
  
  const response = await makeRequest(`${BASE_URL}/admin/products`, {
    cookies: adminCookies,
  });
  if (response.statusCode !== 200) {
    throw new Error(`Ожидался статус 200, получен ${response.statusCode}`);
  }
  // Проверяем наличие функции window.editProduct
  if (!response.body.includes('window.editProduct') && !response.body.includes('editProduct')) {
    throw new Error('JavaScript функция editProduct не найдена на странице');
  }
});

// Тест 9: Проверка наличия модального окна в HTML
runner.test('Модальное окно редактирования присутствует в коде', async () => {
  if (!adminCookies) {
    const loginResponse = await makeRequest(`${BASE_URL}/admin/login`, {
      method: 'POST',
      body: `password=${ADMIN_PASSWORD}`,
    });
    adminCookies = extractCookies(loginResponse);
  }
  
  const response = await makeRequest(`${BASE_URL}/admin/products`, {
    cookies: adminCookies,
  });
  if (response.statusCode !== 200) {
    throw new Error(`Ожидался статус 200, получен ${response.statusCode}`);
  }
  // Проверяем наличие модального окна или его создания в JS
  if (!response.body.includes('editProductModal') && !response.body.includes('modal-overlay')) {
    throw new Error('Модальное окно редактирования не найдено в коде');
  }
});

// Тест 10: Проверка обработчика событий для кнопок
runner.test('Обработчик событий для кнопок редактирования настроен', async () => {
  if (!adminCookies) {
    const loginResponse = await makeRequest(`${BASE_URL}/admin/login`, {
      method: 'POST',
      body: `password=${ADMIN_PASSWORD}`,
    });
    adminCookies = extractCookies(loginResponse);
  }
  
  const response = await makeRequest(`${BASE_URL}/admin/products`, {
    cookies: adminCookies,
  });
  if (response.statusCode !== 200) {
    throw new Error(`Ожидался статус 200, получен ${response.statusCode}`);
  }
  // Проверяем наличие event delegation или обработчиков
  const hasEventDelegation = response.body.includes('addEventListener') || 
                             response.body.includes('event delegation') ||
                             response.body.includes('closest') ||
                             response.body.includes('onclick');
  if (!hasEventDelegation) {
    throw new Error('Обработчики событий для кнопок не найдены');
  }
});

// Тест 11: Доступ к странице product2
runner.test('Страница product2 доступна', async () => {
  if (!adminCookies) {
    const loginResponse = await makeRequest(`${BASE_URL}/admin/login`, {
      method: 'POST',
      body: `password=${ADMIN_PASSWORD}`,
    });
    adminCookies = extractCookies(loginResponse);
  }
  
  const response = await makeRequest(`${BASE_URL}/admin/product2`, {
    cookies: adminCookies,
  });
  if (response.statusCode !== 200) {
    throw new Error(`Ожидался статус 200, получен ${response.statusCode}`);
  }
});

// Тест 12: Проверка API категорий
runner.test('API категорий доступно', async () => {
  if (!adminCookies) {
    const loginResponse = await makeRequest(`${BASE_URL}/admin/login`, {
      method: 'POST',
      body: `password=${ADMIN_PASSWORD}`,
    });
    adminCookies = extractCookies(loginResponse);
  }
  
  const response = await makeRequest(`${BASE_URL}/admin/api/categories`, {
    cookies: adminCookies,
  });
  if (response.statusCode !== 200) {
    throw new Error(`Ожидался статус 200, получен ${response.statusCode}`);
  }
  // Проверяем что это JSON
  try {
    JSON.parse(response.body);
  } catch (e) {
    throw new Error('API категорий не возвращает валидный JSON');
  }
});

// Запуск тестов
// В ES modules проверяем через import.meta.url
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('admin.test.js')) {
  runner.run().catch(error => {
    console.error(`${colors.red}Критическая ошибка:${colors.reset}`, error);
    process.exit(1);
  });
}

export { TestRunner, makeRequest };
