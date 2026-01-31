import { prisma } from './prisma.js';
import { initializeBotContent } from '../services/bot-content-service.js';
function isDatabaseError(error) {
    if (!error)
        return false;
    const errorCode = error.code;
    const errorMessage = error.message || error.meta?.message || '';
    const errorKind = error.kind || '';
    const errorName = error.name || '';
    return (errorCode === 'P2010' || // Raw query failed
        errorCode === 'P1001' || // Can't reach database server
        errorCode === 'P1002' || // Connection timeout
        errorCode === 'P1013' || // Invalid connection string
        errorName === 'ConnectorError' || // Prisma connector errors
        errorMessage.includes('ConnectorError') ||
        errorMessage.includes('Server selection timeout') ||
        errorMessage.includes('No available servers') ||
        errorMessage.includes('I/O error: timed out') ||
        errorMessage.includes('Connection pool timeout') ||
        errorMessage.includes('Transactions are not supported') ||
        errorMessage.includes('replica set') ||
        errorMessage.includes('Authentication failed') ||
        errorMessage.includes('SCRAM failure') ||
        errorKind.includes('AuthenticationFailed') ||
        errorKind.includes('Authentication') ||
        errorKind.includes('ConnectorError'));
}
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
        }
        // Инициализируем контент бота
        await initializeBotContent();
    }
    catch (error) {
        if (isDatabaseError(error)) {
            const errorMsg = error.message || error.toString() || '';
            // Проверяем, не связана ли ошибка с replica set (Railway MongoDB limitation)
            if (errorMsg.includes('replica set') || errorMsg.includes('Transactions are not supported')) {
                console.warn('⚠️  Database operations limited (Railway MongoDB does not support transactions)');
                console.warn('💡 This is expected behavior. App will work, but some operations may be unavailable.');
                console.warn('💡 To enable full Prisma features, use MongoDB Atlas instead.');
            }
            else {
                console.warn('⚠️  Database unavailable during initialization (non-critical):', errorMsg.substring(0, 100));
                console.warn('💡 Initial data will be created when database becomes available');
            }
        }
        else {
            console.warn('⚠️  Failed to initialize data (non-critical):', error.message?.substring(0, 100));
        }
        // Continue without initial data if DB connection fails
    }
}
