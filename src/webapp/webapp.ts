import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { Context } from '../bot/context.js';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { ensureUser } from '../services/user-history.js';
import { getActiveCategories, getCategoryById, getProductById, getProductsByCategory, getAllActiveProducts } from '../services/shop-service.js';
import { addProductToCart, getCartItems, cartItemsToText } from '../services/cart-service.js';
import { createOrderRequest } from '../services/order-service.js';
import { getActiveReviews } from '../services/review-service.js';
import { getOrCreatePartnerProfile, getPartnerDashboard } from '../services/partner-service.js';
import { PartnerProgramType } from '@prisma/client';
import { env } from '../config/env.js';

const router = express.Router();

// Serve static files
router.use('/static', express.static(path.join(__dirname, '../../webapp')));

// Main webapp route
router.get('/', (req, res) => {
  const indexPath = path.join(__dirname, '../../webapp/index.html');
  console.log('📱 Serving webapp from:', indexPath);
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('❌ Error serving webapp:', err);
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>WebApp Error</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; text-align: center; }
            .error { color: #e74c3c; margin: 20px 0; }
          </style>
        </head>
        <body>
          <h1>⚠️ WebApp Error</h1>
          <p class="error">Не удалось загрузить веб-приложение.</p>
          <p>Проверьте логи сервера для деталей.</p>
        </body>
        </html>
      `);
    }
  });
});

// Middleware to extract user info from Telegram WebApp
const extractTelegramUser = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    // Try multiple ways to get Telegram user data
    let telegramUser = null;
    
    // Method 1: From X-Telegram-User header (our custom header)
    const telegramUserHeader = req.headers['x-telegram-user'] as string;
    if (telegramUserHeader) {
      console.log('📱 Found X-Telegram-User header:', telegramUserHeader);
      try {
        telegramUser = JSON.parse(telegramUserHeader);
        console.log('✅ Telegram user from header:', telegramUser);
      } catch (e) {
        console.log('❌ Failed to parse X-Telegram-User:', e);
      }
    }
    
    // Method 2: From x-telegram-init-data header (original Telegram method)
    if (!telegramUser) {
    const initData = req.headers['x-telegram-init-data'] as string;
    if (initData) {
        console.log('📱 Found x-telegram-init-data:', initData);
      const urlParams = new URLSearchParams(initData);
      const userStr = urlParams.get('user');
      if (userStr) {
          telegramUser = JSON.parse(decodeURIComponent(userStr));
          console.log('✅ Telegram user from init-data:', telegramUser);
        }
      }
    }
    
    // Method 2: From query parameters (fallback)
    if (!telegramUser && req.query.user) {
      console.log('📱 Found user in query params:', req.query.user);
      try {
        telegramUser = JSON.parse(decodeURIComponent(req.query.user as string));
        console.log('✅ Telegram user from query:', telegramUser);
      } catch (e) {
        console.log('❌ Failed to parse user from query:', e);
      }
    }
    
    // Method 3: From body (for POST requests)
    if (!telegramUser && req.body && req.body.user) {
      console.log('📱 Found user in body:', req.body.user);
      telegramUser = req.body.user;
      console.log('✅ Telegram user from body:', telegramUser);
      }
    
    // Method 4: Mock user for development/testing
    if (!telegramUser) {
      console.log('⚠️ No Telegram user found, using mock user for development');
      telegramUser = {
        id: 123456789,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
        language_code: 'ru'
      };
    }
    
    (req as any).telegramUser = telegramUser;
    console.log('🔐 Final telegram user:', telegramUser);
    next();
  } catch (error) {
    console.error('❌ Error extracting Telegram user:', error);
    // Set mock user on error
    (req as any).telegramUser = {
      id: 123456789,
      first_name: 'Test',
      last_name: 'User',
      username: 'testuser',
      language_code: 'ru'
    };
    next();
  }
};

// Apply middleware to all API routes
router.use('/api', extractTelegramUser);

// Helper function to get telegram user
const getTelegramUser = (req: express.Request) => {
  return (req as any).telegramUser;
};

// API Routes

// User profile
router.get('/api/user/profile', async (req, res) => {
  try {
    const telegramUser = getTelegramUser(req);
    if (!telegramUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Find or create user
    const { prisma } = await import('../lib/prisma.js');
    let user = await prisma.user.findUnique({
      where: { telegramId: telegramUser.id.toString() }
    });

    if (!user) {
      try {
        user = await prisma.user.create({
          data: {
            telegramId: telegramUser.id.toString(),
            firstName: telegramUser.first_name,
            lastName: telegramUser.last_name,
            username: telegramUser.username,
          }
        });
      } catch (error: any) {
        if (error?.code === 'P2031' || error?.message?.includes('replica set')) {
          console.warn('⚠️  MongoDB replica set not configured - user creation skipped');
          return res.status(503).json({ 
            error: 'Database temporarily unavailable. Please try again later.' 
          });
        }
        throw error;
      }
    }

    res.json({
      id: user.id,
      telegramId: user.telegramId,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      phone: user.phone,
      deliveryAddress: user.deliveryAddress,
      balance: (user as any).balance || 0
    });
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Categories
router.get('/api/categories', async (req, res) => {
  try {
    const categories = await getActiveCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Total products count endpoint (must be before /api/products/:id)
router.get('/api/products/count', async (req, res) => {
  try {
    console.log('📊 Fetching product count...');
    const { prisma } = await import('../lib/prisma.js');
    const count = await prisma.product.count({
      where: { isActive: true }
    });
    console.log(`✅ Product count: ${count}`);
    res.json({ totalProducts: count });
  } catch (error: any) {
    console.error('❌ Error fetching total product count:', error);
    if (error?.code === 'P2031' || error?.message?.includes('replica set')) {
      console.warn('⚠️  MongoDB replica set not configured - returning 0');
      return res.json({ totalProducts: 0 });
    }
    res.status(500).json({ 
      error: 'Internal server error',
      message: error?.message || 'Unknown error'
    });
  }
});

// All products endpoint
router.get('/api/products', async (req, res) => {
  try {
    console.log('📦 Fetching all active products...');
    const products = await getAllActiveProducts();
    console.log(`✅ Found ${products?.length || 0} products`);
    res.json(products || []);
  } catch (error: any) {
    console.error('❌ Error getting all products:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack
    });
    res.status(500).json({ 
      error: 'Internal server error',
      message: error?.message || 'Unknown error',
      code: error?.code
    });
  }
});

// Products by category
router.get('/api/categories/:categoryId/products', async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    // Получаем все активные товары без фильтрации по региону
    const products = await getProductsByCategory(categoryId);
    
    res.json(products);
  } catch (error) {
    console.error('Error getting products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cart operations
router.get('/api/cart/items', async (req, res) => {
  try {
    console.log('🛒 Cart items request:', req.headers);

    const telegramUser = getTelegramUser(req);
    if (!telegramUser) {
      console.log('❌ No telegram user found for cart items');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('✅ Telegram user found for cart items:', telegramUser.id);

    const { prisma } = await import('../lib/prisma.js');
    let user = await prisma.user.findUnique({
      where: { telegramId: telegramUser.id.toString() }
    });

    if (!user) {
      console.log('❌ User not found for telegramId:', telegramUser.id, '- creating user');
      try {
        // Create user if not exists
        user = await prisma.user.create({
          data: {
            telegramId: telegramUser.id.toString(),
            firstName: telegramUser.first_name,
            lastName: telegramUser.last_name,
            username: telegramUser.username,
          }
        });
        console.log('✅ User created:', user.id);
      } catch (error: any) {
        if (error?.code === 'P2031' || error?.message?.includes('replica set')) {
          console.warn('⚠️  MongoDB replica set not configured - user creation failed');
          return res.status(503).json({ 
            error: 'Database temporarily unavailable. Please try again later.' 
          });
        }
        throw error;
      }
    }

    console.log('✅ User found for cart items:', user.id);

    const cartItems = await getCartItems(user.id);
    console.log('✅ Cart items retrieved:', cartItems.length);
    res.json(cartItems);
  } catch (error) {
    console.error('❌ Error getting cart items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cart add endpoint
router.post('/api/cart/add', async (req, res) => {
  try {
    console.log('🛒 Cart add request:', {
      body: req.body,
      headers: req.headers
    });

    const telegramUser = getTelegramUser(req);
    if (!telegramUser) {
      console.log('❌ No telegram user found for cart add');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('✅ Telegram user found for cart:', telegramUser.id);

    const { productId, quantity = 1 } = req.body;
    if (!productId) {
      console.log('❌ No productId provided:', req.body);
      return res.status(400).json({ error: 'Product ID is required' });
    }

    console.log('✅ ProductId validated:', productId, 'Quantity:', quantity);

    const { prisma } = await import('../lib/prisma.js');
    let user = await prisma.user.findUnique({
      where: { telegramId: telegramUser.id.toString() }
    });

    if (!user) {
      console.log('❌ User not found for telegramId:', telegramUser.id, '- creating user');
      try {
        // Create user if not exists
        user = await prisma.user.create({
          data: {
            telegramId: telegramUser.id.toString(),
            firstName: telegramUser.first_name,
            lastName: telegramUser.last_name,
            username: telegramUser.username,
          }
        });
        console.log('✅ User created:', user.id);
      } catch (error: any) {
        if (error?.code === 'P2031' || error?.message?.includes('replica set')) {
          console.warn('⚠️  MongoDB replica set not configured - user creation failed');
          return res.status(503).json({ 
            error: 'Database temporarily unavailable. Please try again later.' 
          });
        }
        throw error;
      }
    }

    console.log('✅ User found for cart:', user.id);

    // Check if item already exists in cart
    const existingItem = await prisma.cartItem.findFirst({
      where: { userId: user.id, productId }
    });

    if (existingItem) {
      console.log('✅ Updating existing cart item:', existingItem.id);
      // Update quantity
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity }
      });
    } else {
      console.log('✅ Creating new cart item');
      // Add new item
      await prisma.cartItem.create({
        data: {
          userId: user.id,
          productId,
          quantity
        }
      });
    }

    console.log('✅ Cart item added successfully');
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error adding to cart:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cart remove endpoint
router.delete('/api/cart/remove/:cartItemId', async (req, res) => {
  try {
    const telegramUser = getTelegramUser(req);
    if (!telegramUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { cartItemId } = req.params;
    const { prisma } = await import('../lib/prisma.js');
    
    const user = await prisma.user.findUnique({
      where: { telegramId: telegramUser.id.toString() }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if cart item belongs to user
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: cartItemId }
    });

    if (!cartItem || cartItem.userId !== user.id) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    await prisma.cartItem.delete({
      where: { id: cartItemId }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error removing from cart:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Order create endpoint
router.post('/api/orders/create', async (req, res) => {
  try {
    console.log('📦 Order creation request:', {
      body: req.body,
      headers: req.headers
    });

    const telegramUser = getTelegramUser(req);
    if (!telegramUser) {
      console.log('❌ No telegram user found');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('✅ Telegram user found:', telegramUser.id);

    const { items, message = '' } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.log('❌ Invalid items:', items);
      return res.status(400).json({ error: 'Items are required' });
    }

    console.log('✅ Items validated:', items);

    const { prisma } = await import('../lib/prisma.js');
    let user = await prisma.user.findUnique({
      where: { telegramId: telegramUser.id.toString() }
    });

    if (!user) {
      console.log('❌ User not found for telegramId:', telegramUser.id, '- creating user');
      try {
        // Create user if not exists
        user = await prisma.user.create({
          data: {
            telegramId: telegramUser.id.toString(),
            firstName: telegramUser.first_name,
            lastName: telegramUser.last_name,
            username: telegramUser.username,
          }
        });
        console.log('✅ User created:', user.id);
      } catch (error: any) {
        if (error?.code === 'P2031' || error?.message?.includes('replica set')) {
          console.warn('⚠️  MongoDB replica set not configured - user creation failed');
          return res.status(503).json({ 
            error: 'Database temporarily unavailable. Please try again later.' 
          });
        }
        throw error;
      }
    }

    console.log('✅ User found:', user.id);

    // Create order
    const order = await prisma.orderRequest.create({
      data: {
        userId: user.id,
        message,
        itemsJson: items,
        status: 'NEW',
        contact: `@${telegramUser.username || 'user'}` || `ID: ${telegramUser.id}`
      }
    });

    console.log('✅ Order created successfully:', order.id);
    res.json({ success: true, orderId: order.id });
  } catch (error) {
    console.error('❌ Error creating order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Partner operations
router.get('/api/partner/dashboard', async (req, res) => {
  try {
    const telegramUser = getTelegramUser(req);
    if (!telegramUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { prisma } = await import('../lib/prisma.js');
    let user = await prisma.user.findUnique({
      where: { telegramId: telegramUser.id.toString() },
      include: { partner: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.partner) {
      return res.json({ 
        isActive: false, 
        message: 'Партнерская программа не активирована' 
      });
    }

    res.json({
      isActive: user.partner.isActive,
      balance: user.partner.balance,
      bonus: user.partner.bonus,
      referralCode: user.partner.referralCode,
      programType: user.partner.programType || 'DIRECT',
      totalPartners: user.partner.totalPartners,
      directPartners: user.partner.directPartners
    });
  } catch (error) {
    console.error('Error getting partner dashboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get partner referrals list
router.get('/api/partner/referrals', async (req, res) => {
  try {
    const telegramUser = getTelegramUser(req);
    if (!telegramUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { prisma } = await import('../lib/prisma.js');
    const { getPartnerList } = await import('../services/partner-service.js');
    
    let user = await prisma.user.findUnique({
      where: { telegramId: telegramUser.id.toString() }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const partnerList = await getPartnerList(user.id);
    
    if (!partnerList) {
      return res.json({
        directPartners: [],
        multiPartners: []
      });
    }

    res.json(partnerList);
  } catch (error) {
    console.error('Error getting partner referrals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Activate partner program
router.post('/api/partner/activate', async (req, res) => {
  try {
    console.log('🤝 Partner activation request:', {
      body: req.body,
      headers: req.headers
    });

    const telegramUser = getTelegramUser(req);
    if (!telegramUser) {
      console.log('❌ No telegram user found for partner activation');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('✅ Telegram user found for partner activation:', telegramUser.id);

    const { type } = req.body;
    if (!type || !['DIRECT', 'MULTI_LEVEL'].includes(type)) {
      console.log('❌ Invalid partner program type:', type);
      return res.status(400).json({ error: 'Invalid program type' });
    }

    console.log('✅ Partner program type validated:', type);

    const { prisma } = await import('../lib/prisma.js');
    let user = await prisma.user.findUnique({
      where: { telegramId: telegramUser.id.toString() },
      include: { partner: true }
    });

    if (!user) {
      console.log('❌ User not found for telegramId:', telegramUser.id, '- creating user');
      // Create user if not exists
      const newUser = await prisma.user.create({
        data: {
          telegramId: telegramUser.id.toString(),
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name,
          username: telegramUser.username,
        }
      });
      console.log('✅ User created:', newUser.id);
      
      // Fetch user with partner relation after creation
      user = await prisma.user.findUnique({
        where: { id: newUser.id },
        include: { partner: true }
      });
    }

    if (!user) {
      console.log('❌ Failed to create or find user');
      return res.status(500).json({ error: 'Failed to create user' });
    }

    console.log('✅ User found for partner activation:', user.id);

    // Check if user already has a partner profile
    if (user.partner) {
      console.log('✅ User already has partner profile:', user.partner.id);
      return res.json({
        success: true,
        message: 'Партнёрская программа уже активирована',
        isActive: user.partner.isActive,
        referralCode: user.partner.referralCode
      });
    }

    // Create partner profile
    console.log('✅ Creating partner profile...');
    const partnerProfile = await getOrCreatePartnerProfile(user.id, type);
    
    console.log('✅ Partner profile created successfully:', partnerProfile.id);
    res.json({
      success: true,
      message: 'Партнёрская программа активирована!',
      referralCode: partnerProfile.referralCode,
      programType: partnerProfile.programType
    });
  } catch (error) {
    console.error('❌ Error activating partner program:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get product by ID endpoint (must be after /api/products/count)
router.get('/api/products/:id', async (req, res) => {
  try {
    const { prisma } = await import('../lib/prisma.js');
    const productId = req.params.id;
    
    // Validate that ID is a valid MongoDB ObjectID format
    if (!productId || productId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(productId)) {
      return res.status(400).json({ error: 'Invalid product ID format' });
    }
    
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true
      }
    });
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product);
  } catch (error: any) {
    console.error('Error fetching product:', error);
    if (error?.code === 'P2023') {
      return res.status(400).json({ error: 'Invalid product ID format' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Total reviews count endpoint
router.get('/api/reviews/count', async (req, res) => {
  try {
    const { prisma } = await import('../lib/prisma.js');
    const count = await prisma.review.count({
      where: { isActive: true }
    });
    res.json({ totalReviews: count });
  } catch (error) {
    console.error('Error fetching total reviews count:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reviews
router.get('/api/reviews', async (req, res) => {
  try {
    const reviews = await getActiveReviews();
    res.json(reviews);
  } catch (error) {
    console.error('Error getting reviews:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Audio files (mock data for now)
router.get('/api/audio/files', async (req, res) => {
  try {
    const audioFiles = [
      {
        id: 'matrix1',
        title: 'Матрица 1 - Восстановление',
        description: 'Аудиофайл для восстановления энергетики',
        duration: '15:30',
        url: 'https://example.com/audio/matrix1.mp3'
      },
      {
        id: 'matrix2',
        title: 'Матрица 2 - Энергия',
        description: 'Аудиофайл для повышения энергии',
        duration: '12:45',
        url: 'https://example.com/audio/matrix2.mp3'
      },
      {
        id: 'matrix3',
        title: 'Матрица 3 - Гармония',
        description: 'Аудиофайл для гармонизации организма',
        duration: '18:20',
        url: 'https://example.com/audio/matrix3.mp3'
      },
      {
        id: 'matrix4',
        title: 'Матрица 4 - Исцеление',
        description: 'Аудиофайл для исцеления',
        duration: '14:10',
        url: 'https://example.com/audio/matrix4.mp3'
      },
      {
        id: 'matrix5',
        title: 'Матрица 5 - Трансформация',
        description: 'Аудиофайл для трансформации сознания',
        duration: '16:55',
        url: 'https://example.com/audio/matrix5.mp3'
      }
    ];

    res.json(audioFiles);
  } catch (error) {
    console.error('Error getting audio files:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save phone number
router.post('/api/user/phone', async (req, res) => {
  try {
    const telegramUser = getTelegramUser(req);
    if (!telegramUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const { prisma } = await import('../lib/prisma.js');
    let user = await prisma.user.findUnique({
      where: { telegramId: telegramUser.id.toString() }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user phone
    await prisma.user.update({
      where: { id: user.id },
      data: { phone }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving phone:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save delivery address
router.post('/api/user/address', async (req, res) => {
  try {
    const telegramUser = getTelegramUser(req);
    if (!telegramUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { address } = req.body;
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    const { prisma } = await import('../lib/prisma.js');
    let user = await prisma.user.findUnique({
      where: { telegramId: telegramUser.id.toString() }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user delivery address
    await prisma.user.update({
      where: { id: user.id },
      data: { deliveryAddress: address }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving address:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get video URL
router.get('/api/video/url', async (req, res) => {
  try {
    const { env } = await import('../config/env.js');
    res.json({ videoUrl: env.videoUrl });
  } catch (error) {
    console.error('Error getting video URL:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
router.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Trigger product import (simple endpoint to fill catalog)
router.post('/api/import-products', async (req, res) => {
  try {
    console.log('🚀 Запрос на импорт продуктов через webapp API');
    
    const { prisma } = await import('../lib/prisma.js');
    const productCount = await prisma.product.count();
    
    if (productCount > 0) {
      return res.json({ 
        success: false, 
        message: `Каталог уже содержит ${productCount} товаров. Импорт не требуется.` 
      });
    }
    
    // Запускаем импорт в фоне
    import('../services/siam-import-service.js').then(async (module) => {
      try {
        const { importSiamProducts } = module;
        const result = await importSiamProducts();
        console.log(`✅ Импорт завершен через webapp API: ${result.success} успешно, ${result.errors} ошибок`);
      } catch (error: any) {
        console.error('❌ Ошибка импорта через webapp API:', error?.message || error);
      }
    }).catch((error) => {
      console.error('❌ Ошибка запуска импорта через webapp API:', error);
    });
    
    res.json({ 
      success: true, 
      message: 'Импорт продуктов запущен в фоновом режиме. Проверьте каталог через несколько минут.' 
    });
  } catch (error: any) {
    console.error('❌ Ошибка при запуске импорта:', error);
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Internal server error' 
    });
  }
});

export { router as webappRouter };