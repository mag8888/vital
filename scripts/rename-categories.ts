import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting category renaming...');

    const mappings = [
        { old: 'Face Care', new: 'Лицо', slug: 'face-care' },
        { old: 'Body Care', new: 'Тело', slug: 'body-care' }, // Standardize to 'Тело'
        { old: 'Bath & Spa', new: 'Тело', slug: 'body-care' }, // Merge 'Bath & Spa' into 'Тело' if desired, or keep separate? 
        // User screenshot shows "Bath & Spa" and "Face Care".
        // Let's map "Bath & Spa" -> "Ванна и спа" or merge to "Тело"?
        // CATALOG_STRUCTURE has "Тело" (body-care). 
        // "Bath & Spa" (bath-spa) is from Siam import. 
        // Let's rename "Bath & Spa" -> "Ванна и спа" for now to be safe, or "Тело" if we want to unify.
        // The user asked to "rename to Russian". "Bath & Spa" -> "Ванна и SPA" or "Уход за телом".
        // Let's stick to literal translation for "Bath & Spa" -> "Ванна и SPA" to miss less products, 
        // OR map to "Тело" if we want to simplify. 
        // Let's use "Ванна и SPA" for "Bath & Spa" and "Лицо" for "Face Care".
        { old: 'Hair Care', new: 'Волосы', slug: 'hair-care' },
        { old: 'Pure Organic Oils', new: 'Органические масла', slug: 'pure-organic-oils' },
        { old: 'Men Collection', new: 'Для мужчин', slug: 'men-collection' }
    ];

    // Additional check: The user screenshot shows "Bath & Spa" and "Face Care" as tabs.
    // If we change "Bath & Spa" to "Ванна и SPA", it will show as "Ванна и SPA".

    const exactRenames = [
        { slug: 'face-care', name: 'Лицо' },
        { slug: 'bath-spa', name: 'Ванна и SPA' },
        { slug: 'hair-care', name: 'Волосы' },
        { slug: 'pure-organic-oils', name: 'Органические масла' },
        { slug: 'men-collection', name: 'Для мужчин' }
    ];

    for (const item of exactRenames) {
        const category = await prisma.category.findUnique({ where: { slug: item.slug } });
        if (category) {
            console.log(`Updating category ${category.name} (${category.slug}) -> ${item.name}`);
            await prisma.category.update({
                where: { id: category.id },
                data: { name: item.name }
            });
        } else {
            console.log(`Region ${item.slug} not found, skipping.`);
        }
    }

    // Also update by NAME if slug doesn't match but name does (e.g. capitalized differently)
    const nameRenames = [
        { oldName: 'Face Care', newName: 'Лицо' },
        { oldName: 'Bath & Spa', newName: 'Ванна и SPA' },
        { oldName: 'Hair Care', newName: 'Волосы' },
        { oldName: 'Pure Organic Oils', newName: 'Органические масла' }
    ];

    for (const item of nameRenames) {
        // Find many because names are not unique in schema (though slug is)
        const categories = await prisma.category.findMany({ where: { name: item.oldName } });
        for (const cat of categories) {
            console.log(`Updating category by name ${cat.name} -> ${item.newName}`);
            await prisma.category.update({
                where: { id: cat.id },
                data: { name: item.newName }
            });
        }
    }

    console.log('✅ Category renaming completed');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
