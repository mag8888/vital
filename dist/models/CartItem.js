import mongoose, { Schema } from 'mongoose';
const CartItemSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    productId: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    quantity: {
        type: Number,
        default: 1,
        min: 1,
    },
}, {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'cartItems',
});
// Compound unique index for userId and productId
CartItemSchema.index({ userId: 1, productId: 1 }, { unique: true });
export const CartItem = mongoose.model('CartItem', CartItemSchema);
