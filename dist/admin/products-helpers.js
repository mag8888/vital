/**
 * Helper functions for products admin page
 * Utility functions for HTML escaping, formatting, etc.
 */
/**
 * Escape HTML attributes safely
 */
export function escapeAttr(str) {
    if (!str)
        return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/`/g, '&#96;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\r?\n/g, ' ')
        .replace(/\r/g, ' ')
        .replace(/\t/g, ' ');
}
/**
 * Escape HTML content safely
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
 * Format product price
 */
export function formatPrice(price) {
    const rubPrice = (price * 100).toFixed(2);
    return `${rubPrice} руб. / ${price.toFixed(2)} PZ`;
}
/**
 * Format date
 */
export function formatDate(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('ru-RU');
}
/**
 * Truncate text
 */
export function truncate(text, maxLength) {
    if (text.length <= maxLength)
        return text;
    return text.substring(0, maxLength) + '...';
}
