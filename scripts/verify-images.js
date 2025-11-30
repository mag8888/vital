/**
 * Проверка загрузки изображений для всех товаров
 * Использование: node scripts/verify-images.js
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyImages() {
  console.log('🔍 Проверка загрузки изображений для всех товаров...\n');
  
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        title: true,
        imageUrl: true
      },
      orderBy: { title: 'asc' }
    });
    
    console.log(`📦 Всего активных товаров: ${products.length}\n`);
    
    const withImages = products.filter(p => p.imageUrl && p.imageUrl.trim() !== '');
    const withoutImages = products.filter(p => !p.imageUrl || p.imageUrl.trim() === '');
    
    console.log(`✅ Товаров с изображениями: ${withImages.length}`);
    console.log(`❌ Товаров без изображений: ${withoutImages.length}\n`);
    
    // Проверяем доступность изображений
    console.log('🔍 Проверяю доступность изображений...\n');
    
    let accessible = 0;
    let inaccessible = 0;
    
    for (const product of withImages.slice(0, 10)) { // Проверяем первые 10 для примера
      try {
        const response = await fetch(product.imageUrl, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          accessible++;
          console.log(`   ✅ ${product.title.substring(0, 50)}...`);
        } else {
          inaccessible++;
          console.log(`   ❌ ${product.title.substring(0, 50)}... (HTTP ${response.status})`);
        }
      } catch (error) {
        inaccessible++;
        console.log(`   ❌ ${product.title.substring(0, 50)}... (недоступно)`);
      }
    }
    
    console.log(`\n📊 Статистика проверки (первые 10):`);
    console.log(`   ✅ Доступных: ${accessible}`);
    console.log(`   ❌ Недоступных: ${inaccessible}`);
    
    if (withoutImages.length > 0) {
      console.log(`\n⚠️  Товары без изображений (первые 10):`);
      withoutImages.slice(0, 10).forEach(p => {
        console.log(`   - ${p.title}`);
      });
    }
    
    await prisma.$disconnect();
    
    if (withoutImages.length === 0) {
      console.log('\n🎉 Все товары имеют изображения!');
      process.exit(0);
    } else {
      console.log(`\n⚠️  Есть ${withoutImages.length} товаров без изображений.`);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Ошибка:', error.message || error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

verifyImages();

