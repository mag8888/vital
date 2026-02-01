import mongoose, { Schema, Document } from 'mongoose';

export enum Region {
  RUSSIA = 'RUSSIA',
  BALI = 'BALI',
  DUBAI = 'DUBAI',
  KAZAKHSTAN = 'KAZAKHSTAN',
  BELARUS = 'BELARUS',
  OTHER = 'OTHER',
}

export interface IUser extends Document {
  _id: string;
  telegramId: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  phone?: string;
  selectedRegion?: Region;
  deliveryAddress?: string;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    telegramId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    firstName: String,
    lastName: String,
    username: String,
    languageCode: String,
    phone: String,
    selectedRegion: {
      type: String,
      enum: Object.values(Region),
      default: Region.RUSSIA,
    },
    deliveryAddress: String,
    balance: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

export const User = mongoose.model<IUser>('User', UserSchema);
