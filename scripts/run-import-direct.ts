#!/usr/bin/env node

/**
 * Прямой запуск импорта продуктов Siam Botanicals
 * Запустите этот скрипт для немедленного импорта
 */

import 'dotenv/config';

async function runImport() {
  try {
    console.log('🚀 Запуск импорта продуктов из Siam Botanicals...\n');
    
    const { importSiamProducts } = await import('../dist/services/siam-import-service.js');
    const { prisma } = await import('../dist/lib/prisma.js');
    
    const result = await importSiamProducts();
    
    console.log('\n📊 Результаты импорта:');
    console.log(`   Всего продуктов: ${result.total}`);
    console.log(`   ✅ Успешно импортировано: ${result.success}`);
    console.log(`   ❌ Ошибок: ${result.errors}`);
    
    if (result.success > 0) {
      console.log('\n✅ Импорт завершён успешно!');
      console.log('🎉 Продукты теперь доступны в каталоге!');
    }
    
    await prisma.$disconnect();
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Критическая ошибка импорта:', error);
    console.error('Детали:', error.message);
    process.exit(1);
  }
}

runImport();



















