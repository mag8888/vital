import 'dotenv/config';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value;
}

function getDatabaseUrl(): string {
  // Проверяем различные варианты имен переменных для Railway MongoDB
  return (
    process.env.DATABASE_URL ||
    process.env.MONGO_PUBLIC_URL ||
    process.env.MONGO_URL ||
    process.env.MONGODB_URL ||
    ''
  );
}

export const env = {
  botToken: requireEnv('BOT_TOKEN'),
  botWebhookUrl: process.env.BOT_WEBHOOK_URL,
  botWebhookSecret: process.env.BOT_WEBHOOK_SECRET,
  adminChatId: process.env.ADMIN_CHAT_ID,
  databaseUrl: (() => {
    const dbUrl = getDatabaseUrl();
    if (!dbUrl) {
      throw new Error(
        'Database URL is required. Please set one of: DATABASE_URL, MONGO_PUBLIC_URL, MONGO_URL, or MONGODB_URL'
      );
    }
    return dbUrl;
  })(),
  adminEmail: requireEnv('ADMIN_EMAIL'),
  adminPassword: requireEnv('ADMIN_PASSWORD'),
  publicBaseUrl: process.env.PUBLIC_BASE_URL || 'http://localhost:3000',
  webappUrl: process.env.WEBAPP_URL || process.env.PUBLIC_BASE_URL || 'https://vital-production-82b0.up.railway.app',
  videoUrl: process.env.VIDEO_URL || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Ссылка на видео по умолчанию
  // Cloudinary configuration (optional)
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
  // OpenAI configuration (optional, for AI translations)
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  // Plazma API configuration (optional, for external product integration)
  plazmaApiKey: process.env.PLAZMA_API_KEY || process.env.EXTERNAL_API_KEY,
  plazmaApiUrl: (() => {
    const url = process.env.PLAZMA_API_URL || 'https://plazma-production.up.railway.app/api/external';
    return url.startsWith('http') ? url : `https://${url}`;
  })(),
};

// Helper function to get all admin chat IDs
export function getAdminChatIds(): string[] {
  if (!env.adminChatId) return [];
  return env.adminChatId.split(',').map(id => id.trim()).filter(id => id);
}

// Helper function to send message to all admins
export async function sendToAllAdmins(bot: any, message: string): Promise<void> {
  const adminIds = getAdminChatIds();

  for (const chatId of adminIds) {
    try {
      await bot.telegram.sendMessage(chatId, message);
      console.log(`Message sent to admin: ${chatId}`);
    } catch (error) {
      console.error(`Failed to send message to admin ${chatId}:`, error);
    }
  }
}
