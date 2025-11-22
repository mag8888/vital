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
  
  // Fix retrywrites -> retryWrites (case insensitive)
  normalized = normalized.replace(/retrywrites=true/gi, 'retryWrites=true');
  
  // MongoDB connection string format: mongodb://[user:pass@]host[:port]/[dbname][?options]
  // Railway sometimes provides URLs without database name
  // We need to ensure there's a slash and database name before query params
  
  // Find where the host/port ends (either / or ?)
  const queryIndex = normalized.indexOf('?');
  const pathStart = normalized.indexOf('/', 10); // Skip "mongodb://"
  
  // If no path separator found before query params, add one with default database
  if (pathStart === -1 || (queryIndex !== -1 && pathStart > queryIndex)) {
    const insertPos = queryIndex !== -1 ? queryIndex : normalized.length;
    normalized = normalized.substring(0, insertPos) + '/vital' + (queryIndex !== -1 ? normalized.substring(insertPos) : '');
  } else {
    // Check if pathname is empty (just /)
    const pathPart = queryIndex !== -1 
      ? normalized.substring(pathStart, queryIndex)
      : normalized.substring(pathStart);
    
    if (pathPart === '/' || pathPart === '') {
      // Empty pathname, add database name
      normalized = normalized.substring(0, pathStart + 1) + 'vital' + (queryIndex !== -1 ? normalized.substring(queryIndex) : '');
    }
  }
  
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
