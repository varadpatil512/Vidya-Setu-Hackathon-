import { useState, useEffect } from 'react';
import { teacherAPI, feedbackAPI, coursesAPI, errMsg } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  ShieldAlert,
  GraduationCap,
  Users,
  MessageSquare,
  BookOpen,
  CheckCircle2,
  FileCode2,
  AlertTriangle,
  Star,
  Plus,
  X,
  Clock,
  RefreshCw,
  Edit3,
  Trash2,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';

export default function TeacherQueuePage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loadingCourses, setLoadingCourses] = useState(true);

  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'students' | 'feedback'

  // Tab 1: Enrolled Students
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Tab 2: Review Queue
  const [queue, setQueue] = useState([]);
  const [selectedSub, setSelectedSub] = useState(null);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [decision, setDecision] = useState('APPROVE');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Tab 3: Student Feedback
  const [feedbackList, setFeedbackList] = useState([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  // Teacher Create/Edit Course Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [thumbnailInputMode, setThumbnailInputMode] = useState('file'); // 'file' | 'url'
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState(false);

  const [categories, setCategories] = useState(['Web Development', 'Programming', 'Data & Databases', 'Development']);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    category: 'Web Development',
    price: 499,
    skill: '',
    instructor: '',
    videoUrl: '',
    thumbnail: '',
    assignment: {
      title: 'Capstone Project Challenge',
      prompt: 'Implement a working solution that satisfies the assignment prompt.',
      starterCode: '// Write your solution here\n',
      rubric: 'structure, correctness, clean syntax',
    },
  });
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [createError, setCreateError] = useState('');

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchMyCourses();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchWorkspaceData(selectedCourse._id);
    }
  }, [selectedCourse]);

  const fetchCategories = async () => {
    try {
      const res = await coursesAPI.getCategories();
      if (res.data && res.data.length > 0) {
        setCategories(res.data);
      }
    } catch (err) {
      // keep fallback categories
    }
  };

  const fetchMyCourses = async () => {
    try {
      setLoadingCourses(true);
      const res = await teacherAPI.getMyCourses();
      const courseData = res.data || [];
      setCourses(courseData);
      if (courseData.length > 0 && !selectedCourse) {
        setSelectedCourse(courseData[0]);
      }
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoadingCourses(false);
    }
  };

  const fetchWorkspaceData = async (courseId) => {
    fetchQueue(courseId);
    fetchStudents(courseId);
    fetchFeedback(courseId);
  };

  const fetchQueue = async (courseId) => {
    try {
      setLoadingQueue(true);
      const res = await teacherAPI.getQueue(courseId);
      const items = res.data || [];
      setQueue(items);
      if (items.length > 0) {
        setSelectedSub(items[0]);
      } else {
        setSelectedSub(null);
      }
    } catch (err) {
      console.error('Failed to fetch queue:', err);
    } finally {
      setLoadingQueue(false);
    }
  };

  const fetchStudents = async (courseId) => {
    try {
      setLoadingStudents(true);
      const res = await teacherAPI.getCourseStudents(courseId);
      setStudents(res.data || []);
    } catch (err) {
      console.error('Failed to fetch students roster:', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchFeedback = async (courseId) => {
    try {
      setLoadingFeedback(true);
      const res = await feedbackAPI.getInterviewFeedback(courseId);
      setFeedbackList(res.data || []);
    } catch (err) {
      console.error('Failed to fetch feedback:', err);
    } finally {
      setLoadingFeedback(false);
    }
  };

  const handleOpenCreateModal = () => {
    setIsEditMode(false);
    setEditingCourseId(null);
    setCreateForm({
      title: '',
      description: '',
      category: categories[0] || 'Web Development',
      price: 499,
      skill: '',
      instructor: user?.name || 'Faculty Member',
      videoUrl: '',
      thumbnail: '',
      assignment: {
        title: 'Capstone Project Challenge',
        prompt: 'Implement a working solution that satisfies the assignment prompt.',
        starterCode: '// Write your solution here\n',
        rubric: 'structure, correctness, clean syntax',
      },
    });
    setCreateError('');
    setShowCreateModal(true);
  };

  const handleOpenEditModal = () => {
    if (!selectedCourse) return;
    setIsEditMode(true);
    setEditingCourseId(selectedCourse._id);
    setCreateForm({
      title: selectedCourse.title || '',
      description: selectedCourse.description || '',
      category: selectedCourse.category || 'Web Development',
      price: selectedCourse.price || 499,
      skill: selectedCourse.skill || '',
      instructor: selectedCourse.instructor || user?.name || 'Faculty Member',
      videoUrl: selectedCourse.videos?.[0]?.url || '',
      thumbnail: selectedCourse.thumbnail || '',
      assignment: {
        title: selectedCourse.assignment?.title || 'Capstone Project Challenge',
        prompt: selectedCourse.assignment?.prompt || '',
        starterCode: selectedCourse.assignment?.starterCode || '',
        rubric: selectedCourse.assignment?.rubric || '',
      },
    });
    setCreateError('');
    setShowCreateModal(true);
  };

  const handleThumbnailFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setCreateError('Thumbnail image must be smaller than 5MB');
      return;
    }
    setCreateError('');
    const reader = new FileReader();
    reader.onloadend = () => {
      setCreateForm((prev) => ({ ...prev, thumbnail: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleCreateCourseSubmit = async (e) => {
    e.preventDefault();
    setCreateError('');
    try {
      setCreatingCourse(true);
      let res;
      if (isEditMode && editingCourseId) {
        res = await teacherAPI.updateCourse(editingCourseId, createForm);
        setSuccessMsg(`Course updated! Status changed to Pending Admin Approval`);
      } else {
        res = await teacherAPI.createCourse(createForm);
        setSuccessMsg(`Course proposal submitted! Status: Pending Admin Approval`);
      }
      setShowCreateModal(false);
      setTimeout(() => setSuccessMsg(''), 5000);

      const savedCourse = res.data;
      await fetchMyCourses();
      setSelectedCourse(savedCourse);
    } catch (err) {
      setCreateError(errMsg(err));
    } finally {
      setCreatingCourse(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!selectedCourse) return;
    try {
      setDeletingCourse(true);
      await teacherAPI.deleteCourse(selectedCourse._id);
      setShowDeleteConfirm(false);
      setSuccessMsg(`Course "${selectedCourse.title}" deleted successfully.`);
      setTimeout(() => setSuccessMsg(''), 4000);

      const res = await teacherAPI.getMyCourses();
      const updatedList = res.data || [];
      setCourses(updatedList);
      setSelectedCourse(updatedList.length > 0 ? updatedList[0] : null);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setDeletingCourse(false);
    }
  };

  const handleReviewDecision = async (e) => {
    e.preventDefault();
    if (!selectedSub) return;
    try {
      setSubmitting(true);
      setError('');
      await teacherAPI.review(selectedSub._id, decision, comments);
      setSuccessMsg(`Logged decision (${decision}) for ${selectedSub.student?.name || 'Student'}`);
      setTimeout(() => setSuccessMsg(''), 3000);
      setComments('');
      if (selectedCourse) {
        await fetchQueue(selectedCourse._id);
      }
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full p-2.5 bg-vs-surface-2 border border-vs-border rounded text-xs text-vs-text focus:outline-none focus:border-vs-accent";

  if (loadingCourses) {
    return (
      <div className="min-h-screen bg-vs-bg flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-vs-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-vs-muted">Loading Teacher Workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vs-bg text-vs-text pb-20">

      {/* Header Banner */}
      <div className="bg-vs-surface border-b border-vs-border py-8 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-vs-accent-light text-vs-accent text-xs font-semibold">
              <GraduationCap className="w-3.5 h-3.5" />
              Faculty Workspace
            </div>
            <h1 className="text-2xl font-bold text-vs-text mt-2">My Courses & Verification Queue</h1>
            <p className="text-sm text-vs-muted mt-0.5">
              Submit new course proposals, review student rosters, flagged AI vivas, and feedback.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-vs-accent hover:bg-vs-accent-hover text-white text-xs font-semibold rounded transition-all btn-scale shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create New Course
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {courses.length === 0 ? (
          <div className="text-center py-20 bg-vs-surface border border-vs-border rounded-lg space-y-4">
            <BookOpen className="w-12 h-12 text-vs-muted mx-auto" />
            <h3 className="text-lg font-bold text-vs-text">No Courses Created Yet</h3>
            <p className="text-sm text-vs-muted max-w-md mx-auto">
              You haven't submitted any courses yet. Click below to submit your first course proposal for Admin approval!
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="px-5 py-2.5 bg-vs-accent hover:bg-vs-accent-hover text-white text-xs font-bold rounded transition-all btn-scale inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Submit Your First Course
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

            {/* Left Sidebar: Assigned & Created Courses List */}
            <div className="space-y-3 lg:col-span-1">
              <h3 className="text-xs font-bold text-vs-muted uppercase tracking-wider">
                My Courses ({courses.length})
              </h3>

              <div className="space-y-2">
                {courses.map((course) => {
                  const isSelected = selectedCourse?._id === course._id;
                  const cStatus = course.status || 'approved';
                  return (
                    <div
                      key={course._id}
                      onClick={() => setSelectedCourse(course)}
                      className={`p-3.5 rounded border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-vs-accent-light border-vs-accent text-vs-text shadow-sm'
                          : 'bg-vs-surface hover:bg-vs-surface-2 border-vs-border text-vs-text'
                      }`}
                    >
                      <div className="flex gap-3 items-start">
                        {course.thumbnail && (
                          <img
                            src={course.thumbnail}
                            alt={course.title}
                            className="w-12 h-12 rounded object-cover border border-vs-border shrink-0 mt-0.5"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between mb-1 gap-1">
                            <span className="text-[10px] font-semibold text-vs-accent uppercase tracking-wider truncate">
                              {course.category}
                            </span>
                            {/* Status Badge */}
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                              cStatus === 'approved'
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-800'
                                : course.isUpdate
                                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200 dark:border-amber-800'
                            }`}>
                              {cStatus === 'approved' ? 'Approved' : course.isUpdate ? 'Update Pending' : 'Pending'}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-vs-text truncate">{course.title}</h4>
                          <p className="text-[11px] text-vs-muted mt-0.5 truncate">{course.skill}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Main Content Area */}
            {selectedCourse && (
              <div className="lg:col-span-3 space-y-6">

                {/* Course Header & Rejection Warning */}
                <div className="bg-vs-surface border border-vs-border rounded-lg p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      {selectedCourse.thumbnail && (
                        <img
                          src={selectedCourse.thumbnail}
                          alt={selectedCourse.title}
                          className="w-28 h-20 rounded-lg object-cover border border-vs-border shrink-0 shadow-xs"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-vs-accent bg-vs-accent-light px-2.5 py-1 rounded">
                            {selectedCourse.skill}
                          </span>
                          {/* Big Status Badge */}
                          <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                            selectedCourse.status === 'approved'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-800'
                              : selectedCourse.isUpdate
                              ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                              : selectedCourse.status === 'pending'
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200 dark:border-amber-800'
                              : 'bg-red-50 dark:bg-red-950/40 text-red-600 border border-red-200 dark:border-red-800'
                          }`}>
                            {selectedCourse.status === 'approved'
                              ? '🟢 Live & Approved'
                              : selectedCourse.isUpdate
                              ? '🔵 Existing Course Update — Pending Admin Re-Approval'
                              : selectedCourse.status === 'pending'
                              ? '🟡 Pending Admin Approval'
                              : '🔴 Proposal Rejected'}
                          </span>
                        </div>
                        <h2 className="text-xl font-bold text-vs-text mt-1">{selectedCourse.title}</h2>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      <button
                        onClick={() => fetchWorkspaceData(selectedCourse._id)}
                        className="px-3 py-1.5 bg-vs-surface-2 border border-vs-border hover:bg-vs-border text-vs-text text-xs font-semibold rounded transition-colors flex items-center gap-1.5"
                        title="Refresh Course Data"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Refresh
                      </button>
                      <button
                        onClick={handleOpenEditModal}
                        className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-xs font-semibold rounded transition-colors flex items-center gap-1.5"
                        title="Edit Course"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit Course
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-semibold rounded transition-colors flex items-center gap-1.5"
                        title="Delete Course"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Course
                      </button>
                    </div>
                  </div>

                  {/* Rejection Alert Box */}
                  {selectedCourse.status === 'rejected' && (
                    <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300 space-y-1">
                      <span className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" /> Admin Rejection Reason:
                      </span>
                      <p className="font-medium">{selectedCourse.rejectionReason || 'Course proposal rejected by platform administration.'}</p>
                    </div>
                  )}

                  {/* Pending Info Alert Box */}
                  {selectedCourse.status === 'pending' && (
                    <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-800 dark:text-amber-200">
                      <span className="font-bold block mb-0.5">Under Review</span>
                      This course proposal is currently queued for Admin approval. It will become live and purchasable once approved.
                    </div>
                  )}

                  {/* Tabs Nav */}
                  <div className="flex items-center gap-4 border-b border-vs-border pt-2">
                    <button
                      onClick={() => setActiveTab('queue')}
                      className={`pb-3 px-1 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
                        activeTab === 'queue'
                          ? 'border-vs-accent text-vs-accent'
                          : 'border-transparent text-vs-muted hover:text-vs-text'
                      }`}
                    >
                      <ShieldAlert className="w-4 h-4" />
                      Review Queue ({queue.length})
                    </button>

                    <button
                      onClick={() => setActiveTab('students')}
                      className={`pb-3 px-1 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
                        activeTab === 'students'
                          ? 'border-vs-accent text-vs-accent'
                          : 'border-transparent text-vs-muted hover:text-vs-text'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      Enrolled Students ({students.length})
                    </button>

                    <button
                      onClick={() => setActiveTab('feedback')}
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

                {/* TAB 1: REVIEW QUEUE */}
                {activeTab === 'queue' && (
                  <div>
                    {loadingQueue ? (
                      <p className="text-xs text-vs-muted py-8 text-center">Loading verification queue...</p>
                    ) : queue.length === 0 ? (
                      <div className="text-center py-16 bg-vs-surface border border-vs-border rounded-lg space-y-2">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                        <h3 className="text-base font-bold text-vs-text">Queue is Clear for this Course!</h3>
                        <p className="text-sm text-vs-muted">No pending flagged submissions requiring review.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Submissions List */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-vs-muted uppercase tracking-wider">
                            Flagged Submissions ({queue.length})
                          </h4>

                          <div className="space-y-2">
                            {queue.map((sub) => {
                              const isSelected = selectedSub?._id === sub._id;
                              return (
                                <div
                                  key={sub._id}
                                  onClick={() => setSelectedSub(sub)}
                                  className={`p-4 rounded border text-left cursor-pointer transition-all ${
                                    isSelected
                                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-vs-text shadow-sm'
                                      : 'bg-vs-surface hover:bg-vs-surface-2 border-vs-border text-vs-text'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-xs text-vs-text truncate">
                                      {sub.student?.name || 'Student'}
                                    </span>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                                      FLAGGED
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-vs-muted font-mono truncate">{sub.student?.email}</p>
                                  <div className="flex items-center justify-between mt-2 text-[10px] text-vs-muted">
                                    <span>Paste events: <strong className="text-amber-600">{sub.pasteEvents}</strong></span>
                                    <span>Score: <strong>{sub.aiScore || 0}/100</strong></span>
                                  </div>
                                  {/* Proctor flag summary badge */}
                                  {sub.interview?.proctorFlags?.length > 0 && (
                                    <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-rose-400">
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-rose-950/60 border border-rose-800">
                                        🛡 {sub.interview.proctorFlags.length} proctor flag{sub.interview.proctorFlags.length !== 1 ? 's' : ''}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Audit Details & Decision Form */}
                        {selectedSub && (
                          <div className="lg:col-span-2 space-y-6">
                            <div className="p-6 bg-vs-surface border border-vs-border rounded-lg space-y-5 text-xs">
                              <div className="flex items-start justify-between border-b border-vs-border pb-4">
                                <div>
                                  <h3 className="text-base font-bold text-vs-text">{selectedSub.student?.name}</h3>
                                  <p className="text-vs-muted font-mono text-[11px]">{selectedSub.student?.email}</p>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] text-vs-muted block">AI Consistency Score</span>
                                  <strong className="text-amber-600 font-bold text-lg">{selectedSub.aiScore || 0}/100</strong>
                                </div>
                              </div>

                              {selectedSub.flagReason && (
                                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded text-amber-800 dark:text-amber-300">
                                  <span className="font-bold block mb-0.5 flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5" /> AI Flag Reason
                                  </span>
                                  {selectedSub.flagReason}
                                </div>
                              )}

                              <div className="space-y-1">
                                <span className="font-bold text-vs-text block flex items-center gap-1">
                                  <FileCode2 className="w-3.5 h-3.5 text-vs-accent" /> Submitted Code
                                </span>
                                <pre className="p-3 bg-vs-surface-2 border border-vs-border rounded font-mono overflow-x-auto max-h-40 text-vs-text">
                                  {selectedSub.code || selectedSub.text}
                                </pre>
                              </div>

                              {selectedSub.interview?.questions?.length > 0 && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-vs-text block">AI Viva Responses</span>
                                    {selectedSub.interview?.mode === 'TYPED' && (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/60 border border-amber-800 text-amber-300">
                                        TYPED MODE
                                      </span>
                                    )}
                                  </div>
                                  {selectedSub.interview?.permissionsGranted === false && (
                                    <div className="p-2.5 bg-amber-950/30 border border-amber-800/60 rounded text-amber-300 space-y-0.5">
                                      <span className="font-bold text-[11px] text-amber-400 block">
                                        ⚠️ Hardware Permissions Denied by Student:
                                      </span>
                                      <p className="text-[11px] italic">
                                        "{selectedSub.interview?.permissionIssueReason || selectedSub.interview?.micIssueReason}"
                                      </p>
                                    </div>
                                  )}
                                  {selectedSub.interview?.permissionsGranted !== false && selectedSub.interview?.micIssueReason && (
                                    <div className="p-2.5 bg-amber-950/30 border border-amber-800/60 rounded text-amber-300 space-y-0.5">
                                      <span className="font-bold text-[11px] text-amber-400 block">
                                        🎙 Student Hardware / Mic Issue Explanation:
                                      </span>
                                      <p className="text-[11px] italic">"{selectedSub.interview.micIssueReason}"</p>
                                    </div>
                                  )}
                                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                    {selectedSub.interview.questions.map((q, idx) => {
                                      const ansObj = (selectedSub.interview.answers || []).find(a => a.question === q.question) || selectedSub.interview.answers?.[idx];
                                      return (
                                        <div key={idx} className="p-3 bg-vs-surface-2 border border-vs-border rounded space-y-1">
                                          <p className="font-semibold text-vs-text">Q{idx + 1}: {q.question}</p>
                                          <p className="text-vs-muted italic">"{ansObj?.answer || 'No answer provided'}"</p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Proctor Flags Log */}
                              {selectedSub.interview?.proctorFlags?.length > 0 ? (
                                <div className="space-y-2">
                                  <span className="font-bold text-vs-text block flex items-center gap-1.5">
                                    🛡 AI Proctoring Signals
                                    <span className="px-1.5 py-0.5 rounded-full bg-rose-950/60 border border-rose-800 text-rose-400 text-[10px] font-bold">
                                      {selectedSub.interview.proctorFlags.length} event{selectedSub.interview.proctorFlags.length !== 1 ? 's' : ''}
                                    </span>
                                  </span>
                                  <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                                    {selectedSub.interview.proctorFlags.map((f, i) => {
                                      const colorMap = {
                                        TAB_SWITCH: 'text-rose-400 bg-rose-950/40 border-rose-800',
                                        FOCUS_LOSS: 'text-amber-400 bg-amber-950/40 border-amber-800',
                                        FULLSCREEN_EXIT: 'text-amber-400 bg-amber-950/40 border-amber-800',
                                        NO_FACE: 'text-rose-400 bg-rose-950/40 border-rose-800',
                                        MULTIPLE_FACES: 'text-rose-400 bg-rose-950/40 border-rose-800',
                                      };
                                      const cls = colorMap[f.type] || 'text-vs-muted bg-vs-surface-2 border-vs-border';
                                      return (
                                        <div key={i} className={`flex items-center justify-between p-2 rounded border text-[10px] font-mono ${cls}`}>
                                          <span className="font-bold uppercase tracking-wide">{f.type.replace(/_/g, ' ')}</span>
                                          <span className="opacity-70">{new Date(f.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-[11px] text-vs-muted italic flex items-center gap-1.5">
                                  <span>🛡</span> No proctoring flags recorded for this session.
                                </div>
                              )}

                              <form onSubmit={handleReviewDecision} className="pt-4 border-t border-vs-border space-y-4">
                                <h4 className="font-bold text-vs-text text-sm">Faculty Verification Decision</h4>

                                <div className="grid grid-cols-3 gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setDecision('APPROVE')}
                                    className={`p-2.5 rounded font-bold text-center border transition-all ${
                                      decision === 'APPROVE'
                                        ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                                        : 'bg-vs-surface-2 border-vs-border text-vs-muted hover:text-vs-text'
                                    }`}
                                  >
                                    Approve & Sign Off
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDecision('REQUEST_REVISION')}
                                    className={`p-2.5 rounded font-bold text-center border transition-all ${
                                      decision === 'REQUEST_REVISION'
                                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                                        : 'bg-vs-surface-2 border-vs-border text-vs-muted hover:text-vs-text'
                                    }`}
                                  >
                                    Request Revision
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDecision('REJECT')}
                                    className={`p-2.5 rounded font-bold text-center border transition-all ${
                                      decision === 'REJECT'
                                        ? 'bg-red-500 text-white border-red-600 shadow-sm'
                                        : 'bg-vs-surface-2 border-vs-border text-vs-muted hover:text-vs-text'
                                    }`}
                                  >
                                    Reject Submission
                                  </button>
                                </div>

                                <div>
                                  <label className="block font-semibold mb-1">Faculty Feedback / Audit Notes</label>
                                  <textarea
                                    rows={2}
                                    value={comments}
                                    onChange={(e) => setComments(e.target.value)}
                                    placeholder="Add feedback or justification for the student..."
                                    className="w-full p-2.5 bg-vs-surface-2 border border-vs-border rounded text-vs-text focus:outline-none focus:border-vs-accent"
                                  />
                                </div>

                                {error && (
                                  <p className="p-2 bg-red-50 text-red-600 rounded text-xs">{error}</p>
                                )}
                                {successMsg && (
                                  <p className="p-2 bg-emerald-50 text-emerald-600 rounded text-xs">{successMsg}</p>
                                )}

                                <button
                                  type="submit"
                                  disabled={submitting}
                                  className="w-full py-2.5 bg-vs-accent hover:bg-vs-accent-hover text-white font-bold rounded text-xs transition-all shadow-sm"
                                >
                                  {submitting ? 'Submitting Decision...' : 'Submit Faculty Verification'}
                                </button>
                              </form>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: ENROLLED STUDENTS */}
                {activeTab === 'students' && (
                  <div className="p-6 bg-vs-surface border border-vs-border rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-vs-text">Enrolled Student Roster</h3>
                      <span className="text-xs text-vs-muted">Total Enrolled: {students.length}</span>
                    </div>

                    {loadingStudents ? (
                      <p className="text-xs text-vs-muted py-6 text-center">Loading student roster...</p>
                    ) : students.length === 0 ? (
                      <p className="text-xs text-vs-muted py-8 text-center">No students enrolled in this course yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-vs-border text-vs-muted uppercase font-bold text-[10px]">
                              <th className="py-3 px-3">Student</th>
                              <th className="py-3 px-3">Enrolled Date</th>
                              <th className="py-3 px-3">Lecture Progress</th>
                              <th className="py-3 px-3 text-right">Verification Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-vs-border/60">
                            {students.map((st) => (
                              <tr key={st._id} className="hover:bg-vs-surface-2/60 transition-colors">
                                <td className="py-3 px-3">
                                  <span className="font-semibold text-vs-text block">{st.student?.name || 'Student'}</span>
                                  <span className="text-vs-muted font-mono text-[10px]">{st.student?.email}</span>
                                </td>
                                <td className="py-3 px-3 text-vs-muted font-mono text-[10px]">
                                  {new Date(st.purchasedAt).toLocaleDateString()}
                                </td>
                                <td className="py-3 px-3">
                                  <span className="font-medium text-vs-text">
                                    {st.videosWatched} / {st.totalVideos} Videos
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <span className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                                    st.status === 'VERIFIED'
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-800'
                                      : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200 dark:border-amber-800'
                                  }`}>
                                    {st.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: STUDENT FEEDBACK */}
                {activeTab === 'feedback' && (
                  <div className="p-6 bg-vs-surface border border-vs-border rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-vs-text">AI Interview Student Feedback</h3>
                      <button
                        onClick={() => selectedCourse && fetchFeedback(selectedCourse._id)}
                        className="px-3 py-1 bg-vs-surface-2 border border-vs-border text-vs-text text-xs rounded hover:bg-vs-border"
                      >
                        Refresh
                      </button>
                    </div>

                    {loadingFeedback ? (
                      <p className="text-xs text-vs-muted py-6 text-center">Loading feedback...</p>
                    ) : feedbackList.length === 0 ? (
                      <div className="py-12 text-center space-y-2">
                        <MessageSquare className="w-8 h-8 text-vs-muted mx-auto" />
                        <p className="text-sm font-semibold text-vs-text">No feedback logged for this course yet.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-vs-border text-vs-muted uppercase font-bold text-[10px]">
                              <th className="py-3 px-3">Student</th>
                              <th className="py-3 px-3">Rating</th>
                              <th className="py-3 px-3">Sentiment Tag</th>
                              <th className="py-3 px-3">Comments</th>
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
                                <td className="py-3 px-3 font-bold">
                                  <div className="flex items-center gap-1 text-amber-500">
                                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                    <span>{fb.rating}/5</span>
                                  </div>
                                </td>
                                <td className="py-3 px-3">
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-vs-accent-light text-vs-accent border border-vs-accent/20">
                                    {fb.tag || 'General'}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-vs-muted max-w-xs truncate">
                                  {fb.comment || <span className="italic text-vs-subtle">No comment</span>}
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
            )}

          </div>
        )}

      </div>

      {/* TEACHER CREATE / EDIT COURSE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-xl bg-vs-surface border border-vs-border rounded-lg shadow-xl overflow-hidden text-vs-text max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-vs-border flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-vs-text">
                  {isEditMode ? 'Edit Course Proposal' : 'Submit New Course Proposal'}
                </h3>
                <p className="text-xs text-vs-muted">
                  {isEditMode
                    ? 'Updating a course requires Admin re-approval before changes reflect to students.'
                    : 'Course will be submitted for Admin approval before going live.'}
                </p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded text-vs-muted hover:text-vs-text">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCourseSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Course Title</label>
                <input
                  type="text"
                  required
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className={inputClass}
                  placeholder="e.g. Master Next.js 15 & Server Actions"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Skill Tag</label>
                  <input
                    type="text"
                    required
                    value={createForm.skill}
                    onChange={(e) => setCreateForm({ ...createForm, skill: e.target.value })}
                    className={inputClass}
                    placeholder="e.g. Next.js App Router"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Category</label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    className={inputClass}
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={createForm.price}
                    onChange={(e) => setCreateForm({ ...createForm, price: Number(e.target.value) })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Instructor Display Name</label>
                  <input
                    type="text"
                    required
                    value={createForm.instructor}
                    onChange={(e) => setCreateForm({ ...createForm, instructor: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  required
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className={inputClass}
                  placeholder="Comprehensive course description..."
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Lecture Video URL (YouTube Link)</label>
                <input
                  type="url"
                  value={createForm.videoUrl}
                  onChange={(e) => setCreateForm({ ...createForm, videoUrl: e.target.value })}
                  className={inputClass}
                  placeholder="https://youtu.be/... or https://www.youtube.com/watch?v=..."
                />
              </div>

              {/* Course Thumbnail Selector (Upload or Link) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold">Course Thumbnail Image</label>
                  <div className="flex items-center gap-1 bg-vs-surface-2 p-0.5 rounded border border-vs-border text-[11px]">
                    <button
                      type="button"
                      onClick={() => setThumbnailInputMode('file')}
                      className={`px-2 py-0.5 rounded font-medium transition-colors flex items-center gap-1 ${
                        thumbnailInputMode === 'file'
                          ? 'bg-vs-accent text-white font-bold'
                          : 'text-vs-muted hover:text-vs-text'
                      }`}
                    >
                      <Upload className="w-3 h-3" /> Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setThumbnailInputMode('url')}
                      className={`px-2 py-0.5 rounded font-medium transition-colors flex items-center gap-1 ${
                        thumbnailInputMode === 'url'
                          ? 'bg-vs-accent text-white font-bold'
                          : 'text-vs-muted hover:text-vs-text'
                      }`}
                    >
                      <ImageIcon className="w-3 h-3" /> Image URL
                    </button>
                  </div>
                </div>

                {thumbnailInputMode === 'file' ? (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailFileChange}
                      className="w-full text-xs text-vs-muted file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-vs-accent-light file:text-vs-accent hover:file:bg-vs-accent/20 cursor-pointer"
                    />
                    <p className="text-[10px] text-vs-subtle mt-1">PNG, JPG, WebP up to 5MB</p>
                  </div>
                ) : (
                  <input
                    type="url"
                    value={createForm.thumbnail}
                    onChange={(e) => setCreateForm({ ...createForm, thumbnail: e.target.value })}
                    className={inputClass}
                    placeholder="https://images.unsplash.com/photo-..."
                  />
                )}

                {createForm.thumbnail && (
                  <div className="mt-2 flex items-center justify-between p-2.5 bg-vs-surface-2 border border-vs-border rounded">
                    <div className="flex items-center gap-3">
                      <img
                        src={createForm.thumbnail}
                        alt="Thumbnail Preview"
                        className="w-16 h-10 object-cover rounded border border-vs-border"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <span className="text-[11px] text-vs-muted font-medium">Selected Thumbnail Preview</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, thumbnail: '' })}
                      className="text-[11px] text-rose-500 hover:underline font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Assignment Details */}
              <div className="p-4 bg-vs-surface-2 border border-vs-border rounded space-y-3">
                <span className="font-bold text-vs-text block">Course Assignment & Rubric</span>

                <div>
                  <label className="block font-medium mb-1">Assignment Title</label>
                  <input
                    type="text"
                    required
                    value={createForm.assignment.title}
                    onChange={(e) => setCreateForm({
                      ...createForm,
                      assignment: { ...createForm.assignment, title: e.target.value }
                    })}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1">Assignment Prompt</label>
                  <textarea
                    rows={2}
                    required
                    value={createForm.assignment.prompt}
                    onChange={(e) => setCreateForm({
                      ...createForm,
                      assignment: { ...createForm.assignment, prompt: e.target.value }
                    })}
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium mb-1">Starter Code</label>
                    <input
                      type="text"
                      value={createForm.assignment.starterCode}
                      onChange={(e) => setCreateForm({
                        ...createForm,
                        assignment: { ...createForm.assignment, starterCode: e.target.value }
                      })}
                      className={inputClass}
                      placeholder="// starter code"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Verification Rubric Terms</label>
                    <input
                      type="text"
                      value={createForm.assignment.rubric}
                      onChange={(e) => setCreateForm({
                        ...createForm,
                        assignment: { ...createForm.assignment, rubric: e.target.value }
                      })}
                      className={inputClass}
                      placeholder="key terms, functions, selectors"
                    />
                  </div>
                </div>
              </div>

              {createError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded text-xs text-red-600 dark:text-red-400">
                  {createError}
                </div>
              )}

              <button
                type="submit"
                disabled={creatingCourse}
                className="w-full py-2.5 bg-vs-accent hover:bg-vs-accent-hover text-white font-bold rounded text-xs transition-all btn-scale shadow-sm"
              >
                {creatingCourse
                  ? 'Saving Course...'
                  : isEditMode
                  ? 'Save Updates & Request Admin Re-Approval'
                  : 'Submit Course Proposal for Admin Approval'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DELETE COURSE CONFIRMATION MODAL */}
      {showDeleteConfirm && selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-vs-surface border border-vs-border rounded-xl shadow-xl overflow-hidden text-vs-text p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-2 bg-rose-500/10 rounded-full">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-vs-text">Delete Course Proposal?</h3>
            </div>

            <p className="text-xs text-vs-muted leading-relaxed">
              Are you sure you want to delete <strong className="text-vs-text">"{selectedCourse.title}"</strong>? This will permanently remove the course and its configuration.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-vs-border">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-vs-surface-2 border border-vs-border hover:bg-vs-border text-vs-text text-xs font-semibold rounded transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingCourse}
                onClick={handleDeleteCourse}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded transition-colors"
              >
                {deletingCourse ? 'Deleting...' : 'Delete Course'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
