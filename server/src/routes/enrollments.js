import { Router } from 'express';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';

import { auth } from '../middleware/auth.js';

const router = Router();

// mock checkout — simulates payment success and enrolls the student
router.post('/checkout', auth, async (req, res) => {
  try {
    const { courseId } = req.body || {};
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const existing = await Enrollment.findOne({ student: req.user._id, course: courseId });
    if (existing) return res.status(409).json({ message: 'Already enrolled in this course', enrollment: existing });

    const enrollment = await Enrollment.create({
      student: req.user._id,
      course: courseId,
      amountPaid: course.price || 0,
      videoWatched: course.videos.map(() => false),
    });
    res.status(201).json(enrollment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/mine', auth, async (req, res) => {
  const enrollments = await Enrollment.find({ student: req.user._id }).populate('course').sort({ purchasedAt: -1 });
  res.json(enrollments);
});

router.get('/:courseId', auth, async (req, res) => {
  const enrollment = await Enrollment.findOne({ student: req.user._id, course: req.params.courseId }).populate('course');
  if (!enrollment) return res.status(404).json({ message: 'Not enrolled in this course' });
  res.json(enrollment);
});

router.post('/:courseId/videos/:index/watched', auth, async (req, res) => {
  try {
    const enrollment = await Enrollment.findOne({ student: req.user._id, course: req.params.courseId });
    if (!enrollment) return res.status(404).json({ message: 'Not enrolled in this course' });
    const idx = Number(req.params.index);
    if (!Number.isInteger(idx) || idx < 0 || idx >= enrollment.videoWatched.length) {
      return res.status(400).json({ message: 'Invalid video index' });
    }
    enrollment.videoWatched[idx] = true;
    if (enrollment.videoWatched.every(Boolean) && enrollment.status === 'ACTIVE') {
      enrollment.status = 'COMPLETED'; // all videos watched — assignment unlocked
    }
    await enrollment.save();
    res.json(enrollment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
