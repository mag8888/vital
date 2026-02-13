import { prisma } from '../lib/prisma.js';

interface OrderItemPayload {
  productId: string;
  title: string;
  price: number;
  quantity: number;
}

export async function createOrderRequest(params: {
  userId?: string;
  contact?: string;
  message: string;
  items: OrderItemPayload[];
}) {
  const itemsJson = params.items.map((item) => ({
    ...item,
    price: Number(item.price),
  }));

  console.log('🛒 Creating order request:', {
    userId: params.userId,
    contact: params.contact,
    message: params.message,
    itemsCount: params.items.length,
    items: params.items
  });

  try {
    const order = await prisma.$transaction(async (tx) => {
      // 1. Decrement stock for each item
      for (const item of params.items) {
        if (item.productId) {
          const result = await tx.product.updateMany({
            where: {
              id: item.productId,
              stock: { gte: item.quantity }
            },
            data: {
              stock: { decrement: item.quantity }
            }
          });

          if (result.count === 0) {
            // Check if product exists to give better error message
            const product = await tx.product.findUnique({ where: { id: item.productId } });
            if (!product) {
              throw new Error(`Товар не найден: ${item.title}`);
            } else {
              throw new Error(`Недостаточно товара на складе: ${item.title} (доступно: ${product.stock})`);
            }
          }
        }
      }

      // 2. Create the order
      return tx.orderRequest.create({
        data: {
          userId: params.userId,
          contact: params.contact,
          message: params.message,
          itemsJson,
        },
      });
    });

    console.log('✅ Order request created successfully:', {
      orderId: order.id,
      userId: order.userId,
      status: order.status,
      createdAt: order.createdAt
    });

    return order;
  } catch (error) {
    console.error('❌ Failed to create order:', error);
    throw error;
  }
}
