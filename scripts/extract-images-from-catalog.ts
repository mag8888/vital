/**
 * Скрипт для извлечения изображений товаров из PDF каталога
 * и загрузки их в Cloudinary для товаров без фото
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');
import { uploadImage, isCloudinaryConfigured } from '../src/services/cloudinary-service.js';

const prisma = new PrismaClient();

interface ImageInfo {
  sku: string;
  imageBuffer: Buffer;
  pageNumber: number;
}

/**
 * Извлекает изображения из PDF (используя pdf-parse для получения метаданных)
 * Для реального извлечения изображений нужна другая библиотека
 */
async function extractImagesFromPDF(pdfPath: string): Promise<Map<string, ImageInfo>> {
  console.log(`📄 Чтение PDF: ${pdfPath}\n`);
  
  // Используем PDFParse для получения информации о PDF
  const absolutePath = pdfPath.startsWith('/') ? pdfPath : `${process.cwd()}/${pdfPath}`;
  const parser = new PDFParse({ 
    url: `file://${absolutePath}` 
  });
  const data = await parser.getText();
  
  console.log(`✅ PDF прочитан. Страниц: ${data.numpages || 'неизвестно'}\n`);
  
  // pdf-parse не поддерживает извлечение изображений напрямую
  // Для извлечения изображений нужна другая библиотека
  // Попробуем использовать pdfjs-dist или другую библиотеку
  
  console.log('⚠️  pdf-parse не поддерживает извлечение изображений напрямую');
  console.log('   Используем альтернативный подход: скачиваем изображения с сайта siambotanicals.com\n');
  
  return new Map();
}

/**
 * Скачивает изображение по URL
 */
async function downloadImage(imageUrl: string): Promise<Buffer> {
  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error: any) {
    throw new Error(`Ошибка загрузки изображения ${imageUrl}: ${error.message}`);
  }
}

/**
 * Генерирует URL изображения товара на сайте Siam Botanicals
 */
function generateImageUrl(sku: string): string {
  // Пробуем разные варианты URL
  const baseUrl = 'https://siambotanicals.com';
  const slug = sku.toLowerCase().replace(/-/g, '-');
  
  // Варианты URL для изображений
  const variants = [
    `${baseUrl}/wp-content/uploads/${slug}.jpg`,
    `${baseUrl}/wp-content/uploads/${slug}.png`,
    `${baseUrl}/wp-content/uploads/products/${slug}.jpg`,
    `${baseUrl}/wp-content/uploads/products/${slug}.png`,
  ];
  
  return variants[0]; // Возвращаем первый вариант, но можно попробовать все
}

/**
 * Находит товары без фото или с пометкой о скопированном фото
 */
async function findProductsNeedingImages() {
  const products = await prisma.product.findMany({
    where: {
      sku: { not: null },
      OR: [
        { imageUrl: null },
        { imageUrl: { contains: 'siambotanicals.com' } }, // Старые прямые ссылки
        { description: { contains: 'скопировано' } }, // Товары с пометкой о копии
      ],
    },
    select: {
      id: true,
      sku: true,
      title: true,
      imageUrl: true,
      description: true,
    },
  });
  
  return products;
}

/**
 * Генерирует варианты slug'ов из SKU для поиска на сайте
 */
function generateSlugVariants(sku: string): string[] {
  const variants: string[] = [];
  
  // Базовый вариант - просто SKU в нижнем регистре
  variants.push(sku.toLowerCase());
  
  // Убираем дефисы
  variants.push(sku.toLowerCase().replace(/-/g, ''));
  
  // Заменяем дефисы на подчеркивания
  variants.push(sku.toLowerCase().replace(/-/g, '_'));
  
  // Пробуем разные комбинации
  const parts = sku.toLowerCase().split('-');
  if (parts.length > 1) {
    // Без последней части (например, FS1002-24 -> fs1002)
    variants.push(parts[0]);
    // Только первая часть с дефисом
    variants.push(`${parts[0]}-${parts[1]}`);
  }
  
  // Убираем дубликаты
  return [...new Set(variants)];
}

/**
 * Пытается найти изображение товара на сайте Siam Botanicals
 */
