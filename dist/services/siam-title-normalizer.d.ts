export declare function normalizeSiamTitle(input: string): string;
export declare function normalizeProductTitlesOnServer(opts?: {
    apply?: boolean;
    limit?: number;
}): Promise<{
    apply: boolean;
    limit: number;
    candidates: number;
    changed: number;
    wouldChange: number;
    skipped: number;
    sample: {
        sku: string | null;
        before: string;
        after: string;
    }[];
}>;
