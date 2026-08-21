import { useState, useEffect } from 'react';
import { coursesAPI, errMsg } from '../lib/api';
import { 
  LayoutDashboard, 
  Plus, 
  Trash2, 
  Edit3, 
  Users, 
  BookOpen, 
  Award, 
  CheckCircle2, 
  X,
  Code2,
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
      instructor: 'Dr. Faculty Member',
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
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400">Loading VidyaSetu Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      
      {/* Top Banner */}
      <div className="bg-slate-900 border-b border-slate-800 py-6 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold">
              <LayoutDashboard className="w-4 h-4" />
              Platform Administration
            </div>
            <h1 className="text-2xl font-extrabold text-white mt-2">Admin Course & Student Management</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Create, edit, or audit courses and view enrolled student rosters.
            </p>
          </div>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create New Course
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-semibold uppercase">Total Courses</span>
              <h3 className="text-2xl font-extrabold text-white mt-0.5">{courses.length}</h3>
            </div>
          </div>

          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-semibold uppercase">Selected Roster Students</span>
              <h3 className="text-2xl font-extrabold text-white mt-0.5">{enrolledStudents.length}</h3>
            </div>
          </div>

          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-semibold uppercase">Platform Engine</span>
              <h3 className="text-sm font-bold text-emerald-400 mt-1">Python AI + Node MERN</h3>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Courses List */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              Course Catalog ({courses.length})
            </h3>

            <div className="space-y-3">
              {courses.map((c) => {
                const isSelected = selectedCourse?._id === c._id;
                return (
                  <div
                    key={c._id}
                    onClick={() => handleSelectCourse(c)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-purple-950/40 border-purple-500/50 text-white shadow-lg'
                        : 'bg-slate-900/80 hover:bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-indigo-400">{c.skill}</span>
                      <h4 className="text-sm font-bold text-white line-clamp-1">{c.title}</h4>
                      <p className="text-xs text-slate-500">₹{c.price} • {c.instructor}</p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(c);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                        title="Edit Course"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCourse(c._id);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/60"
                        title="Delete Course"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Enrolled Roster Panel */}
          {selectedCourse && (
            <div className="lg:col-span-2 space-y-6">
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-6">
                
                <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-xs font-bold text-indigo-400">{selectedCourse.skill}</span>
                    <h2 className="text-xl font-bold text-white">{selectedCourse.title}</h2>
                    <p className="text-xs text-slate-400 mt-1">{selectedCourse.description}</p>
                  </div>

                  <span className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-emerald-400">
                    ₹{selectedCourse.price}
                  </span>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    Enrolled Students Roster ({enrolledStudents.length})
                  </h3>

                  {loadingStudents ? (
                    <p className="text-xs text-slate-400">Loading student roster...</p>
                  ) : enrolledStudents.length === 0 ? (
                    <p className="text-xs text-slate-500 italic p-4 bg-slate-950 rounded-2xl border border-slate-800/60">
                      No students currently enrolled in this course.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {enrolledStudents.map((st, idx) => (
                        <div
                          key={idx}
                          className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between text-xs"
                        >
                          <div>
                            <h4 className="font-bold text-white">{st.student?.name || 'Student'}</h4>
                            <span className="text-slate-500 text-[11px]">{st.student?.email}</span>
                          </div>

                          <div className="text-right">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              st.status === 'VERIFIED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'
                            }`}>
                              {st.status || 'ENROLLED'}
                            </span>
                            <span className="block text-[10px] text-slate-500 mt-0.5">
                              Enrolled: {new Date(st.createdAt).toLocaleDateString()}
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

      {/* Course Modal (Create / Edit) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-white max-h-[90vh] flex flex-col">
            
            <div className="p-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                {editingCourse ? 'Edit Course' : 'Create New VidyaSetu Course'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="p-6 overflow-y-auto space-y-4 text-xs">
              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 font-semibold">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Course Title</label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Skill Tag</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. React.js"
                    value={form.skill}
                    onChange={(e) => setForm({ ...form, skill: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Instructor</label>
                  <input
                    type="text"
                    required
                    value={form.instructor}
                    onChange={(e) => setForm({ ...form, instructor: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Category</label>
                  <input
                    type="text"
                    required
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                />
              </div>

              <div className="border-t border-slate-800 pt-4 space-y-3">
                <h4 className="font-bold text-indigo-400">Assignment Challenge Setup</h4>
                
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Assignment Title</label>
                  <input
                    type="text"
                    required
                    value={form.assignment.title}
                    onChange={(e) => setForm({
                      ...form,
                      assignment: { ...form.assignment, title: e.target.value }
                    })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Assignment Prompt</label>
                  <textarea
                    rows={3}
                    required
                    value={form.assignment.prompt}
                    onChange={(e) => setForm({
                      ...form,
                      assignment: { ...form.assignment, prompt: e.target.value }
                    })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-xl font-bold shadow-lg"
                >
                  {submitting ? 'Saving...' : 'Save Course'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
