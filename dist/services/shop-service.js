import { prisma } from '../lib/prisma.js';
export async function getActiveCategories() {
    const categories = await prisma.category.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
    });
    // Treat missing flag as visible (backward compatible)
    return categories.filter((c) => c?.isVisibleInWebapp !== false);
}
export async function getCategoryById(id) {
    return prisma.category.findUnique({
        where: { id },
    });
}
export async function getProductsByCategory(categoryId) {
    const products = await prisma.product.findMany({
        where: {
            categoryId,
            isActive: true,
            imageUrl: { not: null }, // Only products with images
        },
        orderBy: { title: 'asc' },
    });
    // Additional filter to ensure imageUrl is not empty string
    return products.filter(p => p.imageUrl && p.imageUrl.trim() !== '');
}
export async function getProductById(productId) {
    return prisma.product.findUnique({
        where: { id: productId },
    });
}
export async function getAllActiveProducts() {
    try {
        console.log('📦 getAllActiveProducts: Querying database...');
        const products = await prisma.product.findMany({
            where: {
                isActive: true,
                imageUrl: { not: null }, // Only products with images
            },
            include: {
                category: true
            },
            orderBy: { title: 'asc' },
        });
        // Additional filter to ensure imageUrl is not empty string
        const productsWithImages = products.filter(p => p.imageUrl && p.imageUrl.trim() !== '');
        console.log(`✅ getAllActiveProducts: Found ${productsWithImages.length} products with images (out of ${products.length} total)`);
        return productsWithImages;
    }
    catch (error) {
        console.error('❌ getAllActiveProducts error:', error);
        if (error?.code === 'P2031' || error?.message?.includes('replica set')) {
            console.warn('⚠️  MongoDB replica set not configured');
            // Return empty array instead of throwing
            return [];
        }
        throw error;
    }
}
