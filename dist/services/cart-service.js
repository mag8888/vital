import { prisma } from '../lib/prisma.js';
export async function getCartItems(userId) {
    return prisma.cartItem.findMany({
        where: { userId },
        include: {
            product: true,
        },
        orderBy: { createdAt: 'desc' },
    });
}
export async function addProductToCart(userId, productId) {
    return prisma.cartItem.upsert({
        where: {
            userId_productId: {
                userId,
                productId,
            },
        },
        update: {
            quantity: { increment: 1 },
        },
        create: {
            userId,
            productId,
            quantity: 1,
        },
    });
}
export async function clearCart(userId) {
    await prisma.cartItem.deleteMany({ where: { userId } });
}
export async function increaseProductQuantity(userId, productId) {
    return prisma.cartItem.upsert({
        where: {
            userId_productId: {
                userId,
                productId,
            },
        },
        update: {
            quantity: {
                increment: 1,
            },
        },
        create: {
            userId,
            productId,
            quantity: 1,
        },
    });
}
export async function decreaseProductQuantity(userId, productId) {
    const item = await prisma.cartItem.findUnique({
        where: {
            userId_productId: {
                userId,
                productId,
            },
        },
    });
    if (!item) {
        return null;
    }
    if (item.quantity <= 1) {
        // Remove item if quantity becomes 0 or less
        await prisma.cartItem.delete({
            where: {
                userId_productId: {
                    userId,
                    productId,
                },
            },
        });
        return null;
    }
    return prisma.cartItem.update({
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
}
export async function removeProductFromCart(userId, productId) {
    return prisma.cartItem.delete({
        where: {
            userId_productId: {
                userId,
                productId,
            },
        },
    });
}
export function cartItemsToText(items, discount = 0) {
    if (items.length === 0) {
        return 'Корзина пуста.';
    }
    const lines = items.map((item) => {
        const originalPzPrice = Number(item.product.price);
        const discountedPzPrice = discount > 0 ? originalPzPrice * (1 - discount) : originalPzPrice;
        const rubPrice = (discountedPzPrice * 100).toFixed(2);
        const totalRub = (discountedPzPrice * item.quantity * 100).toFixed(2);
        const totalPz = (discountedPzPrice * item.quantity).toFixed(2);
        if (discount > 0) {
            const originalRub = (originalPzPrice * 100).toFixed(2);
            const originalTotalRub = (originalPzPrice * item.quantity * 100).toFixed(2);
            return `• ${item.product.title} — ${item.quantity} шт. × ${originalRub} ₽ (со скидкой ${(discount * 100).toFixed(0)}%: ${rubPrice} ₽) = ${originalTotalRub} ₽ → ${totalRub} ₽ / ${totalPz} PZ`;
        }
        return `• ${item.product.title} — ${item.quantity} шт. × ${rubPrice} ₽ = ${totalRub} ₽ / ${totalPz} PZ`;
    });
    // Calculate total sum
    let subtotalPzSum = 0;
    let subtotalRubSum = 0;
    items.forEach((item) => {
        const pzPrice = Number(item.product.price);
        subtotalPzSum += pzPrice * item.quantity;
        subtotalRubSum += pzPrice * item.quantity * 100;
    });
    
    let totalPzSum = subtotalPzSum;
    let totalRubSum = subtotalRubSum;
    let discountAmount = 0;
    
    if (discount > 0) {
        discountAmount = subtotalPzSum * discount;
        totalPzSum = subtotalPzSum - discountAmount;
        totalRubSum = subtotalRubSum - (discountAmount * 100);
    }
    
    // Add total sum line
    lines.push('');
    if (discount > 0) {
        lines.push(`💵 Сумма без скидки: ${subtotalRubSum.toFixed(2)} ₽ / ${subtotalPzSum.toFixed(2)} PZ`);
        lines.push(`🎁 Скидка ${(discount * 100).toFixed(0)}%: -${(discountAmount * 100).toFixed(2)} ₽ / -${discountAmount.toFixed(2)} PZ`);
    }
    lines.push(`💰 Общая сумма: ${totalRubSum.toFixed(2)} ₽ / ${totalPzSum.toFixed(2)} PZ`);
    return lines.join('\n');
}
