import { prisma } from '../lib/prisma.js';
export async function getActiveReviews(limit = 5) {
    try {
        return await prisma.review.findMany({
            where: { isActive: true },
            orderBy: [
                { isPinned: 'desc' },
                { createdAt: 'desc' },
            ],
            take: limit,
        });
    }
    catch (error) {
        // Логируем ошибку для отладки
        const errorMessage = error.message || error.meta?.message || '';
        const errorKind = error.kind || '';
        const errorName = error.name || '';
        console.error('⭐ Review Service: Error fetching reviews:', {
            message: errorMessage.substring(0, 200),
            name: errorName,
            kind: errorKind,
            code: error.code
        });
        // Пробрасываем ошибку дальше для обработки в модуле
        throw error;
    }
}
