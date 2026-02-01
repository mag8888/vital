import mongoose, { Document } from 'mongoose';
export declare enum TransactionType {
    CREDIT = "CREDIT",
    DEBIT = "DEBIT"
}
export interface IPartnerTransaction extends Document {
    _id: string;
    profileId: string;
    amount: number;
    type: TransactionType;
    description: string;
    createdAt: Date;
}
export declare const PartnerTransaction: mongoose.Model<IPartnerTransaction, {}, {}, {}, mongoose.Document<unknown, {}, IPartnerTransaction, {}, mongoose.DefaultSchemaOptions> & IPartnerTransaction & Required<{
    _id: string;
}> & {
    __v: number;
} & {
    id: string;
}, any, IPartnerTransaction>;
