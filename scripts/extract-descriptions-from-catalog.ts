/**
 * Скрипт для извлечения описаний товаров из PDF каталога Siam Botanicals
 * и обновления товаров в базе данных
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

const prisma = new PrismaClient();

interface ProductDescription {
  sku: string;
  shortDescription?: string;
  fullDescription?: string;
}

/**
 * Парсит PDF каталог и извлекает описания товаров
 */
async function parseCatalogPDF(pdfPath: string): Promise<Map<string, ProductDescription>> {
  console.log(`📄 Чтение PDF: ${pdfPath}\n`);
  
  // Используем PDFParse как класс с url (как в parse-invoice-pdf.js)
  const absolutePath = pdfPath.startsWith('/') ? pdfPath : `${process.cwd()}/${pdfPath}`;
  const parser = new PDFParse({ 
    url: `file://${absolutePath}` 
  });
  const data = await parser.getText();
  const text = data.text;
  
  console.log(`✅ PDF прочитан. Размер текста: ${text.length} символов\n`);
  
  // Сохраняем текст для анализа
  fs.writeFileSync('catalog-text.txt', text);
  console.log('💾 Текст сохранен в catalog-text.txt для анализа\n');
  
  const descriptions = new Map<string, ProductDescription>();
  
  // Разбиваем текст на строки
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let currentSku: string | null = null;
  let currentShortDesc: string[] = [];
  let currentFullDesc: string[] = [];
  let inProductSection = false;
  
  // Ищем товары по SKU (формат: FS1002-24, FO0001-30 и т.д.)
  const skuPattern = /^([A-Z]{1,3}\d{4,6}(?:-\d{2,3})?)/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Ищем SKU
    const skuMatch = line.match(skuPattern);
    
    if (skuMatch) {
      // Сохраняем предыдущий товар
      if (currentSku && (currentShortDesc.length > 0 || currentFullDesc.length > 0)) {
        const shortDesc = currentShortDesc.join(' ').trim();
        const fullDesc = currentFullDesc.join('\n').trim();
        
        if (shortDesc || fullDesc) {
          descriptions.set(currentSku, {
            sku: currentSku,
            shortDescription: shortDesc || undefined,
            fullDescription: fullDesc || undefined,
          });
        }
      }
      
      // Начинаем новый товар
      currentSku = skuMatch[1];
      currentShortDesc = [];
      currentFullDesc = [];
      inProductSection = true;
      
      // Пропускаем SKU и берем следующую строку как начало описания
      const restOfLine = line.substring(skuMatch[0].length).trim();
      if (restOfLine) {
        currentShortDesc.push(restOfLine);
      }
      continue;
    }
    
    // Если мы в секции товара, собираем описание
    if (inProductSection && currentSku) {
      // Проверяем, не начался ли новый товар (новая строка с SKU)
      if (line.match(/^[A-Z]{1,3}\d{4,6}/)) {
        // Это начало нового товара, сохраняем текущий
        if (currentShortDesc.length > 0 || currentFullDesc.length > 0) {
          const shortDesc = currentShortDesc.join(' ').trim();
          const fullDesc = currentFullDesc.join('\n').trim();
          
          descriptions.set(currentSku, {
            sku: currentSku,
            shortDescription: shortDesc || undefined,
            fullDescription: fullDesc || undefined,
          });
        }
        
        // Начинаем новый товар
        const newSkuMatch = line.match(skuPattern);
        if (newSkuMatch) {
          currentSku = newSkuMatch[1];
          currentShortDesc = [];
          currentFullDesc = [];
          const restOfLine = line.substring(newSkuMatch[0].length).trim();
          if (restOfLine) {
            currentShortDesc.push(restOfLine);
          }
        }
        continue;
      }
      
      // Пропускаем служебные строки
      if (line.match(/^(Page|©|Copyright|Siam Botanicals|www\.|Email:|Tel:|Address:)/i)) {
        continue;
      }
      
      // Если строка короткая (до 100 символов), это может быть краткое описание
      if (line.length < 100 && currentShortDesc.length < 3) {
        currentShortDesc.push(line);
      } else {
        // Длинные строки идут в полное описание
        currentFullDesc.push(line);
      }
    }
  }
  
  // Сохраняем последний товар
  if (currentSku && (currentShortDesc.length > 0 || currentFullDesc.length > 0)) {
    const shortDesc = currentShortDesc.join(' ').trim();
    const fullDesc = currentFullDesc.join('\n').trim();
    
    if (shortDesc || fullDesc) {
      descriptions.set(currentSku, {
        sku: currentSku,
        shortDescription: shortDesc || undefined,
        fullDescription: fullDesc || undefined,
      });
    }
  }
  
  return descriptions;
}

