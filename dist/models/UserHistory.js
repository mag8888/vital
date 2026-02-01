import mongoose, { Schema } from 'mongoose';
const UserHistorySchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    action: {
        type: String,
        required: true,
    },
    payload: {
        type: Schema.Types.Mixed,
    },
}, {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'userHistories',
});
UserHistorySchema.index({ userId: 1, createdAt: -1 });
export const UserHistory = mongoose.model('UserHistory', UserHistorySchema);
