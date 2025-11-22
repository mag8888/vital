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
      console.error('❌ MongoDB Authentication Failed:');
      console.error('   Check that DATABASE_URL or MONGO_PUBLIC_URL is correct');
      console.error('   Verify MongoDB credentials in Railway dashboard');
      console.error('   Error:', error.message);
    } else {
      console.warn('⚠️  Failed to initialize data:', error?.message || error);
    }
    // Continue without initial data if DB connection fails - server can still run
  }
}
