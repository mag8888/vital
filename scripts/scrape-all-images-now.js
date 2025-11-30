/**
 * JavaScript wrapper для скрипта скрапинга всех изображений
 * Запуск: npm run scrape-all-images-now
 * Или: node scripts/scrape-all-images-now.js (после компиляции)
 */

import 'dotenv/config';

async function main() {
  console.log('🚀 Запуск скрипта переноса всех фотографий товаров\n');
  
  try {
    // Импортируем из скомпилированного кода
    const { scrapeAllMissingImages } = await import('../dist/services/scrape-images-service.js');
    const { PrismaClient } = await import('@prisma/client');
    
    const result = await scrapeAllMissingImages();
    
    console.log(`\n\n✅ Сбор фотографий завершен!`);
    console.log(`   ✅ Обновлено: ${result.updated}`);
    console.log(`   ⏭️  Пропущено: ${result.skipped}`);
    console.log(`   ❌ Не удалось: ${result.failed}`);
    console.log(`   🔍 Не найдено в БД: ${result.notFound}`);
    console.log(`   📦 Всего обработано: ${result.total}`);
    
    const prisma = new PrismaClient();
    await prisma.$disconnect();
    
    if (result.updated > 0) {
      console.log('\n🎉 Изображения успешно обновлены!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Не удалось обновить изображения.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Критическая ошибка:', error);
    console.error('Детали:', error?.message || error);
    console.error('\n💡 Убедитесь, что проект скомпилирован: npm run build');
    process.exit(1);
  }
}

main();

