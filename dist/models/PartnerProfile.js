import mongoose, { Schema } from 'mongoose';
export var PartnerProgramType;
(function (PartnerProgramType) {
    PartnerProgramType["DIRECT"] = "DIRECT";
    PartnerProgramType["MULTI_LEVEL"] = "MULTI_LEVEL";
})(PartnerProgramType || (PartnerProgramType = {}));
const PartnerProfileSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    isActive: {
        type: Boolean,
        default: false,
    },
    activatedAt: Date,
    expiresAt: Date,
    activationType: String,
    programType: {
        type: String,
        enum: Object.values(PartnerProgramType),
        default: PartnerProgramType.DIRECT,
    },
    referralCode: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    balance: {
        type: Number,
        default: 0,
    },
    bonus: {
        type: Number,
        default: 0,
    },
    totalPartners: {
        type: Number,
        default: 0,
    },
    directPartners: {
        type: Number,
        default: 0,
    },
    multiPartners: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
    collection: 'partnerProfiles',
});
export const PartnerProfile = mongoose.model('PartnerProfile', PartnerProfileSchema);
