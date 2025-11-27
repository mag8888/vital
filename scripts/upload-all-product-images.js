/**
 * Скрипт для загрузки изображений всех товаров на Cloudinary
 * и обновления URL в базе данных
 * 
 * Использует парсинг страниц товаров Siam Botanicals для получения актуальных URL изображений
 */

import { PrismaClient } from '@prisma/client';
import { uploadImage, isCloudinaryConfigured } from '../dist/services/cloudinary-service.js';
import { siamProducts } from '../dist/services/siam-import-service.js';
import 'dotenv/config';

const prisma = new PrismaClient();

// Маппинг английских названий к slug'ам на сайте Siam Botanicals
const productSlugs = {
  'Organic Castor Oil With Vitamin E': 'organic-castor-oil-with-vitamin-e',
  'Organic Argan Oil': 'organic-argan-oil',
  'Rose Water 100% Pure Bulgarian': 'rose-water-100-pure-bulgarian',
  'Rudis Oleum Botanical Repair Formula Face Serum': 'rudis-oleum-botanical-repair-formula-face-serum',
  'Lemongrass Salt Scrub Soap': 'lemongrass-salt-scrub-soap',
  'Ginger Lily & Frankincense Moisturizing Facial Lotion': 'ginger-lily-frankincense-moisturizing-facial-lotion',
  'Organic Sweet Almond Oil With Vitamin E': 'organic-sweet-almond-oil-with-vitamin-e',
  'Organic Rosehip & Jojoba Facial Oil': 'organic-rosehip-jojoba-facial-oil',
  'Organic Jojoba Oil': 'organic-jojoba-oil',
  'Organic Coconut Oil': 'organic-coconut-oil',
  'Organic Avocado Oil': 'organic-avocado-oil',
  'Organic Grapeseed Oil': 'organic-grapeseed-oil',
  'Organic Rosehip Oil': 'organic-rosehip-oil',
  'Organic Sesame Oil': 'organic-sesame-oil',
  'Organic Evening Primrose Oil': 'organic-evening-primrose-oil',
  'Organic Tamanu Oil': 'organic-tamanu-oil',
  'Organic Marula Oil': 'organic-marula-oil',
  'Aloe Vera Gel 99% Pure': 'aloe-vera-gel-99-pure',
  'Natural Clay Mask': 'natural-clay-mask',
  'Rose & Chamomile Facial Toner': 'rose-chamomile-facial-toner',
  'Vitamin C Brightening Serum': 'vitamin-c-brightening-serum',
  'Hyaluronic Acid Moisturizer': 'hyaluronic-acid-moisturizer',
  'Tea Tree Oil': 'tea-tree-oil',
  'Lavender & Eucalyptus Body Lotion': 'lavender-eucalyptus-body-lotion',
  'Dead Sea Salt Scrub': 'dead-sea-salt-scrub',
  'Coconut & Lime Body Wash': 'coconut-lime-body-wash',
  'Jasmine & Ylang-Ylang Bath Oil': 'jasmine-ylang-ylang-bath-oil',
  'Peppermint & Eucalyptus Foot Cream': 'peppermint-eucalyptus-foot-cream',
  'Argan Oil Hair Treatment': 'argan-oil-hair-treatment',
  'Coconut Oil Hair Mask': 'coconut-oil-hair-mask',
  'Rosemary & Peppermint Shampoo': 'rosemary-peppermint-shampoo',
};

/**
 * Извлекает URL изображения товара со страницы Siam Botanicals
 */
async function extractImageFromPage(url) {
  try {
    const response = await fetch(url, {
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
    
    // Ищем изображение товара в HTML
    const patterns = [
      /<img[^>]*class="[^"]*wp-post-image[^"]*"[^>]*src="([^"]+)"/i,
      /<img[^>]*class="[^"]*attachment-woocommerce_single[^"]*"[^>]*src="([^"]+)"/i,
      /<img[^>]*class="[^"]*woocommerce-product-gallery__image[^"]*"[^>]*src="([^"]+)"/i,
      /<img[^>]*data-large_image="([^"]+)"/i,
      /<img[^>]*src="([^"]*\/wp-content\/uploads\/[^"]+\.(jpg|jpeg|png))"[^>]*>/i,
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
        imageUrl = imageUrl.replace(/-\d+x\d+\.(jpg|jpeg|png)/i, '.$1');
        
        // Убираем параметры запроса
        imageUrl = imageUrl.split('?')[0];
        
        return imageUrl;
      }
    }

    return null;
  } catch (error) {
    console.warn(`   ❌ Ошибка извлечения изображения: ${error.message || error}`);
    return null;
  }
}

/**
 * Скачивает изображение по URL
 */
async function downloadImage(imageUrl) {
  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error(`URL не является изображением: ${contentType}`);
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());
    
    if (imageBuffer.length === 0) {
      throw new Error('Изображение пустое');
    }
    
    return imageBuffer;
  } catch (error) {
    throw new Error(`Ошибка загрузки изображения: ${error.message || error}`);
  }
}