/**
 * Обновляет товары в базе данных с описаниями из каталога
 */
async function updateProductsWithDescriptions(descriptions: Map<string, ProductDescription>) {
  console.log(`\n📦 Найдено описаний в каталоге: ${descriptions.size}\n`);
  
  // Получаем все товары из базы
  const products = await prisma.product.findMany({
    where: { sku: { not: null } },
    select: { id: true, sku: true, title: true },
  });
  
  console.log(`📦 Товаров в базе: ${products.length}\n`);
  
  let updatedCount = 0;
  let notFoundCount = 0;
  const notFoundSkus: string[] = [];
  
  for (const product of products) {
    if (!product.sku) continue;
    
    const description = descriptions.get(product.sku);
    
    if (description) {
      try {
        const updateData: any = {};
        
        // Обновляем краткое описание (summary)
        if (description.shortDescription) {
          updateData.summary = description.shortDescription.substring(0, 200);
        }
        
        // Обновляем полное описание (description)
        if (description.fullDescription) {
          updateData.description = description.fullDescription;
        }
        
        if (Object.keys(updateData).length > 0) {
          await prisma.product.update({
            where: { id: product.id },
            data: updateData,
          });
          
          console.log(`✅ Обновлен: ${product.sku} - ${product.title.substring(0, 50)}`);
          if (description.shortDescription) {
            console.log(`   Краткое: ${description.shortDescription.substring(0, 80)}...`);
          }
          updatedCount++;
        }
      } catch (error: any) {
        console.error(`❌ Ошибка обновления ${product.sku}: ${error.message}`);
      }
    } else {
      notFoundCount++;
      notFoundSkus.push(product.sku);
    }
  }
  
  console.log(`\n✅ Обновление завершено!`);
  console.log(`   Обновлено: ${updatedCount}`);
  console.log(`   Не найдено в каталоге: ${notFoundCount}`);
  
  if (notFoundSkus.length > 0 && notFoundSkus.length <= 20) {
    console.log(`\n   SKU без описаний:`);
    notFoundSkus.forEach(sku => console.log(`     - ${sku}`));
  }
}

async function main() {
  const pdfPath = process.argv[2] || '/Users/ADMIN/Downloads/каталог Siam Botanicals.pdf';
  
  if (!fs.existsSync(pdfPath)) {
    console.error(`❌ Файл не найден: ${pdfPath}`);
    process.exit(1);
  }
  
  try {
    console.log('🚀 Начало извлечения описаний из каталога\n');
    
    // Парсим PDF
    const descriptions = await parseCatalogPDF(pdfPath);
    
    // Выводим найденные описания для проверки
    console.log(`\n📋 Найденные описания (первые 10):\n`);
    let count = 0;
    for (const [sku, desc] of descriptions.entries()) {
      if (count++ >= 10) break;
      console.log(`SKU: ${sku}`);
      if (desc.shortDescription) {
        console.log(`  Краткое: ${desc.shortDescription.substring(0, 100)}...`);
      }
      if (desc.fullDescription) {
        console.log(`  Полное: ${desc.fullDescription.substring(0, 100)}...`);
      }
      console.log('');
    }
    
    // Обновляем товары
    await updateProductsWithDescriptions(descriptions);
    
  } catch (error: any) {
    console.error(`❌ Ошибка: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

