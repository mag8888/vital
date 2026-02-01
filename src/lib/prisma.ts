import { PrismaClient } from '@prisma/client';

// Railway provides MONGO_URL for MongoDB plugin, but we also support DATABASE_URL
const dbUrl = process.env.DATABASE_URL || process.env.MONGO_URL;
if (dbUrl) {
  console.log('Database URL configured:', dbUrl.substring(0, 30) + '...');
  
  // Проверяем, используется ли Railway MongoDB (Reference Variable)
  if (dbUrl.includes('${{') || dbUrl.includes('mongodb://mongo')) {
    console.log('✅ Railway MongoDB detected');
    
    // Проверяем, есть ли параметр replicaSet
    if (!dbUrl.includes('replicaSet=')) {
      console.warn('⚠️  Railway MongoDB detected but replicaSet parameter is missing');
      console.warn('💡 To enable Prisma support, add replicaSet=rs0 to DATABASE_URL');
      console.warn('💡 See QUICK_RAILWAY_MONGODB_SETUP.md for instructions');
    } else {
      console.log('✅ Replica set parameter found in connection string');
    }
  } else if (dbUrl.includes('mongodb+srv://') && dbUrl.includes('mongodb.net')) {
    console.log('✅ MongoDB Atlas detected (supports replica set)');
  }
} else {
  console.error('❌ DATABASE_URL or MONGO_URL not found in environment variables');
  console.error('💡 To use Railway MongoDB, set DATABASE_URL=${{MongoDB.MONGO_URL}}');
}

// Fix MongoDB connection string for Railway and Atlas compatibility
let fixedDbUrl: string | undefined = undefined;
if (dbUrl) {
  try {
    // Используем URL парсер для правильной обработки строки подключения
    let url = dbUrl.trim();
    
    // Исправляем регистр для retryWrites
    url = url.replace('retrywrites=true', 'retryWrites=true');
    
    // Для mongodb:// (не mongodb+srv://) проверяем и исправляем формат
    if (url.startsWith('mongodb://') && !url.includes('mongodb+srv://')) {
      try {
        // Парсим URL для проверки формата
        // Если пароль содержит специальные символы, они должны быть URL-кодированы
        const urlObj = new URL(url);
        
        // Если есть username и password, убеждаемся, что они правильно закодированы
        if (urlObj.username && urlObj.password) {
          // Декодируем и перекодируем для правильного экранирования
          const username = decodeURIComponent(urlObj.username);
          const password = decodeURIComponent(urlObj.password);
          
          // Перекодируем специальные символы
          const encodedUsername = encodeURIComponent(username);
          const encodedPassword = encodeURIComponent(password);
          
          // Если были изменения, пересобираем URL
          if (username !== encodedUsername || password !== encodedPassword) {
            urlObj.username = encodedUsername;
            urlObj.password = encodedPassword;
            url = urlObj.toString();
            console.log('URL-encoded username/password in connection string');
          }
        }
        
        // Если нет pathname (имени базы данных), добавляем по умолчанию
        if (!urlObj.pathname || urlObj.pathname === '/') {
          const defaultDb = process.env.MONGODB_DB_NAME || 'plazma_bot';
          urlObj.pathname = `/${defaultDb}`;
          url = urlObj.toString();
          console.log(`Added default database name: ${defaultDb}`);
        }
        
        // Для Railway MongoDB добавляем authSource=admin если его нет
        if (!urlObj.searchParams.has('authSource')) {
          urlObj.searchParams.set('authSource', 'admin');
          url = urlObj.toString();
          console.log('✅ Added authSource=admin for Railway MongoDB');
        }
        
        // Для Railway MongoDB проверяем наличие replicaSet
        if (!urlObj.searchParams.has('replicaSet')) {
          console.warn('⚠️  replicaSet parameter missing in Railway MongoDB connection string');
          console.warn('💡 Prisma requires replica set for write operations');
          console.warn('💡 Add replicaSet=rs0 to DATABASE_URL after initializing replica set');
          console.warn('💡 See QUICK_RAILWAY_MONGODB_SETUP.md for instructions');
        }
        
      } catch (urlError) {
        // Если URL парсер не смог распарсить (возможно, из-за специальных символов в пароле),
        // пробуем простую проверку и добавление имени БД
        if (!url.includes('/') || url.match(/^mongodb:\/\/[^/]+$/)) {
          const defaultDb = process.env.MONGODB_DB_NAME || 'plazma_bot';
          // Добавляем имя БД перед query параметрами или в конец
          if (url.includes('?')) {
            url = url.replace('?', `/${defaultDb}?`);
          } else {
            url = `${url}/${defaultDb}`;
          }
          console.log(`Added default database name (fallback): ${defaultDb}`);
        }
      }
    }
    
    fixedDbUrl = url;
  } catch (error) {
    console.error('Error processing database URL:', error);
    // Используем исходную строку, если обработка не удалась
    fixedDbUrl = dbUrl;
  }
}

// Кастомный логгер для фильтрации ошибок аутентификации
const customLogger = {
  log: (level: string, message: string) => {
    // Фильтруем ошибки аутентификации из логов
    if (level === 'error' || level === 'warn') {
      const lowerMessage = message.toLowerCase();
      if (lowerMessage.includes('authentication failed') ||
          lowerMessage.includes('scram failure') ||
          lowerMessage.includes('authenticationfailed')) {
        // Не логируем ошибки аутентификации, так как они уже обрабатываются
        return;
      }
    }
    // Логируем остальные сообщения
    if (level === 'query') {
      // Логируем только важные запросы, не все
      return;
    }
    console.log(`[Prisma ${level}]`, message);
  },
  error: (message: string) => {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('authentication failed') ||
        lowerMessage.includes('scram failure') ||
        lowerMessage.includes('authenticationfailed')) {
      // Не логируем ошибки аутентификации
      return;
    }
    console.error('[Prisma error]', message);
  },
  warn: (message: string) => {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('authentication failed') ||
        lowerMessage.includes('scram failure') ||
        lowerMessage.includes('authenticationfailed')) {
      // Не логируем ошибки аутентификации
      return;
    }
    console.warn('[Prisma warn]', message);
  },
  info: (message: string) => {
    console.log('[Prisma info]', message);
  },
  debug: (message: string) => {
    // Не логируем debug сообщения
  },
};

export const prisma = new PrismaClient({
  datasources: fixedDbUrl ? {
    db: {
      url: fixedDbUrl
    }
  } : undefined,
  log: [
    { level: 'info', emit: 'event' },
    { level: 'warn', emit: 'event' },
    { level: 'error', emit: 'event' },
  ],
});

// Обработка событий логирования Prisma
prisma.$on('info' as any, (e: any) => {
  customLogger.info(e.message);
});

prisma.$on('warn' as any, (e: any) => {
  customLogger.warn(e.message);
});

prisma.$on('error' as any, (e: any) => {
  customLogger.error(e.message);
});
