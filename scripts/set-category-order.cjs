const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting category sort order update...');

    const orderMap = [
        { slugs: ['face-care', 'face'], names: ['Лицо', 'Face Care'], order: 1 },
        { slugs: ['bath-spa', 'body-care', 'body'], names: ['Тело', 'Bath & Spa', 'Body Care'], order: 2 },
        { slugs: ['hair-care', 'hair'], names: ['Волосы', 'Hair Care'], order: 3 },
        { slugs: ['men', 'for-men'], names: ['Для Мужчин', 'Men'], order: 4 },
        { slugs: ['pure-organic-oils', 'oils'], names: ['Органические масла', 'Pure Organic Oils'], order: 5 },
    ];

    for (const item of orderMap) {
        // Try finding by slug OR name
        const categories = await prisma.category.findMany({
            where: {
                OR: [
                    { slug: { in: item.slugs } },
                    { name: { in: item.names, mode: 'insensitive' } }
                ]
            }
        });

        for (const cat of categories) {
            console.log(`Update '${cat.name}' (${cat.slug}) -> sortOrder: ${item.order}`);
            await prisma.category.update({
                where: { id: cat.id },
                data: { sortOrder: item.order }
            });
        }
    }

    console.log('✅ Category sort order updated');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
