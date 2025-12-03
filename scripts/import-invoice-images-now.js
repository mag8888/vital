#!/usr/bin/env node

/**
 * JavaScript wrapper для импорта изображений товаров из инвойса
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runImport() {
  try {
    console.log('🚀 Запуск импорта изображений для товаров из инвойса...\n');
    
    const { importImagesForInvoiceItems } = await import('../dist/services/invoice-images-service.js');
    const { PrismaClient } = await import('@prisma/client');
    
    const prisma = new PrismaClient();
    
    // Читаем данные из файла инвойса
    const invoiceFilePath = join(__dirname, '..', 'INVOICE_DATA.txt');
    console.log(`📄 Чтение данных из файла: ${invoiceFilePath}\n`);
    
    const invoiceText = readFileSync(invoiceFilePath, 'utf-8');
    
    // Импортируем изображения
    const result = await importImagesForInvoiceItems(invoiceText);
    
    // Выводим результаты
    console.log('\n📊 Результаты импорта изображений:');
    console.log(`   📦 Всего товаров в инвойсе: ${result.total}`);
    console.log(`   ✅ Найдено изображений: ${result.matched}`);
    console.log(`   💾 Обновлено товаров: ${result.updated}`);
    console.log(`   ❌ Ошибок: ${result.failed}`);
    console.log(`   ⏭️  Не найдено в БД: ${result.notFound}`);
    
    if (result.errors && result.errors.length > 0) {
      console.log('\n❌ Ошибки:');
      result.errors.slice(0, 10).forEach(e => {
        console.log(`   - ${e}`);
      });
      if (result.errors.length > 10) {
        console.log(`   ... и еще ${result.errors.length - 10} ошибок`);
      }
    }
    
    if (result.updated > 0) {
      console.log('\n✅ Импорт изображений завершен успешно!');
      console.log('🎉 Изображения обновлены в базе данных!');
    } else {
      console.log('\n⚠️  Изображения не были обновлены.');
    }
    
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Критическая ошибка при импорте изображений:', error);
    console.error('Детали:', error.message || error);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      await prisma.$disconnect();
    } catch {}
    
    process.exit(1);
  }
}

runImport();


