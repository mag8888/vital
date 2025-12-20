/**
 * Скрипт для исправления цен товаров, которые меньше 1000 рублей
 * Минимальная цена: 1000 руб = 10 PZ
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { getImportSettings } from '../src/services/invoice-import-service.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Начало проверки и исправления цен\n');
  
  // Получаем настройки
  const settings = await getImportSettings();
  console.log(`📊 Настройки:`);
  console.log(`   Курс обмена: ${settings.exchangeRate}`);
  console.log(`   Мультипликатор: ${settings.priceMultiplier}\n`);
  
  // Получаем все активные товары
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
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
  
  console.log(`📦 Найдено товаров: ${products.length}\n`);
  
  if (products.length === 0) {
    console.log('✅ Товары не найдены');
    return;
  }
  
  let fixedCount = 0;
  let errorCount = 0;
  const MIN_PRICE_RUB = 1000; // Минимальная цена в рублях
  const MIN_PRICE_PZ = MIN_PRICE_RUB / 100; // Минимальная цена в PZ (10 PZ)
  
  for (const product of products) {
    try {
      const currentPriceRub = product.price * 100;
      let newPrice = product.price;
      
      // Если цена меньше 1000 руб, пересчитываем
      if (currentPriceRub < MIN_PRICE_RUB) {
        if (product.purchasePrice) {
          // Пересчитываем по формуле
          const calculatedPricePZ = (product.purchasePrice * settings.priceMultiplier * settings.exchangeRate) / 100;
          
          // Если пересчитанная цена тоже меньше минимума, устанавливаем минимум
          if (calculatedPricePZ * 100 < MIN_PRICE_RUB) {
            newPrice = MIN_PRICE_PZ;
            console.log(`⚠️  ${product.sku}: цена ${product.price.toFixed(2)} PZ (${currentPriceRub.toFixed(0)} руб) → ${newPrice.toFixed(2)} PZ (${MIN_PRICE_RUB} руб) [установлен минимум]`);
          } else {
            newPrice = Math.round(calculatedPricePZ * 100) / 100;
            console.log(`✅ ${product.sku}: цена ${product.price.toFixed(2)} PZ (${currentPriceRub.toFixed(0)} руб) → ${newPrice.toFixed(2)} PZ (${(newPrice * 100).toFixed(0)} руб) [пересчитано]`);
          }
        } else {
          // Если нет закупочной цены, устанавливаем минимум
          newPrice = MIN_PRICE_PZ;
          console.log(`⚠️  ${product.sku}: цена ${product.price.toFixed(2)} PZ (${currentPriceRub.toFixed(0)} руб) → ${newPrice.toFixed(2)} PZ (${MIN_PRICE_RUB} руб) [установлен минимум, нет закупочной цены]`);
        }
        
        // Обновляем цену
        if (Math.abs(product.price - newPrice) > 0.01) {
          await prisma.product.update({
            where: { id: product.id },
            data: {
              price: newPrice,
            },
          });
          fixedCount++;
        }
      }
    } catch (error: any) {
      errorCount++;
      console.error(`❌ Ошибка обновления ${product.sku}: ${error.message}`);
    }
  }
  
  console.log('\n✅ Проверка и исправление цен завершены!');
  console.log(`   Исправлено: ${fixedCount}`);
  console.log(`   Без изменений: ${products.length - fixedCount - errorCount}`);
  console.log(`   Ошибок: ${errorCount}`);
  console.log(`   Всего: ${products.length}`);
  console.log(`\n📌 Минимальная цена: ${MIN_PRICE_RUB} руб = ${MIN_PRICE_PZ} PZ`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());








