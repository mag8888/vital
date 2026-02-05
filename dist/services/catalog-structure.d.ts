export type CatalogStructure = Array<{
    id: string;
    name: string;
    slug: string;
    subcategories: Array<{
        id: string;
        name: string;
        slug: string;
        description?: string;
        related_skus: string[];
    }>;
}>;
export declare const CATALOG_STRUCTURE: CatalogStructure;
