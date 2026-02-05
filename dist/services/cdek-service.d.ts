type QuoteArgs = {
    clientId: string;
    clientSecret: string;
    fromCity: string;
    toCity: string;
    method: 'pickup' | 'courier';
    weightGrams: number;
};
export declare function getCdekQuote(args: QuoteArgs): Promise<{
    priceRub: number;
    periodMin?: number;
    periodMax?: number;
}>;
export {};
