/**
 * Улучшенный парсер PDF инвойса
 * Обрабатывает все страницы и правильно извлекает все товары
 */

import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

async function parseInvoiceText(text) {
  const items = new Map();
  
  // Разбиваем текст на строки
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  console.log('📄 Анализ текста PDF...');
  console.log(`   Всего строк: ${lines.length}\n`);
  
  let currentSku = null;
  let currentDescription = [];
  let currentQty = null;
  let currentRate = null;
  let currentAmount = null;
  let inItemSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Пропускаем заголовки и служебные строки
    if (line.match(/^(Item|Description|Qty|Rate|Amount|Total|Page|Invoice|Date|Ship|Currency|Terms|We hereby|Wai Thai|Branch|Attn:|Name \/ Address|Tel:|-- \d+ of \d+ --)/i)) {
      if (line.match(/^Item Description/i)) {
        inItemSection = true;
      }
      continue;
    }
    
    // Если мы не в секции товаров, пропускаем
    if (!inItemSection && !line.match(/^[A-Z]{1,3}\d{4,6}/)) {
      continue;
    }
    
    // Ищем строки с SKU (обычно начинаются с букв и цифр, например FS1002-24)
    const skuMatch = line.match(/^([A-Z]{1,3}\d{4,6}(?:-\d{2,3})?)/);
    
    if (skuMatch) {
      // Сохраняем предыдущий товар, если есть
      if (currentSku && currentQty !== null && currentRate !== null) {
        const description = currentDescription.join(' ').trim();
        // Очищаем описание от служебных строк
        const cleanDesc = description
          .replace(/Name \/ Address.*?In Advance \/FOB Air/gi, '')
          .replace(/SPA Consultant Company.*?Bangkok 10250/gi, '')
          .replace(/Please make payment to:.*?Swift Code:[A-Z]+/gi, '')
          .trim();
        
        if (items.has(currentSku)) {
          const existing = items.get(currentSku);
          existing.quantity += currentQty;
          existing.amount += (currentAmount !== null ? currentAmount : currentQty * currentRate);
          // Обновляем описание, если оно длиннее
          if (cleanDesc.length > existing.description.length) {
            existing.description = cleanDesc;
          }
        } else {
          items.set(currentSku, {
            sku: currentSku,
            description: cleanDesc,
            quantity: currentQty,
            rate: currentRate,
            amount: currentAmount !== null ? currentAmount : currentQty * currentRate
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
      let remainingLine = line.substring(skuMatch[0].length).trim();
      
      // Пробуем найти числа в оставшейся части строки
      const numbersInLine = remainingLine.match(/(\d+[.,]?\d*)/g);
      
      if (numbersInLine && numbersInLine.length >= 2) {
        // Предполагаем, что последние 2-3 числа - это Qty, Rate, Amount
        const parsedNumbers = numbersInLine.map(n => parseFloat(n.replace(/,/g, '')));
        
        // Ищем Qty как первое целое число, которое не слишком большое (до 1000)
        let tempQty = 0;
        let tempRate = 0;
        let tempAmount = 0;
        let qtyIndex = -1;
        
        for (let j = 0; j < parsedNumbers.length; j++) {
          if (parsedNumbers[j] === Math.floor(parsedNumbers[j]) && parsedNumbers[j] > 0 && parsedNumbers[j] < 1000) {
            tempQty = parsedNumbers[j];
            qtyIndex = j;
            break;
          }
        }
        
        if (qtyIndex !== -1) {
          // Если нашли Qty, то Rate и Amount должны быть после него
          if (parsedNumbers.length > qtyIndex + 1) {
            tempRate = parsedNumbers[qtyIndex + 1];
          }
          if (parsedNumbers.length > qtyIndex + 2) {
            tempAmount = parsedNumbers[qtyIndex + 2];
          } else if (parsedNumbers.length > qtyIndex + 1) {
            // Если Amount отсутствует, то Rate может быть последним числом
            tempAmount = tempQty * tempRate; // Рассчитываем Amount
          }
        } else if (parsedNumbers.length >= 3) {
          // Если Qty не найдено как первое целое, пробуем последние 3 числа
          tempQty = parsedNumbers[parsedNumbers.length - 3];
          tempRate = parsedNumbers[parsedNumbers.length - 2];
          tempAmount = parsedNumbers[parsedNumbers.length - 1];
        } else if (parsedNumbers.length === 2) {
          // Если только 2 числа, то это Qty и Rate, Amount рассчитываем
          tempQty = parsedNumbers[0];
          tempRate = parsedNumbers[1];
          tempAmount = tempQty * tempRate;
        }
        
        if (tempQty > 0 && tempRate > 0) {
          currentQty = tempQty;
          currentRate = tempRate;
          currentAmount = tempAmount;
          
          // Удаляем числа из описания
          remainingLine = remainingLine.replace(new RegExp(numbersInLine.map(n => `\\b${n.replace('.', '\\.').replace(',', '')}\\b`).join('|'), 'g'), '').trim();
        }
      }
      
      if (remainingLine && !remainingLine.match(/^\d/)) {
        currentDescription.push(remainingLine);
      }
      
    } else if (currentSku) {
      // Продолжение описания товара или строка с числами (Qty, Rate, Amount)
      const numbersInLine = line.match(/(\d+[.,]?\d*)/g);
      
      if (numbersInLine && numbersInLine.length >= 2 && currentQty === null) {
        // Это строка с данными о количестве и цене, если Qty еще не установлено
        const parsedNumbers = numbersInLine.map(n => parseFloat(n.replace(/,/g, '')));
        
        let tempQty = 0;
        let tempRate = 0;
        let tempAmount = 0;
        let qtyIndex = -1;
        
        for (let j = 0; j < parsedNumbers.length; j++) {
          if (parsedNumbers[j] === Math.floor(parsedNumbers[j]) && parsedNumbers[j] > 0 && parsedNumbers[j] < 1000) {
            tempQty = parsedNumbers[j];
            qtyIndex = j;
            break;
          }
        }
        
        if (qtyIndex !== -1) {
          if (parsedNumbers.length > qtyIndex + 1) {
            tempRate = parsedNumbers[qtyIndex + 1];
          }
          if (parsedNumbers.length > qtyIndex + 2) {
            tempAmount = parsedNumbers[qtyIndex + 2];
          } else if (parsedNumbers.length > qtyIndex + 1) {
            tempAmount = tempQty * tempRate;
          }
        } else if (parsedNumbers.length >= 3) {
          tempQty = parsedNumbers[parsedNumbers.length - 3];
          tempRate = parsedNumbers[parsedNumbers.length - 2];
          tempAmount = parsedNumbers[parsedNumbers.length - 1];
        } else if (parsedNumbers.length === 2) {
          tempQty = parsedNumbers[0];
          tempRate = parsedNumbers[1];
          tempAmount = tempQty * tempRate;
        }
        
        if (tempQty > 0 && tempRate > 0) {
          currentQty = tempQty;
          currentRate = tempRate;
          currentAmount = tempAmount;
        }
      } else if (!line.match(/^\d/) && !line.match(/^Page/)) {
        // Это продолжение описания, если строка не начинается с числа
        currentDescription.push(line);
      }
    }
  }
  
  // Сохраняем последний товар
  if (currentSku && currentQty !== null && currentRate !== null) {
    const description = currentDescription.join(' ').trim();
    const cleanDesc = description
      .replace(/Name \/ Address.*?In Advance \/FOB Air/gi, '')
      .replace(/SPA Consultant Company.*?Bangkok 10250/gi, '')
      .replace(/Please make payment to:.*?Swift Code:[A-Z]+/gi, '')
      .trim();
    
    if (items.has(currentSku)) {
      const existing = items.get(currentSku);
      existing.quantity += currentQty;
      existing.amount += (currentAmount !== null ? currentAmount : currentQty * currentRate);
      if (cleanDesc.length > existing.description.length) {
        existing.description = cleanDesc;
      }
    } else {
      items.set(currentSku, {
        sku: currentSku,
        description: cleanDesc,
        quantity: currentQty,
        rate: currentRate,
        amount: currentAmount !== null ? currentAmount : currentQty * currentRate
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
    const parser = new PDFParse({ data: dataBuffer });
    const result = await parser.getText();
    
    console.log(`📄 Текст извлечен (${result.text.length} символов)\n`);
    
    const items = await parseInvoiceText(result.text);
    
    console.log(`\n📦 Найдено товаров: ${items.length}\n`);
    
    if (items.length === 0) {
      console.log('⚠️  Товары не найдены. Показываю первые 100 строк текста для анализа:');
      const lines = result.text.split('\n').slice(0, 100);
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
      console.log(`   Описание: ${item.description.substring(0, 70)}...`);
      console.log(`   Количество: ${item.quantity}`);
      console.log(`   Цена: ${item.rate}`);
      console.log(`   Сумма: ${item.amount.toFixed(2)}\n`);
    });
    
    // Сохраняем в формате для импорта
    const importData = items.map(item => 
      `${item.sku}|${item.description}|${item.quantity}|${item.rate}|${item.amount.toFixed(2)}`
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








