import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

// Log database URL for debugging (without sensitive info)
const dbUrl = env.databaseUrl;
if (dbUrl) {
  console.log('Database URL configured:', dbUrl.substring(0, 20) + '...');
} else {
  console.error('DATABASE_URL not found in environment variables');
}

// Normalize MongoDB connection string for Railway
function normalizeMongoUrl(url: string): string {
  let normalized = url.trim();
  
  // Fix retrywrites -> retryWrites (case insensitive) - only fix this
  normalized = normalized.replace(/retrywrites=true/gi, 'retryWrites=true');
  
  // Don't modify the connection string otherwise - Railway provides complete URLs
  // MongoDB with Prisma doesn't require database name in connection string for most operations
  // Prisma will use the database specified in schema or default one
  
  return normalized;
}

const fixedDbUrl = dbUrl ? normalizeMongoUrl(dbUrl) : undefined;

export const prisma = new PrismaClient({
  datasources: fixedDbUrl ? {
    db: {
      url: fixedDbUrl
    }
  } : undefined,
  log: ['query', 'info', 'warn', 'error'],
});
