import mongoose, { Document } from 'mongoose';
import { PartnerProgramType } from './PartnerProfile.js';
export interface IPartnerReferral extends Document {
    _id: string;
    profileId: string;
    referredId?: string;
    contact?: string;
    level: number;
    referralType: PartnerProgramType;
    createdAt: Date;
}
export declare const PartnerReferral: mongoose.Model<IPartnerReferral, {}, {}, {}, mongoose.Document<unknown, {}, IPartnerReferral, {}, mongoose.DefaultSchemaOptions> & IPartnerReferral & Required<{
    _id: string;
}> & {
    __v: number;
} & {
    id: string;
}, any, IPartnerReferral>;
