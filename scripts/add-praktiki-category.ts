/**
 * Скрипт для добавления категории "Практики" в базу данных
 * Запуск: npm run add-praktiki-category
 */

import { prisma } from '../src/lib/prisma.js';

async function addPraktikiCategory() {
  try {
    console.log('📂 Добавление категории "Практики"...');
    
    // Проверяем, существует ли уже категория
    const existing = await prisma.category.findFirst({
      where: {
        OR: [
          { name: 'Практики' },
          { slug: 'praktiki' }
        ]
      }
    });
    
    if (existing) {
      console.log('✅ Категория "Практики" уже существует:', existing.id);
      return;
    }
    
    // Создаем категорию
    const category = await prisma.category.create({
      data: {
        name: 'Практики',
        slug: 'praktiki',
        description: 'Категория для практик и методик',
        isActive: true
      }
    });
    
    console.log('✅ Категория "Практики" успешно создана!');
    console.log('📋 ID:', category.id);
    console.log('📋 Слаг:', category.slug);
    
  } catch (error: any) {
    console.error('❌ Ошибка создания категории:', error);
    if (error?.code === 'P2002') {
      console.log('⚠️ Категория уже существует');
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addPraktikiCategory()
  .then(() => {
    console.log('✅ Скрипт завершен');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Ошибка выполнения скрипта:', error);
    process.exit(1);
  });

