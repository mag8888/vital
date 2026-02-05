type CatalogEntry = {
    sku: string;
    title: string;
    summary: string;
    description: string;
    weight: string;
};
export declare function parseSiamCatalogFromPdfText(pdfText: string): Map<string, CatalogEntry>;
export declare function syncSiamFromPdfOnServer(opts?: {
    updateImages?: boolean;
    pdfUrl?: string;
}): Promise<{
    pdfPath: string;
    catalogEntries: number;
    productsTotalWithSku: number;
    matchedBySku: number;
    missingInPdf: number;
    updatedText: number;
    images: {
        requested: boolean;
        extracted: number;
        updated: number;
        skipped: number;
    };
}>;
export declare function translateRemainingTitlesToRussianOnServer(opts?: {
    limit?: number;
}): Promise<{
    candidates: number;
    limit: number;
    updated: number;
    skipped: number;
    failed: number;
    aiEnabled: boolean;
    sample: {
        sku: string | null;
        before: string;
        after: string;
        method: string;
    }[];
}>;
export {};
