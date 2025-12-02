#!/usr/bin/env node

/**
 * Скрипт для запуска импорта всех товаров из Siam Botanicals
 * 
 * Использование:
 * npm run import-siam
 * или
 * ts-node --esm scripts/run-import-all-products.ts
 */

import 'dotenv/config';
import { importSiamProducts } from '../src/services/siam-import-service.js';

async function main() {
  console.log('🚀 Запуск импорта всех товаров из Siam Botanicals...\n');
  
  try {
    const result = await importSiamProducts();
    
    console.log('\n📊 Итоговый результат импорта:');
    console.log(`   ✅ Успешно импортировано: ${result.success}`);
    console.log(`   ❌ Ошибок: ${result.errors}`);
    console.log(`   📦 Всего товаров: ${result.total}`);
    
    if (result.success > 0) {
      console.log('\n✅ Импорт завершен успешно!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Импорт завершен, но товары не были добавлены.');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ Ошибка при импорте:', error?.message || error);
    process.exit(1);
  }
}

main();







