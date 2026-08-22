import { Router } from 'express';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import Submission from '../models/Submission.js';
import InterviewFeedback from '../models/InterviewFeedback.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(auth, requireRole('ADMIN'));

// GET /api/admin/dashboard - Comprehensive platform stats
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalStudents, totalTeachers, totalLiveCourses, pendingCourses,
      pendingReviewQueue, totalEnrollments, totalFeedback, avgRatingAgg,
    ] = await Promise.all([
      User.countDocuments({ role: 'STUDENT' }),
      User.countDocuments({ role: 'TEACHER' }),
      Course.countDocuments({ status: 'approved' }),
      Course.countDocuments({ status: 'pending' }),
      Submission.countDocuments({ status: 'FLAGGED' }),
      Enrollment.countDocuments(),
      InterviewFeedback.countDocuments(),
      InterviewFeedback.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' } } }]),
    ]);

    const avgRating = avgRatingAgg?.[0]?.avg
      ? Math.round(avgRatingAgg[0].avg * 10) / 10
      : null;

    res.json({
      totalStudents,
      totalTeachers,
      totalLiveCourses,
      pendingCourses,
      pendingReviewQueue,
      totalEnrollments,
      totalFeedback,
      avgRating,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/students - All student accounts with enrollment counts
router.get('/students', async (req, res) => {
  try {
    const students = await User.find({ role: 'STUDENT' })
      .select('name email createdAt')
      .sort({ createdAt: -1 });

    const studentIds = students.map(s => s._id);
    const enrollments = await Enrollment.aggregate([
      { $match: { student: { $in: studentIds } } },
      { $group: { _id: '$student', count: { $sum: 1 } } },
    ]);
    const enrollMap = new Map(enrollments.map(e => [String(e._id), e.count]));

    res.json(students.map(s => ({
      _id: s._id,
      name: s.name,
      email: s.email,
      createdAt: s.createdAt,
      enrollmentCount: enrollMap.get(String(s._id)) || 0,
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/teachers - All teacher accounts with course stats
router.get('/teachers', async (req, res) => {
  try {
    const teachers = await User.find({ role: 'TEACHER' })
      .select('name email createdAt')
      .sort({ createdAt: -1 });

    const teacherIds = teachers.map(t => t._id);
    const courses = await Course.find({ createdBy: { $in: teacherIds } })
      .select('createdBy status title');

    // Group by teacherId
    const coursesByTeacher = new Map();
    for (const c of courses) {
      const tid = String(c.createdBy);
      if (!coursesByTeacher.has(tid)) coursesByTeacher.set(tid, []);
      coursesByTeacher.get(tid).push(c);
    }

    res.json(teachers.map(t => {
      const myCourses = coursesByTeacher.get(String(t._id)) || [];
      const approved = myCourses.filter(c => c.status === 'approved').length;
      const rejected = myCourses.filter(c => c.status === 'rejected').length;
      return {
        _id: t._id,
        name: t.name,
        email: t.email,
        createdAt: t.createdAt,
        totalSubmitted: myCourses.length,
        approved,
        rejected,
        pending: myCourses.filter(c => c.status === 'pending').length,
        approvalRate: myCourses.length > 0
          ? Math.round((approved / myCourses.length) * 100)
          : null,
        courses: myCourses.map(c => ({ _id: c._id, title: c.title, status: c.status })),
      };
    }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/enrollments - All student enrollments (platform-wide)
router.get('/enrollments', async (req, res) => {
  try {
    const enrollments = await Enrollment.find()
      .populate('student', 'name email')
      .populate('course', 'title category skill status')
      .sort({ purchasedAt: -1 })
      .limit(500);

    res.json(enrollments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/queue - Global AI-flagged submission review queue (all courses)
router.get('/queue', async (req, res) => {
  try {
    const submissions = await Submission.find({ status: 'FLAGGED' })
      .populate('student', 'name email')
      .populate('course', 'title category skill')
      .sort({ createdAt: -1 });

    const subIds = submissions.map(s => s._id);
    const Interview = (await import('../models/Interview.js')).default;
    const interviews = await Interview.find({ submission: { $in: subIds } });
    const interviewMap = new Map(interviews.map(i => [String(i.submission), i]));

    res.json(submissions.map(s => ({
      ...s.toObject(),
      interview: interviewMap.get(String(s._id)) || null,
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/feedback - All interview feedback platform-wide with aggregations
router.get('/feedback', async (req, res) => {
  try {
    const [feedbackList, ratingAgg, tagAgg] = await Promise.all([
      InterviewFeedback.find()
        .populate('student', 'name email')
        .populate({ path: 'submission', populate: { path: 'course', select: 'title skill category' } })
        .sort({ createdAt: -1 }),
      InterviewFeedback.aggregate([
        { $group: { _id: null, avg: { $avg: '$rating' }, total: { $sum: 1 } } }
      ]),
      InterviewFeedback.aggregate([
        { $group: { _id: '$tag', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.json({
      feedback: feedbackList,
      avgRating: ratingAgg?.[0]?.avg ? Math.round(ratingAgg[0].avg * 10) / 10 : null,
      totalFeedback: ratingAgg?.[0]?.total || 0,
      tagBreakdown: tagAgg,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
