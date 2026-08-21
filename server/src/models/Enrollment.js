import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  purchasedAt: { type: Date, default: Date.now },
  amountPaid: { type: Number, default: 0 },
  videoWatched: { type: [Boolean], default: [] },
  status: {
    type: String,
    enum: ['ACTIVE', 'COMPLETED', 'VERIFIED'],
    default: 'ACTIVE',
  },
}, { timestamps: true });

enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

export default mongoose.model('Enrollment', enrollmentSchema);
