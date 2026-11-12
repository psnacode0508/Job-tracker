import mongoose from 'mongoose';

/**
 * Embedded note schema for application updates and notes
 */
const noteSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Note text is required'],
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

/**
 * Main application schema
 */
const applicationSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner is required'],
    },
    company: {
      type: String,
      required: [true, 'Company is required'],
      trim: true,
      minlength: [2, 'Company must be between 2 and 60 characters'],
      maxlength: [60, 'Company must be between 2 and 60 characters'],
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      trim: true,
      minlength: [2, 'Role must be between 2 and 60 characters'],
      maxlength: [60, 'Role must be between 2 and 60 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['Applied', 'Interview', 'Offer', 'Rejected'],
        message: 'Status must be one of: Applied, Interview, Offer, Rejected',
      },
      default: 'Applied',
    },
    appliedOn: {
      type: Date,
      default: Date.now,
      validate: {
        validator: function (value) {
          if (!value) return true;
          return value.getTime() <= Date.now();
        },
        message: 'appliedOn cannot be in the future',
      },
    },
    priority: {
      type: String,
      enum: {
        values: ['Low', 'Medium', 'High'],
        message: 'Priority must be one of: Low, Medium, High',
      },
      default: 'Medium',
    },
    salary: {
      type: Number,
      min: [0, 'Salary cannot be negative'],
    },
    notes: [noteSchema],
  },
  {
    timestamps: true,
  }
);

// Compound index on owner and status for optimized query performance
applicationSchema.index({ owner: 1, status: 1 });

export const Application = mongoose.model('Application', applicationSchema);

export default Application;
