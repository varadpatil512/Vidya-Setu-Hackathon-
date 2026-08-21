import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { coursesAPI, enrollmentsAPI, errMsg } from '../lib/api';
import {
  Search,
  BookOpen,
  CheckCircle2,
  Play,
  CreditCard,
  X,
  ArrowRight,
  Clock,
  Users,
  Star,
  Sparkles,
} from 'lucide-react';

export default function CoursesPage({ onOpenAuth }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [enrolledMap, setEnrolledMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCoursesAndEnrollments();
  }, [user]);

  const fetchCoursesAndEnrollments = async () => {
    try {
      setLoading(true);
      const res = await coursesAPI.getAll();
      setCourses(res.data || []);
      if (user) {
        const enrollRes = await enrollmentsAPI.getMine();
        const map = {};
        (enrollRes.data || []).forEach(e => {
          map[e.course?._id || e.course] = e;
        });
        setEnrolledMap(map);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollClick = (course) => {
    if (!user) { onOpenAuth(); return; }
    setSelectedCourse(course);
    setShowCheckout(true);
  };

  const handleConfirmPurchase = async () => {
    if (!selectedCourse) return;
    try {
      setEnrolling(true);
      setError('');
      await enrollmentsAPI.enroll(selectedCourse._id);
      setShowCheckout(false);
      navigate(`/course/${selectedCourse._id}`);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setEnrolling(false);
    }
  };

  const categories = ['ALL', ...new Set(courses.map(c => c.category || 'Development'))];

  const filteredCourses = courses.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
                          c.skill.toLowerCase().includes(search.toLowerCase()) ||
                          c.description.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || c.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const featuredCourse = filteredCourses[0];
  const regularCourses = filteredCourses.slice(1);

  return (
    <div className="min-h-screen bg-vs-bg text-vs-text pb-24">

      {/* Header Banner */}
      <div className="bg-vs-surface border-b border-vs-border py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-vs-accent-light text-vs-accent text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Skill Verification Catalog
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-vs-text tracking-tight">
              Explore Skill Courses
            </h1>
            <p className="text-xs text-vs-muted mt-1">
              {filteredCourses.length} verification courses ready to enroll & prove capability.
            </p>
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-vs-subtle" />
              <input
                type="text"
                placeholder="Search courses or skills..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2.5 bg-vs-surface-2 border border-vs-border rounded text-xs text-vs-text placeholder-vs-subtle focus:outline-none focus:border-vs-accent focus:ring-1 focus:ring-vs-accent/20 w-full sm:w-64 transition-colors"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-vs-accent text-white shadow-xs'
                      : 'bg-vs-surface-2 text-vs-muted hover:text-vs-text border border-vs-border hover:border-vs-accent/40'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-80 bg-vs-surface border border-vs-border rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-24 bg-vs-surface border border-vs-border rounded-xl">
            <BookOpen className="w-10 h-10 text-vs-subtle mx-auto mb-3" />
            <h3 className="font-display text-base font-semibold text-vs-text">No courses match your search</h3>
            <p className="text-xs text-vs-muted mt-1">Try clearing search terms or category filters.</p>
          </div>
        ) : (
          <div className="space-y-8">

            {/* Featured Course Spotlight Card */}
            {featuredCourse && (
              <div className="group bg-vs-surface border border-vs-border hover:border-vs-accent/40 rounded-xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 grid grid-cols-1 lg:grid-cols-12 items-center">
                <div className="lg:col-span-6 relative h-64 lg:h-full min-h-[260px] overflow-hidden bg-vs-surface-2">
                  <img
                    src={featuredCourse.thumbnail}
                    alt={featuredCourse.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="px-3 py-1 rounded bg-vs-accent text-white text-xs font-bold shadow-xs">
                      FEATURED COURSE
                    </span>
                    <span className="px-3 py-1 rounded bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs text-xs font-semibold text-vs-accent border border-vs-accent/20">
                      {featuredCourse.category}
                    </span>
                  </div>
                </div>

                <div className="lg:col-span-6 p-6 sm:p-8 space-y-4">
                  <div className="flex items-center gap-2 text-xs text-vs-accent font-semibold">
                    <Star className="w-4 h-4 text-amber-500 fill-current" />
                    Verified Skill Track
                  </div>

                  <h3 className="font-display text-2xl font-bold text-vs-text group-hover:text-vs-accent transition-colors leading-tight">
                    {featuredCourse.title}
                  </h3>

                  <p className="text-xs text-vs-muted leading-relaxed line-clamp-3">
                    {featuredCourse.description}
                  </p>

                  <div className="pt-2 flex items-center justify-between border-t border-vs-border text-xs text-vs-muted">
                    <span>Instructor: <strong className="text-vs-text">{featuredCourse.instructor}</strong></span>
                    <span className="font-bold text-vs-text text-base">₹{featuredCourse.price}</span>
                  </div>

                  <div>
                    {enrolledMap[featuredCourse._id] ? (
                      <button
                        onClick={() => navigate(`/course/${featuredCourse._id}`)}
                        className="w-full py-3 rounded border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors flex items-center justify-center gap-2"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        Continue Course
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEnrollClick(featuredCourse)}
                        className="w-full py-3 rounded bg-vs-accent hover:bg-vs-accent-hover text-white font-bold text-xs shadow-md shadow-sky-500/20 transition-all flex items-center justify-center gap-2 btn-scale"
                      >
                        Enroll Featured Track · ₹{featuredCourse.price}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Course Cards Grid */}
            {regularCourses.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {regularCourses.map((course) => {
                  const enrollment = enrolledMap[course._id];
                  const isEnrolled = Boolean(enrollment);

                  return (
                    <div
                      key={course._id}
                      className="group bg-vs-surface border border-vs-border rounded-xl overflow-hidden hover:shadow-xl hover:border-vs-accent/40 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
                    >
                      <div>
                        <div className="relative h-48 overflow-hidden bg-vs-surface-2">
                          <img
                            src={course.thumbnail}
                            alt={course.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute top-3 left-3">
                            <span className="px-2.5 py-1 rounded bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs text-[11px] font-semibold text-vs-accent border border-vs-accent/20">
                              {course.category || 'Development'}
                            </span>
                          </div>
                          {isEnrolled && (
                            <div className="absolute top-3 right-3">
                              <span className="px-2.5 py-1 rounded bg-emerald-500 text-white text-[11px] font-bold shadow-xs flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> ENROLLED
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="p-5 space-y-3">
                          <h3 className="font-display text-base font-bold text-vs-text group-hover:text-vs-accent transition-colors line-clamp-1 leading-snug">
                            {course.title}
                          </h3>

                          <p className="text-xs text-vs-muted line-clamp-2 leading-relaxed">
                            {course.description}
                          </p>

                          <div className="pt-2 flex items-center justify-between text-xs text-vs-muted border-t border-vs-border">
                            <span className="flex items-center gap-1 truncate max-w-[150px]">
                              <Users className="w-3.5 h-3.5 text-vs-subtle flex-shrink-0" />
                              {course.instructor}
                            </span>
                            <span className="flex items-center gap-1 text-vs-accent font-medium flex-shrink-0">
                              <Clock className="w-3.5 h-3.5" />
                              {course.videos?.length || 1} Lecture
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-xs font-semibold text-vs-accent bg-vs-accent-light px-2.5 py-1 rounded">
                              {course.skill}
                            </span>
                            <span className="text-base font-bold text-vs-text">₹{course.price}</span>
                          </div>
                        </div>
                      </div>

                      <div className="px-5 pb-5 pt-2">
                        {isEnrolled ? (
                          <button
                            onClick={() => navigate(`/course/${course._id}`)}
                            className="w-full py-2.5 rounded border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors flex items-center justify-center gap-2"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            {enrollment.status === 'VERIFIED' ? 'Verified Skill · View Course' : 'Continue Learning'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEnrollClick(course)}
                            className="w-full py-2.5 rounded bg-vs-accent hover:bg-vs-accent-hover text-white text-xs font-bold shadow-md shadow-sky-500/20 transition-all flex items-center justify-center gap-2 btn-scale"
                          >
                            Enroll Now · ₹{course.price}
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

      </div>

      {/* Checkout Modal */}
      {showCheckout && selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-md bg-vs-surface border border-vs-border rounded-lg shadow-2xl overflow-hidden text-vs-text">

            <div className="px-6 py-4 border-b border-vs-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-vs-accent" />
                <h3 className="font-display text-base font-bold text-vs-text">Mock Checkout</h3>
              </div>
              <button
                onClick={() => setShowCheckout(false)}
                className="p-1.5 rounded text-vs-muted hover:text-vs-text hover:bg-vs-surface-2 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex gap-3 bg-vs-surface-2 p-3 rounded border border-vs-border">
                <img
                  src={selectedCourse.thumbnail}
                  alt={selectedCourse.title}
                  className="w-16 h-16 rounded object-cover flex-shrink-0"
                />
                <div className="min-w-0">
                  <h4 className="font-display text-sm font-bold text-vs-text line-clamp-1">{selectedCourse.title}</h4>
                  <p className="text-xs text-vs-accent font-semibold mt-0.5">Skill: {selectedCourse.skill}</p>
                  <p className="text-xs text-vs-muted">By {selectedCourse.instructor}</p>
                </div>
              </div>

              <div className="space-y-2 border-t border-vs-border pt-4 text-xs">
                <div className="flex justify-between text-vs-muted">
                  <span>Course Price</span>
                  <span className="font-semibold text-vs-text">₹{selectedCourse.price}</span>
                </div>
                <div className="flex justify-between text-vs-muted">
                  <span>AI Viva & Verification Engine</span>
                  <span className="font-semibold text-emerald-600">FREE (Hackathon Demo)</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-vs-text pt-2 border-t border-vs-border">
                  <span>Total Amount</span>
                  <span className="text-vs-accent">₹{selectedCourse.price}</span>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded text-xs text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              <button
                onClick={handleConfirmPurchase}
                disabled={enrolling}
                className="w-full py-3 bg-vs-accent hover:bg-vs-accent-hover text-white font-bold text-xs rounded shadow-lg shadow-sky-500/20 transition-all btn-scale flex items-center justify-center gap-2"
              >
                {enrolling ? 'Processing Order...' : `Pay ₹${selectedCourse.price} & Unlock Course`}
              </button>

              <p className="text-[11px] text-center text-vs-muted">
                Simulated payment transaction for hackathon demo. Instant access granted.
              </p>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
