/**
 * Скрипт для загрузки изображения товара на Cloudinary
 * и обновления URL в базе данных
 */

import { PrismaClient } from '@prisma/client';
import { uploadImage, isCloudinaryConfigured } from '../dist/services/cloudinary-service.js';
import 'dotenv/config';

const prisma = new PrismaClient();

// Данные для загрузки изображения Organic Argan Oil
const productImage = {
  productTitle: 'арган', // Часть названия для поиска (используется contains)
  imageUrl: 'https://siambotanicals.com/wp-content/uploads/2023/11/Argan-Oil-45g-2.png'
};

async function downloadImage(imageUrl) {
  try {
    console.log(`   📥 Загружаю изображение: ${imageUrl.split('/').pop()}`);
    
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
    
    console.log(`   ✅ Изображение загружено (${(imageBuffer.length / 1024).toFixed(2)} KB)`);
    return imageBuffer;
  } catch (error) {
    console.error(`   ❌ Ошибка загрузки изображения: ${error.message || error}`);
    throw error;
  }
}

async function uploadProductImage() {
  console.log('🚀 Начало загрузки изображения товара\n');

  // Проверяем настройку Cloudinary
  if (!isCloudinaryConfigured()) {
    console.error('❌ Cloudinary не настроен');
    console.error('   Установите переменные окружения:');
    console.error('   - CLOUDINARY_CLOUD_NAME');
    console.error('   - CLOUDINARY_API_KEY');
    console.error('   - CLOUDINARY_API_SECRET');
    return;
  }

  try {
    // Находим товар в базе данных
    console.log(`🔍 Ищем товар: "${productImage.productTitle}"`);
    const product = await prisma.product.findFirst({
      where: {
        title: {
          contains: productImage.productTitle,
          mode: 'insensitive'
        },
        isActive: true
      }
    });

    if (!product) {
      console.error(`❌ Товар не найден в базе данных`);
      console.error(`   Попробуйте изменить productTitle в скрипте`);
      return;
    }

    console.log(`✅ Найден товар: "${product.title}" (ID: ${product.id})\n`);

    // Скачиваем изображение
    const imageBuffer = await downloadImage(productImage.imageUrl);

    // Загружаем на Cloudinary
    console.log(`\n☁️  Загружаю на Cloudinary...`);
    const uploadResult = await uploadImage(imageBuffer, {
      folder: 'vital/products',
      publicId: `siam-${product.id}`,
      resourceType: 'image'
    });

    console.log(`   ✅ Изображение загружено на Cloudinary`);
    console.log(`   📎 URL: ${uploadResult.secureUrl}\n`);

    // Обновляем товар в базе данных
    console.log(`💾 Обновляю товар в базе данных...`);
    await prisma.product.update({
      where: { id: product.id },
      data: { imageUrl: uploadResult.secureUrl }
    });

    console.log(`   ✅ Товар успешно обновлен!`);
    console.log(`\n🎉 Готово! Изображение загружено и прикреплено к товару.`);

  } catch (error) {
    console.error(`\n❌ Ошибка: ${error.message || error}`);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Запуск
uploadProductImage()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });


