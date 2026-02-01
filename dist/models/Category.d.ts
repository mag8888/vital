import mongoose, { Document } from 'mongoose';
export interface ICategory extends Document {
    _id: string;
    name: string;
    slug: string;
    description?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Category: mongoose.Model<ICategory, {}, {}, {}, mongoose.Document<unknown, {}, ICategory, {}, mongoose.DefaultSchemaOptions> & ICategory & Required<{
    _id: string;
}> & {
    __v: number;
} & {
    id: string;
}, any, ICategory>;
