/**
 * Скрипт для парсинга PDF инвойса и извлечения данных о товарах
 * 
 * Использование:
 *   node scripts/parse-invoice-pdf.js "(Julia) -balance.pdf"
 */

import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

async function parseInvoiceText(text) {
  const items = new Map();
  
  // Разбиваем текст на строки
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  console.log('📄 Анализ текста PDF...\n');
  
  // Ищем паттерны товаров
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Пропускаем заголовки и служебные строки
    if (line.match(/^(Item|Description|Qty|Rate|Amount|Total|Page|Invoice|Date|Ship|Currency|Terms)/i)) {
      continue;
    }
    
    // Ищем строки с SKU (обычно начинаются с букв и цифр, например FS1002-24)
    const skuMatch = line.match(/^([A-Z]{1,3}\d{4,6}(?:-\d{2,3})?)/);
    if (skuMatch) {
      const sku = skuMatch[1];
      
      // Пытаемся извлечь данные из строки
      // Разделитель | или табуляция или пробелы
      const parts = line.split(/[\|\t]+/).map(p => p.trim()).filter(p => p.length > 0);
      
      if (parts.length >= 3) {
        // Пробуем найти числа в строке
        const numbers = line.match(/\d+\.?\d*/g);
        if (numbers && numbers.length >= 2) {
          // Обычно формат: SKU Description Qty Rate Amount
          // Ищем количество (обычно целое число)
          let qty = 0;
          let rate = 0;
          let amount = 0;
          
          // Пробуем разные варианты парсинга
          for (let j = 0; j < numbers.length; j++) {
            const num = parseFloat(numbers[j]);
            // Количество обычно меньше 1000 и целое
            if (num < 1000 && num === Math.floor(num) && qty === 0) {
              qty = num;
            } else if (num > 100 && num < 10000 && rate === 0) {
              rate = num;
            } else if (num > 1000 && amount === 0) {
              amount = num;
            }
          }
          
          if (qty > 0 && rate > 0) {
            // Извлекаем описание (между SKU и числами)
            const descMatch = line.match(/^[A-Z0-9-]+\s+(.+?)\s+\d/);
            const description = descMatch ? descMatch[1].trim() : parts[1] || '';
            
            if (items.has(sku)) {
              const existing = items.get(sku);
              existing.quantity += qty;
              existing.amount += amount;
            } else {
              items.set(sku, {
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
    }
  }
  
  return Array.from(items.values());
}

async function main() {
  const pdfPath = process.argv[2] || '(Julia) -balance.pdf';
  
  console.log(`📄 Чтение PDF файла: ${pdfPath}\n`);
  
  try {
    // Читаем PDF файл
    const dataBuffer = fs.readFileSync(pdfPath);
    // pdf-parse экспортируется как функция через require
    const data = await new Promise((resolve, reject) => {
      pdfParse(dataBuffer, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
    
    console.log(`📄 Текст извлечен (${data.text.length} символов)\n`);
    console.log('Первые 1000 символов:');
    console.log(data.text.substring(0, 1000));
    console.log('\n...\n');
    
    // Парсим данные
    const items = await parseInvoiceText(data.text);
    
    console.log(`\n📦 Найдено товаров: ${items.length}\n`);
    
    if (items.length === 0) {
      console.log('⚠️  Товары не найдены. Показываю первые 100 строк текста для анализа:');
      const lines = data.text.split('\n').slice(0, 100);
      lines.forEach((line, i) => {
        if (line.trim()) {
          console.log(`${i + 1}: ${line}`);
        }
      });
      return;
    }
    
    // Выводим найденные товары
    console.log('📋 Найденные товары:\n');
    items.forEach((item, index) => {
      console.log(`${index + 1}. ${item.sku}`);
      console.log(`   Описание: ${item.description.substring(0, 80)}...`);
      console.log(`   Количество: ${item.quantity}`);
      console.log(`   Цена: ${item.rate}`);
      console.log(`   Сумма: ${item.amount}\n`);
    });
    
    // Сохраняем в формате для импорта
    const importData = items.map(item => 
      `${item.sku}|${item.description}|${item.quantity}|${item.rate}|${item.amount}`
    ).join('\n');
    
    const outputPath = './PARSED_INVOICE_DATA.txt';
    fs.writeFileSync(outputPath, importData, 'utf-8');
    
    console.log(`\n✅ Данные сохранены в: ${outputPath}`);
    console.log(`\n📊 Итого:`);
    console.log(`   Товаров: ${items.length}`);
    console.log(`   Общее количество: ${items.reduce((sum, item) => sum + item.quantity, 0)}`);
    console.log(`   Общая сумма: ${items.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

main().catch(console.error);

