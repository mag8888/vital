/**
 * Скрипт для копирования изображений с аналогичных товаров
 * для товаров без фото
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Находит аналогичный товар с изображением по префиксу SKU
 */
async function findSimilarProductWithImage(sku: string): Promise<{ id: string; imageUrl: string; sku: string } | null> {
  if (!sku) return null;

  // Извлекаем префикс SKU (например, FS1002-24 -> FS1002)
  const prefix = sku.split('-')[0];
  
  // Ищем товары с таким же префиксом, но с изображением
  const similarProducts = await prisma.product.findMany({
    where: {
      isActive: true,
      sku: { startsWith: prefix },
      imageUrl: { not: null },
    },
    select: {
      id: true,
      imageUrl: true,
      sku: true,
    },
    take: 1,
  });

  if (similarProducts.length > 0) {
    return similarProducts[0];
  }

  // Если не найдено по префиксу, ищем по категории и названию
  const currentProduct = await prisma.product.findUnique({
    where: { sku },
    select: { categoryId: true, title: true },
  });

  if (!currentProduct) return null;

  // Извлекаем ключевые слова из названия
  const keywords = currentProduct.title
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3 && !word.match(/^(g|cosmos|organic|natural|certified|by|ionc|germany)$/i));

  // Ищем товары в той же категории с похожим названием
  const similarByTitle = await prisma.product.findMany({
    where: {
      isActive: true,
      categoryId: currentProduct.categoryId,
      imageUrl: { not: null },
      sku: { not: sku },
      OR: keywords.slice(0, 2).map(keyword => ({
        title: { contains: keyword, mode: 'insensitive' },
      })),
    },
    select: {
      id: true,
      imageUrl: true,
      sku: true,
      title: true,
    },
    take: 1,
  });

  if (similarByTitle.length > 0) {
    return similarByTitle[0];
  }

  return null;
}

/**
 * Основная функция
 */
async function main() {
  console.log('🚀 Начало копирования изображений с аналогичных товаров\n');
  
  // Получаем все товары без изображений
  const productsWithoutImages = await prisma.product.findMany({
    where: {
      isActive: true,
      imageUrl: null,
    },
    select: {
      id: true,
      title: true,
      sku: true,
    },
    orderBy: { sku: 'asc' },
  });

  console.log(`📦 Найдено товаров без фото: ${productsWithoutImages.length}\n`);

  if (productsWithoutImages.length === 0) {
    console.log('✅ Все товары уже имеют изображения');
    return;
  }

  let successCount = 0;
  let errorCount = 0;

  for (const product of productsWithoutImages) {
    try {
      console.log(`\n🔄 Обработка: ${product.title} (SKU: ${product.sku || 'N/A'})`);
      
      if (!product.sku) {
        console.log(`   ⚠️  Пропущен: нет SKU`);
        errorCount++;
        continue;
      }

      // Ищем аналогичный товар с изображением
      const similarProduct = await findSimilarProductWithImage(product.sku);

      if (!similarProduct) {
        console.log(`   ⚠️  Аналогичный товар не найден`);
        errorCount++;
        continue;
      }

      console.log(`   ✅ Найден аналогичный товар: ${similarProduct.sku} (${similarProduct.imageUrl?.substring(0, 50)}...)`);

      // Копируем изображение и добавляем пометку в описание
      const currentProduct = await prisma.product.findUnique({
        where: { id: product.id },
        select: { description: true },
      });

      const descriptionWithNote = currentProduct?.description 
        ? `${currentProduct.description}\n\n📷 Фото скопировано с товара ${similarProduct.sku}`
        : `📷 Фото скопировано с товара ${similarProduct.sku}`;

      // Обновляем товар
      await prisma.product.update({
        where: { id: product.id },
        data: {
          imageUrl: similarProduct.imageUrl,
          description: descriptionWithNote,
        },
      });

      console.log(`   ✅ Изображение скопировано`);
      successCount++;

    } catch (error: any) {
      errorCount++;
      console.error(`   ❌ Ошибка: ${error.message}`);
    }
  }

  console.log('\n✅ Копирование изображений завершено!');
  console.log(`   Успешно: ${successCount}`);
  console.log(`   Ошибок: ${errorCount}`);
  console.log(`   Всего: ${productsWithoutImages.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());








