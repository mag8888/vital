import mongoose, { Schema } from 'mongoose';
const ReviewSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    photoUrl: String,
    content: {
        type: String,
        required: true,
    },
    link: String,
    isPinned: {
        type: Boolean,
        default: false,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
    collection: 'reviews',
});
export const Review = mongoose.model('Review', ReviewSchema);
