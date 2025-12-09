/**
 * Скрипт для импорта товаров из инвойса с переводом на русский
 * 
 * Использование:
 *   npm run import-invoice
 * 
 * Или через ts-node:
 *   npx ts-node scripts/import-invoice-products.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { getImportSettings, calculateSellingPrice } from '../src/services/invoice-import-service.js';
import { AITranslationService } from '../src/services/ai-translation-service.js';

const prisma = new PrismaClient();
const translationService = new AITranslationService();

// Читаем данные из файла PARSED_INVOICE.txt
let invoiceData = '';
try {
  invoiceData = readFileSync('./PARSED_INVOICE.txt', 'utf-8');
  // Убираем комментарии и пустые строки
  invoiceData = invoiceData.split('\n')
    .filter(line => line.trim() && !line.trim().startsWith('#'))
    .join('\n');
  console.log('✅ Данные загружены из PARSED_INVOICE.txt\n');
} catch (error) {
  console.warn('⚠️  Не удалось прочитать PARSED_INVOICE.txt, используем встроенные данные\n');
  // Данные из инвойса (резервный вариант)
  invoiceData = `
FS1002-24|Rudis Oleum Botanical Face Care Night Formula 24 G -COSMOS Organic certified by IONC Germany|18|453.86|8169.48
FS1002-24|Natural Balance Face Serum 24 G -COSMOS Natural certified by INC Germany|6|348.72|2092.32
FS1006-24|Rudis Oleum Botanical Face Care Repair Formula 24 G -COSMOS Organic certified by IONC Germany|2|488.91|977.82
FS1007-24|Rudis Oleum Botanical Face Care Replenish Formula 24 G -COSMOS Organic certified by IONC Germany|20|453.86|9077.20
FS0001-24|Natural Balance Face Serum 24 G -COSMOS Natural certified by INC Germany|14|348.72|4882.08
FO0001-30|Organic Rosehip & Jojoba Facial Oil 30 G -COSMOS Organic certified by IONC Germany|4|413.55|1654.20
FO0001-30|Organic Rosehip & Jojoba Facial Oil 30 G -COSMOS Organic certified by IONC Germany|16|413.55|6616.80
FO0002-30|Organic Cranberry & Jojoba Facial Oil 30 G -COSMOS Organic certified by IONC Germany|1|488.91|488.91
SP0016-95|Pre Serum Face Wash 95 G|19|488.91|9289.29
SP0016-95|Pre Serum Face Wash 95 G|6|329.45|1976.70
FC0001-45|Rose Hip & Tea Tree Face Cleanser 45 G -COSMOS Organic certified by IONC Germany|14|278.63|3900.82
FC0021-90|Face Milk Cleanser Siam Roots 90 G|20|348.72|6974.40
FC0021-90|Face Milk Cleanser Siam Roots 90 G|4|348.72|1394.88
FC0023-90|Aloe Pure Milk Cleanser 90 G|2|348.72|697.44
FC0023-90|Aloe Pure Milk Cleanser 90 G|4|348.72|1394.88
FC0023-90|Aloe Pure Milk Cleanser 90 G|14|348.72|4882.08
FC0020-90|Face Milk Cleanser Nurture 90 G|20|348.72|6974.40
FB0001-20|Argan & Moringa Face Polish 20 G -COSMOS Organic certified by IONC Germany|13|243.58|3166.54
FB0001-20|Argan & Moringa Face Polish 20 G -COSMOS Organic certified by IONC Germany|6|243.58|1461.48
FB0001-20|Argan & Moringa Face Polish 20 G -COSMOS Organic certified by IONC Germany|1|243.58|243.58
FB0003-20|Forest Berry Face Polish 20 G -COSMOS Natural certified by IONC Germany|20|243.58|4871.60
FS0016-50|Rose Water & Glycerin Facial Tonic 50 G -COSMOS Organic certified by IONC Germany|13|310.17|4032.21
\`;
}
FS0016-50|Rose Water & Glycerin Facial Tonic 50 G -COSMOS Organic certified by IONC Germany|7|310.17|2171.19
FS0018-50|Witch Hazel & Tea Tree Facial Tonic 50 G -COSMOS Organic certified by IONC Germany|3|310.17|930.51
FS0018-50|Witch Hazel & Tea Tree Facial Tonic 50 G -COSMOS Organic certified by IONC Germany|17|310.17|5272.89
FS0015-50|Witch Hazel Facial Toner 50 G -COSMOS Organic certified by IONC Germany|20|310.17|6203.40
FS0010-50|Rose Water 100% Pure Bulgarian 50 G -COSMOS Organic certified by IONC Germany|20|310.17|6203.40
PB0008-100|White Clay Facial Powder 100 G|20|453.86|9077.20
PB0011-180|Jasmine Rice Facial Powder 180 G|11|243.58|2679.38
PB0011-180|Jasmine Rice Facial Powder 180 G|9|243.58|2192.22
FM0001-20|Tamanu & Cucumber Face Balm 20 G -COSMOS Natural certified by IONC Germany|3|205.03|615.09
FM0001-20|Tamanu & Cucumber Face Balm 20 G -COSMOS Natural certified by IONC Germany|17|205.03|3485.51
BA1001-12|Coconut Lip Balm 12 G -COSMOS Natural certified by IONC Germany|20|115.66|2313.20
BA1002-12|Orange Lip Balm 12 G -COSMOS Natural certified by IONC Germany|11|115.66|1272.26
BA1002-12|Orange Lip Balm 12 G -COSMOS Natural certified by IONC Germany|9|115.66|1040.94
BA1003-12|Peppermint Lip Balm 12 G -COSMOS Natural certified by IONC Germany|14|115.66|1619.24
BA1003-12|Peppermint Lip Balm 12 G -COSMOS Natural certified by IONC Germany|6|115.66|693.96
SC1005-90|Organic Siam Roots Skin Conditioner 90 G -COSMOS Organic certified by IONC Germany|15|348.72|5230.80
SC1006-90|Oriental Jasmine & Ylang Ylang Skin Conditioner 90 G -COSMOS Natural certified by IONC Germany|15|348.72|5230.80
SC1007-90|Organic Revive Rosemary & Peppermint Skin Conditioner 90 G -COSMOS Organic certified by IONC Germany|15|385.52|5782.80
BL1001-220|Body Lotion Siam Roots 220 G|15|329.45|4941.75
BL1002-220|Body Lotion Oriental 220 G|4|348.72|1394.88
BL1002-220|Body Lotion Oriental 220 G|11|348.72|3835.92
BL1003-220|Body Lotion Revive 220 G|2|329.45|658.90
BL1003-220|Body Lotion Revive 220 G|13|329.45|4282.85
BL1001-90|Body Lotion Siam Roots 90 G|15|206.78|3101.70
BL1002-90|Body Lotion Oriental 90 G|15|227.81|3417.15
BL1003-90|Body Lotion Revive 90 G|4|206.78|827.12
BL1003-90|Body Lotion Revive 90 G|11|206.78|2274.58
BG0001-50|Bio Guard with Lemon Eucalyptus 50 G Alu -COSMOS Natural certified by IONC Germany|5|185.75|928.75
BG0001-50|Bio Guard with Lemon Eucalyptus 50 G Alu -COSMOS Natural certified by IONC Germany|10|185.75|1857.50
BG0002-25|Bio Guard Face Mineral Sun Protection 25 G|30|206.78|6203.40
BG0004-250|Shea Butter & Zinc Body Lotion with Amyris 250 G|15|523.95|7859.25
BG0003-250|Shea Butter & Zinc Body Lotion with Tea Tree 250 G|15|523.95|7859.25
SP0020-230|Body Wash Siam Roots 230 G|15|243.58|3653.70
SP0021-230|Body Wash Oriental 230 G|15|278.63|4179.45
SP0022-230|Body Wash Revive 230 G|15|243.58|3653.70
SP0020-100|Body Wash Siam Roots 100 G|15|138.44|2076.60
SP0021-100|Body Wash Oriental 100 G|8|164.72|1317.76
SP0021-100|Body Wash Oriental 100 G|7|164.72|1153.04
SP0022-100|Body Wash Revive 100 G|9|138.44|1245.96
SP0003-50|Natural Ginger Soap 50 G|6|138.44|830.64
SP0014-50|Salt Soap - Lemongrass 50 G|30|61.34|1840.20
SP0015-50|Salt Scrub Soap - Clove 50 G|30|61.34|1840.20
SP0015-100|Salt Soap - Lemongrass 100 G|30|103.39|3101.70
SP0014-100|Salt Scrub Soap - Clove 100 G|30|103.39|3101.70
SP0004-50|Natural Kaffir Lime Shampoo Bar 50 G|30|61.34|1840.20
BP0001-250|Virgin Coconut Body Scrub 250 G -COSMOS Natural certified by IONC Germany|15|243.58|3653.70
BP0002-250|Passionfruit & Lime Body Scrub 250 G -COSMOS Natural certified by IONC Germany|15|243.58|3653.70
HT0011-45|Argan & Lemon Balm Hair Treatment 45 G -COSMOS Organic certified by IONC Germany|5|348.72|1743.60
HT0011-45|Argan & Lemon Balm Hair Treatment 45 G -COSMOS Organic certified by IONC Germany|10|348.72|3487.20
HT0012-45|Coconut & Curry Leaf Hair Treatment 45 G -COSMOS Organic|6|243.58|1461.48
HT0012-45|Coconut & Curry Leaf Hair Treatment 45 G -COSMOS Organic|9|243.58|2192.22
SH0001-230|Shampoo Siam Roots 230 G|15|289.14|4337.10
SH0002-230|Shampoo Oriental 230 G|15|348.72|5230.80
SH0003-230|Shampoo Revive 230 G|15|289.14|4337.10
SH0001-100|Shampoo Siam Roots 100 G|15|164.72|2470.80
SH0002-100|Shampoo Oriental 100 G|15|185.75|2786.25
SH0003-100|Shampoo Revive 100 G|15|164.72|2470.80
HT0001-220|Hair Conditioner Siam Roots 220 G|15|348.72|5230.80
HT0002-220|Hair Conditioner Oriental 220 G|1|392.53|392.53
HT0002-220|Hair Conditioner Oriental 220 G|13|392.53|5102.89
HT0003-220|Hair Conditioner Revive 220 G|1|392.53|392.53
HT0001-90|Hair Conditioner Siam Roots 90 G|15|185.75|2786.25
HT0002-90|Hair Conditioner Oriental 90 G|15|348.72|5230.80
HT0003-90|Hair Conditioner Revive 90 G|15|185.75|2786.25
PF1001-12|Oriental Solid Perfume 12 g -COSMOS Natural certified by IONC Germany|15|243.58|3653.70
PF1002-12|Siam Spice Solid Perfume 12 g -COSMOS Natural|15|243.58|3653.70
PF1003-12|Jasmine Rose Solid Perfume 12 g -COSMOS Natural|15|243.58|3653.70
BOR001-5|Soothing Body Roll-on 5 G -COSMOS Organic certified by IONC Germany|20|82.37|1647.40
BOR002-5|Rejuvenating Body Roll-on 5 G -COSMOS Organic certified by IONC Germany|20|82.37|1647.40
BOR003-5|Night Time Body Roll-on 5 G -COSMOS Organic certified by IONC Germany|20|82.37|1647.40
BOR004-5|Meditation Body Roll-on 5 G -COSMOS Organic certified by IONC Germany|20|82.37|1647.40
BOA0003-90|Refreshing Bath Oil 90 G -COSMOS Natural certified by IONC Germany|15|122.67|1840.05
SI0046-45|Organic Argan Oil 45 G -COSMOS Organic certified by IONC Germany|30|508.18|15245.40
SI0077-45|Organic Jojoba Oil 45 G -COSMOS Organic|15|329.45|4941.75
SI0103-45|Cold Pressed Guava Oil 45 G -COSMOS Natural|15|268.11|4021.65
SI0057-45|Organic Rosehip Oil with Vitamin E 45 G -COSMOS Organic certified by IONC Germany|15|508.18|7622.70
SI0045-45|Organic Tamanu Oil with Vitamin E 45 G -COSMOS Organic certified by IONC Germany|15|494.16|7412.40
SI0104-45|Organic Sweet Almond Oil with Vitamin E 45 G -COSMOS Organic certified by IONC Germany|15|243.58|3653.70
SI0100-45|Organic Apricot Kernel Oil with Vitamin E 45 G -COSMOS Organic certified by IONC Germany|15|243.58|3653.70
FWH001-50|His Skin Tea Tree & Lime Face Wash 50g|20|205.03|4100.60
FDH001-50|His Skin Tea Tree & Lime Face Lotion 50g|20|243.58|4871.60
FOH001-50|His Skin Turmeric & Lime Face Oil 50g|20|534.47|10689.40
SI0044-45|Organic Moringa Oil 45 G -COSMOS Organic certified by IONC Germany|15|346.97|5204.55
BA0002-25|Rejuvenating Balm 25 G -COSMOS Natural certified by IONC Germany|15|164.72|2470.80
BA0003-25|Night Time Balm 25 G -COSMOS Natural certified by IONC Germany|15|164.72|2470.80
BA0004-25|Meditation Balm 25 G -COSMOS Natural|15|164.72|2470.80
BOA0001-90|Relaxing Bath Oil 90 G -COSMOS Natural certified by IONC Germany|15|122.67|1840.05
BOA0002-90|Reviving Bath Oil 90 G -COSMOS Natural certified by IONC Germany|15|122.67|1840.05
`;

interface InvoiceItem {
  sku: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

function parseInvoiceData(text: string): InvoiceItem[] {
  const items: InvoiceItem[] = [];
  const itemsMap = new Map<string, InvoiceItem>();
  
  const lines = text.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const parts = line.split('|').map(p => p.trim());
    if (parts.length >= 5) {
      const sku = parts[0];
      const description = parts[1];
      const qty = parseInt(parts[2]) || 0;
      const rate = parseFloat(parts[3]) || 0;
      const amount = parseFloat(parts[4]) || 0;
      
      if (sku && qty > 0 && rate > 0) {
        if (itemsMap.has(sku)) {
          const existing = itemsMap.get(sku)!;
          existing.quantity += qty;
          existing.amount += amount;
        } else {
          itemsMap.set(sku, {
            sku,
            description,
            quantity: qty,
            rate,
            amount
          });
        }
      }
    }
  }
  
  return Array.from(itemsMap.values());
}

async function translateToRussian(text: string): Promise<string> {
  if (!translationService.isEnabled()) {
    console.warn('⚠️  AI Translation не настроен, используем оригинальное название');
    return text;
  }
  
  try {
    const translated = await translationService.translateTitle(text);
    return translated;
  } catch (error) {
    console.error('Ошибка перевода:', error);
    return text;
  }
}

async function main() {
  console.log('🚀 Начало импорта товаров из инвойса\n');
  
  // Удаляем все существующие товары
  console.log('🗑️  Удаление всех существующих товаров...');
  const deleteResult = await prisma.product.deleteMany({});
  console.log(`   ✅ Удалено товаров: ${deleteResult.count}\n`);
  
  // Получаем настройки
  const settings = await getImportSettings();
  console.log(`📊 Настройки импорта:`);
  console.log(`   Курс обмена: ${settings.exchangeRate}`);
  console.log(`   Мультипликатор: ${settings.priceMultiplier}\n`);
  
  // Парсим данные инвойса
  const items = parseInvoiceData(invoiceData);
  console.log(`📦 Найдено товаров: ${items.length}\n`);
  
  // Получаем или создаем категорию по умолчанию
  let defaultCategory = await prisma.category.findFirst({
    where: { slug: 'default' }
  });
  
  if (!defaultCategory) {
    defaultCategory = await prisma.category.create({
      data: {
        name: 'По умолчанию',
        slug: 'default',
        isActive: true
      }
    });
    console.log('✅ Создана категория "По умолчанию"');
  }
  
  let created = 0;
  let failed = 0;
  
  for (const item of items) {
    try {
      // Ищем существующий товар по SKU
      const existingProduct = await prisma.product.findFirst({
        where: {
          OR: [
            { sku: item.sku },
            { title: { contains: item.sku, mode: 'insensitive' } }
          ]
        }
      });
      
      // Рассчитываем продажную цену
      const sellingPrice = calculateSellingPrice(item.rate, settings.exchangeRate, settings.priceMultiplier);
      
      // Переводим название на русский
      console.log(`🔄 Обработка: ${item.sku} - ${item.description}`);
      const russianTitle = await translateToRussian(item.description);
      console.log(`   → ${russianTitle}`);
      
      // Всегда создаем новый товар (так как все старые удалены)
      await prisma.product.create({
        data: {
          title: russianTitle,
          summary: russianTitle,
          description: item.description,
          price: sellingPrice,
          purchasePrice: item.rate,
          sku: item.sku,
          stock: item.quantity, // Используем остаток из инвойса
          isActive: item.quantity > 0,
          categoryId: defaultCategory.id,
          availableInRussia: true,
          availableInBali: false,
          lowStockThreshold: 3
        }
      });
      created++;
      console.log(`   ✅ Создан (остаток: ${item.quantity}, цена: ${sellingPrice.toFixed(2)} PZ)\n`);
      
      // Пауза между запросами (чтобы не перегружать API перевода)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error: any) {
      failed++;
      console.error(`   ❌ Ошибка: ${error.message}\n`);
    }
  }
  
  console.log('\n✅ Импорт завершен!');
  console.log(`   Создано: ${created}`);
  console.log(`   Ошибок: ${failed}`);
  console.log(`   Всего: ${items.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

