export declare function getCartItems(userId: string): Promise<({
    product: {
        id: string;
        title: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        price: number;
        isActive: boolean;
        summary: string;
        instruction: string | null;
        imageUrl: string | null;
        stock: number;
        availableInRussia: boolean;
        availableInBali: boolean;
        categoryId: string;
    };
} & {
    id: string;
    createdAt: Date;
    userId: string;
    productId: string;
    quantity: number;
})[]>;
export declare function addProductToCart(userId: string, productId: string): Promise<{
    id: string;
    createdAt: Date;
    userId: string;
    productId: string;
    quantity: number;
}>;
export declare function clearCart(userId: string): Promise<void>;
export declare function increaseProductQuantity(userId: string, productId: string): Promise<{
    id: string;
    createdAt: Date;
    userId: string;
    productId: string;
    quantity: number;
}>;
export declare function decreaseProductQuantity(userId: string, productId: string): Promise<{
    id: string;
    createdAt: Date;
    userId: string;
    productId: string;
    quantity: number;
} | null>;
export declare function removeProductFromCart(userId: string, productId: string): Promise<{
    id: string;
    createdAt: Date;
    userId: string;
    productId: string;
    quantity: number;
}>;
export declare function cartItemsToText(items: Array<{
    product: {
        title: string;
        price: number;
    };
    quantity: number;
}>): string;
