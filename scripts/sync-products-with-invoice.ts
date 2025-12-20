/**
 * Скрипт для синхронизации товаров с инвойсом:
 * 1. Обновляет формулу расчета цены с округлением до 10
 * 2. Удаляет товары, которых нет в инвойсе
 * 3. Добавляет/обновляет товары из инвойса
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { getImportSettings } from '../src/services/invoice-import-service.js';

const prisma = new PrismaClient();

// Данные из инвойса (собраны из всех страниц)
const invoiceItems = [
  // Страница 1
  { sku: 'FS1002-24', description: 'Rudis Oleum Botanical Face Care Night Formula 24 G -COSMOS Organic certified by IONC Germany', qty: 20, rate: 453.86 },
  { sku: 'FS1006-24', description: 'Rudis Oleum Botanical Face Care Repair Formula 24 G -COSMOS Organic certified by IONC Germany', qty: 20, rate: 488.91 },
  { sku: 'FS1007-24', description: 'Rudis Oleum Botanical Face Care Replenish Formula 24 G -COSMOS Organic certified by IONC Germany', qty: 20, rate: 453.86 },
  { sku: 'FS0001-24', description: 'Natural Balance Face Serum 24 G -COSMOS Natural certified by INC Germany', qty: 20, rate: 348.72 },
  { sku: 'FO0001-30', description: 'Organic Rosehip & Jojoba Facial Oil 30 G -COSMOS Organic certified by IONC Germany', qty: 20, rate: 413.55 },
  { sku: 'FO0002-30', description: 'Organic Cranberry & Jojoba Facial Oil 30 G -COSMOS Organic certified by IONC Germany', qty: 20, rate: 488.91 },
  { sku: 'SP0016-95', description: 'Pre Serum Face Wash 95 G', qty: 20, rate: 329.45 },
  { sku: 'FC0001-45', description: 'Rose Hip & Tea Tree Face Cleanser 45 G -COSMOS Organic certified by IONC Germany', qty: 20, rate: 278.63 },
  { sku: 'FC0021-90', description: 'Face Milk Cleanser Siam Roots 90 G', qty: 20, rate: 348.72 },
  { sku: 'FC0023-90', description: 'Aloe Pure Milk Cleanser 90 G', qty: 20, rate: 348.72 },
  { sku: 'FC0020-90', description: 'Face Milk Cleanser Nurture 90 G', qty: 20, rate: 348.72 },
  { sku: 'FB0001-20', description: 'Argan & Moringa Face Polish 20 G -COSMOS Organic certified by IONC Germany', qty: 20, rate: 243.58 },
  { sku: 'FB0003-20', description: 'Forest Berry Face Polish 20 G -COSMOS Natural certified by IONC Germany', qty: 20, rate: 243.58 },
  { sku: 'FS0016-50', description: 'Rose Water & Glycerin Facial Tonic 50 G -COSMOS Organic certified by IONC Germany', qty: 20, rate: 310.17 },
  { sku: 'FS0018-50', description: 'Witch Hazel & Tea Tree Facial Tonic 50 G -COSMOS Organic certified by IONC Germany', qty: 20, rate: 310.17 },
  { sku: 'FS0015-50', description: 'Witch Hazel Facial Toner 50 G -COSMOS Organic certified by IONC Germany', qty: 20, rate: 310.17 },
  { sku: 'FS0010-50', description: 'Rose Water 100% Pure Bulgarian 50 G -COSMOS Organic certified by IONC Germany', qty: 20, rate: 310.17 },
  { sku: 'PB0008-100', description: 'White Clay Facial Powder 100 G', qty: 20, rate: 453.86 },
  { sku: 'PB0011-180', description: 'Jasmine Rice Facial Powder 180 G', qty: 11, rate: 243.58 },
  { sku: 'FM0001-20', description: 'Tamanu & Cucumber Face Balm 20 G -COSMOS Natural certified by IONC Germany', qty: 12, rate: 205.03 },
  { sku: 'BA1001-12', description: 'Coconut Lip Balm 12 G -COSMOS Natural certified by IONC Germany', qty: 20, rate: 115.66 },
  { sku: 'BA1002-12', description: 'Orange Lip Balm 12 G -COSMOS Natural certified by IONC Germany', qty: 20, rate: 115.66 },
  { sku: 'BA1003-12', description: 'Peppermint Lip Balm 12 G -COSMOS Natural certified by IONC Germany', qty: 20, rate: 115.66 },
  { sku: 'SC1005-90', description: 'Organic Siam Roots Skin Conditioner 90 G -COSMOS Organic certified by IONC Germany', qty: 15, rate: 348.72 },
  { sku: 'SC1006-90', description: 'Oriental Jasmine & Ylang Ylang Skin Conditioner 90 G -COSMOS Natural certified by IONC Germany', qty: 15, rate: 348.72 },
  { sku: 'SC1007-90', description: 'Organic Revive Rosemary & Peppermint Skin Conditioner 90 G -COSMOS Organic certified by IONC Germany', qty: 15, rate: 348.72 },
  { sku: 'BL1001-220', description: 'Body Lotion Siam Roots 220 G', qty: 15, rate: 329.45 },
  { sku: 'BL1002-220', description: 'Body Lotion Oriental 220 G', qty: 15, rate: 348.72 },
  { sku: 'BL1003-220', description: 'Body Lotion Revive 220 G', qty: 15, rate: 329.45 },
  { sku: 'BL1001-90', description: 'Body Lotion Siam Roots 90 G', qty: 15, rate: 206.78 },
  { sku: 'BL1002-90', description: 'Body Lotion Oriental 90 G', qty: 15, rate: 227.81 },
  { sku: 'BL1003-90', description: 'Body Lotion Revive 90 G', qty: 15, rate: 206.78 },
  { sku: 'BG0001-50', description: 'Bio Guard with Lemon Eucalyptus 50 G Alu -COSMOS Natural certified by IONC Germany', qty: 15, rate: 185.75 },
  { sku: 'BG0002-25', description: 'Bio Guard Face Mineral Sun Protection 25 G', qty: 30, rate: 206.78 },
  { sku: 'BG0003-250', description: 'Shea Butter & Zinc Body Lotion with Tea Tree 250 G', qty: 15, rate: 523.95 },
  { sku: 'BG0004-250', description: 'Shea Butter & Zinc Body Lotion with Amyris 250 G', qty: 15, rate: 523.95 },
  { sku: 'SP0020-230', description: 'Body Wash Siam Roots 230 G', qty: 15, rate: 243.58 },
  { sku: 'SP0021-230', description: 'Body Wash Oriental 230 G', qty: 15, rate: 278.63 },
  { sku: 'SP0022-230', description: 'Body Wash Revive 230 G', qty: 15, rate: 243.58 },
  { sku: 'SP0020-100', description: 'Body Wash Siam Roots 100 G', qty: 15, rate: 138.44 },
  { sku: 'SP0021-100', description: 'Body Wash Oriental 100 G', qty: 15, rate: 164.72 },
  { sku: 'SP0022-100', description: 'Body Wash Revive 100 G', qty: 16, rate: 138.44 },
  { sku: 'SP0003-50', description: 'Natural Ginger Soap 50 G', qty: 30, rate: 61.34 },
  { sku: 'SP0014-50', description: 'Salt Soap - Lemongrass 50 G', qty: 30, rate: 61.34 },
  { sku: 'SP0015-50', description: 'Salt Scrub Soap - Clove 50 G', qty: 30, rate: 61.34 },
  { sku: 'SP0014-100', description: 'Salt Soap - Lemongrass 100 G', qty: 30, rate: 103.39 },
  { sku: 'SP0015-100', description: 'Salt Scrub Soap - Clove 100 G', qty: 30, rate: 103.39 },
  { sku: 'SP0004-50', description: 'Natural Kaffir Lime Shampoo Bar 50 G', qty: 30, rate: 61.34 },
  { sku: 'BP0001-250', description: 'Virgin Coconut Body Scrub 250 G -COSMOS Natural certified by IONC Germany', qty: 30, rate: 243.58 },
  { sku: 'BP0002-250', description: 'Passionfruit & Lime Body Scrub 250 G -COSMOS Natural certified by IONC Germany', qty: 15, rate: 243.58 },
  { sku: 'HT0011-45', description: 'Argan & Lemon Balm Hair Treatment 45 G -COSMOS Organic certified by IONC Germany', qty: 15, rate: 348.72 },
  { sku: 'HT0012-45', description: 'Coconut & Curry Leaf Hair Treatment 45 G -COSMOS Organic certified by IONC Germany', qty: 16, rate: 243.58 },
  { sku: 'SH0001-230', description: 'Shampoo Siam Roots 230 G', qty: 15, rate: 289.14 },
  { sku: 'SH0002-230', description: 'Shampoo Oriental 230 G', qty: 15, rate: 348.72 },
  { sku: 'SH0003-230', description: 'Shampoo Revive 230 G', qty: 15, rate: 289.14 },
  { sku: 'SH0001-100', description: 'Shampoo Siam Roots 100 G', qty: 15, rate: 164.72 },
  { sku: 'SH0002-100', description: 'Shampoo Oriental 100 G', qty: 15, rate: 185.75 },
  { sku: 'SH0003-100', description: 'Shampoo Revive 100 G', qty: 15, rate: 164.72 },
  { sku: 'HT0001-220', description: 'Hair Conditioner Siam Roots 220 G', qty: 15, rate: 348.72 },
  { sku: 'HT0002-220', description: 'Hair Conditioner Oriental 220 G', qty: 15, rate: 392.53 },
  { sku: 'HT0003-220', description: 'Hair Conditioner Revive 220 G', qty: 15, rate: 348.72 },
  { sku: 'HT0001-90', description: 'Hair Conditioner Siam Roots 90 G', qty: 15, rate: 185.75 },
  { sku: 'HT0002-90', description: 'Hair Conditioner Oriental 90 G', qty: 15, rate: 206.78 },
  { sku: 'HT0003-90', description: 'Hair Conditioner Revive 90 G', qty: 15, rate: 185.75 },
  { sku: 'PE1001-12', description: 'Oriental Solid Perfume 12 g -COSMOS Natural certified by IONC Germany', qty: 15, rate: 243.58 },
  { sku: 'PE1002-12', description: 'Siam Spice Solid Perfume 12 g -COSMOS Natural', qty: 15, rate: 243.58 },
  { sku: 'PE1003-12', description: 'Jasmine Rose Solid Perfume 12 g -COSMOS Natural', qty: 15, rate: 243.58 },
  { sku: 'BOR001-5', description: 'Soothing Body Roll-on 5 G -COSMOS Organic certified by IONC Germany', qty: 20, rate: 82.37 },
  { sku: 'BOR002-5', description: 'Rejuvenating Body Roll-on 5 G -COSMOS Organic certified by IONC Germany', qty: 20, rate: 82.37 },
  { sku: 'BOR003-5', description: 'Night Time Body Roll-on 5 G -COSMOS Organic certified by IONC Germany', qty: 20, rate: 82.37 },
  { sku: 'BOR004-5', description: 'Meditation Body Roll-on 5 G -COSMOS Organic certified by IONC Germany', qty: 20, rate: 82.37 },
  { sku: 'BA0002-25', description: 'Rejuvenating Balm 25 G -COSMOS Natural certified by IONC Germany', qty: 15, rate: 164.72 },
  { sku: 'BA0003-25', description: 'Night Time Balm 25 G -COSMOS Natural certified by IONC Germany', qty: 15, rate: 164.72 },
  { sku: 'BA0004-25', description: 'Meditation Balm 25 G -COSMOS Natural', qty: 15, rate: 164.72 },
  { sku: 'BOA0001-90', description: 'Relaxing Bath Oil 90 G -COSMOS Natural certified by IONC Germany', qty: 15, rate: 122.67 },
  { sku: 'BOA0002-90', description: 'Reviving Bath Oil 90 G -COSMOS Natural certified by IONC Germany', qty: 15, rate: 122.67 },
  { sku: 'BOA0003-90', description: 'Refreshing Bath Oil 90 G -COSMOS Natural certified by IONC Germany', qty: 15, rate: 122.67 },
  { sku: 'SI0044-45', description: 'Organic Moringa Oil 45 G -COSMOS Organic certified by IONC Germany', qty: 15, rate: 508.18 },
  { sku: 'SI0046-45', description: 'Organic Argan Oil 45 G -COSMOS Organic certified by IONC Germany', qty: 15, rate: 329.45 },
  { sku: 'SI0103-45', description: 'Organic Jojoba Oil 45 G -COSMOS Organic', qty: 15, rate: 268.11 },
  { sku: 'SI0077-45', description: 'Cold Pressed Guava Oil 45 G -COSMOS Natural', qty: 30, rate: 346.97 },
  { sku: 'SI0057-45', description: 'Organic Rosehip Oil with Vitamin E 45 G -COSMOS Organic certified by IONC Germany', qty: 15, rate: 508.18 },
  { sku: 'SI0045-45', description: 'Organic Tamanu Oil with Vitamin E 45 G -COSMOS Organic certified by IONC Germany', qty: 15, rate: 494.16 },
  { sku: 'SI0104-45', description: 'Organic Sweet Almond Oil with Vitamin E 45 G -COSMOS Organic certified by IONC Germany', qty: 15, rate: 243.58 },
  { sku: 'SI0100-45', description: 'Organic Apricot Kernel Oil with Vitamin E 45 G -COSMOS Organic certified by IONC Germany', qty: 15, rate: 243.58 },
  { sku: 'FWH001-50', description: 'His Skin Tea Tree & Lime Face Wash 50g', qty: 20, rate: 205.03 },
  { sku: 'FLH001-50', description: 'His Skin Tea Tree & Lime Face Lotion 50g', qty: 20, rate: 243.58 },
  { sku: 'FOH001-50', description: 'His Skin Turmeric & Lime Face Oil 50g', qty: 20, rate: 534.47 },
];

/**
 * Рассчитывает цену с округлением до 10
 * Формула: цена_закупки * 2.45 * 8 = цена в рублях, округляем до 10
 */
