import { Router } from 'express';
import Submission from '../models/Submission.js';
import Interview from '../models/Interview.js';
import TeacherReview from '../models/TeacherReview.js';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(auth, requireRole('TEACHER', 'ADMIN'));

// Helper: Get array of course IDs assigned to or created by logged-in teacher (or all course IDs if admin)
async function getAssignedCourseIds(user) {
  if (user.role === 'ADMIN') {
    const all = await Course.find().select('_id');
    return all.map(c => c._id);
  }
  const assigned = await Course.find({
    $or: [{ assignedTeacher: user._id }, { createdBy: user._id }]
  }).select('_id');
  return assigned.map(c => c._id);
}

// GET /api/teacher/courses - Fetch courses created by or assigned to logged-in teacher
router.get('/courses', async (req, res) => {
  try {
    const filter = req.user.role === 'ADMIN'
      ? {}
      : { $or: [{ assignedTeacher: req.user._id }, { createdBy: req.user._id }] };
    const courses = await Course.find(filter)
      .populate('assignedTeacher', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/teacher/courses - Submit a new course proposal (starts in 'pending' status)
router.post('/courses', async (req, res) => {
  try {
    const { title, description, category, price, skill, instructor, thumbnail, videoUrl, videos, assignment } = req.body || {};

    if (!title || !description || !skill || !assignment?.title || !assignment?.prompt) {
      return res.status(400).json({ message: 'Title, Description, Skill, and Assignment details are required' });
    }

    // Build video list: if generic videoUrl is provided, wrap into 1 video object
    const finalVideoUrl = String(videoUrl || videos?.[0]?.url || 'https://youtu.be/6qwOQe2BiYY').trim();
    const finalVideos = [
      {
        title: `${title} - Core Lecture`,
        url: finalVideoUrl,
        durationSec: 90,
      }
    ];

    const course = await Course.create({
      title: title.trim(),
      description: description.trim(),
      category: category || 'Development',
      price: typeof price === 'number' ? price : 499,
      thumbnail: thumbnail || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=60',
      instructor: instructor || req.user.name || 'Faculty Member',
      skill: skill.trim(),
      videos: finalVideos,
      assignment: {
        title: assignment.title || 'Capstone Project',
        prompt: assignment.prompt || 'Complete assignment requirements',
        type: assignment.type || 'code',
        language: assignment.language || 'javascript',
        starterCode: assignment.starterCode || '',
        rubric: assignment.rubric || '',
        testCases: assignment.testCases || [],
        questionCount: assignment.questionCount || 2,
      },
      createdBy: req.user._id,
      assignedTeacher: req.user._id,
      status: 'pending', // Starts as pending for Admin review
      rejectionReason: '',
    });

    res.status(201).json(course);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/teacher/courses/:courseId/students - Enrolled roster for assigned course
router.get('/courses/:courseId/students', async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    if (req.user.role !== 'ADMIN' && String(course.assignedTeacher) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Access denied: You are not assigned to this course' });
    }

    const enrollments = await Enrollment.find({ course: courseId })
      .populate('student', 'name email')
      .sort({ createdAt: -1 });

    const submissions = await Submission.find({ course: courseId }).select('student status aiScore aiConfidence');
    const subByStudent = new Map(submissions.map(s => [String(s.student), s]));

    res.json(enrollments.map(e => ({
      _id: e._id,
      student: e.student,
      purchasedAt: e.createdAt,
      videosWatched: e.videoWatched?.filter(Boolean).length || 0,
      totalVideos: Course.videoCount(),
      status: e.status,
      submission: subByStudent.get(String(e.student?._id || e.student)) || null,
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/teacher/queue - Flagged submissions awaiting human verification (scoped to assigned courses)
router.get('/queue', async (req, res) => {
  try {
    const assignedIds = await getAssignedCourseIds(req.user);
    const { courseId } = req.query;

    let targetCourseIds = assignedIds;
    if (courseId) {
      const isAssigned = assignedIds.some(id => String(id) === String(courseId));
      if (!isAssigned) {
        return res.status(403).json({ message: 'Access denied: You are not assigned to this course' });
      }
      targetCourseIds = [courseId];
    }

    const flagged = await Submission.find({
      status: 'FLAGGED',
      course: { $in: targetCourseIds },
    })
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
        snapshotCount: s.snapshots?.length || 0,
        snapshots: (s.snapshots || []).slice(-10),
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

// POST /api/teacher/reviews - Teacher decision on a flagged submission
router.post('/reviews', async (req, res) => {
  try {
    const { submissionId, decision, comments } = req.body || {};
    if (!['APPROVE', 'REJECT', 'REQUEST_REVISION'].includes(decision)) {
      return res.status(400).json({ message: 'decision must be APPROVE, REJECT or REQUEST_REVISION' });
    }
    const submission = await Submission.findById(submissionId).populate('course');
    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    if (req.user.role !== 'ADMIN') {
      const assignedIds = await getAssignedCourseIds(req.user);
      const isAssigned = assignedIds.some(id => String(id) === String(submission.course._id || submission.course));
      if (!isAssigned) {
        return res.status(403).json({ message: 'Access denied: You are not assigned to review submissions for this course' });
      }
    }

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
