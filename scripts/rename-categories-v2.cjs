const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting category renaming (v2)...');

    // Mappings based on user request:
    // Face care - Лицо
    // Bath & Spa - Тело

    const exactRenames = [
        { slug: 'face-care', name: 'Лицо' },
        { slug: 'bath-spa', name: 'Тело' },
        { slug: 'body-care', name: 'Тело' }, // Ensure standard body care is also mapped if exists
        { slug: 'hair-care', name: 'Волосы' },
        { slug: 'pure-organic-oils', name: 'Органические масла' },
        // Add others if needed
    ];

    for (const item of exactRenames) {
        // Try finding by slug first
        const category = await prisma.category.findUnique({ where: { slug: item.slug } });
        if (category) {
            console.log(`Updating category by slug '${category.slug}': '${category.name}' -> '${item.name}'`);
            await prisma.category.update({
                where: { id: category.id },
                data: { name: item.name }
            });
        } else {
            console.log(`Category with slug '${item.slug}' not found. Searching by name...`);
        }
    }

    // Also update by NAME if slug doesn't match but name does (e.g. capitalized differently)
    const nameRenames = [
        { oldName: 'Face Care', newName: 'Лицо' },
        { oldName: 'Bath & Spa', newName: 'Тело' },
        { oldName: 'Body Care', newName: 'Тело' },
        { oldName: 'Hair Care', newName: 'Волосы' },
        { oldName: 'Pure Organic Oils', newName: 'Органические масла' }
    ];

    for (const item of nameRenames) {
        // Find many because names are not unique in schema (though slug is)
        const categories = await prisma.category.findMany({
            where: {
                name: {
                    equals: item.oldName,
                    mode: 'insensitive' // Case insensitive search
                }
            }
        });

        for (const cat of categories) {
            console.log(`Updating category by name '${cat.name}': -> '${item.newName}'`);
            await prisma.category.update({
                where: { id: cat.id },
                data: { name: item.newName }
            });
        }
    }

    console.log('✅ Category renaming v2 completed');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
