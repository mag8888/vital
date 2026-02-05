import { Markup, Telegraf } from 'telegraf';
import { Context } from '../../bot/context.js';
import { BotModule } from '../../bot/types.js';
import { logUserAction } from '../../services/user-history.js';
import { prisma } from '../../lib/prisma.js';
import { getAdminChatIds } from '../../config/env.js';
import { uploadImage, isCloudinaryConfigured } from '../../services/cloudinary-service.js';
import { env } from '../../config/env.js';
import https from 'https';

const ADMIN_ACTION = 'admin:main';
const CATEGORIES_ACTION = 'admin:categories';
const PRODUCTS_ACTION = 'admin:products';
const PARTNERS_ACTION = 'admin:partners';
const REVIEWS_ACTION = 'admin:reviews';
const ORDERS_ACTION = 'admin:orders';

const ADMIN_MENU_TEXT = `🔧 Админ панель

Выберите раздел для управления:`;

function adminKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📁 Категории', CATEGORIES_ACTION), Markup.button.callback('🛍 Товары', PRODUCTS_ACTION)],
    [Markup.button.callback('👥 Партнёры', PARTNERS_ACTION), Markup.button.callback('⭐ Отзывы', REVIEWS_ACTION)],
    [Markup.button.callback('📦 Заказы', ORDERS_ACTION)],
  ]);
}

async function showCategories(ctx: Context) {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    let message = '📁 Категории товаров:\n\n';
    
    if (categories.length === 0) {
      message += 'Категории не найдены';
    } else {
      categories.forEach((cat, index) => {
        message += `${index + 1}. ${cat.name}\n`;
        message += `   Слаг: ${cat.slug}\n`;
        message += `   Статус: ${cat.isActive ? '✅ Активна' : '❌ Неактивна'}\n`;
        if (cat.description) {
          message += `   Описание: ${cat.description}\n`;
        }
        message += '\n';
      });
    }

    await ctx.answerCbQuery();
    await ctx.reply(message, Markup.inlineKeyboard([
      [Markup.button.callback('➕ Добавить категорию', 'admin:add_category')],
      [Markup.button.callback('🔙 Назад', ADMIN_ACTION)],
    ]));
  } catch (error) {
    console.error('Error fetching categories:', error);
    await ctx.answerCbQuery('Ошибка загрузки категорий');
  }
}

