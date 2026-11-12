import mongoose from 'mongoose';

const aiUsageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    endpoint: {
      type: String,
      required: [true, 'Endpoint name is required'],
      trim: true,
    },
    model: {
      type: String,
      required: [true, 'Model name is required'],
      trim: true,
    },
    inputTokens: {
      type: Number,
      required: [true, 'Input tokens count is required'],
      min: 0,
    },
    outputTokens: {
      type: Number,
      required: [true, 'Output tokens count is required'],
      min: 0,
    },
    durationMs: {
      type: Number,
      required: [true, 'Duration in milliseconds is required'],
      min: 0,
    },
    costUsd: {
      type: Number,
      required: [true, 'Cost in USD is required'],
      min: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

export const AiUsage = mongoose.model('AiUsage', aiUsageSchema);

export default AiUsage;
