import express from 'express';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';

const router = express.Router();

// Middleware для проверки API ключа
const requireApiKey = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!env.externalApiKey) {
    return res.status(503).json({
      success: false,
      error: 'External API is not configured'
    });
  }
  
  if (!apiKey || apiKey !== env.externalApiKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized. Invalid or missing API key'
    });
  }
  
  next();
};

// Применяем проверку API ключа ко всем маршрутам
router.use(requireApiKey);

/**
 * GET /catalog
 * Получить полный каталог с категориями и товарами
 */
router.get('/catalog', async (req, res) => {
  try {
    const { region = 'RUSSIA' } = req.query;
    
    console.log('🔗 External API: Fetching catalog for region:', region);
    
    // Получаем активные категории
    const categories = await prisma.category.findMany({
      where: {
        isActive: true
      },
      include: {
        products: {
          where: {
            isActive: true,
            ...(region === 'RUSSIA' ? { availableInRussia: true } : {}),
            ...(region === 'BALI' ? { availableInBali: true } : {})
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    // Форматируем данные
    const catalog = categories.map(category => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      isActive: category.isActive,
      products: category.products.map(product => ({
        id: product.id,
        title: product.title,
        summary: product.summary,
        description: product.description,
        imageUrl: product.imageUrl,
        price: product.price,
        priceRub: Math.round(product.price * 100), // Конвертация PZ в рубли (1 PZ = 100 руб)
        stock: product.stock,
        availableInRussia: product.availableInRussia,
        availableInBali: product.availableInBali,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
      })),
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    }));
    
    console.log(`✅ External API: Found ${catalog.length} categories with products`);
    
    res.json({
      success: true,
      data: catalog
    });
  } catch (error: any) {
    console.error('❌ External API error fetching catalog:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error'
    });
  }
});

/**
 * GET /categories
 * Получить список категорий
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    res.json({
      success: true,
      data: categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        isActive: cat.isActive,
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt
      }))
    });
  } catch (error: any) {
    console.error('❌ External API error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error'
    });
  }
});

/**
 * GET /products
 * Получить список товаров с фильтрацией
 */
router.get('/products', async (req, res) => {
  try {
    const {
      categoryId,
      region = 'RUSSIA',
      search,
      limit = 100,
      offset = 0
    } = req.query;
    
    const limitNum = Math.min(parseInt(limit as string) || 100, 1000);
    const offsetNum = parseInt(offset as string) || 0;
    
    console.log('🔗 External API: Fetching products with filters:', {
      categoryId,
      region,
      search,
      limit: limitNum,
      offset: offsetNum
    });
    
    // Строим условия фильтрации
    const where: any = {
      isActive: true
    };
    
    if (categoryId) {
      where.categoryId = categoryId as string;
    }
    
    if (region === 'RUSSIA') {
      where.availableInRussia = true;
    } else if (region === 'BALI') {
      where.availableInBali = true;
    }
    
    if (search) {
      const searchPattern = search as string;
      where.OR = [
        { title: { contains: searchPattern } },
        { summary: { contains: searchPattern } },
        { description: { contains: searchPattern } }
      ];
    }
    
    // Получаем товары с категориями
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limitNum,
        skip: offsetNum
      }),
      prisma.product.count({ where })
    ]);
    
    // Форматируем данные
    const formattedProducts = products.map(product => ({
      id: product.id,
      title: product.title,
      summary: product.summary,
      description: product.description,
      imageUrl: product.imageUrl,
      price: product.price,
      priceRub: Math.round(product.price * 100), // Конвертация PZ в рубли
      stock: product.stock,
      isActive: product.isActive,
      categoryId: product.categoryId,
      availableInRussia: product.availableInRussia,
      availableInBali: product.availableInBali,
      category: {
        id: product.category.id,
        name: product.category.name,
        slug: product.category.slug
      },
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    }));
    
    console.log(`✅ External API: Found ${formattedProducts.length} products (total: ${totalCount})`);
    
    // Устанавливаем заголовки
    res.setHeader('X-Total-Count', totalCount.toString());
    res.setHeader('X-Limit', limitNum.toString());
    res.setHeader('X-Offset', offsetNum.toString());
    
    res.json({
      success: true,
      data: formattedProducts
    });
  } catch (error: any) {
    console.error('❌ External API error fetching products:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error'
    });
  }
});

/**
 * GET /products/:id
 * Получить конкретный товар по ID
 */
router.get('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🔗 External API: Fetching product by ID:', id);
    
    const product = await prisma.product.findUnique({
      where: {
        id: id
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    
    // Форматируем данные
    const formattedProduct = {
      id: product.id,
      title: product.title,
      summary: product.summary,
      description: product.description,
      instruction: product.instruction,
      imageUrl: product.imageUrl,
      price: product.price,
      priceRub: Math.round(product.price * 100),
      stock: product.stock,
      isActive: product.isActive,
      categoryId: product.categoryId,
      availableInRussia: product.availableInRussia,
      availableInBali: product.availableInBali,
      category: {
        id: product.category.id,
        name: product.category.name,
        slug: product.category.slug
      },
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    };
    
    res.json({
      success: true,
      data: formattedProduct
    });
  } catch (error: any) {
    console.error('❌ External API error fetching product:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error'
    });
  }
});

/**
 * POST /orders
 * Создать заказ
 */
router.post('/orders', async (req, res) => {
  try {
    const { contact, items, message } = req.body;
    
    console.log('🔗 External API: Creating order:', {
      contact,
      itemsCount: items?.length,
      message
    });
    
    if (!contact || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: contact, items'
      });
    }
    
    // Валидируем товары
    for (const item of items) {
      if (!item.productId || !item.quantity || !item.price) {
        return res.status(400).json({
          success: false,
          error: 'Each item must have productId, quantity, and price'
        });
      }
      
      // Проверяем существование товара
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      });
      
      if (!product || !product.isActive) {
        return res.status(404).json({
          success: false,
          error: `Product ${item.productId} not found or inactive`
        });
      }
    }
    
    // Создаем заказ
    const order = await prisma.orderRequest.create({
      data: {
        contact: contact,
        message: message || `Заказ через внешний API от ${contact}`,
        itemsJson: items,
        status: 'NEW'
      }
    });
    
    console.log('✅ External API: Order created:', order.id);
    
    res.status(201).json({
      success: true,
      data: {
        orderId: order.id,
        contact: order.contact,
        status: order.status,
        createdAt: order.createdAt
      }
    });
  } catch (error: any) {
    console.error('❌ External API error creating order:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error'
    });
  }
});

export { router as externalApiRouter };

