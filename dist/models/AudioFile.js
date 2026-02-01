import mongoose, { Schema } from 'mongoose';
const AudioFileSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    description: String,
    fileId: {
        type: String,
        required: true,
    },
    duration: Number,
    fileSize: Number,
    mimeType: String,
    isActive: {
        type: Boolean,
        default: true,
    },
    category: String,
}, {
    timestamps: true,
    collection: 'audioFiles',
});
export const AudioFile = mongoose.model('AudioFile', AudioFileSchema);
