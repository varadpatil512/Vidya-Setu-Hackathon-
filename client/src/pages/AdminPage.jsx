import { useState, useEffect } from 'react';
import { coursesAPI, errMsg } from '../lib/api';
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
  ShieldCheck
} from 'lucide-react';

export default function AdminPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

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
  });

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

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
    });
    setShowModal(true);
  };

  const handleDeleteCourse = async (id) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
      await coursesAPI.delete(id);
      await fetchCourses();
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
              Manage courses, view enrolled student rosters, and inspect verification status.
            </p>
          </div>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-vs-accent hover:bg-vs-accent-hover text-white text-xs font-semibold rounded transition-colors btn-scale"
          >
            <Plus className="w-4 h-4" />
            Create Course
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Courses List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-vs-muted uppercase tracking-wider">
              Courses ({courses.length})
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
                    <span className="text-xs text-vs-muted">By {selectedCourse.instructor}</span>
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
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-vs-surface border border-vs-border rounded-lg shadow-xl overflow-hidden text-vs-text max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-vs-border flex items-center justify-between">
              <h3 className="text-base font-bold text-vs-text">
                {editingCourse ? 'Edit Course' : 'Create New Course'}
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
                  <label className="block font-semibold mb-1">Skill Verified</label>
                  <input
                    type="text"
                    required
                    value={form.skill}
                    onChange={(e) => setForm({ ...form, skill: e.target.value })}
                    className={inputClass}
                    placeholder="e.g. React Custom Hooks"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Instructor</label>
                  <input
                    type="text"
                    required
                    value={form.instructor}
                    onChange={(e) => setForm({ ...form, instructor: e.target.value })}
                    className={inputClass}
                  />
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
                {submitting ? 'Saving...' : editingCourse ? 'Update Course' : 'Create Course'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
