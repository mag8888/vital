/**
 * Helper functions for products admin page
 * Utility functions for HTML escaping, formatting, etc.
 */
/**
 * Escape HTML attributes safely
 */
export declare function escapeAttr(str: string | null | undefined): string;
/**
 * Escape HTML content safely
 */
export declare function escapeHtml(str: string | null | undefined): string;
/**
 * Format product price
 */
export declare function formatPrice(price: number): string;
/**
 * Format date
 */
export declare function formatDate(date: Date | string): string;
/**
 * Truncate text
 */
export declare function truncate(text: string, maxLength: number): string;
