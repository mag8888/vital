import mongoose, { Document } from 'mongoose';
export interface IReview extends Document {
    _id: string;
    name: string;
    photoUrl?: string;
    content: string;
    link?: string;
    isPinned: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Review: mongoose.Model<IReview, {}, {}, {}, mongoose.Document<unknown, {}, IReview, {}, mongoose.DefaultSchemaOptions> & IReview & Required<{
    _id: string;
}> & {
    __v: number;
} & {
    id: string;
}, any, IReview>;
