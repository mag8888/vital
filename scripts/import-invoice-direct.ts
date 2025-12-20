/**
 * Прямой импорт товаров из PARSED_INVOICE.txt
 * Без перевода (для быстрого импорта)
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { getImportSettings, calculateSellingPrice, parseInvoiceFromDelimitedText, importInvoiceItems } from '../src/services/invoice-import-service.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Начало импорта товаров из инвойса\n');
  
  // Удаляем все существующие товары
  console.log('🗑️  Удаление всех существующих товаров...');
  const deleteResult = await prisma.product.deleteMany({});
  console.log(`   ✅ Удалено товаров: ${deleteResult.count}\n`);
  
  // Читаем данные из файла
  console.log('📄 Чтение PARSED_INVOICE.txt...');
  let invoiceText = '';
  try {
    invoiceText = readFileSync('./PARSED_INVOICE.txt', 'utf-8');
    console.log('   ✅ Файл прочитан\n');
  } catch (error) {
    console.error('   ❌ Ошибка чтения файла:', error);
    process.exit(1);
  }
  
  // Парсим данные
  console.log('📦 Парсинг данных инвойса...');
  const items = parseInvoiceFromDelimitedText(invoiceText);
  console.log(`   ✅ Найдено товаров: ${items.length}\n`);
  
  if (items.length === 0) {
    console.error('❌ Товары не найдены в файле!');
    process.exit(1);
  }
  
  // Импортируем товары
  console.log('🔄 Импорт товаров...\n');
  const result = await importInvoiceItems(items);
  
  console.log('\n✅ Импорт завершен!');
  console.log(`   Всего товаров: ${result.created + result.updated}`);
  console.log(`   Создано: ${result.created}`);
  console.log(`   Обновлено: ${result.updated}`);
  console.log(`   Ошибок: ${result.failed}`);
  
  if (result.lowStockWarnings.length > 0) {
    console.log(`\n⚠️  Низкий остаток у ${result.lowStockWarnings.length} товаров`);
  }
  
  if (result.outOfStock.length > 0) {
    console.log(`\n🛑 Товары закончились: ${result.outOfStock.length}`);
  }
  
  if (result.errors.length > 0) {
    console.log(`\n❌ Ошибки:`);
    result.errors.slice(0, 10).forEach(err => console.log(`   - ${err}`));
    if (result.errors.length > 10) {
      console.log(`   ... и еще ${result.errors.length - 10} ошибок`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());








