import { Router } from 'express';
import Submission from '../models/Submission.js';
import Interview from '../models/Interview.js';
import Enrollment from '../models/Enrollment.js';
import { auth } from '../middleware/auth.js';
import { generateQuestions, scoreInterview } from '../services/ai.js';

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
    if (existing && existing.answers.length) {
      return res.status(409).json({ message: 'Interview already completed for this submission' });
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

    const result = await scoreInterview({ course: submission.course, submission, answers });

    interview.answers = answers;
    interview.consistencyScore = result.consistency;
    interview.aiVerdict = result.verdict;
    interview.aiReasoning = result.reasoning;
    await interview.save();

    submission.aiScore = result.qualityScore;
    submission.aiConfidence = result.confidence;
    submission.aiFeedback = result.feedback;
    submission.flagReason = result.verdict === 'FLAG' ? result.reasoning : '';
    submission.status = 'INTERVIEW_DONE';

    if (result.verdict === 'VERIFY') {
      submission.status = 'VERIFIED';
      submission.verifiedAt = new Date();
      await Enrollment.updateOne({ student: submission.student, course: submission.course }, { status: 'VERIFIED' });
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

export default router;
