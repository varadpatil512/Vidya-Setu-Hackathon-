import mongoose from 'mongoose';

export const STATUSES = [
  'PENDING',            // created, not yet passed code/text verification
  'VERIFICATION_FAILED',// verification ran and tests/rubric did not pass; student may revise
  'CODE_VERIFIED',      // verification passed — interview unlocked
  'INTERVIEW_DONE',     // interview answered, AI decision rendered (VERIFIED or FLAGGED below)
  'VERIFIED',           // skill verified (auto or teacher-approved)
  'FLAGGED',            // AI low confidence/inconsistent — waiting in teacher queue
  'REJECTED',           // teacher rejected
  'REVISION_REQUESTED', // teacher asked for revision
];

const snapshotSchema = new mongoose.Schema({
  at: { type: Date, default: Date.now },
  length: { type: Number, required: true },
  content: { type: String, default: '' }, // rolling latest content for diff context
}, { _id: false });

const submissionSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  type: { type: String, enum: ['code', 'text'], required: true },
  code: { type: String, default: '' },
  text: { type: String, default: '' },
  snapshots: { type: [snapshotSchema], default: [] },
  pasteEvents: { type: Number, default: 0 }, // big-jump diffs detected server-side
  verifyResult: {
    passed: { type: Boolean, default: false },
    results: [{ name: String, passed: Boolean, expected: String, actual: String }],
  },
  status: { type: String, enum: STATUSES, default: 'PENDING', index: true },
  aiScore: { type: Number, default: null },        // rubric/quality score 0-100
  aiConfidence: { type: Number, default: null },   // interview consistency confidence 0-1
  aiFeedback: { type: String, default: '' },
  flagReason: { type: String, default: '' },
  verifiedAt: { type: Date, default: null },
}, { timestamps: true });

submissionSchema.index({ student: 1, course: 1 });

export default mongoose.model('Submission', submissionSchema);
