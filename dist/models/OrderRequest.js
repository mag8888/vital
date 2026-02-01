import mongoose, { Schema } from 'mongoose';
const OrderRequestSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    contact: String,
    message: {
        type: String,
        required: true,
    },
    itemsJson: {
        type: Schema.Types.Mixed,
        required: true,
    },
    status: {
        type: String,
        default: 'NEW',
    },
}, {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'orderRequests',
});
export const OrderRequest = mongoose.model('OrderRequest', OrderRequestSchema);
