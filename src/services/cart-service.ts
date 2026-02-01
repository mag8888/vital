import { prisma } from '../lib/prisma.js';
import { checkPartnerActivation } from './partner-service.js';

export async function getCartItems(userId: string) {
  return prisma.cartItem.findMany({
    where: { userId },
    include: {
      product: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function addProductToCart(userId: string, productId: string) {
  try {
    // Используем findUnique + create/update вместо upsert для избежания транзакций
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existingItem) {
      return await prisma.cartItem.update({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
        data: {
          quantity: { increment: 1 },
        },
      });
    } else {
      return await prisma.cartItem.create({
        data: {
          userId,
          productId,
          quantity: 1,
        },
      });
    }
  } catch (error: any) {
    const errorMessage = error.message || error.meta?.message || '';
    const errorName = error.name || '';
    const errorCode = error.code || '';
    
    // Проверяем, является ли это ошибкой replica set
    const isReplicaSetError = 
      errorMessage.includes('replica set') || 
      errorMessage.includes('Transactions are not supported') ||
      errorName === 'PrismaClientUnknownRequestError';
    
    // Проверяем, является ли это ошибкой подключения
    const isConnectionError = 
      errorCode === 'P2010' || errorCode === 'P1001' || errorCode === 'P1002' || errorCode === 'P1013' ||
      errorName === 'ConnectorError' ||
      errorMessage.includes('ConnectorError') ||
      errorMessage.includes('Authentication failed') ||
      errorMessage.includes('SCRAM failure');
    
    if (isReplicaSetError) {
      console.error('❌ Cart: Replica set error (MongoDB requires replica set for Prisma):', errorMessage.substring(0, 100));
      console.error('💡 To fix: Use MongoDB Atlas (supports replica set) - see MONGODB_ATLAS_REQUIRED.md');
      throw new Error('База данных требует настройки replica set. Пожалуйста, обратитесь к администратору.');
    } else if (isConnectionError) {
      console.error('❌ Cart: Database connection error:', errorMessage.substring(0, 100));
      throw new Error('База данных временно недоступна. Попробуйте позже.');
    } else {
      console.error('❌ Cart: Unexpected error adding to cart:', error);
      throw error;
    }
  }
}

export async function clearCart(userId: string) {
  await prisma.cartItem.deleteMany({ where: { userId } });
}

export async function increaseProductQuantity(userId: string, productId: string) {
  // Используем findUnique + create/update вместо upsert для избежания транзакций
  const existingItem = await prisma.cartItem.findUnique({
    where: {
      userId_productId: {
        userId,
        productId,
      },
    },
  });

  if (existingItem) {
    return prisma.cartItem.update({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
      data: {
        quantity: { increment: 1 },
      },
    });
  } else {
    return prisma.cartItem.create({
      data: {
        userId,
        productId,
        quantity: 1,
      },
    });
  }
}

export async function decreaseProductQuantity(userId: string, productId: string) {
  try {
    const item = await prisma.cartItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (!item) {
      // Товар не найден в корзине
      return null;
    }

    if (item.quantity <= 1) {
      // Remove item if quantity becomes 0 or less
      try {
        await prisma.cartItem.delete({
          where: {
            userId_productId: {
              userId,
              productId,
            },
          },
        });
        return null;
      } catch (error: any) {
        // Обрабатываем ошибку P2025 (Record to delete does not exist)
        if (error?.code === 'P2025') {
          console.warn(`⚠️ Cart: Item already deleted during decrease (userId: ${userId}, productId: ${productId})`);
          return null;
        }
        throw error;
      }
    }

    try {
      return await prisma.cartItem.update({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
        data: {
          quantity: {
            decrement: 1,
          },
        },
      });
    } catch (error: any) {
      // Обрабатываем ошибку P2025 (Record to update does not exist)
      if (error?.code === 'P2025') {
        console.warn(`⚠️ Cart: Item not found during update (userId: ${userId}, productId: ${productId})`);
        return null;
      }
      throw error;
    }
  } catch (error: any) {
    // Логируем неожиданные ошибки
    console.error('❌ Cart: Unexpected error in decreaseProductQuantity:', error);
    throw error;
  }
}

export async function removeProductFromCart(userId: string, productId: string) {
  // Проверяем существование товара перед удалением
  const item = await prisma.cartItem.findUnique({
    where: {
      userId_productId: {
        userId,
        productId,
      },
    },
  });

  if (!item) {
    // Товар уже удален или не существует - возвращаем null вместо ошибки
    return null;
  }

  try {
    return await prisma.cartItem.delete({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });
  } catch (error: any) {
    // Обрабатываем ошибку P2025 (Record to delete does not exist)
    if (error?.code === 'P2025') {
      console.warn(`⚠️ Cart: Item already deleted (userId: ${userId}, productId: ${productId})`);
      return null;
    }
    throw error;
  }
}

/**
 * Calculate price with partner discount (10% if partner program is active)
 */
export async function calculatePriceWithDiscount(userId: string, basePrice: number): Promise<{ 
  originalPrice: number; 
  discountedPrice: number; 
  discount: number; 
  hasDiscount: boolean;
}> {
  const isPartnerActive = await checkPartnerActivation(userId);
  const discountPercent = isPartnerActive ? 10 : 0;
  const discount = (basePrice * discountPercent) / 100;
  const discountedPrice = basePrice - discount;

  return {
    originalPrice: basePrice,
    discountedPrice,
    discount,
    hasDiscount: isPartnerActive
  };
}

export async function cartItemsToText(
  items: Array<{ product: { title: string; price: number }; quantity: number }>,
  userId?: string
) {
  if (items.length === 0) {
    return 'Корзина пуста.';
  }

  // Check if user has active partner program
  let hasPartnerDiscount = false;
  if (userId) {
    hasPartnerDiscount = await checkPartnerActivation(userId);
  }

  const lines = items.map((item) => {
    const pzPrice = Number(item.product.price);
    let finalPrice = pzPrice;
    let discountInfo = '';

    if (hasPartnerDiscount) {
      const discount = (pzPrice * 10) / 100;
      finalPrice = pzPrice - discount;
      discountInfo = ` (скидка 10%: -${(discount * 100).toFixed(2)} ₽)`;
    }

    const rubPrice = (pzPrice * 100).toFixed(2);
    const finalRubPrice = (finalPrice * 100).toFixed(2);
    const totalRub = (finalPrice * item.quantity * 100).toFixed(2);
    const totalPz = (finalPrice * item.quantity).toFixed(2);
    
    return `• ${item.product.title} — ${item.quantity} шт. × ${finalRubPrice} ₽ = ${totalRub} ₽ / ${totalPz} PZ${discountInfo}`;
  });

  // Calculate total sum
  let totalPzSum = 0;
  let totalRubSum = 0;
  let totalDiscount = 0;
  
  items.forEach((item) => {
    const pzPrice = Number(item.product.price);
    let finalPrice = pzPrice;
    
    if (hasPartnerDiscount) {
      const discount = (pzPrice * 10) / 100;
      finalPrice = pzPrice - discount;
      totalDiscount += discount * item.quantity;
    }
    
    totalPzSum += finalPrice * item.quantity;
    totalRubSum += finalPrice * item.quantity * 100;
  });

  // Add total sum line
  lines.push('');
  
  if (hasPartnerDiscount && totalDiscount > 0) {
    lines.push(`🎁 Скидка партнера (10%): -${(totalDiscount * 100).toFixed(2)} ₽ / -${totalDiscount.toFixed(2)} PZ`);
  }
  
  lines.push(`💰 Общая сумма: ${totalRubSum.toFixed(2)} ₽ / ${totalPzSum.toFixed(2)} PZ`);
  
  if (hasPartnerDiscount) {
    lines.push('');
    lines.push('✨ Применена скидка 10% для партнеров');
  }

  return lines.join('\n');
}
