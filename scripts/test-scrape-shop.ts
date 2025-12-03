/**
 * Тестовый скрипт для проверки парсинга страницы магазина
 */

import { scrapeShopPage, extractImageFromProductPage } from '../src/services/scrape-images-service.js';

async function test() {
  console.log('🧪 Тестирование парсинга страницы магазина...\n');
  
  // Тест 1: Парсинг первой страницы
  console.log('📄 Тест 1: Парсинг первой страницы');
  const { products, hasNextPage } = await scrapeShopPage(1);
  console.log(`   ✅ Найдено товаров: ${products.length}`);
  console.log(`   ✅ Есть следующая страница: ${hasNextPage}`);
  
  if (products.length > 0) {
    console.log(`\n📦 Первые 3 товара:`);
    products.slice(0, 3).forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.title}`);
      console.log(`      URL: ${p.productUrl}`);
      console.log(`      Изображение: ${p.imageUrl ? '✅' : '❌'}`);
    });
    
    // Тест 2: Извлечение изображения со страницы первого товара
    if (products[0]) {
      console.log(`\n🔍 Тест 2: Извлечение изображения со страницы товара`);
      console.log(`   Товар: ${products[0].title}`);
      console.log(`   URL: ${products[0].productUrl}`);
      
      const imageUrl = await extractImageFromProductPage(products[0].productUrl);
      if (imageUrl) {
        console.log(`   ✅ Изображение найдено: ${imageUrl.substring(0, 80)}...`);
      } else {
        console.log(`   ❌ Изображение не найдено`);
      }
    }
  }
  
  console.log('\n✅ Тестирование завершено');
}

test().catch(console.error);






