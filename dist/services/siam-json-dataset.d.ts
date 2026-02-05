export type SiamJsonEntry = {
    title: string;
    short_description: string;
    full_description: string;
    price?: string | number;
    sku: string;
    volume?: string;
    ingredients?: string;
};
export declare const SIAM_JSON_ENTRIES: SiamJsonEntry[];
