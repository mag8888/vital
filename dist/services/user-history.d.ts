import { Context } from '../bot/context.js';
import { IUser } from '../models/index.js';
export declare function ensureUser(ctx: Context): Promise<IUser | null>;
/**
 * Проверяет наличие username и phone у пользователя
 * Если username отсутствует и phone тоже отсутствует - запрашивает номер телефона
 * @returns true если пользователь может продолжить, false если нужно запросить телефон
 */
export declare function checkUserContact(ctx: Context): Promise<boolean>;
/**
 * Обрабатывает полученный номер телефона от пользователя
 */
export declare function handlePhoneNumber(ctx: Context): Promise<void>;
export declare function logUserAction(ctx: Context, action: string, payload?: any): Promise<void>;
