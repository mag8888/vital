import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

// Log database URL for debugging (without sensitive info)
const dbUrl = env.databaseUrl;
if (dbUrl) {
  // Extract just the protocol and host part for logging
  const match = dbUrl.match(/^mongodb:\/\/([^:@]+(@[^/]+)?)(:[^@]+)?/);
  if (match) {
    const hostPart = match[0];
    console.log('Database URL configured:', hostPart + '...');
  } else {
    console.log('Database URL configured:', dbUrl.substring(0, 30) + '...');
  }
  
  // Log if database name is present
  const hasDbName = dbUrl.match(/\/[^/?]+(\?|$)/);
  if (!hasDbName) {
    console.warn('⚠️  Database name not found in connection string, will be added automatically');
  }
} else {
  console.error('DATABASE_URL not found in environment variables');
}

// Normalize MongoDB connection string for Railway
function normalizeMongoUrl(url: string): string {
  let normalized = url.trim();
  
  // Fix retrywrites -> retryWrites (case insensitive) in query params
  if (normalized.includes('?')) {
    const [base, query] = normalized.split('?', 2);
    const fixedQuery = query.replace(/retrywrites=true/gi, 'retryWrites=true');
    normalized = base + '?' + fixedQuery;
  } else {
    normalized = normalized.replace(/retrywrites=true/gi, 'retryWrites=true');
  }
  
  // Check if database name is already present
  const queryIndex = normalized.indexOf('?');
  const urlPart = queryIndex !== -1 ? normalized.substring(0, queryIndex) : normalized;
  const queryPart = queryIndex !== -1 ? '?' + normalized.substring(queryIndex + 1) : '';
  
  const atIndex = urlPart.indexOf('@');
  const hostStart = atIndex !== -1 ? atIndex + 1 : (urlPart.indexOf('://') + 3);
  const hostPart = urlPart.substring(hostStart);
  const slashAfterHost = hostPart.indexOf('/');
  
  if (slashAfterHost === -1) {
    normalized = urlPart + '/vital' + queryPart;
  } else {
    const afterSlash = hostPart.substring(slashAfterHost + 1);
    if (!afterSlash || afterSlash.trim() === '') {
      normalized = urlPart + 'vital' + queryPart;
    }
  }
  
  return normalized;
}

let fixedDbUrl = dbUrl ? normalizeMongoUrl(dbUrl) : undefined;

// Optimize connection string
function optimizeConnectionString(url: string): string {
  let optimized = url;
  
  if (!optimized.includes('maxPoolSize')) {
    const separator = optimized.includes('?') ? '&' : '?';
    optimized = `${optimized}${separator}maxPoolSize=10&minPoolSize=2`;
  }
  
  if (!optimized.includes('connectTimeoutMS')) {
    optimized = `${optimized}&connectTimeoutMS=30000`;
  }
  
  if (!optimized.includes('socketTimeoutMS')) {
    optimized = `${optimized}&socketTimeoutMS=30000`;
  }
  
  if (!optimized.includes('serverSelectionTimeoutMS')) {
    optimized = `${optimized}&serverSelectionTimeoutMS=30000`;
  }
  
  if (!optimized.includes('heartbeatFrequencyMS')) {
    optimized = `${optimized}&heartbeatFrequencyMS=10000`;
  }
  
  if (!optimized.includes('authSource')) {
    optimized = `${optimized}&authSource=admin`;
  }
  
  if (optimized.startsWith('mongodb+srv://') && !optimized.includes('tls=')) {
    optimized = `${optimized}&tls=true`;
  }
  
  if (!optimized.includes('retryWrites')) {
    optimized = `${optimized}&retryWrites=true`;
  }
  
  if (!optimized.includes('w=')) {
    optimized = `${optimized}&w=majority`;
  }
  
  return optimized;
}

const optimizedDbUrl = fixedDbUrl ? optimizeConnectionString(fixedDbUrl) : undefined;

export const prisma = new PrismaClient({
  datasources: optimizedDbUrl ? {
    db: {
      url: optimizedDbUrl
    }
  } : undefined,
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn'],
});

// Ensure connection is ready before first query
prisma.$connect().catch(() => {
  // Silent fail - connection will be established on first query
});













