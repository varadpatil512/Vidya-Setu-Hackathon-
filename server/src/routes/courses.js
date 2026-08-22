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
    // Public catalog strictly shows approved courses only
    const filter = { status: 'approved' };
    if (category && category !== 'All') filter.category = category;
    if (search) filter.$or = [
      { title: new RegExp(String(search), 'i') },
      { description: new RegExp(String(search), 'i') },
      { skill: new RegExp(String(search), 'i') },
    ];
    const courses = await Course.find(filter)
      .populate('assignedTeacher', 'name email')
      .sort({ createdAt: -1 });
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/meta/categories', async (req, res) => {
  const cats = await Course.distinct('category');
  res.json(cats);
});

// GET /api/courses/admin/teachers - Admin endpoint to fetch all registered teachers
router.get('/admin/teachers', auth, requireRole('ADMIN'), async (req, res) => {
  try {
    const teachers = await User.find({ role: 'TEACHER' }).select('name email');
    res.json(teachers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/courses/admin/pending - Admin endpoint to fetch pending course proposals
router.get('/admin/pending', auth, requireRole('ADMIN'), async (req, res) => {
  try {
    const pending = await Course.find({ status: 'pending' })
      .populate('createdBy', 'name email')
      .populate('assignedTeacher', 'name email')
      .sort({ createdAt: -1 });
    res.json(pending);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/courses/admin/:id/approve - Admin approves a pending course
router.patch('/admin/:id/approve', auth, requireRole('ADMIN'), async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', rejectionReason: '' },
      { new: true }
    );
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/courses/admin/:id/reject - Admin rejects a pending course with feedback
router.patch('/admin/:id/reject', auth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { reason } = req.body || {};
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', rejectionReason: String(reason || 'Course proposal rejected by administration') },
      { new: true }
    );
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// platform stats — must be registered before /:id
router.get('/admin/stats', auth, requireRole('ADMIN'), async (req, res) => {
  try {
    const [totalCourses, totalStudents, totalEnrollments, submissions, flagged, verified] = await Promise.all([
      Course.countDocuments({ status: 'approved' }),
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
    const course = await Course.findById(req.params.id).populate('assignedTeacher', 'name email');
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
