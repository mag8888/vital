/**
 * Siam Botanicals Import Service
 * Сервис для импорта продуктов с сайта Siam Botanicals
 */

import { PrismaClient } from '@prisma/client';
import { aiTranslationService } from './ai-translation-service.js';
import { uploadImage, isCloudinaryConfigured } from './cloudinary-service.js';

const prisma = new PrismaClient();

export interface SiamProduct {
  englishTitle: string;
  englishSummary: string;
  englishDescription: string;
  price: number; // В батах (THB)
  imageUrl: string;
  category: string;
  categorySlug: string;
}

// Данные продуктов с сайта Siam Botanicals
export const siamProducts: Partial<SiamProduct>[] = [
  {
    englishTitle: 'Organic Castor Oil With Vitamin E',
    englishSummary: 'Pure organic castor oil enriched with Vitamin E. Perfect for hair and skin care, promotes natural growth and nourishment.',
    englishDescription: 'Rich in ricinoleic acid, which has moisturizing and anti-inflammatory properties. Ideal for skin and hair care, promotes strengthening and nourishment.',
    price: 540, // THB
    imageUrl: 'https://siambotanicals.com/wp-content/uploads/2021/06/Organic-Castor-Oil-With-Vitamin-E-1.jpg',
    category: 'Pure Organic Oils',
    categorySlug: 'pure-organic-oils'
  },
  {
    englishTitle: 'Organic Argan Oil',
    englishSummary: 'Known for its anti-aging properties. Deeply moisturizes the skin, increases its elasticity and gives healthy shine to hair.',
    englishDescription: 'Argan oil is known for its anti-aging properties. It deeply moisturizes the skin, increases its elasticity and gives healthy shine to hair.',
    price: 940, // THB
    imageUrl: 'https://siambotanicals.com/wp-content/uploads/2021/06/Organic-Argan-Oil-1.jpg',
    category: 'Pure Organic Oils',
    categorySlug: 'pure-organic-oils'
  },
  {
    englishTitle: 'Rose Water 100% Pure Bulgarian',
    englishSummary: 'Refreshes and tones the skin, has soothing properties and helps relieve irritation. Suitable for all skin types.',
    englishDescription: 'Rose water refreshes and tones the skin, has soothing properties and helps relieve irritation. Suitable for all skin types.',
    price: 885, // THB
    imageUrl: 'https://siambotanicals.com/wp-content/uploads/2021/06/Rose-Water-100-Pure-Bulgarian-1.jpg',
    category: 'Face Care',
    categorySlug: 'face-care'
  },
  {
    englishTitle: 'Rudis Oleum Botanical Repair Formula Face Serum',
    englishSummary: 'Contains a blend of natural oils and extracts that promote skin regeneration, reduce signs of aging and improve overall skin tone.',
    englishDescription: 'This serum contains a blend of natural oils and extracts that promote skin regeneration, reduce signs of aging and improve overall skin tone.',
    price: 1395, // THB
    imageUrl: 'https://siambotanicals.com/wp-content/uploads/2021/06/Rudis-Oleum-Botanical-Repair-Formula-Face-Serum-1.jpg',
    category: 'Face Care',
    categorySlug: 'face-care'
  },
  {
    englishTitle: 'Lemongrass Salt Scrub Soap',
    englishSummary: 'Soap with natural sea salt and lemongrass essential oil gently exfoliates the skin, removing dead cells, and leaves a feeling of freshness and cleanliness.',
    englishDescription: 'Soap with natural sea salt and lemongrass essential oil gently exfoliates the skin, removing dead cells, and leaves a feeling of freshness and cleanliness.',
    price: 175, // THB
    imageUrl: 'https://siambotanicals.com/wp-content/uploads/2021/06/Lemongrass-Salt-Scrub-Soap-1.jpg',
    category: 'Bath & Spa',
    categorySlug: 'bath-spa'
  },
  {
    englishTitle: 'Ginger Lily & Frankincense Moisturizing Facial Lotion',
    englishSummary: 'This lotion deeply moisturizes the skin, gives it softness and elasticity, and also has a pleasant aroma thanks to the combination of ginger lily and frankincense.',
    englishDescription: 'This lotion deeply moisturizes the skin, gives it softness and elasticity, and also has a pleasant aroma thanks to the combination of ginger lily and frankincense.',
    price: 660, // THB
    imageUrl: 'https://siambotanicals.com/wp-content/uploads/2021/06/Ginger-Lily-Frankincense-Moisturizing-Facial-Lotion-1.jpg',
    category: 'Face Care',
    categorySlug: 'face-care'
  },
  {
    englishTitle: 'Organic Sweet Almond Oil With Vitamin E',
    englishSummary: 'Sweet almond oil is rich in vitamins and minerals that nourish and moisturize the skin, making it soft and smooth.',
    englishDescription: 'Sweet almond oil is rich in vitamins and minerals that nourish and moisturize the skin, making it soft and smooth.',
    price: 695, // THB
    imageUrl: 'https://siambotanicals.com/wp-content/uploads/2021/06/Organic-Sweet-Almond-Oil-With-Vitamin-E-1.jpg',
    category: 'Pure Organic Oils',
    categorySlug: 'pure-organic-oils'
  },
  {
    englishTitle: 'Organic Rosehip & Jojoba Facial Oil',
    englishSummary: 'The combination of rosehip and jojoba oils helps restore the skin, reduce pigmentation and give it a healthy appearance.',
    englishDescription: 'The combination of rosehip and jojoba oils helps restore the skin, reduce pigmentation and give it a healthy appearance.',
    price: 1180, // THB
    imageUrl: 'https://siambotanicals.com/wp-content/uploads/2021/06/Organic-Rosehip-Jojoba-Facial-Oil-1.jpg',
    category: 'Face Care',
    categorySlug: 'face-care'
  }
];

