/**
 * Прямой запуск скрапинга всех изображений
 * Использование: node scripts/run-scrape-now.js
 */

import 'dotenv/config';
import { scrapeAllMissingImages } from '../dist/services/scrape-images-service.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Запуск скрапинга всех изображений товаров\n');
  console.log('📝 Этот процесс может занять некоторое время...\n');
  
  try {
    const result = await scrapeAllMissingImages();
    
    console.log(`\n\n✅ Сбор фотографий завершен!`);
    console.log(`   ✅ Обновлено: ${result.updated}`);
    console.log(`   ⏭️  Пропущено: ${result.skipped}`);
    console.log(`   ❌ Не удалось: ${result.failed}`);
    console.log(`   🔍 Не найдено в БД: ${result.notFound}`);
    console.log(`   📦 Всего обработано: ${result.total}`);
    
    if (result.updated > 0) {
      console.log('\n🎉 Изображения успешно обновлены!');
    }
    
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Критическая ошибка:', error);
    console.error('Детали:', error?.message || error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();






