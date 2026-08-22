import { useState, useEffect } from 'react';
import { coursesAPI, feedbackAPI, errMsg } from '../lib/api';
import {
  LayoutDashboard,
  Plus,
  Trash2,
  Edit3,
  Users,
  BookOpen,
  CheckCircle2,
  X,
  Zap,
  ShieldCheck,
  MessageSquare,
  Star,
  Clock,
  AlertTriangle,
  ExternalLink,
  Check,
  XCircle,
} from 'lucide-react';

export default function AdminPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Tab & Teacher state
  const [activeTab, setActiveTab] = useState('courses'); // 'courses' | 'pending' | 'feedback'
  const [feedbackList, setFeedbackList] = useState([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [teachersList, setTeachersList] = useState([]);

  // Pending Course Queue state
  const [pendingCourses, setPendingCourses] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [rejectingCourse, setRejectingCourse] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  // Course Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    skill: '',
    instructor: '',
    price: 999,
    category: 'Development',
    thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=60',
    assignment: {
      type: 'code',
      title: 'Final Capstone Project',
      prompt: 'Implement a function that solves the capstone requirements.',
      starterCode: 'function solution(input) {\n  // Your code here\n  return input;\n}',
      rubric: 'correctness, efficiency, structure',
    },
    assignedTeacher: '',
  });

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCourses();
    fetchFeedback();
    fetchTeachers();
    fetchPendingCourses();
  }, []);

  const fetchPendingCourses = async () => {
    try {
      setLoadingPending(true);
      const res = await coursesAPI.getPending();
      setPendingCourses(res.data || []);
    } catch (err) {
      console.error('Failed to fetch pending courses:', err);
    } finally {
      setLoadingPending(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await coursesAPI.getTeachers();
      setTeachersList(res.data || []);
    } catch (err) {
      console.error('Failed to fetch teachers:', err);
    }
  };

  const fetchFeedback = async () => {
    try {
      setLoadingFeedback(true);
      const res = await feedbackAPI.getInterviewFeedback();
      setFeedbackList(res.data || []);
    } catch (err) {
      console.error('Failed to fetch feedback:', err);
    } finally {
      setLoadingFeedback(false);
    }
  };

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await coursesAPI.getAll();
      setCourses(res.data || []);
      if (res.data?.length > 0 && !selectedCourse) {
        handleSelectCourse(res.data[0]);
      }
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCourse = async (course) => {
    setSelectedCourse(course);
    try {
      setLoadingStudents(true);
      const res = await coursesAPI.getEnrolledStudents(course._id);
      setEnrolledStudents(res.data || []);
    } catch (err) {
      setEnrolledStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleApproveCourse = async (courseId) => {
    try {
      await coursesAPI.approve(courseId);
      setActionMsg('Course proposal approved! It is now live in Explore Courses.');
      setTimeout(() => setActionMsg(''), 4000);
      await fetchPendingCourses();
      await fetchCourses();
    } catch (err) {
      alert(errMsg(err));
    }
  };

  const handleRejectCourseSubmit = async (e) => {
    e.preventDefault();
    if (!rejectingCourse) return;
    try {
      await coursesAPI.reject(rejectingCourse._id, rejectReason.trim());
      setActionMsg(`Course proposal "${rejectingCourse.title}" rejected.`);
      setTimeout(() => setActionMsg(''), 4000);
      setRejectingCourse(null);
      setRejectReason('');
      await fetchPendingCourses();
      await fetchCourses();
    } catch (err) {
      alert(errMsg(err));
    }
  };

  const handleOpenCreate = () => {
    setEditingCourse(null);
    setForm({
      title: '',
      description: '',
      skill: '',
      instructor: 'Faculty Member',
      price: 999,
      category: 'Development',
      thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=60',
      assignment: {
        type: 'code',
        title: 'Final Capstone Project',
        prompt: 'Implement a function that solves the capstone requirements.',
        starterCode: 'function solution(input) {\n  // Your code here\n  return input;\n}',
        rubric: 'correctness, efficiency, structure',
      },
      assignedTeacher: teachersList[0]?._id || '',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (course) => {
    setEditingCourse(course);
    setForm({
      title: course.title || '',
      description: course.description || '',
      skill: course.skill || '',
      instructor: course.instructor || '',
      price: course.price || 999,
      category: course.category || 'Development',
      thumbnail: course.thumbnail || '',
      assignment: course.assignment || {
        type: 'code',
        title: 'Final Capstone Project',
        prompt: 'Implement a function that solves the capstone requirements.',
        starterCode: 'function solution(input) {\n  return input;\n}',
        rubric: 'correctness',
      },
      assignedTeacher: course.assignedTeacher?._id || course.assignedTeacher || '',
    });
    setShowModal(true);
  };

  const handleDeleteCourse = async (id) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
      await coursesAPI.delete(id);
      await fetchCourses();
      await fetchPendingCourses();
    } catch (err) {
      alert(errMsg(err));
    }
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (editingCourse) {
        await coursesAPI.update(editingCourse._id, form);
      } else {
        await coursesAPI.create(form);
      }
      setShowModal(false);
      await fetchCourses();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-vs-bg flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-vs-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-vs-muted">Loading Admin Panel...</p>
        </div>
      </div>
    );
  }

  const inputClass = "w-full p-2.5 bg-vs-surface-2 border border-vs-border rounded text-xs text-vs-text focus:outline-none focus:border-vs-accent";

  return (
    <div className="min-h-screen bg-vs-bg text-vs-text pb-20">

      {/* Top Banner */}
      <div className="bg-vs-surface border-b border-vs-border py-8 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-vs-accent-light text-vs-accent text-xs font-semibold">
              <LayoutDashboard className="w-3.5 h-3.5" />
              Platform Administration
            </div>
            <h1 className="text-2xl font-bold text-vs-text mt-2">Course & Student Management</h1>
            <p className="text-sm text-vs-muted mt-0.5">
              Review pending course submissions, manage live courses, and inspect student AI feedback.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2 bg-vs-accent hover:bg-vs-accent-hover text-white text-xs font-semibold rounded transition-colors btn-scale"
            >
              <Plus className="w-4 h-4" />
              Create Admin Course
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="max-w-7xl mx-auto mt-6 flex items-center gap-4 border-b border-vs-border/50">
          <button
            onClick={() => setActiveTab('courses')}
            className={`pb-3 px-1 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'courses'
                ? 'border-vs-accent text-vs-accent'
                : 'border-transparent text-vs-muted hover:text-vs-text'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Approved Courses ({courses.length})
          </button>

          <button
            onClick={() => { setActiveTab('pending'); fetchPendingCourses(); }}
            className={`pb-3 px-1 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors relative ${
              activeTab === 'pending'
                ? 'border-vs-accent text-vs-accent'
                : 'border-transparent text-vs-muted hover:text-vs-text'
            }`}
          >
            <Clock className="w-4 h-4" />
            Pending Approvals ({pendingCourses.length})
            {pendingCourses.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping absolute top-0 right-0" />
            )}
          </button>

          <button
            onClick={() => { setActiveTab('feedback'); fetchFeedback(); }}
            className={`pb-3 px-1 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'feedback'
                ? 'border-vs-accent text-vs-accent'
                : 'border-transparent text-vs-muted hover:text-vs-text'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            AI Interview Feedback ({feedbackList.length})
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {actionMsg && (
          <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            {actionMsg}
          </div>
        )}

        {/* TAB 1: APPROVED COURSES */}
        {activeTab === 'courses' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Courses List */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-vs-muted uppercase tracking-wider">
                Live Courses ({courses.length})
              </h3>

              <div className="space-y-2">
                {courses.map((course) => {
                  const isSelected = selectedCourse?._id === course._id;
                  return (
                    <div
                      key={course._id}
                      onClick={() => handleSelectCourse(course)}
                      className={`p-4 rounded border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-vs-accent-light border-vs-accent text-vs-text'
                          : 'bg-vs-surface hover:bg-vs-surface-2 border-vs-border text-vs-text'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-bold text-vs-text truncate">{course.title}</h4>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenEdit(course); }}
                            className="p-1 rounded text-vs-muted hover:text-vs-accent"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteCourse(course._id); }}
                            className="p-1 rounded text-vs-muted hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-vs-muted truncate">{course.skill} · ₹{course.price}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Enrolled Roster */}
            {selectedCourse && (
              <div className="lg:col-span-2 space-y-6">
                <div className="p-6 bg-vs-surface border border-vs-border rounded-lg space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-semibold text-vs-accent">{selectedCourse.category}</span>
                      <h2 className="text-xl font-bold text-vs-text mt-0.5">{selectedCourse.title}</h2>
                      <p className="text-xs text-vs-muted mt-1 font-mono">ID: {selectedCourse._id}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-vs-text block">₹{selectedCourse.price}</span>
                      <span className="text-xs text-vs-muted">Instructor: {selectedCourse.instructor}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-vs-border">
                    <h3 className="text-sm font-bold text-vs-text flex items-center gap-2 mb-3">
                      <Users className="w-4 h-4 text-vs-accent" />
                      Enrolled Students ({enrolledStudents.length})
                    </h3>

                    {loadingStudents ? (
                      <p className="text-xs text-vs-muted">Loading roster...</p>
                    ) : enrolledStudents.length === 0 ? (
                      <p className="text-xs text-vs-muted py-4 text-center">No students currently enrolled in this course.</p>
                    ) : (
                      <div className="space-y-2">
                        {enrolledStudents.map((enrollment) => (
                          <div
                            key={enrollment._id}
                            className="p-3 bg-vs-surface-2 border border-vs-border rounded flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-semibold text-vs-text block">{enrollment.user?.name || 'Student'}</span>
                              <span className="text-vs-muted font-mono text-[11px]">{enrollment.user?.email}</span>
                            </div>
                            <div className="text-right">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                enrollment.status === 'VERIFIED'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200 dark:border-amber-800'
                              }`}>
                                {enrollment.status}
                              </span>
                              <span className="block text-[10px] text-vs-muted mt-0.5">
                                Enrolled: {new Date(enrollment.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PENDING COURSE APPROVALS QUEUE */}
        {activeTab === 'pending' && (
          <div className="p-6 bg-vs-surface border border-vs-border rounded-lg space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-vs-text">Pending Course Approvals Queue</h2>
                <p className="text-xs text-vs-muted mt-0.5">
                  Review course proposals submitted by faculty members before approving them live to Explore Courses.
                </p>
              </div>
              <button
                onClick={fetchPendingCourses}
                className="px-3 py-1.5 bg-vs-surface-2 border border-vs-border hover:bg-vs-border text-vs-text text-xs font-medium rounded transition-colors flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                Refresh Queue
              </button>
            </div>

            {loadingPending ? (
              <p className="text-xs text-vs-muted py-8 text-center">Loading pending course proposals...</p>
            ) : pendingCourses.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <h3 className="text-base font-bold text-vs-text">No Pending Approvals!</h3>
                <p className="text-xs text-vs-muted">All teacher-submitted course proposals have been reviewed.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {pendingCourses.map((pc) => {
                  const videoUrl = pc.videos?.[0]?.url || pc.videoUrl || '';
                  return (
                    <div
                      key={pc._id}
                      className="p-6 bg-vs-surface-2 border border-amber-300/40 dark:border-amber-800/40 rounded-lg space-y-4 shadow-sm"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-vs-border pb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                              PENDING ADMIN APPROVAL
                            </span>
                            <span className="text-xs font-semibold text-vs-accent">{pc.category}</span>
                          </div>
                          <h3 className="text-lg font-bold text-vs-text mt-1">{pc.title}</h3>
                          <p className="text-xs text-vs-muted">Skill Tag: <strong className="text-vs-text">{pc.skill}</strong> · Proposed Price: <strong>₹{pc.price}</strong></p>
                        </div>

                        <div className="text-left sm:text-right">
                          <span className="text-xs text-vs-muted block">Submitted By Teacher</span>
                          <strong className="text-xs text-vs-text block">{pc.createdBy?.name || pc.instructor || 'Teacher'}</strong>
                          <span className="text-[10px] text-vs-muted font-mono">{pc.createdBy?.email}</span>
                        </div>
                      </div>

                      {/* Description & Video Link */}
                      <div className="space-y-2 text-xs">
                        <p className="text-vs-muted leading-relaxed">{pc.description}</p>
                        
                        {videoUrl && (
                          <div className="pt-1 flex items-center gap-2">
                            <span className="font-semibold text-vs-text">Lecture Video:</span>
                            <a
                              href={videoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-vs-accent hover:underline flex items-center gap-1 font-mono text-[11px]"
                            >
                              {videoUrl} <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Assignment Preview */}
                      {pc.assignment && (
                        <div className="p-3 bg-vs-surface border border-vs-border rounded text-xs space-y-1">
                          <span className="font-bold text-vs-text block">Assignment: {pc.assignment.title}</span>
                          <p className="text-vs-muted italic">"{pc.assignment.prompt}"</p>
                          {pc.assignment.rubric && (
                            <p className="text-[11px] text-vs-accent font-mono mt-1">Rubric terms: {pc.assignment.rubric}</p>
                          )}
                        </div>
                      )}

                      {/* Approve / Reject Actions */}
                      <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setRejectingCourse(pc)}
                          className="px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 text-xs font-bold rounded transition-colors flex items-center gap-1.5"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject Proposal
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApproveCourse(pc._id)}
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded transition-all btn-scale flex items-center gap-1.5 shadow-sm"
                        >
                          <Check className="w-4 h-4" />
                          Approve & Publish Live
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: STUDENT FEEDBACK */}
        {activeTab === 'feedback' && (
          <div className="p-6 bg-vs-surface border border-vs-border rounded-lg space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-vs-text">AI Interview Student Feedback</h2>
                <p className="text-xs text-vs-muted mt-0.5">
                  Real-time sentiment and pulse feedback from students after completing AI viva defence.
                </p>
              </div>
              <button
                onClick={fetchFeedback}
                className="px-3 py-1.5 bg-vs-surface-2 border border-vs-border hover:bg-vs-border text-vs-text text-xs font-medium rounded transition-colors"
              >
                Refresh List
              </button>
            </div>

            {loadingFeedback ? (
              <p className="text-xs text-vs-muted py-8 text-center">Loading student feedback...</p>
            ) : feedbackList.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <MessageSquare className="w-8 h-8 text-vs-muted mx-auto" />
                <p className="text-sm font-semibold text-vs-text">No interview feedback recorded yet.</p>
                <p className="text-xs text-vs-muted">Feedback submitted by students after AI interviews will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-vs-border text-vs-muted uppercase font-bold text-[10px]">
                      <th className="py-3 px-3">Student</th>
                      <th className="py-3 px-3">Course</th>
                      <th className="py-3 px-3">Rating</th>
                      <th className="py-3 px-3">Tag / Sentiment</th>
                      <th className="py-3 px-3">Comment</th>
                      <th className="py-3 px-3 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-vs-border/60">
                    {feedbackList.map((fb) => (
                      <tr key={fb._id} className="hover:bg-vs-surface-2/60 transition-colors">
                        <td className="py-3 px-3">
                          <span className="font-semibold text-vs-text block">{fb.student?.name || 'Student'}</span>
                          <span className="text-vs-muted font-mono text-[10px]">{fb.student?.email}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-medium text-vs-text block">{fb.submission?.course?.title || 'Course'}</span>
                          <span className="text-vs-muted text-[10px]">{fb.submission?.course?.skill}</span>
                        </td>
                        <td className="py-3 px-3 font-bold">
                          <div className="flex items-center gap-1 text-amber-500">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span>{fb.rating}/5</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-vs-accent-light text-vs-accent border border-vs-accent/20 inline-block">
                            {fb.tag || 'General Feedback'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-vs-muted max-w-xs truncate">
                          {fb.comment || <span className="italic text-vs-subtle">No comment provided</span>}
                        </td>
                        <td className="py-3 px-3 text-right text-vs-muted text-[10px] font-mono">
                          {new Date(fb.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ADMIN REJECT MODAL */}
      {rejectingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-vs-surface border border-vs-border rounded-lg shadow-xl overflow-hidden text-vs-text">
            <div className="px-6 py-4 border-b border-vs-border flex items-center justify-between">
              <h3 className="text-base font-bold text-vs-text">Reject Course Proposal</h3>
              <button onClick={() => setRejectingCourse(null)} className="p-1 rounded text-vs-muted hover:text-vs-text">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRejectCourseSubmit} className="p-6 space-y-4 text-xs">
              <p className="text-vs-muted">
                Rejecting proposal for <strong className="text-vs-text">{rejectingCourse.title}</strong>. Provide a reason so the submitting teacher knows what to revise.
              </p>

              <div>
                <label className="block font-semibold mb-1">Rejection Reason / Feedback</label>
                <textarea
                  rows={3}
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Please clarify the capstone rubric and replace video link with a higher resolution lecture."
                  className={inputClass}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingCourse(null)}
                  className="px-4 py-2 text-vs-muted hover:text-vs-text font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded transition-colors"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT ADMIN COURSE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-vs-surface border border-vs-border rounded-lg shadow-xl overflow-hidden text-vs-text max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-vs-border flex items-center justify-between">
              <h3 className="text-base font-bold text-vs-text">
                {editingCourse ? 'Edit Course' : 'Create Admin Course'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded text-vs-muted hover:text-vs-text">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Course Title</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className={inputClass}
                  placeholder="e.g. Advanced React Architecture"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Instructor Label</label>
                  <input
                    type="text"
                    required
                    value={form.instructor}
                    onChange={(e) => setForm({ ...form, instructor: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Assigned Teacher User</label>
                  <select
                    value={form.assignedTeacher}
                    onChange={(e) => setForm({ ...form, assignedTeacher: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">Unassigned</option>
                    {teachersList.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name} ({t.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className={inputClass}
                  >
                    <option value="Web Development">Web Development</option>
                    <option value="Programming">Programming</option>
                    <option value="Data & Databases">Data & Databases</option>
                    <option value="Development">Development</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Description</label>
                <textarea
                  rows={3}
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className={inputClass}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded text-xs text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-vs-accent hover:bg-vs-accent-hover text-white font-semibold rounded text-xs transition-colors btn-scale"
              >
                {submitting ? 'Saving...' : editingCourse ? 'Update Course' : 'Create Admin Course'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
