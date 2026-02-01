import { Review } from '../models/index.js';
export async function getActiveReviews(limit = 5) {
    try {
        const reviews = await Review.find({ isActive: true })
            .sort({ isPinned: -1, createdAt: -1 })
            .limit(limit)
            .lean();
        return reviews;
    }
    catch (error) {
        // Логируем ошибку для отладки
        const errorMessage = error.message || '';
        const errorName = error.name || '';
        console.error('⭐ Review Service: Error fetching reviews:', {
            message: errorMessage.substring(0, 200),
            name: errorName,
        });
        // Пробрасываем ошибку дальше для обработки в модуле
        throw error;
    }
}
