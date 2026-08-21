import { Router } from 'express';
import User, { ROLES } from '../models/User.js';
import { signToken, auth } from '../middleware/auth.js';

const router = Router();

// Demo platform: role can be chosen at registration. Lock this down for production.
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ message: 'name, email and password are required' });
    if (String(password).length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    const safeRole = ROLES.includes(role) ? role : 'STUDENT';

    const exists = await User.findOne({ email: String(email).toLowerCase() });
    if (exists) return res.status(409).json({ message: 'An account with this email already exists' });

    const user = await User.create({ name, email, password, role: safeRole });
    return res.status(201).json({ token: signToken(user), user: { id: user._id, name, email, role: safeRole } });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'email and password are required' });
    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    return res.json({ token: signToken(user), user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.get('/me', auth, (req, res) => {
  const { _id, name, email, role } = req.user;
  res.json({ user: { id: _id, name, email, role } });
});

export default router;
