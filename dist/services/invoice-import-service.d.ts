/**
 * Сервис для импорта товаров из инвойса
 */
export interface InvoiceItem {
    sku: string;
    description: string;
    quantity: number;
    rate: number;
    amount: number;
}
/**
 * Парсит инвойс из текстового формата (разделенный |)
 */
export declare function parseInvoiceFromDelimitedText(text: string): InvoiceItem[];
/**
 * Получает настройки импорта (курс валюты и мультипликатор)
 */
export declare function getImportSettings(): Promise<{
    exchangeRate: number;
    priceMultiplier: number;
}>;
/**
 * Сохраняет настройки импорта
 */
export declare function saveImportSettings(exchangeRate: number, priceMultiplier: number): Promise<void>;
/**
 * Рассчитывает продажную цену из закупочной
 * Формула: Цена закупки * exchangeRate * multiplier = цена в рублях
 * Округляем до ближайшего десятка (10, 20, 30, ...)
 * Затем конвертируем в PZ: цена в рублях / 100
 */
export declare function calculateSellingPrice(purchasePriceBAT: number, exchangeRate: number, multiplier: number): number;
/**
 * Импортирует товары из инвойса
 */
export declare function importInvoiceItems(invoiceItems: InvoiceItem[]): Promise<{
    updated: number;
    created: number;
    failed: number;
    lowStockWarnings: string[];
    outOfStock: string[];
    errors: string[];
}>;
