import { Router } from 'express';
import Submission from '../models/Submission.js';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import Interview from '../models/Interview.js';
import { auth } from '../middleware/auth.js';
import { verifyCode, verifyText } from '../services/verifier.js';

const router = Router();

const PASTE_JUMP_CHARS = 150; // diff between consecutive snapshots larger than this counts as a paste event
const MAX_SNAPSHOTS = 200;

function countPasteEvents(snapshots) {
  let count = 0;
  for (let i = 1; i < snapshots.length; i++) {
    if (Math.abs(snapshots[i].length - snapshots[i - 1].length) >= PASTE_JUMP_CHARS) count++;
  }
  return count;
}

async function loadContext(req, res) {
  const enrollment = await Enrollment.findOne({ student: req.user._id, course: req.params.courseId || req.body?.courseId });
  if (!enrollment) {
    res.status(403).json({ message: 'You must be enrolled in this course' });
    return null;
  }
  if (!enrollment.videoWatched.every(Boolean)) {
    res.status(403).json({ message: 'Watch all course videos before attempting the assignment' });
    return null;
  }
  const course = await Course.findById(enrollment.course);
  if (!course) {
    res.status(404).json({ message: 'Course not found' });
    return null;
  }
  return { enrollment, course };
}

// create or revise a submission — runs verification immediately
router.post('/', auth, async (req, res) => {
  try {
    const { courseId, type, code, text, snapshots } = req.body || {};
    const ctx = await loadContext({ ...req, body: { courseId } }, res);
    if (!ctx) return;
    const { course } = ctx;

    const subType = type || course.assignment.type;
    if (!['code', 'text'].includes(subType)) return res.status(400).json({ message: 'Invalid submission type' });

    const snaps = (Array.isArray(snapshots) ? snapshots : [])
      .slice(-MAX_SNAPSHOTS)
      .map(s => ({ at: s.at ? new Date(s.at) : new Date(), length: Number(s.length) || 0, content: String(s.content || '').slice(0, 5000) }));

    let verifyResult;
    if (subType === 'code') {
      if (!String(code || '').trim()) return res.status(400).json({ message: 'Code submission is empty' });
      verifyResult = verifyCode(code, course.assignment.testCases, course.assignment.rubric);
    } else {
      if (!String(text || '').trim()) return res.status(400).json({ message: 'Text submission is empty' });
      verifyResult = verifyText(text, course.assignment.rubric);
    }

    const pasteEvents = countPasteEvents(snaps);
    const content = { type: subType, code: subType === 'code' ? code : '', text: subType === 'text' ? text : '' };

    // revise the active submission if it's still open, else start a new attempt
    const open = await Submission.findOne({
      student: req.user._id,
      course: course._id,
      status: { $in: ['PENDING', 'VERIFICATION_FAILED', 'REVISION_REQUESTED'] },
    }).sort({ createdAt: -1 });

    let submission;
    if (open) {
      Object.assign(open, content);
      open.snapshots = snaps.length ? snaps : open.snapshots;
      open.pasteEvents = pasteEvents;
      open.verifyResult = verifyResult;
      open.status = verifyResult.passed ? 'CODE_VERIFIED' : 'VERIFICATION_FAILED';
      open.flagReason = '';
      submission = await open.save();
      // a revision invalidates the previous interview — allow a fresh one
      await Interview.findOneAndDelete({ submission: open._id });
    } else {
      submission = await Submission.create({
        student: req.user._id,
        course: course._id,
        ...content,
        snapshots: snaps,
        pasteEvents,
        verifyResult,
        status: verifyResult.passed ? 'CODE_VERIFIED' : 'VERIFICATION_FAILED',
      });
      // Also wipe old interviews from prior submissions for the same student+course
      // so fresh questions are always generated for a new attempt
      const oldSubs = await Submission.find({
        student: req.user._id,
        course: course._id,
        _id: { $ne: submission._id },
      }).select('_id');
      if (oldSubs.length) {
        await Interview.deleteMany({ submission: { $in: oldSubs.map(s => s._id) } });
      }
    }
    res.status(open ? 200 : 201).json(submission);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/mine', auth, async (req, res) => {
  const submissions = await Submission.find({ student: req.user._id }).populate('course', 'title skill').sort({ updatedAt: -1 });
  res.json(submissions);
});

router.get('/:id', auth, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id).populate('course', 'title skill assignment');
    if (!submission) return res.status(404).json({ message: 'Submission not found' });
    const isOwner = String(submission.student) === String(req.user._id);
    if (!isOwner && !['TEACHER', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not allowed' });
    }
    res.json(submission);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// periodic snapshot log from the locked editor (paste detection evidence)
router.post('/:id/snapshots', auth, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission || String(submission.student) !== String(req.user._id)) {
      return res.status(404).json({ message: 'Submission not found' });
    }
    const { length, content } = req.body || {};
    submission.snapshots.push({ at: new Date(), length: Number(length) || 0, content: String(content || '').slice(0, 5000) });
    if (submission.snapshots.length > MAX_SNAPSHOTS) submission.snapshots = submission.snapshots.slice(-MAX_SNAPSHOTS);
    submission.pasteEvents = countPasteEvents(submission.snapshots);
    await submission.save();
    res.json({ ok: true, pasteEvents: submission.pasteEvents, snapshots: submission.snapshots.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
