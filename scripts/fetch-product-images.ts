/**
 * Скрипт для получения актуальных URL изображений товаров с сайта Siam Botanicals
 * Парсит страницы товаров и обновляет URL изображений в базе данных
 */

import { PrismaClient } from '@prisma/client';
import { uploadImage, isCloudinaryConfigured } from '../src/services/cloudinary-service.js';

const prisma = new PrismaClient();

interface ProductMapping {
  slug: string;
  englishTitle: string;
}

// Маппинг английских названий товаров на URL-слаги
const productSlugs: ProductMapping[] = [
  { slug: 'organic-argan-oil', englishTitle: 'Organic Argan Oil' },
  { slug: 'organic-castor-oil-with-vitamin-e', englishTitle: 'Organic Castor Oil With Vitamin E' },
  { slug: 'rose-water-100-pure-bulgarian', englishTitle: 'Rose Water 100% Pure Bulgarian' },
  { slug: 'rudis-oleum-botanical-repair-formula-face-serum', englishTitle: 'Rudis Oleum Botanical Repair Formula Face Serum' },
  { slug: 'lemongrass-salt-scrub-soap', englishTitle: 'Lemongrass Salt Scrub Soap' },
  { slug: 'organic-sweet-almond-oil-with-vitamin-e', englishTitle: 'Organic Sweet Almond Oil With Vitamin E' },
  { slug: 'organic-jojoba-oil', englishTitle: 'Organic Jojoba Oil' },
  { slug: 'organic-coconut-oil', englishTitle: 'Organic Coconut Oil' },
  { slug: 'organic-avocado-oil', englishTitle: 'Organic Avocado Oil' },
  { slug: 'organic-grapeseed-oil', englishTitle: 'Organic Grapeseed Oil' },
  { slug: 'organic-rosehip-oil', englishTitle: 'Organic Rosehip Oil' },
  { slug: 'organic-sesame-oil', englishTitle: 'Organic Sesame Oil' },
  { slug: 'organic-evening-primrose-oil', englishTitle: 'Organic Evening Primrose Oil' },
  { slug: 'organic-tamanu-oil', englishTitle: 'Organic Tamanu Oil' },
  { slug: 'organic-marula-oil', englishTitle: 'Organic Marula Oil' },
];

async function fetchProductImageUrl(productUrl: string): Promise<string | null> {
  try {
    const response = await fetch(productUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      console.warn(`⚠️  Не удалось загрузить страницу: ${productUrl} (${response.status})`);
      return null;
    }

    const html = await response.text();
    
    // Ищем изображение товара в HTML
    // Обычно это первое большое изображение в галерее товара
    const imageMatches = [
      // WooCommerce стандартный формат
      /<img[^>]*class="[^"]*wp-post-image[^"]*"[^>]*src="([^"]+)"/i,
      // Альтернативный формат
      /<img[^>]*class="[^"]*attachment-woocommerce_single[^"]*"[^>]*src="([^"]+)"/i,
      // Просто первое изображение в контейнере товара
      /<img[^>]*src="([^"]*\/uploads\/[^"]+\.(jpg|jpeg|png))"[^>]*>/i,
    ];

    for (const regex of imageMatches) {
      const match = html.match(regex);
      if (match && match[1]) {
        let imageUrl = match[1];
        
        // Преобразуем относительный URL в абсолютный
        if (imageUrl.startsWith('//')) {
          imageUrl = 'https:' + imageUrl;
        } else if (imageUrl.startsWith('/')) {
          imageUrl = 'https://siambotanicals.com' + imageUrl;
        }

        // Убираем параметры размера, чтобы получить оригинальное изображение
        imageUrl = imageUrl.replace(/-\d+x\d+\.(jpg|jpeg|png)/i, '.$1');
        
        console.log(`   ✅ Найдено изображение: ${imageUrl}`);
        return imageUrl;
      }
    }

    console.warn(`   ⚠️  Изображение не найдено на странице`);
    return null;
  } catch (error) {
    console.error(`   ❌ Ошибка при загрузке страницы: ${error}`);
    return null;
  }
}

async function downloadAndUploadToCloudinary(imageUrl: string, productId: string): Promise<string | null> {
  if (!isCloudinaryConfigured()) {
    console.warn('⚠️  Cloudinary не настроен');
    return null;
  }

  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      console.warn(`   ⚠️  Изображение недоступно: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      console.warn(`   ⚠️  URL не является изображением`);
      return null;
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());
    
    if (imageBuffer.length === 0) {
      console.warn(`   ⚠️  Изображение пустое`);
      return null;
    }
    
    const result = await uploadImage(imageBuffer, {
      folder: 'vital/products',
      publicId: `siam-${productId}`,
      resourceType: 'image'
    });

    return result.secureUrl;
  } catch (error: any) {
    console.warn(`   ⚠️  Ошибка загрузки: ${error.message || error}`);
    return null;
  }
}

async function updateProductImages() {
  console.log('🚀 Начало обновления изображений товаров с сайта Siam Botanicals\n');

  const allProducts = await prisma.product.findMany({
    where: { isActive: true }
  });

  console.log(`📋 Найдено товаров: ${allProducts.length}\n`);

  let updated = 0;
  let failed = 0;

  for (const product of allProducts) {
    try {
      // Находим слаг для этого товара
      const mapping = productSlugs.find(p => 
        product.title.toLowerCase().includes(p.englishTitle.toLowerCase().split(' ')[0].toLowerCase())
      );

      if (!mapping) {
        console.log(`⏭️  Пропущен товар: ${product.title} (нет маппинга)`);
        continue;
      }

      const productUrl = `https://siambotanicals.com/product/${mapping.slug}/`;
      console.log(`\n📦 Обрабатываю: ${product.title}`);
      console.log(`   URL: ${productUrl}`);

      // Получаем URL изображения со страницы товара
      const imageUrl = await fetchProductImageUrl(productUrl);
      
      if (!imageUrl) {
        console.log(`   ⚠️  Не удалось получить URL изображения`);
        failed++;
        continue;
      }

      // Загружаем изображение на Cloudinary
      console.log(`   📥 Загружаю на Cloudinary...`);
      const cloudinaryUrl = await downloadAndUploadToCloudinary(imageUrl, product.id);

      if (!cloudinaryUrl) {
        console.log(`   ⚠️  Не удалось загрузить на Cloudinary`);
        failed++;
        continue;
      }

      // Обновляем товар в базе данных
      await prisma.product.update({
        where: { id: product.id },
        data: { imageUrl: cloudinaryUrl }
      });

      console.log(`   ✅ Изображение обновлено: ${cloudinaryUrl}`);
      updated++;

      // Небольшая задержка между запросами
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`   ❌ Ошибка при обработке товара: ${error}`);
      failed++;
    }
  }

  console.log(`\n\n✅ Обновление завершено!`);
  console.log(`   Обновлено: ${updated}`);
  console.log(`   Не удалось: ${failed}`);
  console.log(`   Всего: ${allProducts.length}`);
}

// Запуск скрипта
updateProductImages()
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    prisma.$disconnect();
    process.exit(1);
  });








