#!/usr/bin/env node

/**
 * Запуск импорта продуктов Siam Botanicals
 */

import('dotenv/config').then(async () => {
  try {
    const { importSiamProducts } = await import('../dist/services/siam-import-service.js');
    const { prisma } = await import('../dist/lib/prisma.js');
    
    console.log('🚀 Запуск импорта продуктов из Siam Botanicals...\n');
    
    const result = await importSiamProducts();
    
    console.log('\n📊 Результаты импорта:');
    console.log(`   Всего: ${result.total}`);
    console.log(`   Успешно: ${result.success}`);
    console.log(`   Ошибок: ${result.errors}`);
    
    if (result.success > 0) {
      console.log('\n✅ Импорт завершён успешно!');
    }
    
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Критическая ошибка импорта:', error);
    process.exit(1);
  }
});



