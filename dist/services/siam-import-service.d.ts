/**
 * Siam Botanicals Import Service
 * Сервис для импорта продуктов с сайта Siam Botanicals
 */
export interface SiamProduct {
    englishTitle: string;
    englishSummary: string;
    englishDescription: string;
    price: number;
    imageUrl: string;
    category: string;
    categorySlug: string;
}
export declare const siamProducts: Partial<SiamProduct>[];
/**
 * Основная функция импорта
 */
export declare function importSiamProducts(): Promise<{
    success: number;
    errors: number;
    total: number;
}>;
/**
 * Обновляет изображения для всех существующих товаров (старая версия с прямыми URL)
 */
export declare function updateProductImages(): Promise<{
    updated: number;
    failed: number;
    total: number;
}>;
/**
 * Загружает изображения для всех товаров, парся страницы Siam Botanicals
 * Использует парсинг HTML страниц товаров для получения актуальных URL изображений
 */
export declare function uploadAllProductImagesFromPages(): Promise<{
    updated: number;
    failed: number;
    skipped: number;
    total: number;
}>;
