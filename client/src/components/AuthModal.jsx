import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Sparkles, LogIn, UserPlus, Lock, Mail, User, Shield } from 'lucide-react';
import { errMsg } from '../lib/api';

export default function AuthModal({ isOpen, onClose }) {
  const { login, register, quickLogin } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STUDENT',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await register(form);
      } else {
        await login(form.email, form.password);
      }
      onClose();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role) => {
    setError('');
    setLoading(true);
    try {
      await quickLogin(role);
      onClose();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-white">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-900/40 via-purple-900/40 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              {isRegister ? <UserPlus className="w-5 h-5 text-indigo-400" /> : <LogIn className="w-5 h-5 text-indigo-400" />}
              {isRegister ? 'Create VidyaSetu Account' : 'Welcome Back'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isRegister ? 'Join the Learn → Do → Prove learning ecosystem' : 'Sign in to access your courses & portfolio'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Quick Demo Accounts Banner */}
          <div className="bg-slate-950/70 border border-indigo-500/20 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 mb-2">
              <Sparkles className="w-4 h-4" />
              1-Click Demo Accounts (Instant Test Login)
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('STUDENT')}
                disabled={loading}
                className="py-2 px-2 bg-indigo-950/80 border border-indigo-800/80 rounded-lg text-xs font-semibold text-indigo-300 hover:bg-indigo-900/80 transition-all text-center"
              >
                🎓 Student
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('TEACHER')}
                disabled={loading}
                className="py-2 px-2 bg-amber-950/80 border border-amber-800/80 rounded-lg text-xs font-semibold text-amber-300 hover:bg-amber-900/80 transition-all text-center"
              >
                👨‍🏫 Teacher
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('ADMIN')}
                disabled={loading}
                className="py-2 px-2 bg-purple-950/80 border border-purple-800/80 rounded-lg text-xs font-semibold text-purple-300 hover:bg-purple-900/80 transition-all text-center"
              >
                ⚡ Admin
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-medium text-rose-400">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Varad Patil"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="student@vidyasetu.dev"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Select Role</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="STUDENT">Student</option>
                    <option value="TEACHER">Teacher</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Processing...' : isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          {/* Toggle Register/Login */}
          <div className="text-center pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register Now"}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
