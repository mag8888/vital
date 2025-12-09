import type { Context as TelegrafContext } from 'telegraf';

export interface SessionData {
  currentCategoryId?: number | null;
  lastProductId?: number | null;
  uiMode?: 'classic' | 'app';
  replyingTo?: {
    userTelegramId: string;
    userName: string;
  };
  addBalanceFlow?: {
    awaitingAmount: boolean;
  };
  // Product2 module session data
  product2Flow?: {
    step?: 'category' | 'subcategory' | 'product_name' | 'product_summary' | 'product_price' | 'product_image' | 'product_image_select';
    categoryId?: string;
    subcategoryId?: string;
    productData?: {
      name?: string;
      summary?: string;
      price?: number;
      imageUrl?: string;
    };
  };
}

export interface Context extends TelegrafContext {
  session: SessionData;
}

