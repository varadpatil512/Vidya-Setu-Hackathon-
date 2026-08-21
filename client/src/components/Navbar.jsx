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
  LogIn,
  Sun,
  Moon,
  ChevronDown,
  User,
} from 'lucide-react';

export default function Navbar({ onOpenAuth }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-vs-surface border-b border-vs-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-vs-accent flex items-center justify-center group-hover:bg-vs-accent-hover transition-colors">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-vs-accent tracking-tight">
                VidyaSetu
              </span>
              <span className="block text-[10px] tracking-widest text-vs-muted font-medium uppercase leading-tight">
                Learn · Do · Prove
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/courses"
              className={`px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 ${
                isActive('/courses')
                  ? 'text-vs-accent bg-vs-accent-light'
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
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 ${
                    isActive('/portfolio')
                      ? 'text-vs-accent bg-vs-accent-light'
                      : 'text-vs-muted hover:text-vs-text hover:bg-vs-surface-2'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  My Portfolio
                </Link>

                {(user.role === 'TEACHER' || user.role === 'ADMIN') && (
                  <Link
                    to="/teacher"
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 ${
                      isActive('/teacher')
                        ? 'text-vs-accent bg-vs-accent-light'
                        : 'text-vs-muted hover:text-vs-text hover:bg-vs-surface-2'
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4" />
                    Review Queue
                  </Link>
                )}

                {user.role === 'ADMIN' && (
                  <Link
                    to="/admin"
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 ${
                      isActive('/admin')
                        ? 'text-vs-accent bg-vs-accent-light'
                        : 'text-vs-muted hover:text-vs-text hover:bg-vs-surface-2'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Admin
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-2">

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="theme-toggle p-2 rounded text-vs-muted hover:text-vs-text hover:bg-vs-surface-2 transition-colors"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle theme"
            >
              {theme === 'dark'
                ? <Sun className="w-4 h-4 text-amber-500" />
                : <Moon className="w-4 h-4" />
              }
            </button>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded border border-vs-border hover:border-vs-accent/40 hover:bg-vs-surface-2 transition-all"
                >
                  <div className="w-7 h-7 rounded-full bg-vs-accent flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">
                      {user.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-semibold text-vs-text leading-tight">{user.name}</span>
                    <span className="text-[10px] text-vs-muted leading-tight">{user.role}</span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-vs-muted" />
                </button>

                {showUserMenu && (
                  <div
                    className="absolute right-0 mt-1.5 w-56 bg-vs-surface border border-vs-border rounded shadow-lg py-1 z-50"
                    onMouseLeave={() => setShowUserMenu(false)}
                  >
                    <div className="px-3 py-2 border-b border-vs-border">
                      <p className="text-sm font-semibold text-vs-text truncate">{user.name}</p>
                      <p className="text-xs text-vs-muted truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => { logout(); setShowUserMenu(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-vs-muted hover:text-vs-text hover:bg-vs-surface-2 flex items-center gap-2 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-2 px-4 py-2 bg-vs-accent hover:bg-vs-accent-hover text-white font-semibold text-sm rounded transition-colors"
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
