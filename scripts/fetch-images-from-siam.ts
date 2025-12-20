/**
 * Скрипт для загрузки изображений товаров с сайта Siam Botanicals
 * и обновления товаров в базе данных
 * 
 * Использование:
 *   npm run fetch-siam-images
 * 
 * Или через ts-node:
 *   npx ts-node --esm scripts/fetch-images-from-siam.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { uploadImage, isCloudinaryConfigured } from '../src/services/cloudinary-service.js';

const prisma = new PrismaClient();

/**
 * Извлекает URL изображения товара со страницы Siam Botanicals
 */
async function extractImageFromProductPage(slug: string): Promise<string | null> {
  try {
    const productUrl = `https://siambotanicals.com/product/${slug}/`;
    console.log(`   📄 Загружаю страницу: ${productUrl}`);
    
    const response = await fetch(productUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      console.warn(`   ⚠️  Страница недоступна: ${response.status}`);
      return null;
    }

    const html = await response.text();
    
    // Паттерны для поиска изображения товара
    const patterns = [
      /<img[^>]*class="[^"]*wp-post-image[^"]*"[^>]*src="([^"]+)"/i,
      /<img[^>]*class="[^"]*attachment-woocommerce_single[^"]*"[^>]*src="([^"]+)"/i,
      /<img[^>]*class="[^"]*woocommerce-product-gallery__image[^"]*"[^>]*src="([^"]+)"/i,
      /<img[^>]*data-large_image="([^"]+)"/i,
      /<img[^>]*src="([^"]*\/wp-content\/uploads\/[^"]+\.(jpg|jpeg|png|webp))"[^>]*>/i,
      /<img[^>]*data-src="([^"]*\/wp-content\/uploads\/[^"]+\.(jpg|jpeg|png|webp))"[^>]*>/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        let imageUrl = match[1];
        
        // Преобразуем относительный URL в абсолютный
        if (imageUrl.startsWith('//')) {
          imageUrl = 'https:' + imageUrl;
        } else if (imageUrl.startsWith('/')) {
          imageUrl = 'https://siambotanicals.com' + imageUrl;
        }

        // Убираем параметры размера для получения оригинала
        imageUrl = imageUrl.replace(/-\d+x\d+\.(jpg|jpeg|png|webp)/i, '.$1');
        
        // Убираем параметры запроса
        imageUrl = imageUrl.split('?')[0];
        
        console.log(`   ✅ Найдено изображение: ${imageUrl}`);
        return imageUrl;
      }
    }

    console.warn(`   ⚠️  Изображение не найдено в HTML`);
    return null;
  } catch (error: any) {
    console.error(`   ❌ Ошибка при извлечении изображения: ${error.message}`);
    return null;
  }
}

/**
 * Создает slug из названия товара или SKU
 */
function createSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Загружает изображение на Cloudinary
 */
async function uploadImageToCloudinary(imageUrl: string, productId: string): Promise<string | null> {
  try {
    if (!isCloudinaryConfigured()) {
      console.warn('   ⚠️  Cloudinary не настроен, используем прямой URL');
      return imageUrl;
    }

    console.log(`   📤 Загружаю изображение на Cloudinary...`);
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());
    const uploadResult = await uploadImage(imageBuffer, {
      folder: 'plazma/products',
      publicId: `product-${productId}-${Date.now()}`,
      resourceType: 'image',
    });

    console.log(`   ✅ Изображение загружено: ${uploadResult.secureUrl}`);
    return uploadResult.secureUrl;
  } catch (error: any) {
    console.error(`   ❌ Ошибка загрузки на Cloudinary: ${error.message}`);
    return imageUrl; // Возвращаем оригинальный URL в случае ошибки
  }
}

/**
 * Обновляет изображение для товара
 */
async function updateProductImage(productId: string, imageUrl: string): Promise<void> {
  try {
    await prisma.product.update({
      where: { id: productId },
      data: { imageUrl },
    });
    console.log(`   ✅ Изображение обновлено для товара ${productId}`);
  } catch (error: any) {
    console.error(`   ❌ Ошибка обновления товара: ${error.message}`);
    throw error;
  }
}

/**
 * Основная функция
 */
async function main() {
  console.log('🚀 Начало загрузки изображений с Siam Botanicals\n');
  
  // Получаем все товары без изображений или с изображениями, которые нужно обновить
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { imageUrl: null },
        { imageUrl: { contains: 'siambotanicals.com' } }, // Обновляем старые изображения
      ],
    },
    select: {
      id: true,
      title: true,
      sku: true,
      imageUrl: true,
    },
  });

  console.log(`📦 Найдено товаров для обработки: ${products.length}\n`);

  if (products.length === 0) {
    console.log('✅ Все товары уже имеют изображения');
    return;
  }

  let successCount = 0;
  let errorCount = 0;

  for (const product of products) {
    try {
      console.log(`\n🔄 Обработка: ${product.title} (ID: ${product.id})`);
      
      // Пытаемся создать slug из SKU или названия
      let slug = '';
      if (product.sku) {
        // Убираем размер из SKU (например, FS1002-24 -> fs1002)
        slug = product.sku.split('-')[0].toLowerCase();
      } else {
        slug = createSlug(product.title);
      }

      // Извлекаем изображение со страницы товара
      const imageUrl = await extractImageFromProductPage(slug);
      
      if (!imageUrl) {
        console.log(`   ⚠️  Изображение не найдено, пропускаем`);
        errorCount++;
        continue;
      }

      // Загружаем на Cloudinary
      const finalImageUrl = await uploadImageToCloudinary(imageUrl, product.id);

      // Обновляем товар
      await updateProductImage(product.id, finalImageUrl);
      
      successCount++;
      
      // Пауза между запросами
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error: any) {
      errorCount++;
      console.error(`   ❌ Ошибка: ${error.message}`);
    }
  }

  console.log('\n✅ Загрузка изображений завершена!');
  console.log(`   Успешно: ${successCount}`);
  console.log(`   Ошибок: ${errorCount}`);
  console.log(`   Всего: ${products.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());








