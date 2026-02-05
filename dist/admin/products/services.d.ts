/**
 * Сервисы для работы с товарами
 */
export interface CreateProductData {
    title: string;
    summary: string;
    description: string;
    instruction?: string | null;
    price: number;
    categoryId: string;
    imageUrl?: string;
    stock?: number;
    isActive?: boolean;
    availableInRussia?: boolean;
    availableInBali?: boolean;
}
export interface UpdateProductData {
    title?: string;
    summary?: string;
    description?: string;
    instruction?: string | null;
    price?: number;
    categoryId?: string;
    imageUrl?: string;
    stock?: number;
    isActive?: boolean;
    availableInRussia?: boolean;
    availableInBali?: boolean;
}
/**
 * Получить все товары с категориями
 */
export declare function getAllProductsWithCategories(): Promise<{
    categories: ({
        products: ({
            category: {
                id: string;
                description: string | null;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                imageUrl: string | null;
                isActive: boolean;
                slug: string;
                isVisibleInWebapp: boolean | null;
            };
        } & {
            id: string;
            title: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            summary: string;
            instruction: string | null;
            imageUrl: string | null;
            price: number;
            purchasePrice: number | null;
            sku: string | null;
            stock: number;
            lowStockThreshold: number | null;
            isActive: boolean;
            availableInRussia: boolean;
            availableInBali: boolean;
            categoryId: string;
        })[];
    } & {
        id: string;
        description: string | null;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        imageUrl: string | null;
        isActive: boolean;
        slug: string;
        isVisibleInWebapp: boolean | null;
    })[];
    allProducts: {
        categoryName: string;
        category: {
            id: string;
            description: string | null;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            imageUrl: string | null;
            isActive: boolean;
            slug: string;
            isVisibleInWebapp: boolean | null;
        };
        id: string;
        title: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        summary: string;
        instruction: string | null;
        imageUrl: string | null;
        price: number;
        purchasePrice: number | null;
        sku: string | null;
        stock: number;
        lowStockThreshold: number | null;
        isActive: boolean;
        availableInRussia: boolean;
        availableInBali: boolean;
        categoryId: string;
    }[];
}>;
/**
 * Создать товар
 */
export declare function createProduct(data: CreateProductData, imageBuffer?: Buffer): Promise<{
    id: string;
    title: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    summary: string;
    instruction: string | null;
    imageUrl: string | null;
    price: number;
    purchasePrice: number | null;
    sku: string | null;
    stock: number;
    lowStockThreshold: number | null;
    isActive: boolean;
    availableInRussia: boolean;
    availableInBali: boolean;
    categoryId: string;
}>;
/**
 * Обновить товар
 */
export declare function updateProduct(productId: string, data: UpdateProductData, imageBuffer?: Buffer): Promise<{
    id: string;
    title: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    summary: string;
    instruction: string | null;
    imageUrl: string | null;
    price: number;
    purchasePrice: number | null;
    sku: string | null;
    stock: number;
    lowStockThreshold: number | null;
    isActive: boolean;
    availableInRussia: boolean;
    availableInBali: boolean;
    categoryId: string;
}>;
/**
 * Удалить товар
 */
export declare function deleteProduct(productId: string): Promise<boolean>;
/**
 * Переключить статус активности товара
 */
export declare function toggleProductActive(productId: string): Promise<{
    id: string;
    title: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    summary: string;
    instruction: string | null;
    imageUrl: string | null;
    price: number;
    purchasePrice: number | null;
    sku: string | null;
    stock: number;
    lowStockThreshold: number | null;
    isActive: boolean;
    availableInRussia: boolean;
    availableInBali: boolean;
    categoryId: string;
}>;
/**
 * Обновить изображение товара
 */
export declare function updateProductImage(productId: string, imageUrl: string): Promise<{
    id: string;
    title: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    summary: string;
    instruction: string | null;
    imageUrl: string | null;
    price: number;
    purchasePrice: number | null;
    sku: string | null;
    stock: number;
    lowStockThreshold: number | null;
    isActive: boolean;
    availableInRussia: boolean;
    availableInBali: boolean;
    categoryId: string;
}>;
/**
 * Сохранить инструкцию товара
 */
export declare function saveProductInstruction(productId: string, instruction: string | null): Promise<{
    id: string;
    title: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    summary: string;
    instruction: string | null;
    imageUrl: string | null;
    price: number;
    purchasePrice: number | null;
    sku: string | null;
    stock: number;
    lowStockThreshold: number | null;
    isActive: boolean;
    availableInRussia: boolean;
    availableInBali: boolean;
    categoryId: string;
}>;
/**
 * Получить список товаров для API
 */
export declare function getProductsList(): Promise<{
    id: string;
    title: string;
    price: number;
    category: {
        name: string;
    };
}[]>;
/**
 * Получить все изображения товаров
 */
export declare function getAllProductImages(): Promise<{
    url: string;
    products: Array<{
        id: string;
        title: string;
    }>;
}[]>;
