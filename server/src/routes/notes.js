import { Router } from 'express';
import Note from '../models/Note.js';
import { auth } from '../middleware/auth.js';

const router = Router();

async function getOrCreate(student, course) {
  let note = await Note.findOne({ student, course });
  if (!note) note = await Note.create({ student, course, content: '' });
  return note;
}

router.get('/:courseId', auth, async (req, res) => {
  const note = await getOrCreate(req.user._id, req.params.courseId);
  res.json(note);
});

router.put('/:courseId', auth, async (req, res) => {
  const content = String((req.body || {}).content ?? '');
  if (content.length > 100_000) return res.status(400).json({ message: 'Note too large' });
  const note = await Note.findOneAndUpdate(
    { student: req.user._id, course: req.params.courseId },
    { content },
    { new: true, upsert: true }
  );
  res.json(note);
});

export default router;
