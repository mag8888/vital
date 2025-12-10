/**
 * Скрипт для пересчета всех цен товаров по формуле:
 * цена_закупки * 8 * 2.45 / 100 = цена в PZ
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { getImportSettings } from '../src/services/invoice-import-service.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Начало пересчета цен товаров\n');
  
  // Получаем настройки
  const settings = await getImportSettings();
  console.log(`📊 Настройки:`);
  console.log(`   Курс обмена: ${settings.exchangeRate}`);
  console.log(`   Мультипликатор: ${settings.priceMultiplier}\n`);
  
  // Получаем все товары с закупочной ценой
  const products = await prisma.product.findMany({
    where: {
      purchasePrice: { not: null },
    },
    select: {
      id: true,
      sku: true,
      title: true,
      price: true,
      purchasePrice: true,
    },
    orderBy: { sku: 'asc' },
  });
  
  console.log(`📦 Найдено товаров для пересчета: ${products.length}\n`);
  
  if (products.length === 0) {
    console.log('✅ Товары с закупочной ценой не найдены');
    return;
  }
  
  let updatedCount = 0;
  let errorCount = 0;
  
  for (const product of products) {
    try {
      if (!product.purchasePrice) continue;
      
      // Формула: цена_закупки * 8 * 2.45 / 100 = цена в PZ
      const calculatedPricePZ = (product.purchasePrice * settings.priceMultiplier * settings.exchangeRate) / 100;
      const calculatedPriceRub = calculatedPricePZ * 100;
      const currentPriceRub = product.price * 100;
      
      // Обновляем цену, если она отличается (даже если разница небольшая, пересчитываем для точности)
      if (Math.abs(product.price - calculatedPricePZ) > 0.001) {
        await prisma.product.update({
          where: { id: product.id },
          data: {
            price: Math.round(calculatedPricePZ * 100) / 100, // Округляем до 2 знаков
          },
        });
        
        console.log(`✅ ${product.sku}: ${product.price.toFixed(2)} PZ → ${calculatedPricePZ.toFixed(2)} PZ (${currentPriceRub.toFixed(0)} → ${calculatedPriceRub.toFixed(0)} руб)`);
        updatedCount++;
      } else {
        // Даже если цена корректна, выводим информацию для проверки
        if (product.sku === 'BA1003-12' || product.sku === 'PE1003-12') {
          console.log(`🔍 ${product.sku}: ${product.price.toFixed(2)} PZ = ${currentPriceRub.toFixed(0)} руб (закупочная: ${product.purchasePrice} БАТ)`);
        }
      }
    } catch (error: any) {
      errorCount++;
      console.error(`❌ Ошибка обновления ${product.sku}: ${error.message}`);
    }
  }
  
  console.log('\n✅ Пересчет цен завершен!');
  console.log(`   Обновлено: ${updatedCount}`);
  console.log(`   Без изменений: ${products.length - updatedCount - errorCount}`);
  console.log(`   Ошибок: ${errorCount}`);
  console.log(`   Всего: ${products.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

