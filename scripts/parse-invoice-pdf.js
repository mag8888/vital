/**
 * Скрипт для парсинга PDF инвойса и извлечения данных о товарах
 * 
 * Использование:
 *   node scripts/parse-invoice-pdf.js "(Julia) -balance.pdf"
 */

import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// pdf-parse v2 использует класс PDFParse
const { PDFParse } = require('pdf-parse');

async function parseInvoiceText(text) {
  const items = new Map();
  
  // Разбиваем текст на строки
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  console.log('📄 Анализ текста PDF...\n');
  
  let currentSku = null;
  let currentDescription = [];
  let currentQty = null;
  let currentRate = null;
  let currentAmount = null;
  
  // Ищем паттерны товаров
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Пропускаем заголовки и служебные строки
    if (line.match(/^(Item|Description|Qty|Rate|Amount|Total|Page|Invoice|Date|Ship|Currency|Terms|We hereby|Wai Thai|Branch|Attn:)/i)) {
      continue;
    }
    
    // Ищем строки с SKU (обычно начинаются с букв и цифр, например FS1002-24)
    const skuMatch = line.match(/^([A-Z]{1,3}\d{4,6}(?:-\d{2,3})?)/);
    
    if (skuMatch) {
      // Сохраняем предыдущий товар, если есть
      if (currentSku && currentQty !== null && currentRate !== null) {
        const description = currentDescription.join(' ').trim();
        if (items.has(currentSku)) {
          const existing = items.get(currentSku);
          existing.quantity += currentQty;
          existing.amount += (currentAmount || currentQty * currentRate);
        } else {
          items.set(currentSku, {
            sku: currentSku,
            description: description,
            quantity: currentQty,
            rate: currentRate,
            amount: currentAmount || currentQty * currentRate
          });
        }
      }
      
      // Начинаем новый товар
      currentSku = skuMatch[1];
      currentDescription = [];
      currentQty = null;
      currentRate = null;
      currentAmount = null;
      
      // Извлекаем описание из этой строки (после SKU)
      const descPart = line.substring(skuMatch[0].length).trim();
      if (descPart && !descPart.match(/^\d/)) {
        currentDescription.push(descPart);
      }
      
      // Пробуем найти числа в этой строке
      const numbers = line.match(/\d+[.,]?\d*/g);
      if (numbers && numbers.length >= 2) {
        // Ищем последние 3 числа (Qty, Rate, Amount)
        const nums = numbers.slice(-3).map(n => parseFloat(n.replace(',', '')));
        if (nums.length >= 2) {
          // Количество обычно целое и меньше 1000
          if (nums[0] < 1000 && nums[0] === Math.floor(nums[0])) {
            currentQty = nums[0];
            currentRate = nums[1];
            currentAmount = nums[2] || null;
          } else if (nums[1] < 1000 && nums[1] === Math.floor(nums[1])) {
            currentQty = nums[1];
            currentRate = nums[0];
            currentAmount = nums[2] || null;
          }
        }
      }
    } else if (currentSku) {
      // Продолжение описания товара
      // Проверяем, не является ли это строкой с числами (Qty, Rate, Amount)
      const numbers = line.match(/\d+[.,]?\d*/g);
      if (numbers && numbers.length >= 2) {
        // Это строка с данными о количестве и цене
        const nums = numbers.map(n => parseFloat(n.replace(',', '')));
        if (nums.length >= 2) {
          // Ищем количество (целое число меньше 1000)
          for (let j = 0; j < nums.length; j++) {
            if (nums[j] < 1000 && nums[j] === Math.floor(nums[j])) {
              currentQty = nums[j];
              currentRate = nums[j + 1] || nums[j - 1] || currentRate;
              currentAmount = nums[nums.length - 1] || null;
              break;
            }
          }
        }
      } else if (!line.match(/^\d/)) {
        // Это продолжение описания
        currentDescription.push(line);
      }
    }
  }
  
  // Сохраняем последний товар
  if (currentSku && currentQty !== null && currentRate !== null) {
    const description = currentDescription.join(' ').trim();
    if (items.has(currentSku)) {
      const existing = items.get(currentSku);
      existing.quantity += currentQty;
      existing.amount += (currentAmount || currentQty * currentRate);
    } else {
      items.set(currentSku, {
        sku: currentSku,
        description: description,
        quantity: currentQty,
        rate: currentRate,
        amount: currentAmount || currentQty * currentRate
      });
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
    
    // Используем PDFParse класс из pdf-parse v2
    // Создаем временный файл или используем data URL
    const parser = new PDFParse({ 
      url: `file://${process.cwd()}/${pdfPath}` 
    });
    const data = await parser.getText();
    
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
    
    // Обновляем PARSED_INVOICE.txt
    const outputPath = './PARSED_INVOICE.txt';
    const header = '# Данные инвойса в формате: SKU|Description|Qty|Rate|Amount\n\n';
    fs.writeFileSync(outputPath, header + importData, 'utf-8');
    
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

