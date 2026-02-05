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
    }
    else {
        console.log('Database URL configured:', dbUrl.substring(0, 30) + '...');
    }
    // Log if database name is present
    const hasDbName = dbUrl.match(/\/[^/?]+(\?|$)/);
    if (!hasDbName) {
        console.warn('⚠️  Database name not found in connection string, will be added automatically');
    }
}
else {
    console.error('DATABASE_URL not found in environment variables');
}
// Normalize MongoDB connection string for Railway
// Be very careful not to break credentials or special characters in password
function normalizeMongoUrl(url) {
    let normalized = url.trim();
    // First, fix retrywrites -> retryWrites (case insensitive) in query params only
    if (normalized.includes('?')) {
        const [base, query] = normalized.split('?', 2);
        const fixedQuery = query.replace(/retrywrites=true/gi, 'retryWrites=true');
        normalized = base + '?' + fixedQuery;
    }
    else {
        normalized = normalized.replace(/retrywrites=true/gi, 'retryWrites=true');
    }
    // Check if database name is already present
    // Look for pattern: /dbname or /dbname?options
    // Be careful - don't match / in credentials part (username:password)
    // Split by query params first
    const queryIndex = normalized.indexOf('?');
    const urlPart = queryIndex !== -1 ? normalized.substring(0, queryIndex) : normalized;
    const queryPart = queryIndex !== -1 ? '?' + normalized.substring(queryIndex + 1) : '';
    // Check if there's a database name after the host:port part
    // Format: mongodb://[user:pass@]host[:port]/dbname
    // Find the last / that comes after @ or : (which indicates it's after host:port)
    // Find position after credentials (after @ if exists)
    const atIndex = urlPart.indexOf('@');
    const hostStart = atIndex !== -1 ? atIndex + 1 : (urlPart.indexOf('://') + 3);
    // Look for / after host part
    const hostPart = urlPart.substring(hostStart);
    const slashAfterHost = hostPart.indexOf('/');
    if (slashAfterHost === -1) {
        // No slash after host - need to add /vital
        normalized = urlPart + '/vital' + queryPart;
    }
    else {
        // Has slash - check if database name is empty
        const afterSlash = hostPart.substring(slashAfterHost + 1);
        if (!afterSlash || afterSlash.trim() === '') {
            // Empty database name - add vital
            normalized = urlPart + 'vital' + queryPart;
        }
        // Otherwise database name exists, keep as is
    }
    return normalized;
}
let fixedDbUrl = dbUrl ? normalizeMongoUrl(dbUrl) : undefined;
// Log normalized URL (without credentials)
if (fixedDbUrl && fixedDbUrl !== dbUrl) {
    const normalizedMatch = fixedDbUrl.match(/^mongodb:\/\/([^:@]+(@[^/]+)?)(:[^@]+)?/);
    if (normalizedMatch) {
        console.log('✅ Database URL normalized:', normalizedMatch[0] + '...');
    }
}
// Optimize connection string for better performance and MongoDB Atlas compatibility
function optimizeConnectionString(url) {
    let optimized = url;
    // MongoDB Atlas requires SSL/TLS by default
    // Add SSL parameters if not present (for mongodb+srv, SSL is automatic)
    // But we can add explicit TLS parameters for better compatibility
    // Add connection pooling options if not present
    if (!optimized.includes('maxPoolSize')) {
        const separator = optimized.includes('?') ? '&' : '?';
        optimized = `${optimized}${separator}maxPoolSize=10&minPoolSize=2`;
    }
    // Add connection timeout options (increase for Railway network)
    if (!optimized.includes('connectTimeoutMS')) {
        optimized = `${optimized}&connectTimeoutMS=30000`;
    }
    if (!optimized.includes('socketTimeoutMS')) {
        optimized = `${optimized}&socketTimeoutMS=30000`;
    }
    // Enable keepalive for persistent connections
    if (!optimized.includes('serverSelectionTimeoutMS')) {
        optimized = `${optimized}&serverSelectionTimeoutMS=30000`;
    }
    // Add heartbeat frequency (keep connections alive)
    if (!optimized.includes('heartbeatFrequencyMS')) {
        optimized = `${optimized}&heartbeatFrequencyMS=10000`;
    }
    // Add authSource if not present (important for MongoDB Atlas)
    // MongoDB Atlas often needs authSource=admin for authentication
    if (!optimized.includes('authSource')) {
        optimized = `${optimized}&authSource=admin`;
    }
    // MongoDB Atlas requires TLS/SSL - ensure it's enabled
    // For mongodb+srv, TLS is automatic, but we can add explicit parameters
    if (optimized.startsWith('mongodb+srv://')) {
        // mongodb+srv automatically uses TLS, but add explicit tls parameter
        if (!optimized.includes('tls=')) {
            optimized = `${optimized}&tls=true`;
        }
    }
    // Add retryWrites if not present (default for replica sets)
    if (!optimized.includes('retryWrites')) {
        optimized = `${optimized}&retryWrites=true`;
    }
    // Add w=majority if not present (default write concern for replica sets)
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
    // Only log warnings and errors, suppress query and info logs
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn'],
});
// Ensure connection is ready before first query
prisma.$connect().catch(() => {
    // Silent fail - connection will be established on first query
});
