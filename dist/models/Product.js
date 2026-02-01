import mongoose, { Schema } from 'mongoose';
const ProductSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    summary: {
        type: String,
        required: true,
    },
    description: String,
    instruction: String,
    imageUrl: String,
    price: {
        type: Number,
        required: true,
    },
    stock: {
        type: Number,
        default: 999,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    availableInRussia: {
        type: Boolean,
        default: true,
    },
    availableInBali: {
        type: Boolean,
        default: true,
    },
    categoryId: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
    },
}, {
    timestamps: true,
    collection: 'products',
});
export const Product = mongoose.model('Product', ProductSchema);
