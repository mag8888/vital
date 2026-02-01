import mongoose, { Schema, Document } from 'mongoose';

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

const ReviewSchema = new Schema<IReview>(
  {
    name: {
      type: String,
      required: true,
    },
    photoUrl: String,
    content: {
      type: String,
      required: true,
    },
    link: String,
    isPinned: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'reviews',
  }
);

export const Review = mongoose.model<IReview>('Review', ReviewSchema);
