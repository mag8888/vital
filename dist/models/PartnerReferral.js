import mongoose, { Schema } from 'mongoose';
import { PartnerProgramType } from './PartnerProfile.js';
const PartnerReferralSchema = new Schema({
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
}, {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'partnerReferrals',
});
export const PartnerReferral = mongoose.model('PartnerReferral', PartnerReferralSchema);
