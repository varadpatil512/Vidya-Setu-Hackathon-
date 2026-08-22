import mongoose from 'mongoose';

const interviewSchema = new mongoose.Schema({
  submission: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', required: true, unique: true },
  questions: [{ question: String }],
  answers: [{ question: String, answer: String }],
  consistencyScore: { type: Number, default: null },
  aiVerdict: { type: String, enum: ['VERIFY', 'FLAG'], default: null },
  aiReasoning: { type: String, default: '' },
  generatedBy: { type: String, default: 'mock' },
  mode: { type: String, enum: ['VOICE', 'TYPED'], default: 'VOICE' },
  micIssueReason: { type: String, default: '' },
  permissionsGranted: { type: Boolean, default: true },
  permissionIssueReason: { type: String, default: '' },
  proctorFlags: [
    {
      type: { type: String, required: true }, // TAB_SWITCH | FOCUS_LOSS | FULLSCREEN_EXIT | NO_FACE | MULTIPLE_FACES
      timestamp: { type: Date, default: Date.now },
      details: { type: String, default: '' },
      _id: false,
    }
  ],
}, { timestamps: true });

export default mongoose.model('Interview', interviewSchema);