function calculatePriceWithRounding(purchasePriceBAT: number, exchangeRate: number, multiplier: number): number {
  const priceInRubles = purchasePriceBAT * exchangeRate * multiplier;
  // Округляем до ближайшего десятка
  const roundedRubles = Math.round(priceInRubles / 10) * 10;
  // Конвертируем в PZ (1 PZ = 100 руб)
  const priceInPZ = roundedRubles / 100;
  return Math.round(priceInPZ * 100) / 100; // Округляем до 2 знаков
}

async function main() {
  console.log('🚀 Начало синхронизации товаров с инвойсом\n');
  
  // Получаем настройки
  const settings = await getImportSettings();
  console.log(`📊 Настройки:`);
  console.log(`   Курс обмена: ${settings.exchangeRate}`);
  console.log(`   Мультипликатор: ${settings.priceMultiplier}\n`);
  
  // Группируем товары по SKU (суммируем количество)
  const itemsBySku = new Map<string, { sku: string; description: string; qty: number; rate: number }>();
  
  invoiceItems.forEach(item => {
    if (itemsBySku.has(item.sku)) {
      const existing = itemsBySku.get(item.sku)!;
      existing.qty += item.qty;
    } else {
      itemsBySku.set(item.sku, { ...item });
    }
  });
  
  const uniqueItems = Array.from(itemsBySku.values());
  console.log(`📦 Уникальных товаров в инвойсе: ${uniqueItems.length}\n`);
  
  // Получаем все товары из базы
  const allProducts = await prisma.product.findMany({
    select: { id: true, sku: true, title: true },
  });
  
  console.log(`📦 Товаров в базе: ${allProducts.length}\n`);
  
  // Создаем Set SKU из инвойса
  const invoiceSkus = new Set(uniqueItems.map(item => item.sku));
  
  // Находим товары, которых нет в инвойсе
  const productsToDelete = allProducts.filter(p => p.sku && !invoiceSkus.has(p.sku));
  
  console.log(`🗑️  Товаров для удаления: ${productsToDelete.length}`);
  if (productsToDelete.length > 0) {
    console.log('   SKU товаров для удаления:');
    productsToDelete.forEach(p => {
      console.log(`     - ${p.sku}: ${p.title}`);
    });
  }
  
  // Удаляем товары, которых нет в инвойсе
  let deletedCount = 0;
  for (const product of productsToDelete) {
    try {
      await prisma.product.delete({
        where: { id: product.id },
      });
      deletedCount++;
      console.log(`   ✅ Удален: ${product.sku}`);
    } catch (error: any) {
      console.error(`   ❌ Ошибка удаления ${product.sku}: ${error.message}`);
    }
  }
  
  console.log(`\n✅ Удалено товаров: ${deletedCount}\n`);
  
  // Находим категорию "Косметика" и её подкатегории
  const cosmeticsCategory = await prisma.category.findFirst({
    where: { name: 'Косметика' },
  });
  
  if (!cosmeticsCategory) {
    console.log('❌ Категория "Косметика" не найдена');
    return;
  }
  
  const subcategories = await prisma.category.findMany({
    where: { name: { startsWith: 'Косметика >' } },
  });
  
  const subcategoryMap: Record<string, string> = {};
  subcategories.forEach(subcat => {
    const subcatName = subcat.name.replace('Косметика > ', '').trim();
    subcategoryMap[subcatName] = subcat.id;
  });
  
  // Функция для определения подкатегории
  function determineSubcategory(sku: string, description: string): string {
    const skuUpper = sku.toUpperCase();
    const descLower = description.toLowerCase();
    
    // Face Care
    if (skuUpper.startsWith('FS') || skuUpper.startsWith('FO') || skuUpper.startsWith('FC') || 
        skuUpper.startsWith('FB') || skuUpper.startsWith('FM') || skuUpper.startsWith('FWH') ||
        skuUpper.startsWith('FLH') || skuUpper.startsWith('FOH') ||
        descLower.includes('face') || descLower.includes('serum') || descLower.includes('cleanser') || 
        descLower.includes('tonic') || descLower.includes('balm') || descLower.includes('polish') ||
        descLower.includes('powder') || descLower.includes('lip balm')) {
      return 'Face Care';
    }
    
    // Hair Care
    if (skuUpper.startsWith('HT') || skuUpper.startsWith('SH') ||
        descLower.includes('hair') || descLower.includes('shampoo') || descLower.includes('conditioner')) {
      return 'Hair Care';
    }
    
    // Pure Organic Oils
    if (skuUpper.startsWith('SI') ||
        descLower.includes('oil') || descLower.includes('argan') || descLower.includes('jojoba') ||
        descLower.includes('rosehip') || descLower.includes('almond') || descLower.includes('moringa') ||
        descLower.includes('tamanu') || descLower.includes('guava') || descLower.includes('apricot')) {
      return 'Pure Organic Oils';
    }
    
    // Bath & Spa (по умолчанию)
    return 'Bath & Spa';
  }
  
  // Обновляем/создаем товары из инвойса
  let createdCount = 0;
  let updatedCount = 0;
  
  for (const item of uniqueItems) {
    try {
      // Определяем подкатегорию
      const subcategoryName = determineSubcategory(item.sku, item.description);
      const categoryId = subcategoryMap[subcategoryName] || cosmeticsCategory.id;
      
      // Рассчитываем цену с округлением до 10
      const calculatedPriceRub = item.rate * settings.exchangeRate * settings.priceMultiplier;
      const roundedPriceRub = Math.round(calculatedPriceRub / 10) * 10;
      const priceInPZ = roundedPriceRub / 100;
      
      // Ищем существующий товар
      const existingProduct = await prisma.product.findFirst({
        where: { sku: item.sku },
      });
      
      if (existingProduct) {
        // Обновляем существующий товар
        await prisma.product.update({
          where: { id: existingProduct.id },
          data: {
            title: item.description,
            price: Math.round(priceInPZ * 100) / 100,
            purchasePrice: item.rate,
            stock: item.qty,
            categoryId: categoryId,
            isActive: item.qty > 0,
          },
        });
        updatedCount++;
        console.log(`✅ Обновлен: ${item.sku} - ${item.description.substring(0, 50)} (${item.qty} шт, ${roundedPriceRub} руб)`);
      } else {
        // Создаем новый товар
        await prisma.product.create({
          data: {
            sku: item.sku,
            title: item.description,
            summary: item.description.substring(0, 200),
            description: item.description,
            price: Math.round(priceInPZ * 100) / 100,
            purchasePrice: item.rate,
            stock: item.qty,
            categoryId: categoryId,
            isActive: item.qty > 0,
            availableInRussia: true,
            availableInBali: true,
          },
        });
        createdCount++;
        console.log(`➕ Создан: ${item.sku} - ${item.description.substring(0, 50)} (${item.qty} шт, ${roundedPriceRub} руб)`);
      }
    } catch (error: any) {
      console.error(`❌ Ошибка обработки ${item.sku}: ${error.message}`);
    }
  }
  
  console.log('\n✅ Синхронизация завершена!');
  console.log(`   Создано: ${createdCount}`);
  console.log(`   Обновлено: ${updatedCount}`);
  console.log(`   Удалено: ${deletedCount}`);
  console.log(`   Всего в инвойсе: ${uniqueItems.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());








