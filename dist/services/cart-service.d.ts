import { ICartItem } from '../models/index.js';
import mongoose from 'mongoose';
export declare function getCartItems(userId: string): Promise<{
    product: string;
    _id: string;
    userId: string;
    productId: string;
    quantity: number;
    createdAt: Date;
    $locals: Record<string, unknown>;
    $op: "save" | "validate" | "remove" | null;
    $where: Record<string, unknown>;
    baseModelName?: string;
    collection: mongoose.Collection;
    db: mongoose.Connection;
    errors?: mongoose.Error.ValidationError;
    isNew: boolean;
    schema: mongoose.Schema;
    __v: number;
}[]>;
export declare function addProductToCart(userId: string, productId: string): Promise<mongoose.ModifyResult<ICartItem>>;
export declare function clearCart(userId: string): Promise<void>;
export declare function increaseProductQuantity(userId: string, productId: string): Promise<mongoose.ModifyResult<ICartItem>>;
export declare function decreaseProductQuantity(userId: string, productId: string): Promise<ICartItem | null>;
export declare function removeProductFromCart(userId: string, productId: string): Promise<ICartItem | null>;
/**
 * Calculate price with partner discount (10% if partner program is active)
 */
export declare function calculatePriceWithDiscount(userId: string, basePrice: number): Promise<{
    originalPrice: number;
    discountedPrice: number;
    discount: number;
    hasDiscount: boolean;
}>;
export declare function cartItemsToText(items: Array<{
    product: {
        title: string;
        price: number;
    };
    quantity: number;
}>, userId?: string): Promise<string>;