/**
 * Конвертирует тайский бат в PZ (1 бат ≈ 2.5 руб, 1 PZ = 100 руб)
 */
function convertTHBToPZ(thbPrice: number): number {
  return Math.round((thbPrice * 2.5) / 100 * 100) / 100;
}

/**
 * Создает или получает категорию
 */
async function getOrCreateCategory(name: string, slug: string) {
  let category = await prisma.category.findUnique({
    where: { slug }
  });

  if (!category) {
    category = await prisma.category.create({
      data: {
        name,
        slug,
        description: `Категория ${name} от Siam Botanicals`,
        isActive: true
      }
    });
    console.log(`✅ Создана категория: ${name}`);
  }

  return category;
}

/**
 * Загружает изображение по URL и возвращает Cloudinary URL
 */
async function downloadAndUploadImage(imageUrl: string, productId: string): Promise<string | null> {
  if (!isCloudinaryConfigured()) {
    console.warn('⚠️  Cloudinary не настроен, пропускаю загрузку изображения');
    return null;
  }

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());
    
    const result = await uploadImage(imageBuffer, {
      folder: 'vital/products',
      publicId: `siam-${productId}`,
      resourceType: 'image'
    });

    console.log(`✅ Изображение загружено: ${result.secureUrl}`);
    return result.secureUrl;
  } catch (error) {
    console.error(`❌ Ошибка загрузки изображения ${imageUrl}:`, error);
    return null;
  }
}

/**
 * Импортирует один продукт
 */
async function importProduct(product: SiamProduct): Promise<any> {
  console.log(`\n📦 Импортирую: ${product.englishTitle}`);

  // Проверяем, не существует ли уже продукт с таким названием
  const existingProduct = await prisma.product.findFirst({
    where: {
      title: {
        contains: product.englishTitle.split(' ')[0], // Проверяем по первому слову
        mode: 'insensitive'
      }
    }
  });

  if (existingProduct) {
    console.log(`⏭️  Продукт "${product.englishTitle}" уже существует, пропускаю`);
    return existingProduct;
  }

  // Получаем или создаем категорию
  const category = await getOrCreateCategory(product.category, product.categorySlug);

  // Переводим через AI
  console.log('  🔄 Перевод названия...');
  const translatedTitle = await aiTranslationService.translateTitle(product.englishTitle);

  console.log('  🔄 Перевод краткого описания...');
  const translatedSummary = await aiTranslationService.translateSummary(
    product.englishSummary,
    translatedTitle
  );

  console.log('  🔄 Перевод полного описания...');
  const translatedDescription = await aiTranslationService.translateProductDescription(
    product.englishDescription,
    'cosmetic',
    {
      preserveStyle: true,
      targetAudience: 'natural',
      enhanceDescription: true
    }
  );

  // Конвертируем цену
  const priceInPZ = convertTHBToPZ(product.price);

  // Загружаем изображение
  let imageUrl: string | null = null;
  if (product.imageUrl) {
    console.log('  📷 Загрузка изображения...');
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    imageUrl = await downloadAndUploadImage(product.imageUrl, tempId);
  }

  // Создаем продукт
  const createdProduct = await prisma.product.create({
    data: {
      title: translatedTitle,
      summary: translatedSummary.substring(0, 200),
      description: translatedDescription,
      price: priceInPZ,
      categoryId: category.id,
      imageUrl: imageUrl || undefined,
      stock: 999,
      isActive: true,
      availableInRussia: true,
      availableInBali: true
    }
  });

  console.log(`✅ Продукт создан: ${translatedTitle} (${priceInPZ} PZ)`);
  return createdProduct;
}

/**
 * Основная функция импорта
 */
export async function importSiamProducts(): Promise<{ success: number; errors: number; total: number }> {
  console.log('🚀 Начало импорта продуктов из Siam Botanicals\n');

  if (!aiTranslationService.isEnabled()) {
    throw new Error('AI Translation Service не настроен! Добавьте OPENAI_API_KEY в переменные окружения.');
  }

  if (siamProducts.length === 0) {
    throw new Error('Список продуктов пуст.');
  }

  console.log(`📋 Найдено продуктов: ${siamProducts.length}\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const product of siamProducts) {
    if (!product.englishTitle || !product.englishSummary || !product.englishDescription || !product.price) {
      console.warn(`⚠️  Пропущен продукт из-за неполных данных: ${product.englishTitle || 'Unknown'}`);
      errorCount++;
      continue;
    }

    try {
      await importProduct(product as SiamProduct);
      successCount++;
      
      // Пауза между запросами
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      errorCount++;
      console.error(`❌ Не удалось импортировать продукт:`, error);
    }
  }

  console.log(`\n✅ Импорт завершен!`);
  console.log(`   Успешно: ${successCount}`);
  console.log(`   Ошибок: ${errorCount}`);

  return {
    success: successCount,
    errors: errorCount,
    total: siamProducts.length
  };
}