async function findImageOnWebsite(sku: string): Promise<string | null> {
  try {
    const slugVariants = generateSlugVariants(sku);
    
    // Пробуем найти страницу товара
    for (const slug of slugVariants) {
      const productUrl = `https://siambotanicals.com/product/${slug}/`;
      
      try {
        const response = await fetch(productUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          signal: AbortSignal.timeout(15000)
        });
        
        if (response.ok) {
          const html = await response.text();
          
          // Ищем изображение товара в HTML
          const imagePatterns = [
            /<img[^>]*class="[^"]*woocommerce-product-gallery__image[^"]*"[^>]*src="([^"]+)"/i,
            /<img[^>]*class="[^"]*wp-post-image[^"]*"[^>]*src="([^"]+)"/i,
            /<img[^>]*class="[^"]*attachment-woocommerce_single[^"]*"[^>]*src="([^"]+)"/i,
            /<img[^>]*data-large_image="([^"]+)"/i,
            /<img[^>]*data-src-full="([^"]+)"/i,
            /<img[^>]*src="([^"]*\/wp-content\/uploads\/[^"]+\.(jpg|jpeg|png|webp))"[^>]*>/i,
            /<img[^>]*data-src="([^"]*\/wp-content\/uploads\/[^"]+\.(jpg|jpeg|png|webp))"[^>]*>/i,
          ];
          
          for (const pattern of imagePatterns) {
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
              imageUrl = imageUrl.replace(/-\d+x\d+\.(jpg|jpeg|png|webp)/i, (match, ext) => `.${ext}`);
              
              // Убираем параметры запроса
              imageUrl = imageUrl.split('?')[0];
              
              // Проверяем, что это действительно изображение
              if (imageUrl.match(/\.(jpg|jpeg|png|webp)$/i)) {
                console.log(`   ✅ Найдено изображение: ${imageUrl}`);
                return imageUrl;
              }
            }
          }
        }
      } catch (error: any) {
        // Продолжаем поиск
        continue;
      }
    }
    
    return null;
  } catch (error: any) {
    console.error(`   ❌ Ошибка поиска изображения для ${sku}: ${error.message}`);
    return null;
  }
}

/**
 * Загружает изображение в Cloudinary и обновляет товар
 */
async function uploadAndUpdateProduct(productId: string, imageUrl: string, sku: string) {
  try {
    console.log(`   📥 Скачиваю изображение...`);
    const imageBuffer = await downloadImage(imageUrl);
    
    console.log(`   ☁️  Загружаю в Cloudinary...`);
    const uploadResult = await uploadImage(imageBuffer, {
      folder: 'vital/products',
      publicId: `siam-${sku.toLowerCase()}`,
      resourceType: 'image'
    });
    
    console.log(`   ✅ Изображение загружено: ${uploadResult.secureUrl}`);
    
    // Обновляем товар
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { description: true },
    });
    
    // Убираем пометку о скопированном фото из описания
    let newDescription = product?.description || '';
    if (newDescription.includes('скопировано')) {
      newDescription = newDescription.replace(/\n?\n?📷 Фото скопировано[^\n]*/g, '').trim();
    }
    
    await prisma.product.update({
      where: { id: productId },
      data: {
        imageUrl: uploadResult.secureUrl,
        description: newDescription,
      },
    });
    
    console.log(`   ✅ Товар обновлен\n`);
    return true;
  } catch (error: any) {
    console.error(`   ❌ Ошибка: ${error.message}\n`);
    return false;
  }
}

async function main() {
  console.log('🚀 Начало извлечения и загрузки изображений из каталога\n');
  
  // Проверяем Cloudinary
  if (!isCloudinaryConfigured()) {
    console.error('❌ Cloudinary не настроен');
    console.error('   Установите переменные окружения:');
    console.error('   - CLOUDINARY_CLOUD_NAME');
    console.error('   - CLOUDINARY_API_KEY');
    console.error('   - CLOUDINARY_API_SECRET');
    process.exit(1);
  }
  
  // Находим товары, которым нужны изображения
  const products = await findProductsNeedingImages();
  
  console.log(`📦 Товаров без фото или с копией: ${products.length}\n`);
  
  if (products.length === 0) {
    console.log('✅ Все товары имеют изображения!');
    return;
  }
  
  let updatedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  
  for (const product of products) {
    if (!product.sku) {
      skippedCount++;
      continue;
    }
    
    console.log(`\n🔍 Обработка: ${product.sku} - ${product.title.substring(0, 50)}`);
    
    // Пытаемся найти изображение на сайте
    const imageUrl = await findImageOnWebsite(product.sku);
    
    if (imageUrl) {
      const success = await uploadAndUpdateProduct(product.id, imageUrl, product.sku);
      if (success) {
        updatedCount++;
      } else {
        failedCount++;
      }
    } else {
      console.log(`   ⚠️  Изображение не найдено на сайте`);
      skippedCount++;
    }
    
    // Небольшая задержка между запросами
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n✅ Обработка завершена!`);
  console.log(`   Обновлено: ${updatedCount}`);
  console.log(`   Не найдено: ${skippedCount}`);
  console.log(`   Ошибок: ${failedCount}`);
  console.log(`   Всего обработано: ${products.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

