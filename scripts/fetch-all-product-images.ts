/**
 * Скрипт для загрузки изображений всех товаров с сайта Siam Botanicals
 * Улучшенная версия с расширенным поиском
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
    
    const response = await fetch(productUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    
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
        
        if (imageUrl.startsWith('//')) {
          imageUrl = 'https:' + imageUrl;
        } else if (imageUrl.startsWith('/')) {
          imageUrl = 'https://siambotanicals.com' + imageUrl;
        }

        imageUrl = imageUrl.replace(/-\d+x\d+\.(jpg|jpeg|png|webp)/i, '.$1');
        imageUrl = imageUrl.split('?')[0];
        
        return imageUrl;
      }
    }

    return null;
  } catch (error: any) {
    return null;
  }
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

    return uploadResult.secureUrl;
  } catch (error: any) {
    console.error(`   ❌ Ошибка загрузки на Cloudinary: ${error.message}`);
    return imageUrl;
  }
}

/**
 * Создает возможные slug варианты из SKU и названия
 */
function createSlugVariants(sku: string, title: string): string[] {
  const variants: string[] = [];
  
  // Расширенный маппинг SKU к slug
  const skuToSlug: Record<string, string[]> = {
    'FS1002-24': ['rudis-oleum-botanical-face-care-night-formula', 'rudis-oleum-night-formula'],
    'FS1006-24': ['rudis-oleum-botanical-repair-formula-face-serum', 'rudis-oleum-repair-formula'],
    'FS1007-24': ['rudis-oleum-botanical-face-care-replenish-formula', 'rudis-oleum-replenish-formula'],
    'FS0001-24': ['natural-balance-face-serum'],
    'FO0001-30': ['organic-rosehip-jojoba-facial-oil', 'rosehip-jojoba-facial-oil'],
    'FO0002-30': ['organic-cranberry-jojoba-facial-oil', 'cranberry-jojoba-facial-oil'],
    'SP0016-95': ['pre-serum-face-wash'],
    'FC0001-45': ['rose-hip-tea-tree-face-cleanser'],
    'FC0021-90': ['face-milk-cleanser-siam-roots', 'milk-cleanser-siam-roots'],
    'FC0023-90': ['aloe-pure-milk-cleanser', 'aloe-milk-cleanser'],
    'FC0020-90': ['face-milk-cleanser-nurture', 'milk-cleanser-nurture'],
    'FB0001-20': ['argan-moringa-face-polish'],
    'FB0003-20': ['forest-berry-face-polish'],
    'FS0016-50': ['rose-water-glycerin-facial-tonic'],
    'FS0018-50': ['witch-hazel-tea-tree-facial-tonic'],
    'FS0015-50': ['witch-hazel-facial-toner'],
    'FS0010-50': ['rose-water-100-pure-bulgarian', 'rose-water-bulgarian'],
    'PB0008-100': ['white-clay-facial-powder'],
    'PB0011-180': ['jasmine-rice-facial-powder'],
    'FM0001-20': ['tamanu-cucumber-face-balm'],
    'BA1001-12': ['coconut-lip-balm'],
    'BA1002-12': ['orange-lip-balm'],
    'BA1003-12': ['peppermint-lip-balm'],
    'SC1005-90': ['organic-siam-roots-skin-conditioner', 'siam-roots-skin-conditioner'],
    'SC1006-90': ['oriental-jasmine-ylang-ylang-skin-conditioner', 'oriental-jasmine-skin-conditioner'],
    'SC1007-90': ['organic-revive-rosemary-peppermint-skin-conditioner', 'revive-rosemary-peppermint-skin-conditioner'],
    'BL1001-220': ['body-lotion-siam-roots'],
    'BL1002-220': ['body-lotion-oriental'],
    'BL1003-220': ['body-lotion-revive'],
    'BL1001-90': ['body-lotion-siam-roots'],
    'BL1002-90': ['body-lotion-oriental'],
    'BL1003-90': ['body-lotion-revive'],
    'BG0001-50': ['bio-guard-lemon-eucalyptus', 'bio-guard-with-lemon-eucalyptus'],
    'BG0002-25': ['bio-guard-mineral-sun-protection', 'bio-guard-face-mineral-sun-protection'],
    'BG0004-250': ['shea-butter-zinc-body-lotion-amyris'],
    'BG0003-250': ['shea-butter-zinc-body-lotion-tea-tree'],
    'SP0020-230': ['body-wash-siam-roots'],
    'SP0021-230': ['body-wash-oriental'],
    'SP0022-230': ['body-wash-revive'],
    'SP0020-100': ['body-wash-siam-roots'],
    'SP0021-100': ['body-wash-oriental'],
    'SP0022-100': ['body-wash-revive'],
    'SP0003-50': ['natural-ginger-soap'],
    'SP0014-50': ['salt-soap-lemongrass', 'lemongrass-salt-scrub-soap'],
    'SP0015-50': ['salt-scrub-soap-clove', 'clove-salt-scrub-soap'],
    'SP0014-100': ['salt-soap-lemongrass'],
    'SP0015-100': ['salt-scrub-soap-clove'],
    'SP0004-50': ['natural-kaffir-lime-shampoo-bar'],
    'BP0001-250': ['virgin-coconut-body-scrub'],
    'BP0002-250': ['passionfruit-lime-body-scrub'],
    'HT0011-45': ['argan-lemon-balm-hair-treatment'],
    'HT0012-45': ['coconut-curry-leaf-hair-treatment'],
    'HT0001-220': ['hair-conditioner-siam-roots'],
    'HT0002-220': ['hair-conditioner-oriental'],
    'HT0003-220': ['hair-conditioner-revive'],
    'HT0001-90': ['hair-conditioner-siam-roots'],
    'HT0002-90': ['hair-conditioner-oriental'],
    'HT0003-90': ['hair-conditioner-revive'],
    'PE1001-12': ['oriental-solid-perfume'],
    'PE1002-12': ['siam-spice-solid-perfume'],
    'PE1003-12': ['jasmine-rose-solid-perfume'],
    'BOR001-5': ['soothing-body-roll-on'],
    'BOR002-5': ['rejuvenating-body-roll-on'],
    'BOR003-5': ['night-time-body-roll-on'],
    'BOR004-5': ['meditation-body-roll-on'],
    'BOA0001-90': ['relaxing-bath-oil'],
    'BOA0002-90': ['reviving-bath-oil'],
    'BOA0003-90': ['refreshing-bath-oil'],
    'SI0044-45': ['organic-moringa-oil'],
    'SI0046-45': ['organic-argan-oil'],
    'SI0077-45': ['organic-jojoba-oil'],
    'SI0103-45': ['cold-pressed-guava-oil', 'cold-pressed-guava-seed-oil'],
    'SI0057-45': ['organic-rosehip-oil-vitamin-e'],
    'SI0045-45': ['organic-tamanu-oil-vitamin-e'],
    'SI0104-45': ['organic-sweet-almond-oil-vitamin-e'],
    'SI0100-45': ['organic-apricot-kernel-oil-vitamin-e'],
    'FWH001-50': ['his-skin-tea-tree-lime-face-wash'],
    'FDH001-50': ['his-skin-tea-tree-lime-face-lotion'],
    'FOH001-50': ['his-skin-turmeric-lime-face-oil'],
    'BA0002-25': ['rejuvenating-balm'],
    'BA0003-25': ['night-time-balm'],
    'BA0004-25': ['meditation-balm'],
    'SH0001-100': ['shampoo-siam-roots'],
    'SH0001-230': ['shampoo-siam-roots'],
    'SH0002-100': ['shampoo-oriental'],
    'SH0002-230': ['shampoo-oriental'],
    'SH0003-100': ['shampoo-revive'],
    'SH0003-230': ['shampoo-revive'],
    'BA0002-25': ['rejuvenating-balm'],
    'BA0003-25': ['night-time-balm'],
    'BA0004-25': ['meditation-balm'],
    'BA1001-12': ['coconut-lip-balm'],
    'BA1002-12': ['orange-lip-balm'],
    'BA1003-12': ['peppermint-lip-balm'],
    'BG0001-50': ['bio-guard-lemon-eucalyptus', 'bio-guard-with-lemon-eucalyptus'],
    'BG0002-25': ['bio-guard-mineral-sun-protection', 'bio-guard-face-mineral-sun-protection'],
    'BG0003-250': ['shea-butter-zinc-body-lotion-tea-tree'],
    'BG0004-250': ['shea-butter-zinc-body-lotion-amyris'],
    'BL1001-220': ['body-lotion-siam-roots'],
    'BL1001-90': ['body-lotion-siam-roots'],
    'BL1002-220': ['body-lotion-oriental'],
    'BL1002-90': ['body-lotion-oriental'],
    'BL1003-220': ['body-lotion-revive'],
    'BL1003-90': ['body-lotion-revive'],
    'BP0001-250': ['virgin-coconut-body-scrub'],
    'FC0020-90': ['face-milk-cleanser-nurture', 'milk-cleanser-nurture'],
    'FC0021-90': ['face-milk-cleanser-siam-roots', 'milk-cleanser-siam-roots'],
    'FO0001-30': ['organic-rosehip-jojoba-facial-oil', 'rosehip-jojoba-facial-oil'],
    'FS0010-50': ['rose-water-100-pure-bulgarian', 'rose-water-bulgarian'],
    'FS0016-50': ['rose-water-glycerin-facial-tonic'],
    'FS1007-24': ['rudis-oleum-botanical-face-care-replenish-formula', 'rudis-oleum-replenish-formula'],
    'HT0001-220': ['hair-conditioner-siam-roots'],
    'HT0001-90': ['hair-conditioner-siam-roots'],
    'HT0002-220': ['hair-conditioner-oriental'],
    'HT0002-90': ['hair-conditioner-oriental'],
    'HT0003-220': ['hair-conditioner-revive'],
    'HT0003-90': ['hair-conditioner-revive'],
    'HT0011-45': ['argan-lemon-balm-hair-treatment'],
    'HT0012-45': ['coconut-curry-leaf-hair-treatment'],
    'SI0045-45': ['organic-tamanu-oil-vitamin-e'],
    'SI0057-45': ['organic-rosehip-oil-vitamin-e'],
    'SI0077-45': ['cold-pressed-guava-oil', 'cold-pressed-guava-seed-oil'],
    'SI0100-45': ['organic-apricot-kernel-oil-vitamin-e'],
    'SP0014-100': ['salt-soap-lemongrass', 'lemongrass-salt-scrub-soap'],
    'SP0014-50': ['salt-soap-lemongrass', 'lemongrass-salt-scrub-soap'],
    'SP0016-95': ['pre-serum-face-wash'],
    'SP0020-100': ['body-wash-siam-roots'],
    'SP0020-230': ['body-wash-siam-roots'],
    'SP0021-100': ['body-wash-oriental'],
    'SP0021-230': ['body-wash-oriental'],
    'SP0022-100': ['body-wash-revive'],
    'SP0022-230': ['body-wash-revive'],
  };

  // Добавляем варианты из маппинга
  if (sku && skuToSlug[sku]) {
    variants.push(...skuToSlug[sku]);
  }

  // Создаем slug из названия товара
  const titleSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
  
  if (titleSlug && !variants.includes(titleSlug)) {
    variants.push(titleSlug);
  }

  // Создаем упрощенный вариант из названия (убираем размеры и сертификаты)
  const simplifiedTitle = title
    .replace(/\d+\s*G/gi, '')
    .replace(/-COSMOS[^|]*/gi, '')
    .replace(/certified by[^|]*/gi, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
  
  if (simplifiedTitle && simplifiedTitle !== titleSlug && !variants.includes(simplifiedTitle)) {
    variants.push(simplifiedTitle);
  }

  return variants;
}

/**
 * Основная функция
 */
async function main() {
  console.log('🚀 Начало загрузки изображений для всех товаров\n');
  
  // Получаем все товары без изображений
  const allProducts = await prisma.product.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      title: true,
      sku: true,
      imageUrl: true,
    },
    orderBy: { sku: 'asc' },
  });

  // Фильтруем товары без изображений
  const products = allProducts.filter(p => !p.imageUrl);

  console.log(`📦 Найдено товаров для обработки: ${products.length}\n`);

  if (products.length === 0) {
    console.log('✅ Все товары уже имеют изображения');
    return;
  }

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (const product of products) {
    try {
      console.log(`\n🔄 Обработка: ${product.title} (SKU: ${product.sku || 'N/A'})`);
      
      if (!product.sku) {
        console.log(`   ⚠️  Пропущен: нет SKU`);
        skippedCount++;
        continue;
      }

      // Получаем варианты slug для поиска
      const slugVariants = createSlugVariants(product.sku, product.title);
      console.log(`   🔍 Пробую ${slugVariants.length} вариантов slug...`);

      let imageUrl: string | null = null;
      let foundSlug: string | null = null;

      // Пробуем каждый вариант slug
      for (const slug of slugVariants) {
        const found = await extractImageFromProductPage(slug);
        if (found) {
          imageUrl = found;
          foundSlug = slug;
          break;
        }
        // Небольшая задержка между запросами
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (!imageUrl) {
        console.log(`   ⚠️  Изображение не найдено ни для одного варианта`);
        errorCount++;
        continue;
      }

      console.log(`   ✅ Изображение найдено (slug: ${foundSlug})`);
      console.log(`   📤 Загружаю на Cloudinary...`);

      // Загружаем на Cloudinary
      const finalImageUrl = await uploadImageToCloudinary(imageUrl, product.id);

      if (!finalImageUrl) {
        console.log(`   ⚠️  Не удалось загрузить на Cloudinary`);
        errorCount++;
        continue;
      }

      // Обновляем товар
      await prisma.product.update({
        where: { id: product.id },
        data: { imageUrl: finalImageUrl },
      });

      console.log(`   ✅ Изображение загружено: ${finalImageUrl.substring(0, 60)}...`);
      successCount++;

      // Пауза между запросами
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error: any) {
      errorCount++;
      console.error(`   ❌ Ошибка: ${error.message}`);
    }
  }

  console.log('\n✅ Загрузка изображений завершена!');
  console.log(`   Успешно: ${successCount}`);
  console.log(`   Ошибок: ${errorCount}`);
  console.log(`   Пропущено: ${skippedCount}`);
  console.log(`   Всего: ${products.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

