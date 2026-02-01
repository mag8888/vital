import mongoose, { Schema } from 'mongoose';
const BotContentSchema = new Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    title: {
        type: String,
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    description: String,
    category: String,
    isActive: {
        type: Boolean,
        default: true,
    },
    language: {
        type: String,
        default: 'ru',
    },
}, {
    timestamps: true,
    collection: 'botContents',
});
export const BotContent = mongoose.model('BotContent', BotContentSchema);
