import { prisma } from './prisma.js';
import { initializeBotContent } from '../services/bot-content-service.js';

export async function ensureInitialData() {
  try {
    const reviewCount = await prisma.review.count();
    if (reviewCount === 0) {
      await prisma.review.create({
        data: {
          name: 'Дмитрий',
          content: 'Будущее наступило ребята\nЭто действительно биохакинг нового поколения. Мне было трудно поверить в такую эффективность. Я забыл что такое усталость!',
          isActive: true,
          isPinned: true,
        },
      });
      console.log('✅ Initial review created');
    }

    // Инициализируем контент бота
    await initializeBotContent();
    
    // Проверяем, пуст ли каталог, и если да - запускаем импорт в фоне
    const productCount = await prisma.product.count();
    if (productCount === 0) {
      console.log('📦 Каталог пуст, запускаю импорт продуктов в фоне...');
      // Запускаем импорт асинхронно, чтобы не блокировать запуск сервера
      import('../services/siam-import-service.js').then(async (module) => {
        try {
          const { importSiamProducts } = module;
          const result = await importSiamProducts();
          console.log(`✅ Импорт завершен: ${result.success} успешно, ${result.errors} ошибок`);
        } catch (error: any) {
          if (error?.message?.includes('AI Translation Service не настроен')) {
            console.log('⚠️  Импорт пропущен: OPENAI_API_KEY не настроен');
          } else {
            console.error('❌ Ошибка импорта:', error?.message || error);
          }
        }
      }).catch(() => {
        // Silent fail - импорт может не запуститься по разным причинам
      });
    }
    
    console.log('✅ Initial data ensured');
  } catch (error: any) {
    // MongoDB authentication errors - check connection string
    if (error?.code === 'P1013' || error?.message?.includes('Authentication failed')) {
      // Silent fail - MongoDB auth issue, but server can still run
      // Connection will be retried on next request
    } else {
      // Only log non-auth errors
      console.warn('⚠️  Failed to initialize data:', error?.message || error);
    }
    // Continue without initial data if DB connection fails - server can still run
  }
}
