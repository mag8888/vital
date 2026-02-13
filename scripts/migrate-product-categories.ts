
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Starting migration of product categories...');

    try {
        // Get all products that don't have categoryIds set or where it's empty
        // Prisma mongo toggle for empty arrays can be tricky, let's just fetch all and check in code for safety
        const products = await prisma.product.findMany({
            select: { id: true, categoryId: true, categoryIds: true }
        });

        console.log(`📦 Found ${products.length} products to check.`);

        let updatedCount = 0;

        for (const product of products) {
            if (!product.categoryIds || product.categoryIds.length === 0) {
                if (product.categoryId) {
                    await prisma.product.update({
                        where: { id: product.id },
                        data: {
                            categoryIds: [product.categoryId]
                        }
                    });
                    updatedCount++;
                    if (updatedCount % 50 === 0) process.stdout.write('.');
                }
            }
        }

        console.log(`\n✅ Migration completed. Updated ${updatedCount} products.`);
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
