import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/useTheme';
import { 
  GraduationCap, 
  BookOpen, 
  Award, 
  ShieldAlert, 
  LayoutDashboard, 
  LogOut, 
  UserCheck, 
  LogIn, 
  Sparkles,
  ChevronDown,
  Sun,
  Moon
} from 'lucide-react';

export default function Navbar({ onOpenAuth }) {
  const { user, logout, quickLogin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const isActive = (path) => location.pathname === path;

  const handleSwitchRole = async (role) => {
    setShowRoleMenu(false);
    await quickLogin(role);
  };

  return (
    <header className="sticky top-0 z-40 bg-vs-surface/90 dark:bg-vs-surface/90 backdrop-blur-md border-b border-vs-border text-vs-text">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                VidyaSetu
              </span>
              <span className="block text-[10px] tracking-wider text-indigo-500 dark:text-indigo-400 font-semibold uppercase">
                Learn • Do • Prove
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                isActive('/') 
                  ? 'bg-indigo-600/20 text-indigo-500 dark:text-indigo-400 border border-indigo-500/30' 
                  : 'text-vs-muted hover:text-vs-text hover:bg-vs-surface-2'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Explore Courses
            </Link>

            {user && (
              <>
                <Link
                  to="/portfolio"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    isActive('/portfolio')
                      ? 'bg-indigo-600/20 text-indigo-500 dark:text-indigo-400 border border-indigo-500/30'
                      : 'text-vs-muted hover:text-vs-text hover:bg-vs-surface-2'
                  }`}
                >
                  <Award className="w-4 h-4 text-emerald-500" />
                  Skill Portfolio
                </Link>

                {(user.role === 'TEACHER' || user.role === 'ADMIN') && (
                  <Link
                    to="/teacher"
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      isActive('/teacher')
                        ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                        : 'text-vs-muted hover:text-vs-text hover:bg-vs-surface-2'
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    Teacher Queue
                  </Link>
                )}

                {user.role === 'ADMIN' && (
                  <Link
                    to="/admin"
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      isActive('/admin')
                        ? 'bg-purple-500/20 text-purple-500 border border-purple-500/30'
                        : 'text-vs-muted hover:text-vs-text hover:bg-vs-surface-2'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 text-purple-500" />
                    Admin Panel
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* User Controls */}
          <div className="flex items-center gap-2">

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="theme-toggle p-2 rounded-lg bg-vs-surface-2 border border-vs-border text-vs-muted hover:text-vs-text"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle theme"
            >
              {theme === 'dark'
                ? <Sun className="w-4 h-4 text-amber-400" />
                : <Moon className="w-4 h-4 text-indigo-500" />
              }
            </button>

            {/* Demo Quick Switcher Button */}
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="px-3 py-1.5 rounded-lg bg-indigo-950/60 dark:bg-indigo-950/60 bg-indigo-50 border border-indigo-200 dark:border-indigo-800/60 text-xs font-semibold text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 flex items-center gap-1.5 shadow-sm transition-all"
                title="Quick switch roles for hackathon demo"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span className="hidden sm:inline">Demo Switcher:</span>
                <span className="uppercase text-amber-500 dark:text-amber-300 font-bold">{user ? user.role : 'STUDENT'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-vs-muted" />
              </button>

              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-vs-surface border border-vs-border rounded-xl shadow-2xl p-2 z-50">
                  <div className="px-3 py-1 text-[11px] font-semibold text-vs-muted uppercase tracking-wider">
                    Quick Switch Role
                  </div>
                  <button
                    onClick={() => handleSwitchRole('STUDENT')}
                    className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-indigo-600/10 text-vs-text hover:text-indigo-500 flex items-center justify-between"
                  >
                    <span>Student Mode</span>
                    {user?.role === 'STUDENT' && <UserCheck className="w-3.5 h-3.5 text-emerald-500" />}
                  </button>
                  <button
                    onClick={() => handleSwitchRole('TEACHER')}
                    className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-amber-600/10 text-vs-text hover:text-amber-500 flex items-center justify-between"
                  >
                    <span>Teacher Mode</span>
                    {user?.role === 'TEACHER' && <UserCheck className="w-3.5 h-3.5 text-emerald-500" />}
                  </button>
                  <button
                    onClick={() => handleSwitchRole('ADMIN')}
                    className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-purple-600/10 text-vs-text hover:text-purple-500 flex items-center justify-between"
                  >
                    <span>Admin Mode</span>
                    {user?.role === 'ADMIN' && <UserCheck className="w-3.5 h-3.5 text-emerald-500" />}
                  </button>
                </div>
              )}
            </div>

            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-semibold text-vs-text">{user.name}</span>
                  <span className="text-[10px] text-vs-muted font-mono">{user.email}</span>
                </div>
                <button
                  onClick={logout}
                  className="p-2 rounded-lg bg-vs-surface-2 hover:bg-rose-950/60 hover:text-rose-400 text-vs-muted transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium text-sm shadow-md shadow-indigo-500/25 transition-all flex items-center gap-2 btn-scale"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
            )}

          </div>

        </div>
      </div>
    </header>
  );
}
