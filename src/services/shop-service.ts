import { prisma } from '../lib/prisma.js';

export async function getActiveCategories() {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
}

export async function getCategoryById(id: string) {
  return prisma.category.findUnique({
    where: { id },
  });
}

export async function getProductsByCategory(categoryId: string) {
  return prisma.product.findMany({
    where: { categoryId, isActive: true },
    orderBy: { title: 'asc' },
  });
}

export async function getProductById(productId: string) {
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
  } catch (error: any) {
    console.error('❌ getAllActiveProducts error:', error);
    if (error?.code === 'P2031' || error?.message?.includes('replica set')) {
      console.warn('⚠️  MongoDB replica set not configured');
      // Return empty array instead of throwing
      return [];
    }
    throw error;
  }
}
