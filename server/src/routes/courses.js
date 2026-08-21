import { Router } from 'express';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import Submission from '../models/Submission.js';
import User from '../models/User.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();

// ---- public ----

router.get('/', async (req, res) => {
  try {
    const { search, category } = req.query;
    const filter = {};
    if (category && category !== 'All') filter.category = category;
    if (search) filter.$or = [
      { title: new RegExp(String(search), 'i') },
      { description: new RegExp(String(search), 'i') },
      { skill: new RegExp(String(search), 'i') },
    ];
    const courses = await Course.find(filter).sort({ createdAt: -1 });
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/meta/categories', async (req, res) => {
  const cats = await Course.distinct('category');
  res.json(cats);
});

// platform stats — must be registered before /:id
router.get('/admin/stats', auth, requireRole('ADMIN'), async (req, res) => {
  try {
    const [totalCourses, totalStudents, totalEnrollments, submissions, flagged, verified] = await Promise.all([
      Course.countDocuments(),
      User.countDocuments({ role: 'STUDENT' }),
      Enrollment.countDocuments(),
      Submission.countDocuments(),
      Submission.countDocuments({ status: 'FLAGGED' }),
      Submission.countDocuments({ status: 'VERIFIED' }),
    ]);
    res.json({ totalCourses, totalStudents, totalEnrollments, totalSubmissions: submissions, pendingTeacherReview: flagged, verifiedSubmissions: verified });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---- admin CRUD ----

function validateCourse(body, res) {
  const expected = Course.videoCount();
  const videos = (body.videos || []).filter(v => v && v.title && v.url);
  if (videos.length !== expected) {
    res.status(400).json({ message: `A course must have exactly ${expected} videos (got ${videos.length}).` });
    return null;
  }
  if (!body.title || !body.description || !body.skill || !body.assignment?.title || !body.assignment?.prompt) {
    res.status(400).json({ message: 'title, description, skill and assignment (title + prompt) are required' });
    return null;
  }
  return { ...body, videos };
}

router.post('/', auth, requireRole('ADMIN'), async (req, res) => {
  const clean = validateCourse(req.body, res);
  if (!clean) return;
  try {
    const course = await Course.create(clean);
    res.status(201).json(course);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', auth, requireRole('ADMIN'), async (req, res) => {
  const clean = validateCourse(req.body, res);
  if (!clean) return;
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, clean, { new: true, runValidators: true });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(course);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', auth, requireRole('ADMIN'), async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    await Promise.all([
      Enrollment.deleteMany({ course: course._id }),
      Submission.deleteMany({ course: course._id }),
    ]);
    res.json({ message: 'Course deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// enrolled students per course
router.get('/:id/students', auth, requireRole('ADMIN', 'TEACHER'), async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ course: req.params.id })
      .populate('student', 'name email')
      .sort({ purchasedAt: -1 });
    const submissions = await Submission.find({ course: req.params.id }).select('student status aiScore aiConfidence');
    const subByStudent = new Map(submissions.map(s => [String(s.student), s]));
    res.json(enrollments.map(e => ({
      student: e.student,
      purchasedAt: e.purchasedAt,
      videosWatched: e.videoWatched.filter(Boolean).length,
      totalVideos: Course.videoCount(),
      status: e.status,
      submission: subByStudent.get(String(e.student)) || null,
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
