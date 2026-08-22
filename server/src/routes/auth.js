import { Router } from 'express';
import User, { ROLES } from '../models/User.js';
import { signToken, auth } from '../middleware/auth.js';

const router = Router();

/**
 * Helper to get list of authorized admin emails from process.env.ADMIN_EMAILS
 */
export function getAdminEmails() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Determines the role for a given email + requested role:
 * - If email is in ADMIN_EMAILS environment variable -> always ADMIN
 * - Otherwise -> requested role must be STUDENT or TEACHER only
 */
function resolveRole(email, requestedRole) {
  const normalEmail = String(email || '').toLowerCase().trim();
  const adminEmails = getAdminEmails();
  if (adminEmails.includes(normalEmail)) return 'ADMIN';
  // Block any self-attempt to claim ADMIN through the API
  if (requestedRole === 'ADMIN') return 'STUDENT';
  return ROLES.includes(requestedRole) ? requestedRole : 'STUDENT';
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' });
    if (String(password).length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const finalRole = resolveRole(email, role);
    const normalEmail = String(email).toLowerCase().trim();

    const exists = await User.findOne({ email: normalEmail });
    if (exists) return res.status(409).json({ message: 'An account with this email already exists' });

    const user = await User.create({ name, email: normalEmail, password, role: finalRole, authProvider: 'local' });
    console.log(`[auth] Registered: ${user.email} (${user.role})`);
    return res.status(201).json({ token: signToken(user), user: { id: user._id, name: user.name, email: user.email, role: finalRole } });
  } catch (err) {
    console.error('[auth] Register error:', err);
    return res.status(500).json({ message: err.message || 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    return res.json({ token: signToken(user), user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error('[auth] Login error:', err);
    return res.status(500).json({ message: err.message || 'Login failed' });
  }
});

// Google OAuth2 Signup / Login
router.post('/google', async (req, res) => {
  try {
    const { credential, email: mockEmail, name: mockName, googleId: mockGoogleId, avatar: mockAvatar } = req.body || {};
    let googleUser = null;

    if (credential) {
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
      if (!response.ok) {
        return res.status(400).json({ message: 'Invalid or expired Google OAuth credential token' });
      }
      const payload = await response.json();
      if (!payload.email) {
        return res.status(400).json({ message: 'Google account missing email address' });
      }
      googleUser = {
        googleId: payload.sub,
        email: payload.email.toLowerCase(),
        name: payload.name || payload.email.split('@')[0],
        avatar: payload.picture,
      };
    } else if (mockEmail && mockGoogleId) {
      googleUser = {
        googleId: String(mockGoogleId),
        email: String(mockEmail).toLowerCase(),
        name: mockName || mockEmail.split('@')[0],
        avatar: mockAvatar,
      };
    } else {
      return res.status(400).json({ message: 'Google OAuth token or user credentials required' });
    }

    let user = await User.findOne({
      $or: [{ googleId: googleUser.googleId }, { email: googleUser.email }],
    });

    if (user) {
      let updated = false;
      if (!user.googleId) {
        user.googleId = googleUser.googleId;
        updated = true;
      }
      if (googleUser.avatar && !user.avatar) {
        user.avatar = googleUser.avatar;
        updated = true;
      }
      // Auto-promote to ADMIN if email matches env-configured admin list
      if (getAdminEmails().includes(String(user.email).toLowerCase()) && user.role !== 'ADMIN') {
        user.role = 'ADMIN';
        updated = true;
        console.log(`[auth] Auto-promoted ${user.email} to ADMIN on Google login`);
      }
      if (updated) await user.save();
    } else {
      const googleRole = resolveRole(googleUser.email, 'STUDENT');
      user = await User.create({
        name: googleUser.name,
        email: googleUser.email,
        googleId: googleUser.googleId,
        avatar: googleUser.avatar,
        authProvider: 'google',
        role: googleRole,
      });
      console.log(`[auth] Registered Google OAuth user: ${user.email} (${user.role})`);
    }

    const token = signToken(user);
    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        authProvider: user.authProvider,
      },
    });
  } catch (err) {
    console.error('[auth] Google OAuth error:', err);
    return res.status(500).json({ message: err.message || 'Google OAuth failed' });
  }
});

router.get('/me', auth, (req, res) => {
  const { _id, name, email, role, avatar, authProvider } = req.user;
  res.json({ user: { id: _id, name, email, role, avatar, authProvider } });
});

export default router;
