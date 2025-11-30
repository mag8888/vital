/**
 * Скрипт для сбора всех недостающих фотографий продуктов
 * с сайта Siam Botanicals (https://siambotanicals.com/shop/)
 */

import { PrismaClient } from '@prisma/client';
import { uploadImage, isCloudinaryConfigured } from '../src/services/cloudinary-service.js';
import 'dotenv/config';

const prisma = new PrismaClient();

interface ProductFromSite {
  title: string;
  slug: string;
  imageUrl: string | null;
  productUrl: string;
}

/**
 * Парсит страницу магазина и извлекает информацию о продуктах
 */
async function scrapeShopPage(page: number = 1): Promise<{
  products: ProductFromSite[];
  hasNextPage: boolean;
}> {
  const url = `https://siambotanicals.com/shop/${page > 1 ? `page/${page}/` : ''}`;
  
  try {
    console.log(`\n📄 Парсинг страницы ${page}: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const products: ProductFromSite[] = [];
    
    // Парсим HTML для поиска продуктов
    // WooCommerce обычно использует структуру с классом .product
    const productPattern = /<li[^>]*class="[^"]*product[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
    const productMatches = [...html.matchAll(productPattern)];
    
    // Также ищем в структуре типа <article class="product">
    const articlePattern = /<article[^>]*class="[^"]*product[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
    const articleMatches = [...html.matchAll(articlePattern)];
    
    const allMatches = [...productMatches, ...articleMatches];
    
    for (const match of allMatches) {
      const productHtml = match[1];
      
      // Извлекаем ссылку на продукт
      const linkMatch = productHtml.match(/<a[^>]*href="([^"]*\/product\/[^"]+)"[^>]*>/i);
      if (!linkMatch) continue;
      
      const productUrl = linkMatch[1];
      if (!productUrl.includes('/product/')) continue;
      
      // Извлекаем slug из URL
      const slugMatch = productUrl.match(/\/product\/([^\/]+)\/?/);
      const slug = slugMatch ? slugMatch[1] : null;
      if (!slug) continue;
      
      // Извлекаем название
      const titleMatch = productHtml.match(/<h2[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i) ||
                        productHtml.match(/<h3[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i) ||
                        productHtml.match(/<a[^>]*class="[^"]*woocommerce-LoopProduct-link[^"]*"[^>]*>[\s\S]*?<h2[^>]*>([\s\S]*?)<\/h2>/i);
      
      let title = '';
      if (titleMatch) {
        title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
      }
      
      // Извлекаем изображение
      const imageMatch = productHtml.match(/<img[^>]*src="([^"]+)"[^>]*class="[^"]*(?:attachment-woocommerce_thumbnail|wp-post-image)[^"]*"/i) ||
                        productHtml.match(/<img[^>]*class="[^"]*(?:attachment-woocommerce_thumbnail|wp-post-image)[^"]*"[^>]*src="([^"]+)"/i) ||
                        productHtml.match(/<img[^>]*data-src="([^"]+)"[^>]*>/i) ||
                        productHtml.match(/<img[^>]*src="([^"]*\/wp-content\/uploads\/[^"]+\.(jpg|jpeg|png))"[^>]*>/i);
      
      let imageUrl: string | null = null;
      if (imageMatch && imageMatch[1]) {
        imageUrl = imageMatch[1];
        // Преобразуем относительный URL в абсолютный
        if (imageUrl.startsWith('//')) {
          imageUrl = 'https:' + imageUrl;
        } else if (imageUrl.startsWith('/')) {
          imageUrl = 'https://siambotanicals.com' + imageUrl;
        }
        // Убираем параметры размера для получения оригинала
        imageUrl = imageUrl.replace(/-\d+x\d+\.(jpg|jpeg|png)/i, '.$1');
        imageUrl = imageUrl.split('?')[0];
      }
      
      if (title && slug) {
        products.push({
          title: title,
          slug: slug,
          imageUrl: imageUrl,
          productUrl: productUrl.startsWith('http') ? productUrl : `https://siambotanicals.com${productUrl}`
        });
      }
    }
    
    // Проверяем наличие следующей страницы
    const hasNextPage = html.includes('next page-numbers') || 
                       html.includes('next page') ||
                       html.includes('→') ||
                       (page === 1 && products.length > 0); // Если на первой странице есть продукты, вероятно есть еще
    
    console.log(`   ✅ Найдено продуктов: ${products.length}`);
    
    return { products, hasNextPage };
  } catch (error: any) {
    console.error(`   ❌ Ошибка парсинга страницы ${page}: ${error.message || error}`);
    return { products: [], hasNextPage: false };
  }
}

