import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { X, Lock, Mail, User, Shield, Globe } from 'lucide-react';
import { errMsg } from '../lib/api';

export default function AuthModal({ isOpen, onClose }) {
  const { login, register, googleAuth } = useAuth();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [showGooglePrompt, setShowGooglePrompt] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const googleBtnRef = useRef(null);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STUDENT',
  });

  const redirectUserByRole = (userObj) => {
    if (!userObj) return;
    if (userObj.role === 'ADMIN') {
      navigate('/admin');
    } else if (userObj.role === 'TEACHER') {
      navigate('/teacher');
    }
  };

  useEffect(() => {
    if (isOpen) {
      setForm({
        name: '',
        email: '',
        password: '',
        role: 'STUDENT',
      });
      setError('');
      setShowGooglePrompt(false);
      setGoogleEmail('');
      setGoogleName('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (googleClientId && window.google) {
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            if (response?.credential) {
              setLoading(true);
              setError('');
              try {
                const loggedUser = await googleAuth({ credential: response.credential });
                onClose();
                redirectUserByRole(loggedUser);
              } catch (err) {
                setError(errMsg(err));
              } finally {
                setLoading(false);
              }
            }
          },
        });
        if (googleBtnRef.current) {
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            width: 320,
            text: isRegister ? 'signup_with' : 'signin_with',
          });
        }
      } catch (err) {
        console.warn('Google Identity Services setup warning:', err);
      }
    }
  }, [isOpen, isRegister, googleClientId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let loggedUser;
      if (isRegister) {
        loggedUser = await register(form);
      } else {
        loggedUser = await login(form.email, form.password);
      }
      onClose();
      redirectUserByRole(loggedUser);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = async () => {
    setError('');
    if (googleClientId && window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
      return;
    }
    setShowGooglePrompt(true);
  };

  const handleCustomGoogleSubmit = async (e) => {
    e.preventDefault();
    if (!googleEmail) {
      setError('Google email is required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const emailClean = googleEmail.trim().toLowerCase();
      const nameClean = googleName.trim() || emailClean.split('@')[0];
      const googleId = `google-user-${Date.now()}`;
      const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(emailClean)}`;
      const loggedUser = await googleAuth({ email: emailClean, name: nameClean, googleId, avatar });
      onClose();
      redirectUserByRole(loggedUser);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full pl-9 pr-3 py-2.5 bg-vs-surface-2 border border-vs-border rounded text-sm text-vs-text placeholder-vs-subtle focus:outline-none focus:border-vs-accent focus:ring-1 focus:ring-vs-accent/20 transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-vs-surface border border-vs-border rounded-lg shadow-xl overflow-hidden text-vs-text">

        {/* Header */}
        <div className="px-6 py-4 border-b border-vs-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-vs-text">
              {isRegister ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="text-xs text-vs-muted mt-0.5">
              {isRegister
                ? 'Join VidyaSetu and prove your skills'
                : 'Sign in to access your courses and portfolio'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-vs-muted hover:text-vs-text hover:bg-vs-surface-2 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {showGooglePrompt ? (
            <form onSubmit={handleCustomGoogleSubmit} className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-vs-border">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-vs-accent" />
                  <span className="text-sm font-semibold text-vs-text">Google Sign-In</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGooglePrompt(false)}
                  className="text-xs text-vs-accent hover:underline"
                >
                  ← Back
                </button>
              </div>

              <p className="text-xs text-vs-muted">
                Enter your Google account email to authenticate.
              </p>

              <div>
                <label className="block text-xs font-semibold text-vs-text mb-1">Google Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-vs-subtle" />
                  <input
                    type="email"
                    required
                    placeholder="you@gmail.com"
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-vs-text mb-1">Your Name (optional)</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-vs-subtle" />
                  <input
                    type="text"
                    placeholder="Your name (optional)"
                    value={googleName}
                    onChange={(e) => setGoogleName(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-vs-accent hover:bg-vs-accent-hover text-white font-semibold text-sm rounded transition-colors btn-scale"
              >
                {loading ? 'Signing in...' : 'Continue with Google'}
              </button>
            </form>
          ) : (
            <>
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded text-xs font-medium text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              {/* Email/Password Form FIRST */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {isRegister && (
                  <div>
                    <label className="block text-xs font-semibold text-vs-text mb-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 w-4 h-4 text-vs-subtle" />
                      <input
                        type="text"
                        required
                        placeholder="Your full name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-vs-text mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-vs-subtle" />
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-vs-text mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-vs-subtle" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>

                {isRegister && (
                  <div>
                    <label className="block text-xs font-semibold text-vs-text mb-1">I am a</label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-2.5 w-4 h-4 text-vs-subtle" />
                      <select
                        value={form.role}
                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                        className={inputClass + " appearance-none"}
                      >
                        <option value="STUDENT">Student</option>
                        <option value="TEACHER">Teacher</option>
                      </select>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-vs-accent hover:bg-vs-accent-hover text-white font-semibold text-sm rounded transition-colors btn-scale"
                >
                  {loading ? 'Processing...' : isRegister ? 'Create Account' : 'Sign In'}
                </button>
              </form>

              {/* Separator */}
              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-vs-border w-full" />
                <span className="bg-vs-surface px-3 text-xs text-vs-muted font-medium absolute">or</span>
              </div>

              {/* Google Sign In at Bottom */}
              {googleClientId ? (
                <div ref={googleBtnRef} className="flex justify-center w-full min-h-[44px]" />
              ) : (
                <button
                  type="button"
                  onClick={handleGoogleClick}
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-vs-surface border border-vs-border hover:border-vs-muted rounded text-sm font-medium text-vs-text transition-colors flex items-center justify-center gap-3 btn-scale"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  {isRegister ? 'Sign up with Google' : 'Sign in with Google'}
                </button>
              )}
            </>
          )}

          {/* Toggle link */}
          <div className="text-center pt-2 border-t border-vs-border">
            <button
              type="button"
              onClick={() => { setIsRegister(!isRegister); setError(''); }}
              className="text-xs text-vs-accent hover:text-vs-accent-hover font-medium hover:underline"
            >
              {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
