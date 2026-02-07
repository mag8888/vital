
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
    try {
        const userCount = await prisma.user.count();
        console.log(`\n📊 Final User Count: ${userCount}`);
    } catch (error) {
        console.error('Error verifying:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verify();
