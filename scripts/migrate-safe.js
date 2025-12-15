#!/usr/bin/env node

/**
 * Безопасное выполнение миграций Prisma
 * Не падает, если база данных недоступна (полезно для сборки Docker образа)
 */

import { execSync } from 'child_process';
import { exit } from 'process';

const isBuildTime = process.env.RAILWAY_ENVIRONMENT === undefined || process.env.NODE_ENV === 'production';

console.log('🔄 Attempting to run database migrations...');

try {
  // Пытаемся выполнить миграции
  execSync('npx prisma db push', {
    stdio: 'inherit',
    env: process.env,
  });
  console.log('✅ Database migrations completed successfully');
  exit(0);
} catch (error) {
  const errorMessage = error.message || error.toString() || '';
  const isConnectionError = 
    errorMessage.includes('Server selection timeout') ||
    errorMessage.includes('No available servers') ||
    errorMessage.includes('I/O error: timed out') ||
    errorMessage.includes('Connection pool timeout') ||
    errorMessage.includes('ECONNREFUSED') ||
    errorMessage.includes('ENOTFOUND');

  if (isConnectionError && isBuildTime) {
    console.warn('⚠️  Database is not available during build time. Skipping migrations.');
    console.warn('💡 Migrations will be applied automatically on first startup if database is available.');
    console.warn('💡 Or run manually: railway run npx prisma db push');
    exit(0); // Не падаем во время сборки
  } else {
    console.error('❌ Database migration failed:', errorMessage);
    exit(1); // Падаем в других случаях
  }
}

