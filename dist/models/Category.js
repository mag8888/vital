import mongoose, { Schema } from 'mongoose';
const CategorySchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    description: String,
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
    collection: 'categories',
    toJSON: {
        virtuals: true,
        transform: function (doc, ret) {
            if (ret._id) {
                ret.id = ret._id.toString();
                ret._id = undefined;
            }
            if (ret.__v !== undefined) {
                ret.__v = undefined;
            }
            return ret;
        }
    },
    toObject: {
        virtuals: true,
        transform: function (doc, ret) {
            if (ret._id) {
                ret.id = ret._id.toString();
                ret._id = undefined;
            }
            if (ret.__v !== undefined) {
                ret.__v = undefined;
            }
            return ret;
        }
    }
});
CategorySchema.virtual('id').get(function () {
    return this._id?.toString() || '';
});
export const Category = mongoose.model('Category', CategorySchema);
