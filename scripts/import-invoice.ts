#!/usr/bin/env node

/**
 * Скрипт для импорта товаров из инвойса
 * 
 * Использование:
 * npm run build && node scripts/import-invoice-now.js
 * или
 * ts-node --esm scripts/import-invoice.ts
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseInvoiceFromDelimitedText, importInvoiceItems } from '../src/services/invoice-import-service.js';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🚀 Запуск импорта товаров из инвойса...\n');
    
    // Читаем данные из файла
    const invoiceFilePath = join(__dirname, '..', 'INVOICE_DATA.txt');
    console.log(`📄 Чтение данных из файла: ${invoiceFilePath}\n`);
    
    const invoiceText = readFileSync(invoiceFilePath, 'utf-8');
    
    // Парсим данные
    console.log('🔍 Парсинг данных инвойса...');
    const items = parseInvoiceFromDelimitedText(invoiceText);
    
    if (items.length === 0) {
      console.error('❌ Не удалось распознать товары в инвойсе!');
      process.exit(1);
    }
    
    console.log(`✅ Распознано ${items.length} уникальных товаров\n`);
    
    // Показываем первые несколько товаров для проверки
    console.log('📋 Примеры распознанных товаров:');
    items.slice(0, 5).forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.sku} - ${item.description.substring(0, 50)}... (${item.quantity} шт, ${item.rate} БАТ)`);
    });
    if (items.length > 5) {
      console.log(`   ... и еще ${items.length - 5} товаров\n`);
    } else {
      console.log('');
    }
    
    // Импортируем товары
    console.log('💾 Начало импорта товаров в базу данных...\n');
    const result = await importInvoiceItems(items);
    
    // Выводим результаты
    console.log('\n📊 Результаты импорта:');
    console.log(`   ✅ Обновлено товаров: ${result.updated}`);
    console.log(`   ➕ Создано товаров: ${result.created}`);
    console.log(`   ❌ Ошибок: ${result.failed}`);
    console.log(`   📦 Всего обработано: ${result.updated + result.created + result.failed}`);
    
    if (result.lowStockWarnings.length > 0) {
      console.log(`\n⚠️  Предупреждений о низком остатке: ${result.lowStockWarnings.length}`);
      console.log('   Первые несколько:');
      result.lowStockWarnings.slice(0, 3).forEach(w => {
        console.log(`   - ${w}`);
      });
      if (result.lowStockWarnings.length > 3) {
        console.log(`   ... и еще ${result.lowStockWarnings.length - 3} предупреждений`);
      }
    }
    
    if (result.outOfStock.length > 0) {
      console.log(`\n🛑 Товаров с нулевым остатком: ${result.outOfStock.length}`);
      console.log('   Первые несколько:');
      result.outOfStock.slice(0, 3).forEach(w => {
        console.log(`   - ${w}`);
      });
      if (result.outOfStock.length > 3) {
        console.log(`   ... и еще ${result.outOfStock.length - 3} товаров`);
      }
    }
    
    if (result.errors.length > 0) {
      console.log(`\n❌ Ошибки импорта: ${result.errors.length}`);
      console.log('   Первые несколько:');
      result.errors.slice(0, 5).forEach(e => {
        console.log(`   - ${e}`);
      });
      if (result.errors.length > 5) {
        console.log(`   ... и еще ${result.errors.length - 5} ошибок`);
      }
    }
    
    if (result.updated > 0 || result.created > 0) {
      console.log('\n✅ Импорт завершен успешно!');
      console.log('🎉 Товары обновлены в базе данных!');
    } else {
      console.log('\n⚠️  Импорт завершен, но товары не были добавлены или обновлены.');
    }
    
    await prisma.$disconnect();
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Критическая ошибка при импорте:', error);
    console.error('Детали:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();

