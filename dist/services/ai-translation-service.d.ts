/**
 * AI Translation Service
 * Использует OpenAI API для перевода и адаптации описаний продуктов
 * с английского на русский язык с сохранением стиля и привлекательности
 */
interface TranslationOptions {
    preserveStyle?: boolean;
    targetAudience?: 'general' | 'luxury' | 'natural';
    enhanceDescription?: boolean;
}
export declare class AITranslationService {
    private apiKey;
    private baseUrl;
    constructor();
    isEnabled(): boolean;
    /**
     * Переводит и адаптирует описание продукта с английского на русский
     */
    translateProductDescription(englishText: string, productType?: string, options?: TranslationOptions): Promise<string>;
    /**
     * Строит промпт для перевода
     */
    private buildTranslationPrompt;
    /**
     * Переводит краткое описание (summary)
     */
    translateSummary(englishSummary: string, productName?: string): Promise<string>;
    /**
     * Переводит название продукта
     */
    translateTitle(englishTitle: string): Promise<string>;
}
export declare const aiTranslationService: AITranslationService;
export {};
