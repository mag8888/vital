/**
 * Скрипт для:
 * 1. Копирования изображений с аналогичных товаров для товаров без фото
 * 2. Распределения товаров по подкатегориям в категории "Косметика"
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Находит аналогичный товар с изображением
 */
async function findSimilarProductWithImage(sku: string, productId: string, categoryId: string): Promise<{ id: string; imageUrl: string; sku: string } | null> {
  if (!sku) return null;

  // Извлекаем префикс SKU (например, FS1002-24 -> FS1002)
  const prefix = sku.split('-')[0];
  
  // Ищем товары с таким же префиксом, но с изображением
  const similarProducts = await prisma.product.findMany({
    where: {
      isActive: true,
      sku: { startsWith: prefix },
      imageUrl: { not: null },
      id: { not: productId }, // Исключаем сам товар
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

  // Если не найдено по префиксу, ищем в той же категории
  if (categoryId) {
    const similarInCategory = await prisma.product.findMany({
      where: {
        isActive: true,
        categoryId: categoryId,
        imageUrl: { not: null },
        id: { not: productId },
      },
      select: {
        id: true,
        imageUrl: true,
        sku: true,
      },
      take: 1,
    });

    if (similarInCategory.length > 0) {
      return similarInCategory[0];
    }
  }

  // Если не найдено, ищем любой товар с изображением в категории "Косметика"
  const cosmeticsCategory = await prisma.category.findFirst({
    where: { name: 'Косметика' },
  });

  if (cosmeticsCategory) {
    const anyProductWithImage = await prisma.product.findFirst({
      where: {
        isActive: true,
        imageUrl: { not: null },
        id: { not: productId },
        OR: [
          { categoryId: cosmeticsCategory.id },
          { category: { name: { contains: 'Косметика' } } },
        ],
      },
      select: {
        id: true,
        imageUrl: true,
        sku: true,
      },
    });

    if (anyProductWithImage) {
      return anyProductWithImage;
    }
  }

  // В крайнем случае, берем любой товар с изображением
  const anyProduct = await prisma.product.findFirst({
    where: {
      isActive: true,
      imageUrl: { not: null },
      id: { not: productId },
    },
    select: {
      id: true,
      imageUrl: true,
      sku: true,
    },
  });

  return anyProduct;
}

/**
 * Определяет подкатегорию для товара на основе SKU и названия
 */
function determineSubcategory(sku: string, title: string): string {
  const titleLower = title.toLowerCase();
  const skuUpper = sku.toUpperCase();

  // Face Care
  if (skuUpper.startsWith('FS') || skuUpper.startsWith('FO') || skuUpper.startsWith('FC') || 
      skuUpper.startsWith('FB') || skuUpper.startsWith('FM') || skuUpper.startsWith('FWH') ||
      skuUpper.startsWith('FDH') || skuUpper.startsWith('FOH') ||
      titleLower.includes('face') || titleLower.includes('лицо') ||
      titleLower.includes('serum') || titleLower.includes('cleanser') || 
      titleLower.includes('tonic') || titleLower.includes('balm') ||
      titleLower.includes('polish') || titleLower.includes('powder')) {
    return 'Face Care';
  }

  // Hair Care
  if (skuUpper.startsWith('HT') || skuUpper.startsWith('SH') ||
      titleLower.includes('hair') || titleLower.includes('волос') ||
      titleLower.includes('shampoo') || titleLower.includes('conditioner')) {
    return 'Hair Care';
  }

  // Pure Organic Oils
  if (skuUpper.startsWith('SI') ||
      titleLower.includes('oil') || titleLower.includes('масло') ||
      titleLower.includes('argan') || titleLower.includes('jojoba') ||
      titleLower.includes('rosehip') || titleLower.includes('almond')) {
    return 'Pure Organic Oils';
  }

  // Bath & Spa (по умолчанию для остальных)
  return 'Bath & Spa';
}

/**
 * Основная функция
 */
async function main() {
  console.log('🚀 Начало обработки товаров\n');
  
  // Находим категорию "Косметика"
  const cosmeticsCategory = await prisma.category.findFirst({
    where: {
      name: 'Косметика',
    },
  });

  if (!cosmeticsCategory) {
    console.log('❌ Категория "Косметика" не найдена');
    return;
  }

  console.log(`✅ Найдена категория "Косметика" (ID: ${cosmeticsCategory.id})\n`);

  // Находим или создаем подкатегории
  const subcategories = ['Face Care', 'Hair Care', 'Pure Organic Oils', 'Bath & Spa'];
  const subcategoryMap: Record<string, string> = {};

  for (const subcatName of subcategories) {
    const subcatSlug = `${cosmeticsCategory.slug}-${subcatName.toLowerCase().replace(/\s+/g, '-')}`;
    let subcategory = await prisma.category.findUnique({
      where: { slug: subcatSlug },
    });

    if (!subcategory) {
      subcategory = await prisma.category.create({
        data: {
          name: `Косметика > ${subcatName}`,
          slug: subcatSlug,
          description: `Подкатегория ${subcatName} в категории Косметика`,
          isActive: true,
        },
      });
      console.log(`✅ Создана подкатегория: ${subcategory.name}`);
    } else {
      console.log(`✅ Найдена подкатегория: ${subcategory.name}`);
    }

    subcategoryMap[subcatName] = subcategory.id;
  }

  // Получаем все товары
  const allProducts = await prisma.product.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      title: true,
      sku: true,
      imageUrl: true,
      description: true,
      categoryId: true,
    },
    orderBy: { sku: 'asc' },
  });

  console.log(`\n📦 Найдено товаров: ${allProducts.length}\n`);

  let imagesCopied = 0;
  let categoriesUpdated = 0;

  for (const product of allProducts) {
    try {
      // 1. Копируем изображение, если его нет
      if (!product.imageUrl) {
        console.log(`\n🔄 Обработка: ${product.title} (SKU: ${product.sku || 'N/A'})`);
        
        if (product.sku) {
          const similarProduct = await findSimilarProductWithImage(product.sku, product.id, product.categoryId || '');

          if (similarProduct) {
            console.log(`   ✅ Найден аналогичный товар: ${similarProduct.sku}`);

            const currentDescription = product.description || '';
            const descriptionWithNote = currentDescription 
              ? `${currentDescription}\n\n📷 Фото скопировано с товара ${similarProduct.sku}`
              : `📷 Фото скопировано с товара ${similarProduct.sku}`;

            await prisma.product.update({
              where: { id: product.id },
              data: {
                imageUrl: similarProduct.imageUrl,
                description: descriptionWithNote,
              },
            });

            console.log(`   ✅ Изображение скопировано`);
            imagesCopied++;
          } else {
            console.log(`   ⚠️  Аналогичный товар не найден`);
          }
        }
      }

      // 2. Распределяем по подкатегориям
      if (product.sku) {
        const subcategoryName = determineSubcategory(product.sku, product.title);
        const targetCategoryId = subcategoryMap[subcategoryName];

        if (targetCategoryId && product.categoryId !== targetCategoryId) {
          await prisma.product.update({
            where: { id: product.id },
            data: {
              categoryId: targetCategoryId,
            },
          });

          console.log(`   📁 Перемещен в подкатегорию: ${subcategoryName}`);
          categoriesUpdated++;
        }
      }

    } catch (error: any) {
      console.error(`   ❌ Ошибка: ${error.message}`);
    }
  }

  console.log('\n✅ Обработка завершена!');
  console.log(`   Скопировано изображений: ${imagesCopied}`);
  console.log(`   Обновлено категорий: ${categoriesUpdated}`);
  console.log(`   Всего товаров: ${allProducts.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

