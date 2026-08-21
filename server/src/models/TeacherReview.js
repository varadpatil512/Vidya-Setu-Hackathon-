import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  submission: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', required: true, unique: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  decision: { type: String, enum: ['APPROVE', 'REJECT', 'REQUEST_REVISION'], required: true },
  comments: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('TeacherReview', reviewSchema);
