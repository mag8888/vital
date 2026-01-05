import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface RailwayProduct {
  id: string;
  title: string;
  summary: string;
  description: string | null;
  instruction: string | null;
  imageUrl: string | null;
  price: number;
  purchasePrice: number | null;
  sku: string | null;
  stock: number;
  lowStockThreshold: number;
  isActive: boolean;
  availableInRussia: boolean;
  availableInBali: boolean;
  categoryId: string;
  category: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    isActive: boolean;
  };
}

async function importProducts() {
  try {
    console.log('📥 Начинаю импорт каталога из Railway...\n');

    // Читаем данные из файла
    const fs = await import('fs/promises');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'scripts', 'railway-products.json');
    
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const products: RailwayProduct[] = JSON.parse(fileContent);

    console.log(`✅ Загружено ${products.length} товаров из Railway\n`);

    // Собираем уникальные категории
    const categoriesMap = new Map<string, RailwayProduct['category']>();
    for (const product of products) {
      if (product.category && !categoriesMap.has(product.category.id)) {
        categoriesMap.set(product.category.id, product.category);
      }
    }

    console.log(`📁 Найдено ${categoriesMap.size} уникальных категорий\n`);

    // Импортируем категории
    const categoryIdMap = new Map<string, string>(); // Старый ID -> Новый ID
    let categoriesCreated = 0;
    let categoriesSkipped = 0;

    for (const [oldId, category] of categoriesMap) {
      try {
        // Проверяем, существует ли категория по slug
        const existing = await prisma.category.findUnique({
          where: { slug: category.slug }
        });

        if (existing) {
          categoryIdMap.set(oldId, existing.id);
          categoriesSkipped++;
          console.log(`⏭️  Категория уже существует: ${category.name}`);
        } else {
          const newCategory = await prisma.category.create({
            data: {
              name: category.name,
              slug: category.slug,
              description: category.description || null,
              isActive: category.isActive,
            }
          });
          categoryIdMap.set(oldId, newCategory.id);
          categoriesCreated++;
          console.log(`✅ Создана категория: ${category.name}`);
        }
      } catch (error: any) {
        console.error(`❌ Ошибка при создании категории ${category.name}:`, error.message);
      }
    }

    console.log(`\n📊 Категории: создано ${categoriesCreated}, пропущено ${categoriesSkipped}\n`);

    // Импортируем товары
    let productsCreated = 0;
    let productsUpdated = 0;
    let productsSkipped = 0;
    let productsErrors = 0;

    for (const product of products) {
      try {
        const newCategoryId = categoryIdMap.get(product.categoryId);
        if (!newCategoryId) {
          console.error(`❌ Категория не найдена для товара ${product.title}`);
          productsErrors++;
          continue;
        }

        // Проверяем, существует ли товар по SKU
        let existingProduct = null;
        if (product.sku) {
          existingProduct = await prisma.product.findFirst({
            where: { sku: product.sku }
          });
        }

        const productData = {
          title: product.title,
          summary: product.summary,
          description: product.description || null,
          instruction: product.instruction || null,
          imageUrl: product.imageUrl || null,
          price: product.price,
          purchasePrice: product.purchasePrice || null,
          sku: product.sku || null,
          stock: product.stock,
          lowStockThreshold: product.lowStockThreshold,
          isActive: product.isActive,
          availableInRussia: product.availableInRussia,
          availableInBali: product.availableInBali,
          categoryId: newCategoryId,
        };

        if (existingProduct) {
          // Обновляем существующий товар
          await prisma.product.update({
            where: { id: existingProduct.id },
            data: productData
          });
          productsUpdated++;
          console.log(`🔄 Обновлен товар: ${product.title}`);
        } else {
          // Создаем новый товар
          await prisma.product.create({
            data: productData
          });
          productsCreated++;
          console.log(`✅ Создан товар: ${product.title}`);
        }
      } catch (error: any) {
        console.error(`❌ Ошибка при импорте товара ${product.title}:`, error.message);
        productsErrors++;
      }
    }

    console.log(`\n📊 Товары: создано ${productsCreated}, обновлено ${productsUpdated}, ошибок ${productsErrors}\n`);

    console.log('✅ Импорт завершен успешно!');
  } catch (error: any) {
    console.error('❌ Критическая ошибка при импорте:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importProducts();

