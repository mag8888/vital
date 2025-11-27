#!/usr/bin/env node

/**
 * Скрипт для обновления изображений товаров
 * Использует функцию напрямую из сервиса
 */

import 'dotenv/config';

// Используем скомпилированную версию
import { updateProductImages } from '../dist/services/siam-import-service.js';

async function main() {
  try {
    console.log('🚀 Запуск обновления изображений товаров...\n');
    
    const result = await updateProductImages();
    
    console.log('\n✅ Обновление завершено!');
    console.log(`📊 Результаты:`);
    console.log(`   - Обновлено: ${result.updated}`);
    console.log(`   - Ошибок: ${result.failed}`);
    console.log(`   - Всего товаров: ${result.total}`);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Ошибка при обновлении изображений:');
    console.error(error?.message || error);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();

