import mongoose from 'mongoose';

const interviewSchema = new mongoose.Schema({
  submission: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', required: true, unique: true },
  questions: [{ question: String }],
  answers: [{ question: String, answer: String }],
  consistencyScore: { type: Number, default: null },
  aiVerdict: { type: String, enum: ['VERIFY', 'FLAG'], default: null },
  aiReasoning: { type: String, default: '' },
  generatedBy: { type: String, enum: ['openai', 'mock'], default: 'mock' },
}, { timestamps: true });

export default mongoose.model('Interview', interviewSchema);
