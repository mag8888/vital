/**
 * Скрипт для парсинга страниц товаров Siam Botanicals
 * и получения актуальных URL изображений
 */

import { PrismaClient } from '@prisma/client';
import { uploadImage, isCloudinaryConfigured } from '../src/services/cloudinary-service.js';
import 'dotenv/config';

const prisma = new PrismaClient();

interface ProductInfo {
  slug: string;
  title: string;
}

// Список товаров с их URL-слагами на сайте Siam Botanicals
const products: ProductInfo[] = [
  { slug: 'organic-argan-oil', title: 'Organic Argan Oil' },
  { slug: 'organic-castor-oil-with-vitamin-e', title: 'Organic Castor Oil With Vitamin E' },
  { slug: 'rose-water-100-pure-bulgarian', title: 'Rose Water 100% Pure Bulgarian' },
  { slug: 'rudis-oleum-botanical-repair-formula-face-serum', title: 'Rudis Oleum Botanical Repair Formula Face Serum' },
  { slug: 'lemongrass-salt-scrub-soap', title: 'Lemongrass Salt Scrub Soap' },
  { slug: 'ginger-lily-frankincense-moisturizing-facial-lotion', title: 'Ginger Lily & Frankincense Moisturizing Facial Lotion' },
  { slug: 'organic-sweet-almond-oil-with-vitamin-e', title: 'Organic Sweet Almond Oil With Vitamin E' },
  { slug: 'organic-rosehip-jojoba-facial-oil', title: 'Organic Rosehip & Jojoba Facial Oil' },
  { slug: 'organic-jojoba-oil', title: 'Organic Jojoba Oil' },
  { slug: 'organic-coconut-oil', title: 'Organic Coconut Oil' },
  { slug: 'organic-avocado-oil', title: 'Organic Avocado Oil' },
  { slug: 'organic-grapeseed-oil', title: 'Organic Grapeseed Oil' },
  { slug: 'organic-rosehip-oil', title: 'Organic Rosehip Oil' },
  { slug: 'organic-sesame-oil', title: 'Organic Sesame Oil' },
  { slug: 'organic-evening-primrose-oil', title: 'Organic Evening Primrose Oil' },
  { slug: 'organic-tamanu-oil', title: 'Organic Tamanu Oil' },
  { slug: 'organic-marula-oil', title: 'Organic Marula Oil' },
  { slug: 'aloe-vera-gel-99-pure', title: 'Aloe Vera Gel 99% Pure' },
  { slug: 'natural-clay-mask', title: 'Natural Clay Mask' },
  { slug: 'rose-chamomile-facial-toner', title: 'Rose & Chamomile Facial Toner' },
  { slug: 'vitamin-c-brightening-serum', title: 'Vitamin C Brightening Serum' },
  { slug: 'hyaluronic-acid-moisturizer', title: 'Hyaluronic Acid Moisturizer' },
  { slug: 'tea-tree-oil', title: 'Tea Tree Oil' },
  { slug: 'lavender-eucalyptus-body-lotion', title: 'Lavender & Eucalyptus Body Lotion' },
  { slug: 'dead-sea-salt-scrub', title: 'Dead Sea Salt Scrub' },
  { slug: 'coconut-lime-body-wash', title: 'Coconut & Lime Body Wash' },
  { slug: 'jasmine-ylang-ylang-bath-oil', title: 'Jasmine & Ylang-Ylang Bath Oil' },
  { slug: 'peppermint-eucalyptus-foot-cream', title: 'Peppermint & Eucalyptus Foot Cream' },
  { slug: 'argan-oil-hair-treatment', title: 'Argan Oil Hair Treatment' },
  { slug: 'coconut-oil-hair-mask', title: 'Coconut Oil Hair Mask' },
  { slug: 'rosemary-peppermint-shampoo', title: 'Rosemary & Peppermint Shampoo' },
];

// Позволяет ограничить запуск одним товаром через аргументы
const slugArg = process.argv.find((arg) => arg.startsWith('--slug='));
const titleArg = process.argv.find((arg) => arg.startsWith('--title='));
const requestedSlug = slugArg ? slugArg.replace('--slug=', '') : undefined;
const requestedTitle = titleArg ? titleArg.replace('--title=', '').toLowerCase() : undefined;