/**
 * Находит товар в базе данных по английскому названию
 */
function findProductByEnglishTitle(products, englishTitle) {
  // Ищем по первому слову или ключевым словам
  const firstWord = englishTitle.split(' ')[0].toLowerCase();
  
  // Попытка найти точное совпадение или частичное
  for (const product of products) {
    const productTitle = product.title.toLowerCase();
    const englishTitleLower = englishTitle.toLowerCase();
    
    // Проверяем различные варианты сопоставления
    if (
      productTitle.includes(firstWord) ||
      englishTitleLower.includes(productTitle.split(' ')[0].toLowerCase()) ||
      productTitle.includes(englishTitleLower.split(' ')[1]?.toLowerCase() || '')
    ) {
      return product;
    }
  }
  
  return null;
}

/**
 * Основная функция загрузки изображений для всех товаров
 */
async function uploadAllProductImages() {
  console.log('🚀 Начало загрузки изображений для всех товаров\n');

  // Проверяем настройку Cloudinary
  if (!isCloudinaryConfigured()) {
    console.error('❌ Cloudinary не настроен');
    console.error('   Установите переменные окружения:');
    console.error('   - CLOUDINARY_CLOUD_NAME');
    console.error('   - CLOUDINARY_API_KEY');
    console.error('   - CLOUDINARY_API_SECRET');
    return;
  }

  // Получаем все товары из базы данных
  const allProducts = await prisma.product.findMany({
    where: { isActive: true }
  });

  console.log(`📦 Найдено товаров в базе: ${allProducts.length}`);
  console.log(`📋 Будет обработано товаров из списка: ${siamProducts.length}\n`);

  let updated = 0;
  let failed = 0;
  let skipped = 0;

  for (const siamProduct of siamProducts) {
    if (!siamProduct.englishTitle) {
      skipped++;
      continue;
    }

    try {
      const slug = productSlugs[siamProduct.englishTitle];
      if (!slug) {
        console.log(`⏭️  Пропущен: ${siamProduct.englishTitle} (slug не найден)`);
        skipped++;
        continue;
      }

      // Находим товар в базе данных
      const dbProduct = findProductByEnglishTitle(allProducts, siamProduct.englishTitle);

      if (!dbProduct) {
        console.log(`⏭️  Пропущен: ${siamProduct.englishTitle} (не найден в базе)`);
        skipped++;
        continue;
      }

      console.log(`\n📦 Товар: ${dbProduct.title}`);
      console.log(`   Английское название: ${siamProduct.englishTitle}`);
      
      // Извлекаем URL изображения со страницы товара
      const productUrl = `https://siambotanicals.com/product/${slug}/`;
      console.log(`   📄 Загружаю страницу: ${productUrl}`);
      
      const imageUrl = await extractImageFromPage(productUrl);
      
      if (!imageUrl) {
        console.log(`   ⚠️  Не удалось получить URL изображения`);
        failed++;
        continue;
      }

      console.log(`   ✅ Найдено изображение: ${imageUrl.split('/').pop()}`);

      // Скачиваем изображение
      console.log(`   📥 Скачиваю изображение...`);
      const imageBuffer = await downloadImage(imageUrl);
      console.log(`   ✅ Изображение скачано (${(imageBuffer.length / 1024).toFixed(2)} KB)`);

      // Загружаем на Cloudinary
      console.log(`   ☁️  Загружаю на Cloudinary...`);
      const uploadResult = await uploadImage(imageBuffer, {
        folder: 'vital/products',
        publicId: `siam-${dbProduct.id}`,
        resourceType: 'image'
      });

      console.log(`   ✅ Изображение загружено на Cloudinary`);

      // Обновляем товар в базе данных
      await prisma.product.update({
        where: { id: dbProduct.id },
        data: { imageUrl: uploadResult.secureUrl }
      });

      console.log(`   ✅ Товар обновлен в базе данных!`);
      updated++;

      // Задержка между запросами, чтобы не перегружать сервер
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`   ❌ Ошибка: ${error.message || error}`);
      failed++;
    }
  }

  console.log(`\n\n✅ Обработка завершена!`);
  console.log(`   ✅ Обновлено: ${updated}`);
  console.log(`   ❌ Не удалось: ${failed}`);
  console.log(`   ⏭️  Пропущено: ${skipped}`);
  console.log(`   📦 Всего обработано: ${siamProducts.length}`);

  return {
    updated,
    failed,
    skipped,
    total: siamProducts.length
  };
}

// Экспортируем функцию для использования в других модулях
export { uploadAllProductImages };

// Если скрипт запускается напрямую (через node)
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.endsWith('upload-all-product-images.js');

if (isMainModule || process.argv[1]?.includes('upload-all-product-images')) {
  uploadAllProductImages()
    .then(() => {
      prisma.$disconnect();
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      prisma.$disconnect();
      process.exit(1);
    });
}
