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
  // Railway sometimes provides URLs like: mongodb://user:pass@host:port?options
  // Error: "Missing delimiting slash between hosts and options" means we need /dbname before ?
  
  const protocolIndex = normalized.indexOf('://');
  if (protocolIndex === -1) {
    return normalized; // Invalid URL, return as is
  }
  
  const queryIndex = normalized.indexOf('?');
  const afterProtocol = normalized.substring(protocolIndex + 3);
  
  if (queryIndex !== -1) {
    // There are query parameters
    const beforeQuery = normalized.substring(0, queryIndex);
    const afterProtocolPart = beforeQuery.substring(protocolIndex + 3);
    
    // Find first slash after protocol (should be after host:port)
    const slashIndex = afterProtocolPart.indexOf('/');
    
    if (slashIndex === -1) {
      // No slash found before ? - need to add /database before ?
      normalized = beforeQuery + '/vital' + normalized.substring(queryIndex);
    } else {
      // Slash exists - check if database name is empty
      const afterSlash = afterProtocolPart.substring(slashIndex + 1);
      if (!afterSlash || afterSlash.trim() === '') {
        // Empty database name - add it
        normalized = beforeQuery + 'vital' + normalized.substring(queryIndex);
      }
      // Otherwise keep as is - database name already exists
    }
  } else {
    // No query parameters - check if database name exists
    const slashIndex = afterProtocol.indexOf('/');
    
    if (slashIndex === -1) {
      // No slash at all - add /database
      normalized = normalized + '/vital';
    } else if (slashIndex === afterProtocol.length - 1) {
      // Slash is at the end - add database name
      normalized = normalized + 'vital';
    } else {
      // Check if database name is empty
      const afterSlash = afterProtocol.substring(slashIndex + 1);
      if (!afterSlash || afterSlash.trim() === '') {
        normalized = normalized.substring(0, normalized.length - 1) + 'vital';
      }
    }
  }
  
  return normalized;
}

const fixedDbUrl = dbUrl ? normalizeMongoUrl(dbUrl) : undefined;

// Optimize connection string for better performance
function optimizeConnectionString(url: string): string {
  let optimized = url;
  
  // Add connection pooling options if not present
  if (!optimized.includes('maxPoolSize')) {
    const separator = optimized.includes('?') ? '&' : '?';
    optimized = `${optimized}${separator}maxPoolSize=10&minPoolSize=2`;
  }
  
  // Add connection timeout options
  if (!optimized.includes('connectTimeoutMS')) {
    optimized = `${optimized}&connectTimeoutMS=5000&socketTimeoutMS=10000`;
  }
  
  // Enable keepalive for persistent connections
  if (!optimized.includes('serverSelectionTimeoutMS')) {
    optimized = `${optimized}&serverSelectionTimeoutMS=5000`;
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
  // Only log warnings and errors, suppress query and info logs
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn'],
});

// Ensure connection is ready before first query
prisma.$connect().catch(() => {
  // Silent fail - connection will be established on first query
});
