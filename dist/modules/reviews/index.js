import { Markup } from 'telegraf';
import { getActiveReviews } from '../../services/review-service.js';
import { logUserAction } from '../../services/user-history.js';
export const reviewsModule = {
    async register(bot) {
        // Handle reviews command
        bot.command('reviews', async (ctx) => {
            try {
                // Логируем действие с обработкой ошибок
                try {
                    await logUserAction(ctx, 'command:reviews');
                }
                catch (logError) {
                    // Игнорируем ошибки логирования, продолжаем работу
                    console.warn('⭐ Reviews: Failed to log action (non-critical):', logError);
                }
                await showReviews(ctx);
            }
            catch (error) {
                console.error('⭐ Reviews: Failed to process /reviews command', error);
                const keyboard = Markup.inlineKeyboard([
                    [Markup.button.url('💬 Оставить отзыв', 'https://iplazma.tilda.ws/comment')]
                ]);
                try {
                    await ctx.reply('❌ Не удалось загрузить отзывы. Попробуйте позже.', keyboard);
                }
                catch (replyError) {
                    // Игнорируем ошибки отправки сообщений
                    console.error('⭐ Reviews: Failed to send error message:', replyError);
                }
            }
        });
        bot.hears(['Отзывы', '⭐ Отзывы'], async (ctx) => {
            try {
                // Логируем действие с обработкой ошибок
                try {
                    await logUserAction(ctx, 'menu:reviews');
                }
                catch (logError) {
                    // Игнорируем ошибки логирования, продолжаем работу
                    console.warn('⭐ Reviews: Failed to log action (non-critical):', logError);
                }
                await showReviews(ctx);
            }
            catch (error) {
                console.error('⭐ Reviews: Failed to process reviews menu', error);
                const keyboard = Markup.inlineKeyboard([
                    [Markup.button.url('💬 Оставить отзыв', 'https://iplazma.tilda.ws/comment')]
                ]);
                try {
                    await ctx.reply('❌ Не удалось загрузить отзывы. Попробуйте позже.', keyboard);
                }
                catch (replyError) {
                    // Игнорируем ошибки отправки сообщений
                    console.error('⭐ Reviews: Failed to send error message:', replyError);
                }
            }
        });
    },
};
export async function showReviews(ctx) {
    try {
        // Добавляем таймаут для загрузки отзывов
        let reviews = [];
        try {
            reviews = await Promise.race([
                getActiveReviews(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Database timeout')), 5000))
            ]);
        }
        catch (dbError) {
            const errorMessage = dbError.message || dbError.meta?.message || '';
            const errorKind = dbError.kind || '';
            const errorName = dbError.name || '';
            console.error('⭐ Reviews: Error loading reviews from DB:', {
                message: errorMessage.substring(0, 100),
                name: errorName,
                kind: errorKind,
                code: dbError.code
            });
            // Показываем сообщение об ошибке и кнопку для отзыва
            const keyboard = Markup.inlineKeyboard([
                [Markup.button.url('💬 Оставить отзыв', 'https://iplazma.tilda.ws/comment')]
            ]);
            // Более информативное сообщение в зависимости от типа ошибки
            let errorText = '❌ Ошибка при загрузке отзывов. Попробуйте позже.';
            if (errorMessage.includes('Authentication failed') || errorMessage.includes('SCRAM failure') ||
                errorName === 'ConnectorError' || errorKind.includes('AuthenticationFailed')) {
                errorText = '❌ Ошибка при загрузке отзывов. База данных временно недоступна. Попробуйте позже.';
            }
            try {
                await ctx.reply(errorText, keyboard);
            }
            catch (replyError) {
                console.error('⭐ Reviews: Failed to send error message:', replyError);
            }
            return;
        }
        if (reviews.length === 0) {
            const keyboard = Markup.inlineKeyboard([
                [Markup.button.url('💬 Оставить отзыв', 'https://iplazma.tilda.ws/comment')]
            ]);
            await ctx.reply('Отзывов пока нет. Добавьте их в админке.', keyboard);
            return;
        }
        for (const review of reviews) {
            try {
                const caption = [`⭐ ${review.name}`, review.content];
                if (review.link) {
                    caption.push(`Подробнее: ${review.link}`);
                }
                if (review.photoUrl) {
                    try {
                        await ctx.replyWithPhoto(review.photoUrl, { caption: caption.join('\n\n') });
                    }
                    catch (photoError) {
                        // Если не удалось отправить фото, отправляем текст
                        console.warn('⭐ Reviews: Failed to send photo, sending text instead:', photoError);
                        await ctx.reply(caption.join('\n\n'));
                    }
                }
                else {
                    await ctx.reply(caption.join('\n\n'));
                }
            }
            catch (reviewError) {
                // Пропускаем проблемный отзыв, продолжаем с остальными
                console.warn('⭐ Reviews: Failed to send review:', reviewError);
                continue;
            }
        }
        // Добавляем кнопку для оставления отзыва после всех отзывов
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.url('💬 Оставить отзыв', 'https://iplazma.tilda.ws/comment')]
        ]);
        await ctx.reply('💬 Хотите оставить свой отзыв?', keyboard);
    }
    catch (error) {
        console.error('⭐ Reviews: Failed to show reviews', error);
        // Проверяем, не является ли это ошибкой БД
        const errorMessage = error.message || error.meta?.message || '';
        const errorKind = error.kind || '';
        const errorName = error.name || '';
        const isDbError = error.code === 'P2010' || error.code === 'P1001' || error.code === 'P1002' || error.code === 'P1013' ||
            errorName === 'ConnectorError' || errorName === 'PrismaClientUnknownRequestError' ||
            errorMessage.includes('ConnectorError') || errorMessage.includes('Authentication failed') ||
            errorMessage.includes('SCRAM failure') || errorMessage.includes('replica set') ||
            errorKind.includes('AuthenticationFailed') || errorKind.includes('ConnectorError');
        // Показываем кнопку для отзыва даже при ошибке
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.url('💬 Оставить отзыв', 'https://iplazma.tilda.ws/comment')]
        ]);
        if (isDbError) {
            await ctx.reply('❌ Ошибка при загрузке отзывов. База данных временно недоступна. Попробуйте позже.', keyboard);
        }
        else {
            await ctx.reply('❌ Ошибка при загрузке отзывов. Попробуйте позже.', keyboard);
        }
    }
}
