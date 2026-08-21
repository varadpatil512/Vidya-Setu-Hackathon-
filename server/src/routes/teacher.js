import { Router } from 'express';
import Submission from '../models/Submission.js';
import Interview from '../models/Interview.js';
import TeacherReview from '../models/TeacherReview.js';
import Enrollment from '../models/Enrollment.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(auth, requireRole('TEACHER', 'ADMIN'));

// flagged submissions awaiting human verification, with the full evidence bundle
router.get('/queue', async (req, res) => {
  try {
    const flagged = await Submission.find({ status: 'FLAGGED' })
      .populate('student', 'name email')
      .populate('course', 'title skill')
      .sort({ updatedAt: -1 });

    const withEvidence = await Promise.all(flagged.map(async (s) => {
      const [interview, review] = await Promise.all([
        Interview.findOne({ submission: s._id }),
        TeacherReview.findOne({ submission: s._id }),
      ]);
      return {
        _id: s._id,
        student: s.student,
        course: s.course,
        type: s.type,
        code: s.code,
        text: s.text,
        pasteEvents: s.pasteEvents,
        snapshotCount: s.snapshots.length,
        snapshots: s.snapshots.slice(-10),
        verifyResult: s.verifyResult,
        aiScore: s.aiScore,
        aiConfidence: s.aiConfidence,
        flagReason: s.flagReason,
        status: s.status,
        updatedAt: s.updatedAt,
        interview,
        review,
      };
    }));
    res.json(withEvidence);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// teacher decision on a flagged submission
router.post('/reviews', async (req, res) => {
  try {
    const { submissionId, decision, comments } = req.body || {};
    if (!['APPROVE', 'REJECT', 'REQUEST_REVISION'].includes(decision)) {
      return res.status(400).json({ message: 'decision must be APPROVE, REJECT or REQUEST_REVISION' });
    }
    const submission = await Submission.findById(submissionId);
    if (!submission) return res.status(404).json({ message: 'Submission not found' });
    if (submission.status !== 'FLAGGED') {
      return res.status(409).json({ message: `Only FLAGGED submissions can be reviewed (current status: ${submission.status})` });
    }

    await TeacherReview.findOneAndUpdate(
      { submission: submission._id },
      { teacher: req.user._id, decision, comments: String(comments || '') },
      { new: true, upsert: true }
    );

    if (decision === 'APPROVE') {
      submission.status = 'VERIFIED';
      submission.verifiedAt = new Date();
      await Enrollment.updateOne({ student: submission.student, course: submission.course }, { status: 'VERIFIED' });
    } else if (decision === 'REJECT') {
      submission.status = 'REJECTED';
    } else {
      submission.status = 'REVISION_REQUESTED';
    }
    await submission.save();
    res.json(submission);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
