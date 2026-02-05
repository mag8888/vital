/**
 * Сервис для сбора недостающих фотографий продуктов
 * с сайта Siam Botanicals
 */
export interface ProductFromSite {
    title: string;
    slug: string;
    imageUrl: string | null;
    productUrl: string;
}
export interface ScrapeResult {
    updated: number;
    skipped: number;
    failed: number;
    notFound: number;
    total: number;
}
/**
 * Парсит страницу магазина и извлекает информацию о продуктах
 */
export declare function scrapeShopPage(page?: number): Promise<{
    products: ProductFromSite[];
    hasNextPage: boolean;
}>;
/**
 * Извлекает изображение со страницы продукта
 */
export declare function extractImageFromProductPage(productUrl: string): Promise<string | null>;
/**
 * Загружает изображение на Cloudinary или возвращает прямой URL
 */
export declare function downloadAndUploadImage(imageUrl: string, productId: string, productTitle: string): Promise<string | null>;
/**
 * Находит продукт в базе данных по названию
 */
export declare function findProductInDB(title: string, slug: string): Promise<{
    id: string;
    title: string;
    imageUrl: string | null;
} | null>;
/**
 * Основная функция сбора всех фотографий (обновляет даже существующие для лучшего качества)
 */
export declare function scrapeAllMissingImages(): Promise<ScrapeResult>;
