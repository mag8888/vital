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
  
  const queryIndex = normalized.indexOf('?');
  
  if (queryIndex !== -1) {
    // There are query parameters - check if there's a slash before them
    const beforeQuery = normalized.substring(0, queryIndex);
    const lastSlashIndex = beforeQuery.lastIndexOf('/');
    
    // Check if the slash is part of the protocol (mongodb://)
    const protocolIndex = normalized.indexOf('://');
    const isSlashInProtocol = lastSlashIndex <= protocolIndex + 2;
    
    if (lastSlashIndex === -1 || isSlashInProtocol) {
      // No slash found or slash is only in protocol - need to add /database before ?
      normalized = beforeQuery + '/vital' + normalized.substring(queryIndex);
    } else {
      // Slash exists - check if database name is empty
      const afterSlash = beforeQuery.substring(lastSlashIndex + 1);
      if (afterSlash === '' || afterSlash.trim() === '') {
        // Empty database name - add it
        normalized = beforeQuery + 'vital' + normalized.substring(queryIndex);
      }
      // Otherwise keep as is - database name already exists
    }
  } else {
    // No query parameters - check if database name exists
    const protocolIndex = normalized.indexOf('://');
    if (protocolIndex !== -1) {
      const afterProtocol = normalized.substring(protocolIndex + 3);
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
        if (afterSlash === '' || afterSlash.trim() === '') {
          normalized = normalized.substring(0, normalized.length - 1) + 'vital';
        }
      }
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
