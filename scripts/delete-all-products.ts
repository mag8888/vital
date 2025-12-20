/**
 * Скрипт для удаления всех товаров из базы данных
 * 
 * Использование:
 *   npm run delete-all-products
 * 
 * Или через ts-node:
 *   npx ts-node --esm scripts/delete-all-products.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Начало удаления всех товаров\n');
  
  try {
    // Подсчитываем количество товаров
    const count = await prisma.product.count();
    console.log(`📦 Найдено товаров: ${count}\n`);
    
    if (count === 0) {
      console.log('✅ Товаров нет, удалять нечего');
      return;
    }
    
    // Удаляем все товары
    const result = await prisma.product.deleteMany({});
    
    console.log(`✅ Удалено товаров: ${result.count}`);
    console.log(`\n🎯 База данных очищена. Готово к импорту новых товаров.`);
  } catch (error: any) {
    console.error('❌ Ошибка при удалении товаров:', error);
    throw error;
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());