/**
 * Извлекает изображение со страницы продукта (более высокое разрешение)
 */
async function extractImageFromProductPage(productUrl: string): Promise<string | null> {
  try {
    const response = await fetch(productUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    
    // Ищем основное изображение продукта
    const patterns = [
      /<img[^>]*class="[^"]*wp-post-image[^"]*"[^>]*src="([^"]+)"/i,
      /<img[^>]*class="[^"]*attachment-woocommerce_single[^"]*"[^>]*src="([^"]+)"/i,
      /<img[^>]*class="[^"]*woocommerce-product-gallery__image[^"]*"[^>]*src="([^"]+)"/i,
      /<img[^>]*data-large_image="([^"]+)"/i,
      /<img[^>]*data-src="([^"]*\/wp-content\/uploads\/[^"]+\.(jpg|jpeg|png))"[^>]*>/i,
      /<img[^>]*src="([^"]*\/wp-content\/uploads\/[^"]+\.(jpg|jpeg|png))"[^>]*>/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        let imageUrl = match[1];
        
        if (imageUrl.startsWith('//')) {
          imageUrl = 'https:' + imageUrl;
        } else if (imageUrl.startsWith('/')) {
          imageUrl = 'https://siambotanicals.com' + imageUrl;
        }

        imageUrl = imageUrl.replace(/-\d+x\d+\.(jpg|jpeg|png)/i, '.$1');
        imageUrl = imageUrl.split('?')[0];
        
        return imageUrl;
      }
    }

    return null;
  } catch (error: any) {
    console.warn(`   ⚠️  Ошибка извлечения изображения со страницы: ${error.message || error}`);
    return null;
  }
}

/**
 * Загружает изображение на Cloudinary или возвращает прямой URL
 */
