/**
 * Скрипт для:
 * 1. Перевода названий товаров на русский язык
 * 2. Добавления оригинала в описание под кнопкой "Дополнительно"
 * 3. Загрузки изображений с сайта siambotanicals.com
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { AITranslationService } from '../src/services/ai-translation-service.js';
import { uploadImage, isCloudinaryConfigured } from '../src/services/cloudinary-service.js';

const prisma = new PrismaClient();
const translationService = new AITranslationService();

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
    return imageUrl;
  }
}

/**
 * Создает slug из SKU или названия товара
 */
function createSlugFromSku(sku: string, title: string): string {
  // Маппинг SKU к slug на сайте siambotanicals.com
  const skuToSlug: Record<string, string> = {
    'FS1002-24': 'rudis-oleum-botanical-face-care-night-formula',
    'FS1006-24': 'rudis-oleum-botanical-repair-formula-face-serum',
    'FS1007-24': 'rudis-oleum-botanical-face-care-replenish-formula',
    'FS0001-24': 'natural-balance-face-serum',
    'FO0001-30': 'organic-rosehip-jojoba-facial-oil',
    'FO0002-30': 'organic-cranberry-jojoba-facial-oil',
    'SP0016-95': 'pre-serum-face-wash',
    'FC0001-45': 'rose-hip-tea-tree-face-cleanser',
    'FC0021-90': 'face-milk-cleanser-siam-roots',
    'FC0023-90': 'aloe-pure-milk-cleanser',
    'FC0020-90': 'face-milk-cleanser-nurture',
    'FB0001-20': 'argan-moringa-face-polish',
    'FB0003-20': 'forest-berry-face-polish',
    'FS0016-50': 'rose-water-glycerin-facial-tonic',
    'FS0018-50': 'witch-hazel-tea-tree-facial-tonic',
    'FS0015-50': 'witch-hazel-facial-toner',
    'FS0010-50': 'rose-water-100-pure-bulgarian',
    'PB0008-100': 'white-clay-facial-powder',
    'PB0011-180': 'jasmine-rice-facial-powder',
    'FM0001-20': 'tamanu-cucumber-face-balm',
    'BA1001-12': 'coconut-lip-balm',
    'BA1002-12': 'orange-lip-balm',
    'BA1003-12': 'peppermint-lip-balm',
    'SC1005-90': 'organic-siam-roots-skin-conditioner',
    'SC1006-90': 'oriental-jasmine-ylang-ylang-skin-conditioner',
    'SC1007-90': 'organic-revive-rosemary-peppermint-skin-conditioner',
    'BL1001-220': 'body-lotion-siam-roots',
    'BL1002-220': 'body-lotion-oriental',
    'BL1003-220': 'body-lotion-revive',
    'BL1001-90': 'body-lotion-siam-roots',
    'BL1002-90': 'body-lotion-oriental',
    'BL1003-90': 'body-lotion-revive',
    'BG0001-50': 'bio-guard-lemon-eucalyptus',
    'BG0002-25': 'bio-guard-mineral-sun-protection',
    'BG0004-250': 'shea-butter-zinc-body-lotion-amyris',
    'BG0003-250': 'shea-butter-zinc-body-lotion-tea-tree',
    'SP0020-230': 'body-wash-siam-roots',
    'SP0021-230': 'body-wash-oriental',
    'SP0022-230': 'body-wash-revive',
    'SP0020-100': 'body-wash-siam-roots',
    'SP0021-100': 'body-wash-oriental',
    'SP0022-100': 'body-wash-revive',
    'SP0003-50': 'natural-ginger-soap',
    'SP0014-50': 'salt-soap-lemongrass',
    'SP0015-50': 'salt-scrub-soap-clove',
    'SP0014-100': 'salt-soap-lemongrass',
    'SP0015-100': 'salt-scrub-soap-clove',
    'SP0004-50': 'natural-kaffir-lime-shampoo-bar',
    'BP0001-250': 'virgin-coconut-body-scrub',
    'BP0002-250': 'passionfruit-lime-body-scrub',
    'HT0011-45': 'argan-lemon-balm-hair-treatment',
    'HT0012-45': 'coconut-curry-leaf-hair-treatment',
    'HT0001-220': 'hair-conditioner-siam-roots',
    'HT0002-220': 'hair-conditioner-oriental',
    'HT0003-220': 'hair-conditioner-revive',
    'HT0001-90': 'hair-conditioner-siam-roots',
    'HT0002-90': 'hair-conditioner-oriental',
    'HT0003-90': 'hair-conditioner-revive',
    'PE1001-12': 'oriental-solid-perfume',
    'PE1002-12': 'siam-spice-solid-perfume',
    'PE1003-12': 'jasmine-rose-solid-perfume',
    'BOR001-5': 'soothing-body-roll-on',
    'BOR002-5': 'rejuvenating-body-roll-on',
    'BOR003-5': 'night-time-body-roll-on',
    'BOR004-5': 'meditation-body-roll-on',
    'BOA0001-90': 'relaxing-bath-oil',
    'BOA0002-90': 'reviving-bath-oil',
    'BOA0003-90': 'refreshing-bath-oil',
    'SI0044-45': 'organic-moringa-oil',
    'SI0046-45': 'organic-argan-oil',
    'SI0077-45': 'organic-jojoba-oil',
    'SI0103-45': 'cold-pressed-guava-oil',
    'SI0057-45': 'organic-rosehip-oil-vitamin-e',
    'SI0045-45': 'organic-tamanu-oil-vitamin-e',
    'SI0104-45': 'organic-sweet-almond-oil-vitamin-e',
    'SI0100-45': 'organic-apricot-kernel-oil-vitamin-e',
    'FWH001-50': 'his-skin-tea-tree-lime-face-wash',
    'FDH001-50': 'his-skin-tea-tree-lime-face-lotion',
    'FOH001-50': 'his-skin-turmeric-lime-face-oil',
    'BA0002-25': 'rejuvenating-balm',
    'BA0003-25': 'night-time-balm',
    'BA0004-25': 'meditation-balm',
  };

  // Сначала пробуем найти по SKU
  if (sku && skuToSlug[sku]) {
    return skuToSlug[sku];
  }

  // Если не найдено, создаем slug из названия
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

/**
 * Основная функция
 */
async function main() {
  console.log('🚀 Начало обработки товаров\n');
  
  // Получаем все товары
  const products = await prisma.product.findMany({
    where: {
      isActive: true
    },
    select: {
      id: true,
      title: true,
      description: true,
      sku: true,
      imageUrl: true,
    },
  });

  console.log(`📦 Найдено товаров: ${products.length}\n`);

  if (products.length === 0) {
    console.log('✅ Товары не найдены');
    return;
  }

  let translatedCount = 0;
  let imageUpdatedCount = 0;
  let errorCount = 0;

  for (const product of products) {
    try {
      console.log(`\n🔄 Обработка: ${product.title} (SKU: ${product.sku})`);
      
      let needsUpdate = false;
      const updates: any = {};

      // 1. Переводим название, если оно на английском
      if (translationService.isEnabled() && /[a-zA-Z]/.test(product.title) && !/[а-яА-Я]/.test(product.title)) {
        console.log(`   🔄 Перевод названия...`);
        try {
          const russianTitle = await translationService.translateTitle(product.title);
          if (russianTitle && russianTitle !== product.title) {
            updates.title = russianTitle;
            updates.summary = russianTitle;
            needsUpdate = true;
            console.log(`   ✅ Переведено: ${russianTitle}`);
          }
        } catch (error: any) {
          console.warn(`   ⚠️  Ошибка перевода: ${error.message}`);
        }
        
        // Пауза между запросами к API
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 2. Обновляем описание - добавляем оригинал под кнопкой "Дополнительно"
      const originalDescription = product.description || product.title;
      const hasOriginalInDescription = originalDescription.includes('Оригинальное название:') || 
                                       originalDescription.includes('Original name:');
      
      if (!hasOriginalInDescription && product.title) {
        const englishTitle = /[a-zA-Z]/.test(product.title) && !/[а-яА-Я]/.test(product.title) 
          ? product.title 
          : originalDescription.match(/[A-Z][a-zA-Z\s&,-]+/)?.[0] || product.title;
        
        const newDescription = `${originalDescription || ''}\n\n<details>\n<summary><strong>Дополнительно</strong></summary>\n\n<strong>Оригинальное название:</strong> ${englishTitle}\n</details>`;
        updates.description = newDescription;
        needsUpdate = true;
        console.log(`   ✅ Добавлено оригинальное название в описание`);
      }

      // 3. Загружаем изображение, если его нет
      if (!product.imageUrl || product.imageUrl.includes('siambotanicals.com')) {
        if (product.sku) {
          console.log(`   📷 Поиск изображения...`);
          const slug = createSlugFromSku(product.sku, product.title);
          console.log(`   🔍 Используется slug: ${slug}`);
          const imageUrl = await extractImageFromProductPage(slug);
          
          if (imageUrl) {
            console.log(`   ✅ Изображение найдено, загружаю на Cloudinary...`);
            const cloudinaryUrl = await uploadImageToCloudinary(imageUrl, product.id);
            if (cloudinaryUrl) {
              updates.imageUrl = cloudinaryUrl;
              needsUpdate = true;
              imageUpdatedCount++;
              console.log(`   ✅ Изображение загружено`);
            }
          } else {
            console.log(`   ⚠️  Изображение не найдено для SKU: ${product.sku}`);
          }
          
          // Пауза между запросами
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Обновляем товар, если есть изменения
      if (needsUpdate) {
        await prisma.product.update({
          where: { id: product.id },
          data: updates,
        });
        
        if (updates.title) {
          translatedCount++;
        }
        
        console.log(`   ✅ Товар обновлен`);
      } else {
        console.log(`   ⏭️  Изменений не требуется`);
      }
      
    } catch (error: any) {
      errorCount++;
      console.error(`   ❌ Ошибка: ${error.message}`);
    }
  }

  console.log('\n✅ Обработка завершена!');
  console.log(`   Переведено названий: ${translatedCount}`);
  console.log(`   Загружено изображений: ${imageUpdatedCount}`);
  console.log(`   Ошибок: ${errorCount}`);
  console.log(`   Всего: ${products.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

