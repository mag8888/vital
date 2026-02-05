export declare function getCartItems(userId: string): Promise<({
    product: {
        id: string;
        title: string;
        description: string | null;
        summary: string;
        imageUrl: string | null;
        price: number;
        isActive: boolean;
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
