import mongoose, { Schema, Document } from 'mongoose';
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

const PartnerReferralSchema = new Schema<IPartnerReferral>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'PartnerProfile',
      required: true,
    },
    referredId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    contact: String,
    level: {
      type: Number,
      required: true,
    },
    referralType: {
      type: String,
      enum: Object.values(PartnerProgramType),
      default: PartnerProgramType.DIRECT,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'partnerReferrals',
  }
);

export const PartnerReferral = mongoose.model<IPartnerReferral>('PartnerReferral', PartnerReferralSchema);
