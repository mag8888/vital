import mongoose, { Schema, Document } from 'mongoose';

export interface IUserHistory extends Document {
  _id: string;
  userId: string;
  action: string;
  payload?: any;
  createdAt: Date;
}

const UserHistorySchema = new Schema<IUserHistory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    payload: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'userHistories',
  }
);

UserHistorySchema.index({ userId: 1, createdAt: -1 });

export const UserHistory = mongoose.model<IUserHistory>('UserHistory', UserHistorySchema);
