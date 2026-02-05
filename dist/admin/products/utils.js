/**
 * Утилиты для модуля управления товарами
 */
/**
 * Безопасное экранирование строк для HTML атрибутов
 */
export function escapeAttr(str) {
    if (!str)
        return '';
    return String(str)
        .replace(/&/g, '&amp;') // Должно быть первым
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/`/g, '&#96;')
        .replace(/\\/g, '\\\\')
        .replace(/\r?\n/g, ' ')
        .replace(/\r/g, ' ')
        .replace(/\t/g, ' ')
        .replace(/\x00/g, '')
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
        .replace(/\u2028/g, ' ')
        .replace(/\u2029/g, ' ');
}
/**
 * Безопасное экранирование строк для HTML контента
 */
export function escapeHtml(str) {
    if (!str)
        return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
/**
 * Форматирование цены
 */
export function formatPrice(price) {
    return price.toFixed(2);
}
/**
 * Форматирование даты
 */
export function formatDate(date) {
    return new Date(date).toLocaleDateString('ru-RU');
}
/**
 * Обрезка текста
 */
export function truncate(text, maxLength) {
    if (text.length <= maxLength)
        return text;
    return text.slice(0, maxLength) + '...';
}
export function validateProduct(data) {
    const errors = [];
    if (!data.title || !data.title.trim()) {
        errors.push('Название товара обязательно');
    }
    if (!data.price || isNaN(parseFloat(String(data.price))) || parseFloat(String(data.price)) < 0) {
        errors.push('Цена должна быть положительным числом');
    }
    if (!data.categoryId) {
        errors.push('Выберите категорию');
    }
    if (!data.summary || !data.summary.trim()) {
        errors.push('Краткое описание обязательно');
    }
    if (!data.description || !data.description.trim()) {
        errors.push('Полное описание обязательно');
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
/**
 * Очистка данных инструкции для безопасной вставки
 */
export function sanitizeInstruction(instruction) {
    if (!instruction)
        return '';
    return String(instruction)
        .replace(/[\r\n\t]/g, ' ')
        .replace(/[\x00-\x1F\x7F]/g, '')
        .trim();
}