async function downloadAndUploadImage(imageUrl: string, productId: string, productTitle: string): Promise<string | null> {
  // Проверяем доступность изображения
  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(15000),
      method: 'HEAD' // Только проверяем доступность
    });

    if (!response.ok) {
      console.warn(`   ⚠️  Изображение недоступно: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      console.warn(`   ⚠️  Не изображение: ${contentType}`);
      return null;
    }
  } catch (error: any) {
    console.warn(`   ⚠️  Ошибка проверки изображения: ${error.message || error}`);
    return null;
  }

  // Если Cloudinary настроен, загружаем туда
  if (isCloudinaryConfigured()) {
    try {
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        return imageUrl; // Возвращаем прямой URL если не удалось скачать
      }

      const imageBuffer = Buffer.from(await response.arrayBuffer());
      
      if (imageBuffer.length === 0) {
        return imageUrl; // Возвращаем прямой URL
      }
      
      const safeTitle = productTitle.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50);
      
      const result = await uploadImage(imageBuffer, {
        folder: 'vital/products',
        publicId: `siam-${safeTitle}-${Date.now()}`,
        resourceType: 'image'
      });

      return result.secureUrl;
    } catch (error: any) {
      console.warn(`   ⚠️  Не удалось загрузить на Cloudinary, используем прямой URL: ${error.message || error}`);
      return imageUrl; // Возвращаем прямой URL если Cloudinary недоступен
    }
  } else {
    // Cloudinary не настроен, используем прямой URL
    console.log(`   ℹ️  Cloudinary не настроен, используем прямой URL`);
    return imageUrl;
  }
}

/**
 * Находит продукт в базе данных по названию (нечеткое совпадение)
 */
async function findProductInDB(title: string, slug: string): Promise<{ id: string; title: string; imageUrl: string | null } | null> {
  // Сначала пробуем найти по точному совпадению названия
  const exactMatch = await prisma.product.findFirst({
    where: {
      title: {
        equals: title,
        mode: 'insensitive'
      }
    },
    select: {
      id: true,
      title: true,
      imageUrl: true
    }
  });
  
  if (exactMatch) {
    return exactMatch;
  }
  
  // Пробуем найти по части названия
  const words = title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  if (words.length > 0) {
    const partialMatch = await prisma.product.findFirst({
      where: {
        OR: words.map(word => ({
          title: {
            contains: word,
            mode: 'insensitive'
          }
        }))
      },
      select: {
        id: true,
        title: true,
        imageUrl: true
      }
    });
    
    if (partialMatch) {
      return partialMatch;
    }
  }
  
  return null;
}

/**
 * Основная функция
 */
async function main() {
  console.log('🚀 Начало сбора недостающих фотографий продуктов\n');
  
  if (!isCloudinaryConfigured()) {
    console.warn('⚠️  Cloudinary не настроен, будут использоваться прямые URL изображений');
    console.warn('   Для загрузки на Cloudinary добавьте переменные окружения CLOUDINARY_*\n');
  }

  // Получаем все продукты из базы данных
  const dbProducts = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      title: true,
      imageUrl: true
    }
  });

  console.log(`📦 Найдено продуктов в базе данных: ${dbProducts.length}\n`);

  // Собираем все продукты со страниц магазина
  const allProductsFromSite: ProductFromSite[] = [];
  let currentPage = 1;
  let hasMorePages = true;
  const maxPages = 20; // Ограничение для безопасности

  while (hasMorePages && currentPage <= maxPages) {
    const { products, hasNextPage } = await scrapeShopPage(currentPage);
    allProductsFromSite.push(...products);
    
    hasMorePages = hasNextPage && products.length > 0;
    currentPage++;
    
    // Небольшая задержка между запросами
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n📋 Всего найдено продуктов на сайте: ${allProductsFromSite.length}\n`);

  // Статистика
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let notFound = 0;

  // Обрабатываем каждый продукт
  for (const siteProduct of allProductsFromSite) {
    try {
      console.log(`\n📦 Продукт: ${siteProduct.title}`);
      
      // Находим соответствующий продукт в базе данных
      const dbProduct = await findProductInDB(siteProduct.title, siteProduct.slug);
      
      if (!dbProduct) {
        console.log(`   ⏭️  Пропущен: не найден в базе данных`);
        notFound++;
        continue;
      }
      
      // Обновляем изображения для ВСЕХ товаров (включая уже существующие)
      // Это позволит получить более качественные изображения со страниц товаров
      const hasExistingImage = dbProduct.imageUrl && dbProduct.imageUrl.trim() !== '';
      if (hasExistingImage) {
        console.log(`   ℹ️  Изображение уже есть: ${dbProduct.imageUrl.substring(0, 60)}...`);
        console.log(`   🔄 Обновляю на более качественное изображение со страницы товара`);
      }
      
      // Всегда заходим на страницу продукта для получения изображения высокого качества
      console.log(`   🔍 Извлекаю изображение высокого качества со страницы продукта...`);
      let imageUrl = await extractImageFromProductPage(siteProduct.productUrl);
      
      // Если не получилось со страницы, пробуем из списка
      if (!imageUrl && siteProduct.imageUrl) {
        console.log(`   🔄 Используем изображение из списка товаров`);
        imageUrl = siteProduct.imageUrl;
      }
      
      if (!imageUrl) {
        console.log(`   ⚠️  Изображение не найдено`);
        failed++;
        continue;
      }
      
      console.log(`   📥 Загружаю изображение: ${imageUrl.substring(0, 60)}...`);
      
      // Загружаем на Cloudinary
      const cloudinaryUrl = await downloadAndUploadImage(imageUrl, dbProduct.id, dbProduct.title);
      
      if (!cloudinaryUrl) {
        console.log(`   ⚠️  Не удалось загрузить на Cloudinary`);
        failed++;
        continue;
      }
      
      // Обновляем в базе данных
      await prisma.product.update({
        where: { id: dbProduct.id },
        data: { imageUrl: cloudinaryUrl }
      });
      
      console.log(`   ✅ Успешно обновлено!`);
      updated++;
      
      // Задержка между запросами
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error: any) {
      console.error(`   ❌ Ошибка: ${error.message || error}`);
      failed++;
    }
  }

  console.log(`\n\n✅ Сбор фотографий завершен!`);
  console.log(`   ✅ Обновлено: ${updated}`);
  console.log(`   ⏭️  Пропущено (уже есть): ${skipped}`);
  console.log(`   ❌ Не удалось: ${failed}`);
  console.log(`   🔍 Не найдено в БД: ${notFound}`);
  console.log(`   📦 Всего обработано: ${allProductsFromSite.length}`);
}

// Запуск
main()
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    prisma.$disconnect();
    process.exit(1);
  });

