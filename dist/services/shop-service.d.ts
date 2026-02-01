export declare function getActiveCategories(): Promise<(import("../models/Category.js").ICategory & Required<{
    _id: string;
}> & {
    __v: number;
})[]>;
export declare function getCategoryById(id: string): Promise<(import("../models/Category.js").ICategory & Required<{
    _id: string;
}> & {
    __v: number;
}) | null>;
export declare function getProductsByCategory(categoryId: string): Promise<(import("../models/Product.js").IProduct & Required<{
    _id: string;
}> & {
    __v: number;
})[]>;
export declare function getProductById(productId: string): Promise<(import("../models/Product.js").IProduct & Required<{
    _id: string;
}> & {
    __v: number;
}) | null>;
