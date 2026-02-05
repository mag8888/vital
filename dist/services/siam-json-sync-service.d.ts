type SiamJsonEntry = {
    title?: string;
    short_description?: string;
    full_description?: string;
    price?: string | number;
    sku?: string;
    volume?: string;
    ingredients?: string;
};
export declare function syncProductsFromSiamJsonOnServer(args: {
    entries: SiamJsonEntry[];
    apply?: boolean;
    includeMetaInDescription?: boolean;
    limit?: number;
}): Promise<{
    apply: boolean;
    includeMetaInDescription: boolean;
    input: {
        entries: number;
        limit: number;
    };
    expandedSkus: number;
    duplicates: {
        count: number;
        sample: string[];
    };
    invalid: {
        count: number;
        sample: {
            idx: number;
            reason: string;
        }[];
    };
    db: {
        totalWithSku: number;
    };
    compare: {
        jsonSkus: number;
        dbSkus: number;
        matched: number;
        missingInDb: {
            count: number;
            sample: string[];
        };
        missingInJson: {
            count: number;
            sample: string[];
        };
    };
    changes: {
        updated: number;
        wouldUpdate: number;
        skipped: number;
    };
    sample: {
        sku: string;
        before: {
            title: string;
            summary: string;
            description: string | null;
            price: number;
        };
        after: {
            title: string;
            summary: string;
            description: string;
            price: number;
        };
        changed: {
            title: boolean;
            summary: boolean;
            description: boolean;
            price: false;
        };
    }[];
}>;
export {};
