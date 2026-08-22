import mongoose from 'mongoose';

const interviewFeedbackSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  submission: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  tag: { type: String, default: '' },
  comment: { type: String, default: '' },
}, { timestamps: true });

interviewFeedbackSchema.index({ student: 1, submission: 1 }, { unique: true });

export default mongoose.model('InterviewFeedback', interviewFeedbackSchema);
