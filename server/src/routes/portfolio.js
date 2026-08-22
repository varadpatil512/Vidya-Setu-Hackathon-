import { Router } from 'express';
import Submission from '../models/Submission.js';
import Interview from '../models/Interview.js';
import TeacherReview from '../models/TeacherReview.js';
import User from '../models/User.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();

// verified skills with links to the evidence that proved them
async function buildPortfolio(userId) {
  const user = await User.findById(userId).select('name email role');
  if (!user) return null;

  const verified = await Submission.find({ student: userId, status: 'VERIFIED' })
    .populate('course', 'title skill')
    .sort({ verifiedAt: -1 });

  const entries = await Promise.all(verified.map(async (s) => {
    const interview = await Interview.findOne({ submission: s._id });
    const review = await TeacherReview.findOne({ submission: s._id }).populate('teacher', 'name');
    return {
      submissionId: s._id,
      skill: s.course?.skill || s.course?.title,
      courseTitle: s.course?.title,
      aiScore: s.aiScore,
      aiConfidence: s.aiConfidence,
      verifiedAt: s.verifiedAt,
      verifiedBy: review ? `Teacher (${review.teacher?.name || 'faculty'}) after AI flag` : 'AI auto-verification',
      evidence: {
        submissionType: s.type,
        submissionExcerpt: String(s.type === 'code' ? s.code : s.text).slice(0, 300),
        interviewQuestions: interview?.questions?.length || 0,
        pasteEvents: s.pasteEvents,
        snapshotCount: s.snapshots.length,
      },
      teacherReview: review ? { decision: review.decision, comments: review.comments, at: review.createdAt } : null,
    };
  }));

  const pending = await Submission.find({
    student: userId,
    status: { $in: ['FLAGGED', 'INTERVIEW_DONE'] },
  })
    .populate('course', 'title skill')
    .sort({ updatedAt: -1 });

  const pendingReview = await Promise.all(pending.map(async (s) => {
    const interview = await Interview.findOne({ submission: s._id });
    return {
      submissionId: s._id,
      skill: s.course?.skill || s.course?.title,
      courseTitle: s.course?.title,
      status: s.status,
      statusLabel: s.status === 'FLAGGED' ? 'Awaiting teacher approval' : 'Processing interview defence',
      flagReason: s.flagReason || (s.status === 'FLAGGED' ? 'Consistency audit queued for faculty review' : 'Evaluating defence responses'),
      aiScore: s.aiScore,
      submittedAt: s.updatedAt || s.createdAt,
      evidence: {
        submissionType: s.type,
        interviewQuestions: interview?.questions?.length || 0,
        pasteEvents: s.pasteEvents || 0,
        snapshotCount: s.snapshots?.length || 0,
      },
    };
  }));

  return { user, verifiedSkills: entries, pendingReview };
}

// Portfolio is student-only
router.get('/mine', auth, requireRole('STUDENT'), async (req, res) => {
  const portfolio = await buildPortfolio(req.user._id);
  res.json(portfolio);
});

router.get('/:userId', auth, requireRole('STUDENT'), async (req, res) => {
  try {
    const portfolio = await buildPortfolio(req.params.userId);
    if (!portfolio) return res.status(404).json({ message: 'User not found' });
    res.json(portfolio);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
