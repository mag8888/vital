import { Telegraf } from 'telegraf';
import { Context } from './context.js';
import { BotModule } from './types.js';
import { navigationModule } from '../modules/navigation/index.js';
import { shopModule } from '../modules/shop/index.js';
import { partnerModule } from '../modules/partner/index.js';
import { reviewsModule } from '../modules/reviews/index.js';
import { aboutModule } from '../modules/about/index.js';
import { audioModule } from '../modules/audio/index.js';
import { paymentModule } from '../modules/payment/index.js';
import { product2Module } from '../modules/product2/index.js';

const modules: BotModule[] = [
  shopModule,
  navigationModule,
  partnerModule,
  reviewsModule,
  aboutModule,
  audioModule,
  paymentModule,
  product2Module, // Новый модуль для добавления товара "Товар 2"
];

export async function applyBotModules(bot: Telegraf<Context>) {
  for (const module of modules) {
    await module.register(bot);
  }
}










