import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/useTheme';
import { notificationsAPI } from '../lib/api';
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
  Bell,
  CheckCheck,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export default function Navbar({ onOpenAuth }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  useEffect(() => {
    if (user && user.role === 'STUDENT') {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 12000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await notificationsAPI.getAll();
      const list = res.data || [];
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.read).length);
    } catch (err) {
      console.warn('[Navbar] Notification fetch error:', err);
    }
  };

  const handleNotificationClick = async (notif) => {
    try {
      if (!notif.read) {
        await notificationsAPI.markAsRead(notif._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      setShowNotifMenu(false);
      if (notif.type === 'approval') {
        navigate('/portfolio');
      } else if (notif.course?._id || notif.course) {
        navigate(`/course/${notif.course?._id || notif.course}`);
      }
    } catch (err) {
      console.error('[Navbar] Mark notification read error:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

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
                {user.role === 'STUDENT' && (
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
                )}

                {(user.role === 'TEACHER' || user.role === 'ADMIN') && (
                  <Link
                    to="/teacher"
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 ${
                      isActive('/teacher')
                        ? 'text-vs-accent bg-vs-accent-light'
                        : 'text-vs-muted hover:text-vs-text hover:bg-vs-surface-2'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    My Courses
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

            {/* Notifications Bell Dropdown (Student Only) */}
            {user && user.role === 'STUDENT' && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotifMenu(!showNotifMenu);
                    setShowUserMenu(false);
                  }}
                  className="p-2 rounded text-vs-muted hover:text-vs-text hover:bg-vs-surface-2 transition-colors relative"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5 text-vs-text" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifMenu && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-vs-surface border border-vs-border rounded-2xl shadow-2xl z-50 overflow-hidden animate-scale-up">
                    <div className="p-3.5 border-b border-vs-border flex items-center justify-between bg-vs-surface-2">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-vs-accent" />
                        <h4 className="text-xs font-bold text-vs-text">Notifications</h4>
                        {unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-vs-accent-light text-vs-accent text-[10px] font-bold">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[11px] font-semibold text-vs-accent hover:underline flex items-center gap-1"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-vs-border">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-vs-muted space-y-1">
                          <p className="font-semibold text-vs-text">No notifications yet</p>
                          <p className="text-[11px]">Submission status updates and course completion notifications will appear here.</p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <button
                            key={n._id}
                            onClick={() => handleNotificationClick(n)}
                            className={`w-full p-3.5 text-left transition-colors flex items-start gap-3 hover:bg-vs-surface-2/80 ${
                              !n.read ? 'bg-vs-accent-light/30 font-medium' : 'opacity-85'
                            }`}
                          >
                            <div className="mt-0.5 flex-shrink-0">
                              {n.type === 'approval' ? (
                                <div className="w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                                  <CheckCircle2 className="w-4 h-4" />
                                </div>
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                                  <AlertCircle className="w-4 h-4" />
                                </div>
                              )}
                            </div>

                            <div className="space-y-1 min-w-0 flex-1">
                              <p className={`text-xs leading-snug ${!n.read ? 'text-vs-text font-bold' : 'text-vs-muted'}`}>
                                {n.message}
                              </p>
                              <span className="text-[10px] text-vs-subtle block">
                                {new Date(n.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                              </span>
                            </div>

                            {!n.read && (
                              <span className="h-2 w-2 rounded-full bg-vs-accent flex-shrink-0 mt-1.5" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

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
