#!/usr/bin/env node

/**
 * Скрипт для обновления изображений всех товаров
 * Загружает изображения из Siam Botanicals и сохраняет их в Cloudinary
 * 
 * Использование:
 * npm run update-images
 * или
 * ts-node --esm scripts/update-product-images.ts
 */

import 'dotenv/config';
import { updateProductImages } from '../src/services/siam-import-service.js';

async function main() {
  try {
    console.log('🚀 Запуск обновления изображений товаров...\n');
    
    const result = await updateProductImages();
    
    console.log('\n✅ Обновление завершено!');
    console.log(`📊 Результаты:`);
    console.log(`   - Обновлено: ${result.updated}`);
    console.log(`   - Ошибок: ${result.failed}`);
    console.log(`   - Всего товаров: ${result.total}`);
    
    // Закрываем соединение с базой данных
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.$disconnect();
    
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Ошибка при обновлении изображений:');
    console.error(error?.message || error);
    console.error(error?.stack);
    
    // Закрываем соединение с базой данных в случае ошибки
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      await prisma.$disconnect();
    } catch {}
    
    process.exit(1);
  }
}

main();