const productsToProcess =
  requestedSlug || requestedTitle
    ? products.filter((product) => {
        if (requestedSlug && product.slug === requestedSlug) {
          return true;
        }
        if (requestedTitle && product.title.toLowerCase() === requestedTitle) {
          return true;
        }
        return false;
      })
    : products;

if ((requestedSlug || requestedTitle) && productsToProcess.length === 0) {
  console.warn('⚠️  Не найден товар по указанным параметрам, будет обработан весь список.');
}

async function extractImageFromPage(url: string): Promise<string | null> {
  try {
    console.log(`   📄 Загружаю страницу: ${url}`);
    
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
    // WooCommerce обычно использует класс wp-post-image
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
        
        console.log(`   ✅ Найдено изображение: ${imageUrl}`);
        return imageUrl;
      }
    }

    console.warn(`   ⚠️  Изображение не найдено в HTML`);
    return null;
  } catch (error: any) {
    console.warn(`   ❌ Ошибка: ${error.message || error}`);
    return null;
  }
}

async function downloadAndUploadImage(imageUrl: string, productId: string): Promise<string | null> {
  if (!isCloudinaryConfigured()) {
    console.warn('⚠️  Cloudinary не настроен');
    return null;
  }

  try {
    console.log(`   📥 Загружаю изображение: ${imageUrl.split('/').pop()}`);
    
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
      console.warn(`   ⚠️  Не изображение: ${contentType}`);
      return null;
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());
    
    if (imageBuffer.length === 0) {
      console.warn(`   ⚠️  Пустой файл`);
      return null;
    }
    
    const result = await uploadImage(imageBuffer, {
      folder: 'vital/products',
      publicId: `siam-${productId}-${Date.now()}`,
      resourceType: 'image'
    });

    console.log(`   ✅ Загружено на Cloudinary: ${result.secureUrl.substring(0, 60)}...`);
    return result.secureUrl;
  } catch (error: any) {
    console.warn(`   ❌ Ошибка загрузки: ${error.message || error}`);
    return null;
  }
}

async function updateAllProducts() {
  console.log('🚀 Начало обновления изображений товаров\n');
  console.log(`📋 Будет обработано товаров: ${productsToProcess.length}\n`);

  const allProducts = await prisma.product.findMany({
    where: { isActive: true }
  });

  console.log(`📦 Найдено товаров в базе: ${allProducts.length}\n`);

  let updated = 0;
  let failed = 0;
  let skipped = 0;

  for (const productInfo of productsToProcess) {
    try {
      // Находим соответствующий товар в базе данных
      const dbProduct = allProducts.find(p => 
        p.title.toLowerCase().includes(productInfo.title.toLowerCase().split(' ')[0].toLowerCase()) ||
        productInfo.title.toLowerCase().includes(p.title.toLowerCase().split(' ')[0].toLowerCase())
      );

      if (!dbProduct) {
        console.log(`⏭️  Пропущен: ${productInfo.title} (не найден в базе)`);
        skipped++;
        continue;
      }

      console.log(`\n📦 Товар: ${dbProduct.title}`);
      
      const productUrl = `https://siambotanicals.com/product/${productInfo.slug}/`;
      
      // Извлекаем URL изображения со страницы
      const imageUrl = await extractImageFromPage(productUrl);
      
      if (!imageUrl) {
        console.log(`   ⚠️  Не удалось получить URL изображения`);
        failed++;
        continue;
      }

      // Загружаем на Cloudinary
      const cloudinaryUrl = await downloadAndUploadImage(imageUrl, dbProduct.id);

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
    } catch (error) {
      console.error(`   ❌ Ошибка: ${error}`);
      failed++;
    }
  }

  console.log(`\n\n✅ Обновление завершено!`);
  console.log(`   ✅ Обновлено: ${updated}`);
  console.log(`   ❌ Не удалось: ${failed}`);
  console.log(`   ⏭️  Пропущено: ${skipped}`);
  console.log(`   📦 Всего обработано: ${productsToProcess.length}`);
}

// Запуск
updateAllProducts()
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    prisma.$disconnect();
    process.exit(1);
  });








