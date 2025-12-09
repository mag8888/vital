import { prisma } from '../lib/prisma.js';
import { Context } from '../bot/context.js';

export async function ensureUser(ctx: Context) {
  if (!ctx.from) {
    throw new Error('User not found in context');
  }

  const telegramId = ctx.from.id.toString();
  
  const user = await prisma.user.findUnique({
    where: { telegramId },
  });

  if (user) {
    return user;
  }

  // Create new user
  return prisma.user.create({
    data: {
      telegramId,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name,
      username: ctx.from.username,
      languageCode: ctx.from.language_code,
    },
  });
}

export async function logUserAction(ctx: Context, action: string, payload?: any) {
  try {
    const user = await ensureUser(ctx);
    await prisma.userHistory.create({
      data: {
        userId: user.id,
        action,
        payload: payload ? JSON.parse(JSON.stringify(payload)) : undefined,
      },
    });
  } catch (error) {
    console.error('Failed to log user action:', error);
  }
}

export async function checkUserContact(ctx: Context): Promise<boolean> {
  const user = await ensureUser(ctx);
  return !!(user.username || user.phone);
}

export async function handlePhoneNumber(ctx: Context, phoneNumber: string): Promise<void> {
  const user = await ensureUser(ctx);
  await prisma.user.update({
    where: { id: user.id },
    data: { phone: phoneNumber },
  });
}

