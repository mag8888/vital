/**
 * Скрипт для парсинга PDF инвойса и извлечения данных о товарах
 * 
 * Использование:
 *   npx ts-node --esm scripts/parse-invoice-pdf.ts
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import pdf from 'pdf-parse';

interface InvoiceItem {
  sku: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

/**
 * Парсит текст из PDF и извлекает данные о товарах
 */
function parseInvoiceText(text: string): InvoiceItem[] {
  const items: InvoiceItem[] = [];
  const itemsMap = new Map<string, InvoiceItem>();
  
  // Разбиваем текст на строки
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  console.log('📄 Анализ текста PDF...\n');
  
  // Ищем паттерны товаров
  // Обычно в инвойсе формат: SKU | Description | Qty | Rate | Amount
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Пропускаем заголовки и служебные строки
    if (line.match(/^(Item|Description|Qty|Rate|Amount|Total|Page|Invoice|Date)/i)) {
      continue;
    }
    
    // Ищем строки с SKU (обычно начинаются с букв и цифр, например FS1002-24)
    const skuMatch = line.match(/^([A-Z]{1,3}\d{4,6}(?:-\d{2,3})?)/);
    if (skuMatch) {
      const sku = skuMatch[1];
      
      // Пытаемся извлечь данные из строки
      // Формат может быть разным, пробуем разные варианты
      
      // Вариант 1: Разделитель | или табуляция
      const parts = line.split(/[\|\t]+/).map(p => p.trim()).filter(p => p.length > 0);
      
      if (parts.length >= 5) {
        const description = parts[1] || '';
        const qty = parseFloat(parts[2]?.replace(/[^\d.]/g, '')) || 0;
        const rate = parseFloat(parts[3]?.replace(/[^\d.]/g, '')) || 0;
        const amount = parseFloat(parts[4]?.replace(/[^\d.]/g, '')) || 0;
        
        if (qty > 0 && rate > 0) {
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
          continue;
        }
      }
      
      // Вариант 2: Пробуем найти числа в строке
      const numbers = line.match(/\d+\.?\d*/g);
      if (numbers && numbers.length >= 3) {
        // Обычно: SKU Description Qty Rate Amount
        const qty = parseFloat(numbers[0]) || 0;
        const rate = parseFloat(numbers[1]) || 0;
        const amount = parseFloat(numbers[2]) || 0;
        
        if (qty > 0 && rate > 0) {
          // Извлекаем описание (между SKU и числами)
          const descMatch = line.match(/^[A-Z0-9-]+\s+(.+?)\s+\d/);
          const description = descMatch ? descMatch[1].trim() : '';
          
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
  }
  
  return Array.from(itemsMap.values());
}

async function main() {
  const pdfPath = process.argv[2] || './vital/(Julia) -balance.pdf';
  
  console.log(`📄 Чтение PDF файла: ${pdfPath}\n`);
  
  try {
    // Читаем PDF файл
    const dataBuffer = readFileSync(pdfPath);
    const data = await pdf(dataBuffer);
    
    console.log(`📄 Текст извлечен (${data.text.length} символов)\n`);
    console.log('Первые 500 символов:');
    console.log(data.text.substring(0, 500));
    console.log('\n...\n');
    
    // Парсим данные
    const items = parseInvoiceText(data.text);
    
    console.log(`\n📦 Найдено товаров: ${items.length}\n`);
    
    if (items.length === 0) {
      console.log('⚠️  Товары не найдены. Показываю первые 50 строк текста для анализа:');
      const lines = data.text.split('\n').slice(0, 50);
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
      console.log(`   Описание: ${item.description.substring(0, 60)}...`);
      console.log(`   Количество: ${item.quantity}`);
      console.log(`   Цена: ${item.rate}`);
      console.log(`   Сумма: ${item.amount}\n`);
    });
    
    // Сохраняем в формате для импорта
    const importData = items.map(item => 
      `${item.sku}|${item.description}|${item.quantity}|${item.rate}|${item.amount}`
    ).join('\n');
    
    const outputPath = './PARSED_INVOICE_DATA.txt';
    const fs = await import('fs');
    fs.writeFileSync(outputPath, importData, 'utf-8');
    
    console.log(`\n✅ Данные сохранены в: ${outputPath}`);
    console.log(`\n📊 Итого:`);
    console.log(`   Товаров: ${items.length}`);
    console.log(`   Общее количество: ${items.reduce((sum, item) => sum + item.quantity, 0)}`);
    console.log(`   Общая сумма: ${items.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}`);
    
  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

main().catch(console.error);