async function showProducts(ctx: Context) {
  try {
    const products = await prisma.product.findMany({
      include: { category: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    let message = '🛍 Товары:\n\n';
    
    if (products.length === 0) {
      message += 'Товары не найдены';
    } else {
      products.forEach((product, index) => {
        message += `${index + 1}. ${product.title}\n`;
        message += `   Цена: ${product.price} ₽\n`;
        message += `   Категория: ${product.category.name}\n`;
        message += `   Статус: ${product.isActive ? '✅ Активен' : '❌ Неактивен'}\n`;
        message += `   Краткое описание: ${product.summary}\n\n`;
      });
    }

    await ctx.answerCbQuery();
    await ctx.reply(message, Markup.inlineKeyboard([
      [Markup.button.callback('➕ Добавить товар', 'admin:add_product')],
      [Markup.button.callback('🔙 Назад', ADMIN_ACTION)],
    ]));
  } catch (error) {
    console.error('Error fetching products:', error);
    await ctx.answerCbQuery('Ошибка загрузки товаров');
  }
}

async function showPartners(ctx: Context) {
  try {
    const partners = await prisma.partnerProfile.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    let message = '👥 Партнёры:\n\n';
    
    if (partners.length === 0) {
      message += 'Партнёры не найдены';
    } else {
      partners.forEach((partner, index) => {
        message += `${index + 1}. ${partner.user.firstName || 'Без имени'}\n`;
        message += `   Username: @${partner.user.username || 'не указан'}\n`;
        message += `   Тип: ${partner.programType === 'DIRECT' ? 'Прямая (25%)' : 'Многоуровневая (15%+5%+5%)'}\n`;
        message += `   Баланс: ${partner.balance} ₽\n`;
        message += `   Партнёров: ${partner.totalPartners}\n`;
        message += `   Реферальный код: ${partner.referralCode}\n\n`;
      });
    }

    await ctx.answerCbQuery();
    await ctx.reply(message, Markup.inlineKeyboard([
      [Markup.button.callback('🔙 Назад', ADMIN_ACTION)],
    ]));
  } catch (error) {
    console.error('Error fetching partners:', error);
    await ctx.answerCbQuery('Ошибка загрузки партнёров');
  }
}

async function showReviews(ctx: Context) {
  try {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    let message = '⭐ Отзывы:\n\n';
    
    if (reviews.length === 0) {
      message += 'Отзывы не найдены';
    } else {
      reviews.forEach((review, index) => {
        message += `${index + 1}. ${review.name}\n`;
        message += `   Статус: ${review.isActive ? '✅ Активен' : '❌ Неактивен'}\n`;
        message += `   Закреплён: ${review.isPinned ? '📌 Да' : '❌ Нет'}\n`;
        message += `   Текст: ${review.content.substring(0, 100)}${review.content.length > 100 ? '...' : ''}\n\n`;
      });
    }

    await ctx.answerCbQuery();
    await ctx.reply(message, Markup.inlineKeyboard([
      [Markup.button.callback('➕ Добавить отзыв', 'admin:add_review')],
      [Markup.button.callback('🔙 Назад', ADMIN_ACTION)],
    ]));
  } catch (error) {
    console.error('Error fetching reviews:', error);
    await ctx.answerCbQuery('Ошибка загрузки отзывов');
  }
}

async function showOrders(ctx: Context) {
  try {
    const orders = await prisma.orderRequest.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    let message = '📦 Заказы:\n\n';
    
    if (orders.length === 0) {
      message += 'Заказы не найдены';
    } else {
      orders.forEach((order, index) => {
        message += `${index + 1}. Заказ #${order.id.substring(0, 8)}\n`;
        message += `   Пользователь: ${order.user?.firstName || 'Не указан'}\n`;
        message += `   Статус: ${order.status}\n`;
        message += `   Контакт: ${order.contact || 'Не указан'}\n`;
        message += `   Сообщение: ${order.message.substring(0, 50)}${order.message.length > 50 ? '...' : ''}\n\n`;
      });
    }

    await ctx.answerCbQuery();
    await ctx.reply(message, Markup.inlineKeyboard([
      [Markup.button.callback('🔙 Назад', ADMIN_ACTION)],
    ]));
  } catch (error) {
    console.error('Error fetching orders:', error);
    await ctx.answerCbQuery('Ошибка загрузки заказов');
  }
}

function isAdmin(ctx: Context): boolean {
  const id = ctx.from?.id?.toString();
  if (!id) return false;
  const adminIds = getAdminChatIds();
  return adminIds.length > 0 ? adminIds.includes(id) : id === process.env.ADMIN_CHAT_ID;
}

/** Скачать файл по file_path с Telegram и вернуть Buffer */
async function downloadTelegramFile(filePath: string): Promise<Buffer> {
  const token = env.botToken;
  const url = `https://api.telegram.org/file/bot${token}/${filePath}`;
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

export const adminModule: BotModule = {
  async register(bot: Telegraf<Context>) {
    // Загрузка фото админом через бота: фото → Cloudinary → ссылка
    bot.on('photo', async (ctx, next) => {
      if (!isAdmin(ctx)) return next();
      const photo = ctx.message.photo;
      if (!photo?.length) return next();
      const largest = photo[photo.length - 1];
      try {
        if (!isCloudinaryConfigured()) {
          await ctx.reply('❌ Cloudinary не настроен (CLOUDINARY_*). Загрузка недоступна.');
          return;
        }
        const file = await ctx.telegram.getFile(largest.file_id);
        const buffer = await downloadTelegramFile(file.file_path!);
        const result = await uploadImage(buffer, {
          folder: 'plazma/products',
          resourceType: 'image',
        });
        await logUserAction(ctx, 'admin:photo_upload', { publicId: result.publicId });
        await ctx.reply(
          `✅ Фото загружено в Cloudinary.\n\n🔗 URL:\n${result.secureUrl}\n\nСкопируйте ссылку и вставьте в админ-панель для товара или отзыва.`,
          { parse_mode: 'HTML' }
        );
      } catch (err: any) {
        console.error('Admin photo upload error:', err);
        await ctx.reply(`❌ Ошибка загрузки: ${err?.message || 'неизвестно'}`);
      }
    });

    bot.hears(['админ', 'admin'], async (ctx) => {
      if (!isAdmin(ctx)) {
        await ctx.reply('У вас нет прав доступа к админ панели');
        return;
      }
      
      await logUserAction(ctx, 'admin:access');
      await ctx.reply(ADMIN_MENU_TEXT, adminKeyboard());
    });

    bot.action(ADMIN_ACTION, async (ctx) => {
      if (!isAdmin(ctx)) return;
      await ctx.answerCbQuery();
      await ctx.reply(ADMIN_MENU_TEXT, adminKeyboard());
    });

    bot.action(CATEGORIES_ACTION, async (ctx) => {
      if (!isAdmin(ctx)) return;
      await logUserAction(ctx, 'admin:categories');
      await showCategories(ctx);
    });

    bot.action(PRODUCTS_ACTION, async (ctx) => {
      if (!isAdmin(ctx)) return;
      await logUserAction(ctx, 'admin:products');
      await showProducts(ctx);
    });

    bot.action(PARTNERS_ACTION, async (ctx) => {
      if (!isAdmin(ctx)) return;
      await logUserAction(ctx, 'admin:partners');
      await showPartners(ctx);
    });

    bot.action(REVIEWS_ACTION, async (ctx) => {
      if (!isAdmin(ctx)) return;
      await logUserAction(ctx, 'admin:reviews');
      await showReviews(ctx);
    });

    bot.action(ORDERS_ACTION, async (ctx) => {
      if (!isAdmin(ctx)) return;
      await logUserAction(ctx, 'admin:orders');
      await showOrders(ctx);
    });
  },
};
