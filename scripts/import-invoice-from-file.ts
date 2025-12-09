/**
 * Скрипт для импорта товаров из файла инвойса (PDF или текстовый)
 * 
 * Использование:
 *   npx ts-node --esm scripts/import-invoice-from-file.ts /path/to/invoice.pdf
 *   или
 *   npx ts-node --esm scripts/import-invoice-from-file.ts /path/to/invoice.txt
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { getImportSettings, calculateSellingPrice } from '../src/services/invoice-import-service.js';
import { AITranslationService } from '../src/services/ai-translation-service.js';

const prisma = new PrismaClient();
const translationService = new AITranslationService();

interface InvoiceItem {
  sku: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

/**
 * Парсит текстовый файл инвойса
 */
function parseInvoiceFromText(text: string): InvoiceItem[] {
  const items: InvoiceItem[] = [];
  const itemsMap = new Map<string, InvoiceItem>();
  
  const lines = text.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    // Пытаемся найти паттерн: SKU|Description|Qty|Rate|Amount
    // Или просто ищем строки с данными товара
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

/**
 * Извлекает текст из PDF (простая версия, для сложных PDF может потребоваться библиотека)
 */
async function extractTextFromPDF(filePath: string): Promise<string> {
  // Для работы с PDF нужна библиотека pdf-parse или pdfjs-dist
  // Пока возвращаем пустую строку и просим пользователя предоставить текстовый файл
  throw new Error('PDF парсинг пока не реализован. Пожалуйста, предоставьте данные в текстовом формате (SKU|Description|Qty|Rate|Amount)');
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
  const filePath = process.argv[2];
  
  if (!filePath) {
    console.error('❌ Укажите путь к файлу инвойса:');
    console.error('   npx ts-node --esm scripts/import-invoice-from-file.ts /path/to/invoice.txt');
    process.exit(1);
  }
  
  console.log(`📄 Чтение файла: ${filePath}\n`);
  
  let invoiceText = '';
  
  try {
    if (filePath.endsWith('.pdf')) {
      invoiceText = await extractTextFromPDF(filePath);
    } else {
      invoiceText = readFileSync(filePath, 'utf-8');
    }
  } catch (error: any) {
    console.error(`❌ Ошибка чтения файла: ${error.message}`);
    process.exit(1);
  }
  
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
  const items = parseInvoiceFromText(invoiceText);
  console.log(`📦 Найдено товаров: ${items.length}\n`);
  
  if (items.length === 0) {
    console.error('❌ Не удалось распознать товары в файле. Убедитесь, что формат: SKU|Description|Qty|Rate|Amount');
    process.exit(1);
  }
  
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
      // Рассчитываем продажную цену
      const sellingPrice = calculateSellingPrice(item.rate, settings.exchangeRate, settings.priceMultiplier);
      
      // Переводим название на русский
      console.log(`🔄 Обработка: ${item.sku} - ${item.description}`);
      const russianTitle = await translateToRussian(item.description);
      console.log(`   → ${russianTitle}`);
      
      // Создаем новый товар
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

