/**
 * Утилиты для модуля управления товарами
 */
/**
 * Безопасное экранирование строк для HTML атрибутов
 */
export declare function escapeAttr(str: string | null | undefined): string;
/**
 * Безопасное экранирование строк для HTML контента
 */
export declare function escapeHtml(str: string | null | undefined): string;
/**
 * Форматирование цены
 */
export declare function formatPrice(price: number): string;
/**
 * Форматирование даты
 */
export declare function formatDate(date: Date): string;
/**
 * Обрезка текста
 */
export declare function truncate(text: string, maxLength: number): string;
/**
 * Валидация данных товара
 */
export interface ProductValidationResult {
    valid: boolean;
    errors: string[];
}
export declare function validateProduct(data: {
    title?: string;
    price?: string | number;
    categoryId?: string;
    summary?: string;
    description?: string;
}): ProductValidationResult;
/**
 * Очистка данных инструкции для безопасной вставки
 */
export declare function sanitizeInstruction(instruction: string | null | undefined): string;
