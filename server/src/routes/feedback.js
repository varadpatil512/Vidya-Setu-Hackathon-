import { Router } from 'express';
import InterviewFeedback from '../models/InterviewFeedback.js';
import Submission from '../models/Submission.js';
import Course from '../models/Course.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();

// POST /api/feedback/interview - Submit student feedback for an AI interview
router.post('/interview', auth, async (req, res) => {
  try {
    const { submissionId, rating, tag, comment } = req.body || {};

    if (!submissionId || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Valid submissionId and rating (1-5) are required' });
    }

    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Ensure student owns the submission
    if (String(submission.student) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only submit feedback for your own interview' });
    }

    // Upsert or create feedback
    const feedback = await InterviewFeedback.findOneAndUpdate(
      { student: req.user._id, submission: submissionId },
      { rating, tag: tag || '', comment: comment || '' },
      { new: true, upsert: true }
    );

    res.status(201).json(feedback);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/feedback/interview - Admin / Teacher endpoint to list interview feedback (scoped for TEACHER)
router.get('/interview', auth, requireRole('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const { courseId } = req.query;

    let targetCourseIds = null;
    if (req.user.role === 'TEACHER') {
      const assigned = await Course.find({ assignedTeacher: req.user._id }).select('_id');
      targetCourseIds = assigned.map(c => String(c._id));
      if (courseId) {
        if (!targetCourseIds.includes(String(courseId))) {
          return res.status(403).json({ message: 'Access denied: You are not assigned to this course' });
        }
        targetCourseIds = [String(courseId)];
      }
    } else if (courseId) {
      targetCourseIds = [String(courseId)];
    }

    const feedbackList = await InterviewFeedback.find()
      .populate('student', 'name email')
      .populate({
        path: 'submission',
        populate: { path: 'course', select: 'title skill assignedTeacher' }
      })
      .sort({ createdAt: -1 });

    // Filter feedback entries by target course IDs if scoped
    const filtered = targetCourseIds
      ? feedbackList.filter(f => f.submission?.course && targetCourseIds.includes(String(f.submission.course._id || f.submission.course)))
      : feedbackList;

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
