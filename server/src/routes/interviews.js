import { Router } from 'express';
import Submission from '../models/Submission.js';
import Interview from '../models/Interview.js';
import Enrollment from '../models/Enrollment.js';
import { auth } from '../middleware/auth.js';
import { generateQuestions, scoreInterview } from '../services/ai.js';
import { handleSubmissionApproved } from '../services/notificationService.js';

const router = Router();

async function loadOwnSubmission(req, res, id) {
  const submission = await Submission.findById(id).populate('course');
  if (!submission) {
    res.status(404).json({ message: 'Submission not found' });
    return null;
  }
  const isOwner = String(submission.student) === String(req.user._id);
  if (!isOwner && !['TEACHER', 'ADMIN'].includes(req.user.role)) {
    res.status(403).json({ message: 'Not allowed' });
    return null;
  }
  return submission;
}

// generate the AI interview for a verified submission
router.post('/start/:submissionId', auth, async (req, res) => {
  try {
    const submission = await loadOwnSubmission(req, res, req.params.submissionId);
    if (!submission) return;
    if (String(submission.student) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only the submitting student can start the interview' });
    }
    if (submission.status !== 'CODE_VERIFIED') {
      return res.status(409).json({ message: `Interview unlocks after your submission passes verification (current status: ${submission.status})` });
    }

    const existing = await Interview.findOne({ submission: submission._id });
    if (existing && existing.questions && existing.questions.length > 0) {
      if (existing.answers && existing.answers.length > 0) {
        return res.status(409).json({ message: 'Interview already completed for this submission' });
      }
      return res.json(existing);
    }

    const { questions, generatedBy } = await generateQuestions({ course: submission.course, submission });
    const interview = await Interview.findOneAndUpdate(
      { submission: submission._id },
      { questions: questions.map(q => ({ question: q })), answers: [], generatedBy },
      { new: true, upsert: true }
    );
    res.json(interview);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// submit answers → AI scores consistency → auto-verify or flag for teacher review
router.post('/answers/:submissionId', auth, async (req, res) => {
  try {
    const submission = await loadOwnSubmission(req, res, req.params.submissionId);
    if (!submission) return;
    if (String(submission.student) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only the submitting student can answer the interview' });
    }
    if (!['CODE_VERIFIED', 'INTERVIEW_DONE', 'FLAGGED'].includes(submission.status)) {
      return res.status(409).json({ message: `Cannot submit interview answers from status ${submission.status}` });
    }

    const interview = await Interview.findOne({ submission: submission._id });
    if (!interview || !interview.questions.length) return res.status(404).json({ message: 'Start the interview first' });
    if (interview.answers.length) return res.status(409).json({ message: 'Interview already completed' });

    const answers = (req.body?.answers || []).filter(a => a && a.question && typeof a.answer === 'string');
    if (answers.length !== interview.questions.length) {
      return res.status(400).json({ message: `All ${interview.questions.length} questions must be answered` });
    }

    const micIssueReason = String(req.body?.micIssueReason || req.body?.permissionIssueReason || '').trim();
    const permissionsGranted = typeof req.body?.permissionsGranted === 'boolean' ? req.body.permissionsGranted : (micIssueReason ? false : true);
    const permissionIssueReason = String(req.body?.permissionIssueReason || micIssueReason).trim();

    const result = await scoreInterview({ course: submission.course, submission, answers });

    interview.answers = answers;
    interview.consistencyScore = result.consistency;
    interview.aiVerdict = result.verdict;
    interview.aiReasoning = result.reasoning;
    interview.permissionsGranted = permissionsGranted;
    if (permissionIssueReason) {
      interview.permissionIssueReason = permissionIssueReason;
      interview.micIssueReason = permissionIssueReason;
      interview.mode = 'TYPED';
    }
    await interview.save();

    submission.aiScore = result.qualityScore;
    submission.aiConfidence = result.confidence;
    submission.aiFeedback = result.feedback;
    submission.flagReason = result.verdict === 'FLAG' ? result.reasoning : '';
    submission.status = 'INTERVIEW_DONE';

    if (result.verdict === 'VERIFY') {
      submission.status = 'VERIFIED';
      submission.verifiedAt = new Date();
      await handleSubmissionApproved({ submission });
    } else {
      submission.status = 'FLAGGED';
    }
    await submission.save();

    res.json({
      verdict: result.verdict,
      consistency: result.consistency,
      confidence: result.confidence,
      qualityScore: result.qualityScore,
      reasoning: result.reasoning,
      feedback: result.feedback,
      scoredBy: result.scoredBy,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// full transcript (owner, teacher, admin)
router.get('/:submissionId', auth, async (req, res) => {
  const submission = await loadOwnSubmission(req, res, req.params.submissionId);
  if (!submission) return;
  const interview = await Interview.findOne({ submission: submission._id });
  res.json(interview || { questions: [], answers: [] });
});

// append a proctoring flag event (student only, during their own interview)
router.post('/proctor-flags/:submissionId', auth, async (req, res) => {
  try {
    const submission = await loadOwnSubmission(req, res, req.params.submissionId);
    if (!submission) return;
    if (String(submission.student) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    const { type, timestamp, details } = req.body || {};
    if (!type) return res.status(400).json({ message: 'Flag type is required' });

    const ALLOWED_TYPES = ['TAB_SWITCH', 'FOCUS_LOSS', 'FULLSCREEN_EXIT', 'NO_FACE', 'MULTIPLE_FACES'];
    if (!ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({ message: `Invalid flag type: ${type}` });
    }

    const flagEntry = { type, timestamp: timestamp ? new Date(timestamp) : new Date(), details: details || '' };

    const interview = await Interview.findOneAndUpdate(
      { submission: submission._id },
      { $push: { proctorFlags: flagEntry } },
      { new: true }
    );

    if (!interview) return res.status(404).json({ message: 'Interview not found — start the interview first' });

    res.json({ ok: true, totalFlags: interview.proctorFlags.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
