/**
 * Запуск импорта продуктов Siam Botanicals
 * Скрипт для немедленного запуска импорта
 */

import { importSiamProducts } from '../src/services/siam-import-service.js';
import { prisma } from '../src/lib/prisma.js';

async function runImport() {
  try {
    console.log('🚀 Запуск импорта продуктов из Siam Botanicals...\n');
    
    const result = await importSiamProducts();
    
    console.log('\n📊 Результаты импорта:');
    console.log(`   Всего: ${result.total}`);
    console.log(`   Успешно: ${result.success}`);
    console.log(`   Ошибок: ${result.errors}`);
    
    if (result.success > 0) {
      console.log('\n✅ Импорт завершён успешно!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Критическая ошибка импорта:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runImport();











