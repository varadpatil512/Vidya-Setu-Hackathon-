import { useState, useEffect, useCallback } from 'react';
import { coursesAPI, adminAPI, errMsg } from '../lib/api';
import {
  LayoutDashboard, BookOpen, Clock, Users, GraduationCap,
  MessageSquare, Plus, Trash2, Edit3, X,
  CheckCircle2, Star, ExternalLink, Check,
  XCircle, ChevronRight, TrendingUp, Award, Activity,
  BarChart3, Globe, RefreshCw,
} from 'lucide-react';

const NAV_SECTIONS = [
  { id: 'dashboard',   label: 'Dashboard',           icon: LayoutDashboard },
  { id: 'pending',     label: 'Pending Approvals',    icon: Clock },
  { id: 'courses',     label: 'All Courses',          icon: BookOpen },
  { id: 'students',    label: 'Enrolled Students',    icon: Users },
  { id: 'teachers',    label: 'Teachers',             icon: GraduationCap },
  { id: 'feedback',    label: 'Feedback Overview',    icon: MessageSquare },
];

function StatCard({ label, value, sub, icon: Icon, color = 'text-vs-accent', onClick, badge }) {
  return (
    <div
      onClick={onClick}
      className={`bg-vs-surface border border-vs-border rounded-xl p-5 space-y-3 ${onClick ? 'cursor-pointer hover:border-vs-accent/60 hover:-translate-y-0.5 transition-all' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg bg-vs-surface-2 flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        {badge != null && badge > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 animate-pulse">
            {badge} pending
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-vs-text">{value ?? '—'}</p>
        <p className="text-xs text-vs-muted font-medium mt-0.5">{label}</p>
        {sub && <p className="text-[11px] text-vs-subtle mt-0.5">{sub}</p>}
      </div>
      {onClick && (
        <div className="flex items-center gap-1 text-[11px] text-vs-accent font-semibold">
          View <ChevronRight className="w-3 h-3" />
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const [activeSection, setActiveSection] = useState('dashboard');

  // Dashboard
  const [dashStats, setDashStats] = useState(null);
  const [loadingDash, setLoadingDash] = useState(true);

  // Courses
  const [courses, setCourses] = useState([]);
  const [pendingCourses, setPendingCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingPending, setLoadingPending] = useState(false);
  const [teachersList, setTeachersList] = useState([]);
  const [rejectingCourse, setRejectingCourse] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [courseForm, setCourseForm] = useState(null);
  const [actionMsg, setActionMsg] = useState('');

  // Students
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentCourseFilter, setStudentCourseFilter] = useState('');

  // Teachers
  const [teachers, setTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [expandedTeacher, setExpandedTeacher] = useState(null);


  // Feedback
  const [feedbackData, setFeedbackData] = useState(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  const showMsg = (msg) => { setActionMsg(msg); setTimeout(() => setActionMsg(''), 4000); };

  // ─────────────────── Fetch helpers ───────────────────
  const fetchDashboard = useCallback(async () => {
    try {
      setLoadingDash(true);
      const res = await adminAPI.getDashboard();
      setDashStats(res.data);
    } catch (err) { console.error(err); }
    finally { setLoadingDash(false); }
  }, []);

  const fetchCourses = useCallback(async () => {
    try {
      setLoadingCourses(true);
      const res = await coursesAPI.getAll();
      setCourses(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoadingCourses(false); }
  }, []);

  const fetchPending = useCallback(async () => {
    try {
      setLoadingPending(true);
      const res = await coursesAPI.getPending();
      setPendingCourses(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoadingPending(false); }
  }, []);

  const fetchTeachersForSelector = useCallback(async () => {
    try {
      const res = await coursesAPI.getTeachers();
      setTeachersList(res.data || []);
    } catch (err) { console.error(err); }
  }, []);

  const fetchStudents = useCallback(async () => {
    try {
      setLoadingStudents(true);
      const res = await adminAPI.getStudents();
      setStudents(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoadingStudents(false); }
  }, []);

  const fetchTeachers = useCallback(async () => {
    try {
      setLoadingTeachers(true);
      const res = await adminAPI.getTeachers();
      setTeachers(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoadingTeachers(false); }
  }, []);

  const fetchFeedback = useCallback(async () => {
    try {
      setLoadingFeedback(true);
      const res = await adminAPI.getFeedback();
      setFeedbackData(res.data);
    } catch (err) { console.error(err); }
    finally { setLoadingFeedback(false); }
  }, []);

  // Initial load
  useEffect(() => {
    fetchDashboard();
    fetchTeachersForSelector();
  }, []);

  // Lazy-load sections on first visit
  useEffect(() => {
    if (activeSection === 'courses' && courses.length === 0) fetchCourses();
    if (activeSection === 'pending') fetchPending();
    if (activeSection === 'students' && students.length === 0) fetchStudents();
    if (activeSection === 'teachers' && teachers.length === 0) fetchTeachers();
    if (activeSection === 'feedback' && !feedbackData) fetchFeedback();
  }, [activeSection]);

  // ─────────────────── Course CRUD helpers ───────────────────
  const handleApproveCourse = async (courseId) => {
    try {
      await coursesAPI.approve(courseId);
      showMsg('Course approved and is now live in Explore Courses!');
      await fetchPending();
      await fetchDashboard();
      if (courses.length > 0) fetchCourses();
    } catch (err) { alert(errMsg(err)); }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectingCourse) return;
    try {
      await coursesAPI.reject(rejectingCourse._id, rejectReason);
      showMsg(`"${rejectingCourse.title}" proposal rejected.`);
      setRejectingCourse(null);
      setRejectReason('');
      await fetchPending();
      await fetchDashboard();
    } catch (err) { alert(errMsg(err)); }
  };

  const handleDeleteCourse = async (id) => {
    if (!confirm('Delete this course permanently? All enrollments will be removed.')) return;
    try {
      await coursesAPI.delete(id);
      showMsg('Course deleted.');
      await fetchCourses();
      await fetchDashboard();
    } catch (err) { alert(errMsg(err)); }
  };

  const openCreateModal = () => {
    setEditingCourse(null);
    setCourseForm({
      title: '', description: '', skill: '', instructor: 'Faculty Member',
      price: 999, category: 'Web Development', assignedTeacher: teachersList[0]?._id || '',
      thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=60',
    });
    setFormError('');
    setShowCourseModal(true);
  };

  const openEditModal = (course) => {
    setEditingCourse(course);
    setCourseForm({
      title: course.title || '',
      description: course.description || '',
      skill: course.skill || '',
      instructor: course.instructor || '',
      price: course.price || 999,
      category: course.category || 'Web Development',
      assignedTeacher: course.assignedTeacher?._id || '',
      thumbnail: course.thumbnail || '',
    });
    setFormError('');
    setShowCourseModal(true);
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSubmitting(true);
    try {
      if (editingCourse) {
        await coursesAPI.update(editingCourse._id, courseForm);
        showMsg('Course updated successfully.');
      } else {
        // Admin-created courses go live immediately (status: approved)
        await coursesAPI.create({ ...courseForm, status: 'approved' });
        showMsg('Course created and published live.');
      }
      setShowCourseModal(false);
      await fetchCourses();
      await fetchDashboard();
    } catch (err) {
      setFormError(errMsg(err));
    } finally {
      setFormSubmitting(false);
    }
  };

  const inputClass = "w-full p-2.5 bg-vs-surface-2 border border-vs-border rounded text-xs text-vs-text focus:outline-none focus:border-vs-accent";

  return (
    <div className="min-h-screen bg-vs-bg flex">

      {/* ─── SIDEBAR ─── */}
      <aside className="hidden lg:flex flex-col w-56 bg-vs-surface border-r border-vs-border py-6 px-3 shrink-0 sticky top-0 h-screen overflow-y-auto">
        <div className="px-2 mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-vs-accent-light text-vs-accent text-[11px] font-bold">
            <LayoutDashboard className="w-3 h-3" />
            Platform Admin
          </div>
        </div>

        <nav className="space-y-1">
          {NAV_SECTIONS.map(({ id, label, icon: Icon }) => {
            const isBadge = id === 'pending' && dashStats?.pendingCourses > 0;
            return (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-left text-sm font-medium transition-all relative ${
                  activeSection === id
                    ? 'bg-vs-accent-light text-vs-accent'
                    : 'text-vs-muted hover:text-vs-text hover:bg-vs-surface-2'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{label}</span>
                {isBadge && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ─── MOBILE NAV ─── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-vs-surface border-t border-vs-border px-2 py-1 flex items-center justify-around">
        {NAV_SECTIONS.map(({ id, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={`flex flex-col items-center gap-1 p-2 rounded text-xs transition-colors ${
              activeSection === id ? 'text-vs-accent' : 'text-vs-muted'
            }`}
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex-1 pb-20 lg:pb-8 overflow-auto">

        {/* Top Header */}
        <div className="bg-vs-surface border-b border-vs-border px-6 py-5 flex items-center justify-between sticky top-0 z-30">
          <div>
            <h1 className="text-lg font-bold text-vs-text">
              {NAV_SECTIONS.find(n => n.id === activeSection)?.label}
            </h1>
            <p className="text-xs text-vs-muted">Vidya-Setu Platform Administration</p>
          </div>
          <div className="flex items-center gap-2">
            {activeSection === 'courses' && (
              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 px-3 py-2 bg-vs-accent hover:bg-vs-accent-hover text-white text-xs font-semibold rounded transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Course
              </button>
            )}
            <button
              onClick={() => {
                if (activeSection === 'dashboard') fetchDashboard();
                if (activeSection === 'courses') fetchCourses();
                if (activeSection === 'pending') fetchPending();
                if (activeSection === 'students') fetchStudents();
                if (activeSection === 'teachers') fetchTeachers();
                if (activeSection === 'feedback') fetchFeedback();
              }}
              className="p-2 rounded text-vs-muted hover:text-vs-accent hover:bg-vs-accent-light transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-6 space-y-6">

          {actionMsg && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {actionMsg}
            </div>
          )}

          {/* ══════════════════ DASHBOARD ══════════════════ */}
          {activeSection === 'dashboard' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-sm font-bold text-vs-muted uppercase tracking-wider mb-4">Platform Overview</h2>
                {loadingDash ? (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="bg-vs-surface border border-vs-border rounded-xl p-5 h-28 animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Total Students" value={dashStats?.totalStudents} icon={Users} color="text-sky-500"
                      onClick={() => setActiveSection('students')} />
                    <StatCard label="Total Teachers" value={dashStats?.totalTeachers} icon={GraduationCap} color="text-violet-500"
                      onClick={() => setActiveSection('teachers')} />
                    <StatCard label="Live Courses" value={dashStats?.totalLiveCourses} icon={BookOpen} color="text-emerald-500"
                      onClick={() => setActiveSection('courses')} />
                    <StatCard
                      label="Pending Approvals"
                      value={dashStats?.pendingCourses}
                      icon={Clock}
                      color="text-amber-500"
                      badge={dashStats?.pendingCourses}
                      onClick={() => setActiveSection('pending')}
                    />
                    <StatCard label="Total Enrollments" value={dashStats?.totalEnrollments} icon={Award} color="text-pink-500" />
                    <StatCard label="Feedback Submitted" value={dashStats?.totalFeedback} icon={MessageSquare} color="text-teal-500"
                      onClick={() => setActiveSection('feedback')} />
                    <StatCard label="Avg Interview Rating" value={dashStats?.avgRating ? `${dashStats.avgRating} / 5` : '—'} icon={Star} color="text-amber-400" />
                  </div>
                )}
              </div>

              {/* Quick Action Cards */}
              {dashStats?.pendingCourses > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-vs-muted uppercase tracking-wider mb-4">Quick Actions</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setActiveSection('pending')}>
                      <div>
                        <p className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">Action Required</p>
                        <p className="text-sm font-bold text-amber-800 dark:text-amber-200 mt-1">
                          {dashStats.pendingCourses} Course Proposal{dashStats.pendingCourses !== 1 ? 's' : ''} Awaiting Review
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-amber-500" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════ PENDING APPROVALS ══════════════════ */}
          {activeSection === 'pending' && (
            <div className="space-y-6">
              {loadingPending ? (
                <p className="text-sm text-vs-muted py-8 text-center">Loading pending proposals...</p>
              ) : pendingCourses.length === 0 ? (
                <div className="text-center py-16 bg-vs-surface border border-vs-border rounded-xl">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-vs-text">No Pending Proposals</h3>
                  <p className="text-sm text-vs-muted mt-1">All submitted course proposals have been reviewed.</p>
                </div>
              ) : (
                pendingCourses.map(pc => {
                  const videoUrl = pc.videos?.[0]?.url || '';
                  return (
                    <div key={pc._id} className={`p-6 bg-vs-surface border rounded-xl space-y-4 ${
                      pc.isUpdate
                        ? 'border-indigo-400/60 dark:border-indigo-600/60 shadow-xs'
                        : 'border-amber-300/40 dark:border-amber-700/40'
                    }`}>
                      <div className="flex flex-col sm:flex-row justify-between gap-3 border-b border-vs-border pb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {pc.isUpdate ? (
                              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700 flex items-center gap-1">
                                <RefreshCw className="w-3 h-3 text-indigo-500 animate-spin-slow" />
                                EXISTING COURSE UPDATE REVISION
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                                NEW COURSE PROPOSAL
                              </span>
                            )}
                            <span className="text-xs text-vs-accent font-semibold">{pc.category}</span>
                          </div>
                          <h3 className="text-lg font-bold text-vs-text">{pc.title}</h3>
                          <p className="text-xs text-vs-muted">Skill: <strong className="text-vs-text">{pc.skill}</strong> · Price: ₹{pc.price}</p>
                        </div>
                        <div className="text-sm sm:text-right">
                          <span className="text-xs text-vs-muted block">Submitted by</span>
                          <strong className="text-vs-text">{pc.createdBy?.name || pc.instructor || 'Teacher'}</strong>
                          <span className="text-[11px] text-vs-muted font-mono block">{pc.createdBy?.email}</span>
                          <span className="text-[11px] text-vs-subtle">{new Date(pc.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <p className="text-xs text-vs-muted leading-relaxed">{pc.description}</p>
                      {videoUrl && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-semibold text-vs-text">Lecture Video:</span>
                          <a href={videoUrl} target="_blank" rel="noreferrer"
                            className="text-vs-accent hover:underline flex items-center gap-1 font-mono">
                            {videoUrl.substring(0, 60)}{videoUrl.length > 60 ? '...' : ''} <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                      {pc.assignment && (
                        <div className="p-3 bg-vs-surface-2 border border-vs-border rounded text-xs space-y-1">
                          <span className="font-bold text-vs-text">Assignment: {pc.assignment.title}</span>
                          <p className="text-vs-muted italic">"{pc.assignment.prompt}"</p>
                        </div>
                      )}
                      <div className="flex items-center justify-end gap-3 pt-2">
                        <button onClick={() => setRejectingCourse(pc)}
                          className="px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 text-xs font-bold rounded flex items-center gap-1.5">
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                        <button onClick={() => handleApproveCourse(pc._id)}
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded flex items-center gap-1.5 btn-scale">
                          <Check className="w-4 h-4" /> Approve & Publish
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ══════════════════ ALL COURSES ══════════════════ */}
          {activeSection === 'courses' && (
            <div className="space-y-4">
              {loadingCourses ? (
                <p className="text-sm text-vs-muted py-8 text-center">Loading courses...</p>
              ) : courses.length === 0 ? (
                <p className="text-sm text-vs-muted py-8 text-center">No live courses found.</p>
              ) : (
                <div className="overflow-x-auto bg-vs-surface border border-vs-border rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-vs-border text-vs-muted uppercase font-bold text-[10px]">
                        <th className="py-3 px-4">Title</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Instructor</th>
                        <th className="py-3 px-4">Price</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-vs-border/60">
                      {courses.map(course => (
                        <tr key={course._id} className="hover:bg-vs-surface-2/60 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-semibold text-vs-text block">{course.title}</span>
                            <span className="text-[11px] text-vs-accent">{course.skill}</span>
                          </td>
                          <td className="py-3 px-4 text-vs-muted">{course.category}</td>
                          <td className="py-3 px-4 text-vs-muted">{course.instructor}</td>
                          <td className="py-3 px-4 font-semibold text-vs-text">₹{course.price}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              course.status === 'approved'
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200 dark:border-amber-800'
                            }`}>
                              {course.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => openEditModal(course)} className="p-1.5 rounded text-vs-muted hover:text-vs-accent hover:bg-vs-accent-light transition-colors" title="Edit">
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDeleteCourse(course._id)} className="p-1.5 rounded text-vs-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors" title="Delete">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════ ENROLLED STUDENTS ══════════════════ */}
          {activeSection === 'students' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-vs-muted">
                  Total students on platform: <strong className="text-vs-text">{students.length}</strong>
                </p>
              </div>
              {loadingStudents ? (
                <p className="text-sm text-vs-muted py-8 text-center">Loading students...</p>
              ) : students.length === 0 ? (
                <p className="text-sm text-vs-muted py-8 text-center">No students registered yet.</p>
              ) : (
                <div className="overflow-x-auto bg-vs-surface border border-vs-border rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-vs-border text-vs-muted uppercase font-bold text-[10px]">
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Courses Enrolled</th>
                        <th className="py-3 px-4 text-right">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-vs-border/60">
                      {students.map(s => (
                        <tr key={s._id} className="hover:bg-vs-surface-2/60 transition-colors">
                          <td className="py-3 px-4 font-semibold text-vs-text">{s.name}</td>
                          <td className="py-3 px-4 text-vs-muted font-mono text-[11px]">{s.email}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                              s.enrollmentCount > 0
                                ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 border border-sky-200 dark:border-sky-800'
                                : 'bg-vs-surface-2 text-vs-muted border border-vs-border'
                            }`}>
                              {s.enrollmentCount} course{s.enrollmentCount !== 1 ? 's' : ''}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-vs-muted font-mono text-[11px]">
                            {new Date(s.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════ TEACHERS ══════════════════ */}
          {activeSection === 'teachers' && (
            <div className="space-y-4">
              <p className="text-sm text-vs-muted">
                Total teachers: <strong className="text-vs-text">{teachers.length}</strong>
              </p>
              {loadingTeachers ? (
                <p className="text-sm text-vs-muted py-8 text-center">Loading teachers...</p>
              ) : teachers.length === 0 ? (
                <p className="text-sm text-vs-muted py-8 text-center">No teachers registered yet.</p>
              ) : (
                <div className="space-y-3">
                  {teachers.map(t => (
                    <div key={t._id} className="bg-vs-surface border border-vs-border rounded-xl overflow-hidden">
                      <div
                        className="p-5 flex items-center justify-between cursor-pointer hover:bg-vs-surface-2/60 transition-colors"
                        onClick={() => setExpandedTeacher(expandedTeacher === t._id ? null : t._id)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-vs-accent-light flex items-center justify-center text-vs-accent font-bold text-sm">
                            {t.name[0]}
                          </div>
                          <div>
                            <span className="font-semibold text-vs-text block text-sm">{t.name}</span>
                            <span className="text-[11px] text-vs-muted font-mono">{t.email}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-xs">
                          <div className="text-center hidden sm:block">
                            <span className="font-bold text-vs-text block">{t.totalSubmitted}</span>
                            <span className="text-vs-muted">Submitted</span>
                          </div>
                          <div className="text-center hidden sm:block">
                            <span className="font-bold text-emerald-600 block">{t.approved}</span>
                            <span className="text-vs-muted">Approved</span>
                          </div>
                          <div className="text-center hidden sm:block">
                            <span className="font-bold text-amber-600 block">{t.pending}</span>
                            <span className="text-vs-muted">Pending</span>
                          </div>
                          {t.approvalRate != null && (
                            <div className="text-center">
                              <span className="font-bold text-vs-accent block">{t.approvalRate}%</span>
                              <span className="text-vs-muted">Approval</span>
                            </div>
                          )}
                          <ChevronRight className={`w-4 h-4 text-vs-muted transition-transform ${expandedTeacher === t._id ? 'rotate-90' : ''}`} />
                        </div>
                      </div>
                      {expandedTeacher === t._id && t.courses.length > 0 && (
                        <div className="border-t border-vs-border bg-vs-surface-2/40 p-4 space-y-2">
                          <p className="text-[10px] font-bold text-vs-muted uppercase tracking-wider mb-3">Submitted Courses</p>
                          {t.courses.map(c => (
                            <div key={c._id} className="flex items-center justify-between px-3 py-2 bg-vs-surface border border-vs-border rounded text-xs">
                              <span className="text-vs-text truncate">{c.title}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ml-3 shrink-0 ${
                                c.status === 'approved' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-800'
                                  : c.status === 'pending' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200 dark:border-amber-800'
                                  : 'bg-red-50 dark:bg-red-950/40 text-red-600 border border-red-200 dark:border-red-800'
                              }`}>
                                {c.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}



          {/* ══════════════════ FEEDBACK OVERVIEW ══════════════════ */}
          {activeSection === 'feedback' && (
            <div className="space-y-6">
              {loadingFeedback ? (
                <p className="text-sm text-vs-muted py-8 text-center">Loading feedback data...</p>
              ) : !feedbackData ? (
                <p className="text-sm text-vs-muted py-8 text-center">No feedback data available.</p>
              ) : (
                <>
                  {/* Aggregate Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <StatCard label="Total Feedback" value={feedbackData.totalFeedback} icon={MessageSquare} color="text-teal-500" />
                    <StatCard label="Avg Rating" value={feedbackData.avgRating ? `${feedbackData.avgRating} / 5` : '—'} icon={Star} color="text-amber-400" />
                    {feedbackData.tagBreakdown?.slice(0, 2).map(tag => (
                      <StatCard key={tag._id} label={tag._id || 'General'} value={tag.count} icon={BarChart3} color="text-violet-500" />
                    ))}
                  </div>

                  {/* Tag Breakdown */}
                  {feedbackData.tagBreakdown?.length > 0 && (
                    <div className="bg-vs-surface border border-vs-border rounded-xl p-5">
                      <h3 className="text-sm font-bold text-vs-text mb-4">Sentiment Tag Breakdown</h3>
                      <div className="flex flex-wrap gap-2">
                        {feedbackData.tagBreakdown.map(tag => (
                          <div key={tag._id} className="flex items-center gap-2 px-3 py-1.5 bg-vs-surface-2 border border-vs-border rounded-full text-xs">
                            <span className="font-semibold text-vs-text">{tag._id || 'General'}</span>
                            <span className="px-1.5 py-0.5 rounded-full bg-vs-accent-light text-vs-accent text-[10px] font-bold">{tag.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Feedback Table */}
                  {feedbackData.feedback?.length > 0 && (
                    <div className="bg-vs-surface border border-vs-border rounded-xl overflow-hidden">
                      <div className="px-5 py-4 border-b border-vs-border">
                        <h3 className="text-sm font-bold text-vs-text">All Student Feedback ({feedbackData.feedback.length})</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-vs-border text-vs-muted uppercase font-bold text-[10px]">
                              <th className="py-3 px-4">Student</th>
                              <th className="py-3 px-4">Course</th>
                              <th className="py-3 px-4">Rating</th>
                              <th className="py-3 px-4">Tag</th>
                              <th className="py-3 px-4">Comment</th>
                              <th className="py-3 px-4 text-right">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-vs-border/60">
                            {feedbackData.feedback.map(fb => (
                              <tr key={fb._id} className="hover:bg-vs-surface-2/60 transition-colors">
                                <td className="py-3 px-4">
                                  <span className="font-semibold text-vs-text block">{fb.student?.name}</span>
                                  <span className="text-[10px] text-vs-muted font-mono">{fb.student?.email}</span>
                                </td>
                                <td className="py-3 px-4 text-vs-muted truncate max-w-[140px]">{fb.submission?.course?.title}</td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-1 text-amber-500">
                                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                                    <span className="font-bold">{fb.rating}/5</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-vs-accent-light text-vs-accent border border-vs-accent/20">
                                    {fb.tag || 'General'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-vs-muted max-w-[200px] truncate">
                                  {fb.comment || <span className="italic text-vs-subtle">No comment</span>}
                                </td>
                                <td className="py-3 px-4 text-right text-[10px] text-vs-muted font-mono">
                                  {new Date(fb.createdAt).toLocaleDateString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

        </div>
      </main>

      {/* ─── REJECT COURSE MODAL ─── */}
      {rejectingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-vs-surface border border-vs-border rounded-xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-vs-border flex items-center justify-between">
              <h3 className="text-sm font-bold text-vs-text">Reject Course Proposal</h3>
              <button onClick={() => setRejectingCourse(null)} className="p-1 rounded text-vs-muted hover:text-vs-text">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRejectSubmit} className="p-6 space-y-4 text-xs">
              <p className="text-vs-muted">
                Rejecting <strong className="text-vs-text">"{rejectingCourse.title}"</strong>. Provide feedback for the teacher.
              </p>
              <div>
                <label className="block font-semibold mb-1">Rejection Reason</label>
                <textarea rows={3} required value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                  placeholder="e.g. Please improve the rubric and provide a clearer assignment prompt."
                  className={inputClass} />
              </div>
              <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={() => setRejectingCourse(null)} className="px-4 py-2 text-vs-muted hover:text-vs-text font-semibold">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-xs transition-colors">
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── CREATE / EDIT COURSE MODAL ─── */}
      {showCourseModal && courseForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-vs-surface border border-vs-border rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-vs-border flex items-center justify-between">
              <h3 className="text-sm font-bold text-vs-text">
                {editingCourse ? 'Edit Course' : 'Create Admin Course'}
              </h3>
              <button onClick={() => setShowCourseModal(false)} className="p-1 rounded text-vs-muted hover:text-vs-text">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveCourse} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Course Title</label>
                <input type="text" required value={courseForm.title}
                  onChange={e => setCourseForm({ ...courseForm, title: e.target.value })}
                  className={inputClass} placeholder="e.g. Advanced React Architecture" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Skill Tag</label>
                  <input type="text" required value={courseForm.skill}
                    onChange={e => setCourseForm({ ...courseForm, skill: e.target.value })}
                    className={inputClass} placeholder="e.g. React Hooks" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Price (₹)</label>
                  <input type="number" required value={courseForm.price}
                    onChange={e => setCourseForm({ ...courseForm, price: Number(e.target.value) })}
                    className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Category</label>
                  <select value={courseForm.category}
                    onChange={e => setCourseForm({ ...courseForm, category: e.target.value })}
                    className={inputClass}>
                    <option>Web Development</option>
                    <option>Programming</option>
                    <option>Data & Databases</option>
                    <option>Development</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Instructor Label</label>
                  <input type="text" required value={courseForm.instructor}
                    onChange={e => setCourseForm({ ...courseForm, instructor: e.target.value })}
                    className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Assigned Teacher</label>
                <select value={courseForm.assignedTeacher}
                  onChange={e => setCourseForm({ ...courseForm, assignedTeacher: e.target.value })}
                  className={inputClass}>
                  <option value="">Unassigned</option>
                  {teachersList.map(t => (
                    <option key={t._id} value={t._id}>{t.name} ({t.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Description</label>
                <textarea rows={3} required value={courseForm.description}
                  onChange={e => setCourseForm({ ...courseForm, description: e.target.value })}
                  className={inputClass} />
              </div>
              {formError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded text-red-600 dark:text-red-400">
                  {formError}
                </div>
              )}
              <button type="submit" disabled={formSubmitting}
                className="w-full py-2.5 bg-vs-accent hover:bg-vs-accent-hover text-white font-semibold rounded transition-colors btn-scale">
                {formSubmitting ? 'Saving...' : editingCourse ? 'Update Course' : 'Create & Publish Course'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
