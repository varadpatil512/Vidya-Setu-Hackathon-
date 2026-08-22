import { Router } from 'express';
import Notification from '../models/Notification.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/notifications - fetch logged-in student's notifications
router.get('/', auth, requireRole('STUDENT'), async (req, res) => {
  try {
    const notifications = await Notification.find({ student: req.user._id })
      .populate('course', 'title skill thumbnail')
      .sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/notifications/unread-count - fetch unread count badge
router.get('/unread-count', auth, requireRole('STUDENT'), async (req, res) => {
  try {
    const count = await Notification.countDocuments({ student: req.user._id, read: false });
    res.json({ unreadCount: count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/notifications/read-all - mark ALL notifications as read
// IMPORTANT: must be registered BEFORE /:id/read to avoid 'read-all' being matched as :id
router.patch('/read-all', auth, requireRole('STUDENT'), async (req, res) => {
  try {
    await Notification.updateMany({ student: req.user._id, read: false }, { read: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/notifications/:id/read - mark single notification as read
router.patch('/:id/read', auth, requireRole('STUDENT'), async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, student: req.user._id },
      { read: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json(notification);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
