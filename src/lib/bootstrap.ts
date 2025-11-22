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
