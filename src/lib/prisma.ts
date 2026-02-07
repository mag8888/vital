import { PrismaClient } from '@prisma/client';

// SQLite initialization
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn'],
});

// Ensure connection is ready
prisma.$connect().catch((e) => {
  console.error('Failed to connect to SQLite database:', e);
});
