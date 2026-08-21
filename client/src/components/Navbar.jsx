import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
  ChevronDown
} from 'lucide-react';

export default function Navbar({ onOpenAuth }) {
  const { user, logout, quickLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const isActive = (path) => location.pathname === path;

  const handleSwitchRole = async (role) => {
    setShowRoleMenu(false);
    await quickLogin(role);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
                VidyaSetu
              </span>
              <span className="block text-[10px] tracking-wider text-indigo-400 font-semibold uppercase">
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
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
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
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Award className="w-4 h-4 text-emerald-400" />
                  Skill Portfolio
                </Link>

                {(user.role === 'TEACHER' || user.role === 'ADMIN') && (
                  <Link
                    to="/teacher"
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      isActive('/teacher')
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    Teacher Queue
                  </Link>
                )}

                {user.role === 'ADMIN' && (
                  <Link
                    to="/admin"
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      isActive('/admin')
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 text-purple-400" />
                    Admin Panel
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* User Controls & Demo Switcher */}
          <div className="flex items-center gap-3">
            
            {/* Demo Quick Switcher Button */}
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="px-3 py-1.5 rounded-lg bg-indigo-950/60 border border-indigo-800/60 text-xs font-semibold text-indigo-300 hover:bg-indigo-900/60 flex items-center gap-1.5 shadow-sm transition-all"
                title="Quick switch roles for hackathon demo"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span className="hidden sm:inline">Demo Switcher:</span>
                <span className="uppercase text-amber-300 font-bold">{user ? user.role : 'STUDENT'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50">
                  <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Quick Switch Role
                  </div>
                  <button
                    onClick={() => handleSwitchRole('STUDENT')}
                    className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-indigo-600/20 text-slate-200 hover:text-indigo-300 flex items-center justify-between"
                  >
                    <span>Student Mode</span>
                    {user?.role === 'STUDENT' && <UserCheck className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                  <button
                    onClick={() => handleSwitchRole('TEACHER')}
                    className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-amber-600/20 text-slate-200 hover:text-amber-300 flex items-center justify-between"
                  >
                    <span>Teacher Mode</span>
                    {user?.role === 'TEACHER' && <UserCheck className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                  <button
                    onClick={() => handleSwitchRole('ADMIN')}
                    className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-purple-600/20 text-slate-200 hover:text-purple-300 flex items-center justify-between"
                  >
                    <span>Admin Mode</span>
                    {user?.role === 'ADMIN' && <UserCheck className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                </div>
              )}
            </div>

            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-semibold text-slate-200">{user.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{user.email}</span>
                </div>
                <button
                  onClick={logout}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium text-sm shadow-md shadow-indigo-500/25 transition-all flex items-center gap-2"
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
