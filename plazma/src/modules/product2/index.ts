import { Markup, Telegraf } from 'telegraf';
import { Context } from '../../bot/context.js';
import { BotModule } from '../../bot/types.js';
import { ensureUser, logUserAction } from '../../services/user-history.js';
import { getAdminChatIds, env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { uploadImage, isCloudinaryConfigured } from '../../services/cloudinary-service.js';

const PRODUCT2_PREFIX = 'product2:';
const ACTION_ADD_CATEGORY = `${PRODUCT2_PREFIX}add_category`;
const ACTION_ADD_SUBCATEGORY = `${PRODUCT2_PREFIX}add_subcategory`;
const ACTION_ADD_PRODUCT = `${PRODUCT2_PREFIX}add_product`;
const ACTION_SELECT_CATEGORY = `${PRODUCT2_PREFIX}select_category:`;
const ACTION_SELECT_SUBCATEGORY = `${PRODUCT2_PREFIX}select_subcategory:`;
const ACTION_SELECT_IMAGE = `${PRODUCT2_PREFIX}select_image:`;

// Проверка прав администратора
function isAdmin(userId: string): boolean {
  const adminChatIds = getAdminChatIds();
  return adminChatIds.includes(userId);
}

// Главное меню модуля
async function showProduct2Menu(ctx: Context) {
  const userId = ctx.from?.id?.toString() || '';
  
  if (!isAdmin(userId)) {
    await ctx.reply('❌ Доступ запрещен. Только администраторы могут использовать этот модуль.');
    return;
  }

  await ctx.reply(
    '🛍️ Модуль добавления товара "Товар 2"\n\nВыберите действие:',
    Markup.inlineKeyboard([
      [Markup.button.callback('➕ Добавить категорию', ACTION_ADD_CATEGORY)],
      [Markup.button.callback('➕ Добавить подкатегорию', ACTION_ADD_SUBCATEGORY)],
      [Markup.button.callback('➕ Добавить товар', ACTION_ADD_PRODUCT)],
    ])
  );
}

// Добавление категории
async function startAddCategory(ctx: Context) {
  const userId = ctx.from?.id?.toString() || '';
  
  if (!isAdmin(userId)) {
    await ctx.reply('❌ Доступ запрещен.');
    return;
  }

  if (!ctx.session) {
    ctx.session = {};
  }
  
  ctx.session.product2Flow = {
    step: 'category',
  };

  await ctx.reply('📂 Введите название категории:');
}

// Добавление подкатегории
async function startAddSubcategory(ctx: Context) {
  const userId = ctx.from?.id?.toString() || '';
  
  if (!isAdmin(userId)) {
    await ctx.reply('❌ Доступ запрещен.');
    return;
  }

  // Получаем все категории для выбора родительской
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  if (categories.length === 0) {
    await ctx.reply('❌ Нет доступных категорий. Сначала создайте категорию.');
    return;
  }

  if (!ctx.session) {
    ctx.session = {};
  }
  
  ctx.session.product2Flow = {
    step: 'subcategory',
  };

  const keyboard = categories.map(cat => [
    Markup.button.callback(`📂 ${cat.name}`, `${ACTION_SELECT_CATEGORY}${cat.id}`),
  ]);

  await ctx.reply('📂 Выберите родительскую категорию для подкатегории:', Markup.inlineKeyboard(keyboard));
}

// Обработка выбора категории для подкатегории
async function handleCategorySelectionForSubcategory(ctx: Context, categoryId: string) {
  if (!ctx.session) {
    ctx.session = {};
  }
  
  if (!ctx.session.product2Flow) {
    ctx.session.product2Flow = {};
  }

  ctx.session.product2Flow.categoryId = categoryId;
  ctx.session.product2Flow.step = 'subcategory';

  await ctx.answerCbQuery();
  await ctx.reply('📂 Введите название подкатегории:');
}

// Добавление товара
async function startAddProduct(ctx: Context) {
  const userId = ctx.from?.id?.toString() || '';
  
  if (!isAdmin(userId)) {
    await ctx.reply('❌ Доступ запрещен.');
    return;
  }

  // Получаем все категории
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  if (categories.length === 0) {
    await ctx.reply('❌ Нет доступных категорий. Сначала создайте категорию.');
    return;
  }

  if (!ctx.session) {
    ctx.session = {};
  }
  
  ctx.session.product2Flow = {
    step: 'product_name',
    productData: {},
  };

  const keyboard = categories.map(cat => [
    Markup.button.callback(`📂 ${cat.name}`, `${ACTION_SELECT_CATEGORY}${cat.id}`),
  ]);

  await ctx.reply('📂 Выберите категорию для товара:', Markup.inlineKeyboard(keyboard));
}

// Обработка выбора категории для товара
async function handleCategorySelectionForProduct(ctx: Context, categoryId: string) {
  if (!ctx.session) {
    ctx.session = {};
  }
  
  if (!ctx.session.product2Flow) {
    ctx.session.product2Flow = {};
  }

  ctx.session.product2Flow.categoryId = categoryId;
  ctx.session.product2Flow.step = 'product_name';

  await ctx.answerCbQuery();
  await ctx.reply('📝 Введите название товара:');
}

// Обработка текстовых сообщений в процессе добавления
async function handleTextInput(ctx: Context) {
  const userId = ctx.from?.id?.toString() || '';
  
  if (!isAdmin(userId)) {
    return;
  }

  if (!ctx.session?.product2Flow) {
    return;
  }

  const flow = ctx.session.product2Flow;
  const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';

  if (!text) {
    return;
  }

  try {
    switch (flow.step) {
      case 'category': {
        // Создаем категорию
        const slug = text.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .substring(0, 50);

        const category = await prisma.category.create({
          data: {
            name: text,
            slug: slug || `category-${Date.now()}`,
            isActive: true,
          },
        });

        await logUserAction(ctx, 'product2:category_created', { categoryId: category.id });
        await ctx.reply(`✅ Категория "${category.name}" успешно создана!`);
        delete ctx.session.product2Flow;
        await showProduct2Menu(ctx);
        break;
      }

      case 'subcategory': {
        if (!flow.categoryId) {
          await ctx.reply('❌ Ошибка: категория не выбрана. Начните заново.');
          delete ctx.session.product2Flow;
          return;
        }

        // Создаем подкатегорию (используем slug для связи с родительской категорией)
        const parentCategory = await prisma.category.findUnique({
          where: { id: flow.categoryId },
        });

        if (!parentCategory) {
          await ctx.reply('❌ Родительская категория не найдена.');
          delete ctx.session.product2Flow;
          return;
        }

        const slug = `${parentCategory.slug}-${text.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .substring(0, 30)}`;

        const subcategory = await prisma.category.create({
          data: {
            name: `${parentCategory.name} > ${text}`,
            slug: slug || `subcategory-${Date.now()}`,
            isActive: true,
          },
        });

        await logUserAction(ctx, 'product2:subcategory_created', { 
          subcategoryId: subcategory.id,
          parentCategoryId: flow.categoryId,
        });
        await ctx.reply(`✅ Подкатегория "${text}" успешно создана в категории "${parentCategory.name}"!`);
        delete ctx.session.product2Flow;
        await showProduct2Menu(ctx);
        break;
      }

      case 'product_name': {
        if (!flow.productData) {
          flow.productData = {};
        }
        flow.productData.name = text;
        flow.step = 'product_summary';
        await ctx.reply('📝 Введите краткое описание товара:');
        break;
      }

      case 'product_summary': {
        if (!flow.productData) {
          flow.productData = {};
        }
        flow.productData.summary = text;
        flow.step = 'product_price';
        await ctx.reply('💰 Введите цену товара в PZ (число):');
        break;
      }

      case 'product_price': {
        const price = parseFloat(text);
        if (isNaN(price) || price <= 0) {
          await ctx.reply('❌ Неверная цена. Введите положительное число:');
          return;
        }

        if (!flow.productData) {
          flow.productData = {};
        }
        flow.productData.price = price;
        flow.step = 'product_image';
        
        await ctx.reply(
          '📷 Отправьте фото для товара или выберите из загруженных:',
          Markup.inlineKeyboard([
            [Markup.button.callback('📂 Выбрать из загруженных', `${ACTION_SELECT_IMAGE}list`)],
          ])
        );
        break;
      }
    }
  } catch (error: any) {
    console.error('Error in handleTextInput:', error);
    await ctx.reply(`❌ Ошибка: ${error.message || 'Неизвестная ошибка'}`);
    delete ctx.session.product2Flow;
  }
}

// Обработка загрузки фото
async function handlePhotoUpload(ctx: Context) {
  const userId = ctx.from?.id?.toString() || '';
  
  if (!isAdmin(userId)) {
    return;
  }

  if (!ctx.session?.product2Flow || ctx.session.product2Flow.step !== 'product_image') {
    return;
  }

  const flow = ctx.session.product2Flow;

  try {
    const photo = ctx.message && 'photo' in ctx.message ? ctx.message.photo : null;
    if (!photo || photo.length === 0) {
      await ctx.reply('❌ Фото не найдено. Попробуйте еще раз.');
      return;
    }

    // Получаем фото наибольшего размера
    const largestPhoto = photo[photo.length - 1];
    const fileId = largestPhoto.file_id;

    // Получаем файл от Telegram
    const file = await ctx.telegram.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${env.botToken}/${file.file_path}`;

    // Скачиваем файл
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error('Failed to download photo from Telegram');
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());

    // Загружаем на Cloudinary
    let imageUrl: string;
    if (isCloudinaryConfigured()) {
      const uploadResult = await uploadImage(imageBuffer, {
        folder: 'plazma/products',
        publicId: `product-${Date.now()}`,
        resourceType: 'image',
      });
      imageUrl = uploadResult.secureUrl;
    } else {
      // Если Cloudinary не настроен, используем прямой URL от Telegram (временный)
      imageUrl = fileUrl;
      await ctx.reply('⚠️ Cloudinary не настроен. Используется временная ссылка от Telegram.');
    }

    if (!flow.productData) {
      flow.productData = {};
    }
    flow.productData.imageUrl = imageUrl;

    // Создаем товар
    if (!flow.categoryId || !flow.productData.name || !flow.productData.summary || !flow.productData.price) {
      await ctx.reply('❌ Ошибка: не все данные товара заполнены.');
      delete ctx.session.product2Flow;
      return;
    }

    const product = await prisma.product.create({
      data: {
        title: flow.productData.name,
        summary: flow.productData.summary,
        price: flow.productData.price,
        imageUrl: flow.productData.imageUrl,
        categoryId: flow.categoryId,
        isActive: true,
        stock: 999,
        availableInRussia: true,
        availableInBali: true,
      },
    });

    await logUserAction(ctx, 'product2:product_created', { productId: product.id });
    await ctx.reply(
      `✅ Товар "${product.title}" успешно создан!\n\n` +
      `📝 Описание: ${product.summary}\n` +
      `💰 Цена: ${product.price} PZ\n` +
      `📂 Категория: ${flow.categoryId}`,
      flow.productData.imageUrl ? { caption: `Фото товара: ${product.title}` } : undefined
    );

    if (flow.productData.imageUrl) {
      await ctx.replyWithPhoto(flow.productData.imageUrl, {
        caption: `✅ Товар "${product.title}" успешно создан!`,
      });
    }

    delete ctx.session.product2Flow;
    await showProduct2Menu(ctx);
  } catch (error: any) {
    console.error('Error in handlePhotoUpload:', error);
    await ctx.reply(`❌ Ошибка при загрузке фото: ${error.message || 'Неизвестная ошибка'}`);
  }
}

// Выбор загруженного фото
async function handleSelectImage(ctx: Context, action: string) {
  const userId = ctx.from?.id?.toString() || '';
  
  if (!isAdmin(userId)) {
    await ctx.reply('❌ Доступ запрещен.');
    return;
  }

  if (action === 'list') {
    // Получаем все товары с фото
    const productsWithImages = await prisma.product.findMany({
      where: {
        imageUrl: { not: null },
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        imageUrl: true,
      },
      take: 20, // Ограничиваем до 20 товаров
      orderBy: { createdAt: 'desc' },
    });

    if (productsWithImages.length === 0) {
      await ctx.reply('❌ Нет загруженных фото. Загрузите фото через Telegram.');
      return;
    }

    const keyboard = productsWithImages.map(product => [
      Markup.button.callback(
        `📷 ${product.title}`,
        `${ACTION_SELECT_IMAGE}${product.id}`
      ),
    ]);

    await ctx.answerCbQuery();
    await ctx.reply('📷 Выберите фото из загруженных:', Markup.inlineKeyboard(keyboard));
  } else {
    // Выбрано конкретное фото
    const productId = action;
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { imageUrl: true, title: true },
    });

    if (!product || !product.imageUrl) {
      await ctx.answerCbQuery('Фото не найдено');
      return;
    }

    if (!ctx.session?.product2Flow || ctx.session.product2Flow.step !== 'product_image') {
      await ctx.answerCbQuery('Ошибка: процесс добавления товара не активен');
      return;
    }

    const flow = ctx.session.product2Flow;
    if (!flow.productData) {
      flow.productData = {};
    }
    flow.productData.imageUrl = product.imageUrl;

    // Создаем товар
    if (!flow.categoryId || !flow.productData.name || !flow.productData.summary || !flow.productData.price) {
      await ctx.answerCbQuery('Ошибка: не все данные товара заполнены');
      return;
    }

    try {
      const newProduct = await prisma.product.create({
        data: {
          title: flow.productData.name,
          summary: flow.productData.summary,
          price: flow.productData.price,
          imageUrl: flow.productData.imageUrl,
          categoryId: flow.categoryId,
          isActive: true,
          stock: 999,
          availableInRussia: true,
          availableInBali: true,
        },
      });

      await logUserAction(ctx, 'product2:product_created', { productId: newProduct.id });
      await ctx.answerCbQuery('✅ Товар создан!');
      
      await ctx.replyWithPhoto(product.imageUrl, {
        caption: `✅ Товар "${newProduct.title}" успешно создан!\n\n` +
          `📝 Описание: ${newProduct.summary}\n` +
          `💰 Цена: ${newProduct.price} PZ`,
      });

      delete ctx.session.product2Flow;
      await showProduct2Menu(ctx);
    } catch (error: any) {
      console.error('Error creating product:', error);
      await ctx.answerCbQuery('Ошибка при создании товара');
      await ctx.reply(`❌ Ошибка: ${error.message || 'Неизвестная ошибка'}`);
    }
  }
}

export const product2Module: BotModule = {
  async register(bot: Telegraf<Context>) {
    console.log('🛍️ Registering product2 module...');

    // Команда для открытия модуля
    bot.command('product2', async (ctx) => {
      await logUserAction(ctx, 'product2:command');
      await showProduct2Menu(ctx);
    });

    // Обработчики кнопок
    bot.action(ACTION_ADD_CATEGORY, async (ctx) => {
      await ctx.answerCbQuery();
      await startAddCategory(ctx);
    });

    bot.action(ACTION_ADD_SUBCATEGORY, async (ctx) => {
      await ctx.answerCbQuery();
      await startAddSubcategory(ctx);
    });

    bot.action(ACTION_ADD_PRODUCT, async (ctx) => {
      await ctx.answerCbQuery();
      await startAddProduct(ctx);
    });

    bot.action(new RegExp(`^${ACTION_SELECT_CATEGORY}(.+)$`), async (ctx) => {
      const match = ctx.match as RegExpExecArray;
      const categoryId = match[1];
      
      if (ctx.session?.product2Flow?.step === 'subcategory') {
        await handleCategorySelectionForSubcategory(ctx, categoryId);
      } else {
        await handleCategorySelectionForProduct(ctx, categoryId);
      }
    });

    bot.action(new RegExp(`^${ACTION_SELECT_IMAGE}(.+)$`), async (ctx) => {
      const match = ctx.match as RegExpExecArray;
      const action = match[1];
      await handleSelectImage(ctx, action);
    });

    // Обработка текстовых сообщений (только если активен процесс product2)
    bot.on('text', async (ctx) => {
      // Проверяем, что активен процесс product2
      if (ctx.session?.product2Flow) {
        await handleTextInput(ctx);
      }
    });

    // Обработка загрузки фото
    bot.on('photo', async (ctx) => {
      await handlePhotoUpload(ctx);
    });
  },
};

