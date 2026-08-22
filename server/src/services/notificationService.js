import Notification from '../models/Notification.js';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';

export async function handleSubmissionApproved({ submission }) {
  try {
    const studentId = submission.student?._id || submission.student;
    const courseId = submission.course?._id || submission.course;

    // 1. Mark enrollment status as 'completed' and set completedAt timestamp
    await Enrollment.updateOne(
      { student: studentId, course: courseId },
      { status: 'completed', completedAt: new Date() }
    );

    // 2. Fetch course details for title & skill tag
    const course = await Course.findById(courseId).select('title skill');
    const courseTitle = course?.title || 'Course';
    const skillTag = course?.skill || 'Skill';

    // 3. Create approval notification for student
    const notification = await Notification.create({
      student: studentId,
      type: 'approval',
      course: courseId,
      submission: submission._id,
      message: `Your submission for "${courseTitle}" was approved — ${skillTag} has been added to your portfolio!`,
    });

    console.log(`[Notification] Created approval notification for student ${studentId}`);
    return notification;
  } catch (err) {
    console.error('[Notification] Error in handleSubmissionApproved:', err);
  }
}

export async function handleSubmissionRejected({ submission, comments = '' }) {
  try {
    const studentId = submission.student?._id || submission.student;
    const courseId = submission.course?._id || submission.course;

    // Fetch course details
    const course = await Course.findById(courseId).select('title');
    const courseTitle = course?.title || 'Course';

    const reasonStr = comments && comments.trim() ? ` Reason: ${comments.trim()}` : '';
    const notification = await Notification.create({
      student: studentId,
      type: 'rejection',
      course: courseId,
      submission: submission._id,
      message: `Your submission for "${courseTitle}" needs revision.${reasonStr}`,
    });

    console.log(`[Notification] Created rejection notification for student ${studentId}`);
    return notification;
  } catch (err) {
    console.error('[Notification] Error in handleSubmissionRejected:', err);
  }
}
