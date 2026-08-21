import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useScrollReveal } from '../context/useScrollReveal';
import { coursesAPI, enrollmentsAPI, errMsg } from '../lib/api';
import { 
  Search, 
  Sparkles, 
  BookOpen, 
  CheckCircle2, 
  Play, 
  Code, 
  FileText, 
  Award, 
  CreditCard, 
  X,
  UserCheck,
  ShieldCheck,
  Zap,
  ArrowRight
} from 'lucide-react';

export default function ExplorePage({ onOpenAuth }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const stepsRef = useScrollReveal('.animate-fade-up');

  const [courses, setCourses] = useState([]);
  const [enrolledMap, setEnrolledMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  
  // Selected course for detail modal / checkout
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
    if (!user) {
      onOpenAuth();
      return;
    }
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

  return (
    <div className="min-h-screen bg-vs-bg text-vs-text pb-20">
      
      {/* Hero Banner */}
      <section className="relative overflow-hidden border-b border-vs-border bg-gradient-to-b from-vs-surface via-indigo-950/10 dark:via-indigo-950/40 to-vs-bg py-16 px-4 sm:px-6 lg:px-8">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 blur-3xl pointer-events-none" />
        
        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-500 dark:text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Hackathon MVP • Applied Skill Verification Engine
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-vs-text via-vs-text to-indigo-400 dark:from-white dark:via-slate-100 dark:to-indigo-200 bg-clip-text text-transparent">
            Don't Just Finish Courses. <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Prove Your Skills.
            </span>
          </h1>

          <p className="text-vs-muted text-base sm:text-lg max-w-3xl mx-auto leading-relaxed">
            VidyaSetu bridges the gap between completion certificates and real software capability.
            Watch module videos, solve real coding challenges, clear an AI viva interview, and get your skills human-verified.
          </p>

          {/* Process Steps — scroll-reveal with staggered delay */}
          <div ref={stepsRef} className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div
              className="animate-fade-up p-4 bg-vs-surface border border-vs-border rounded-2xl shadow-sm"
              style={{ animationDelay: '0ms' }}
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-500 flex items-center justify-center font-bold text-sm mb-2">1</div>
              <h4 className="text-xs font-bold text-vs-text">Course Video Modules</h4>
              <p className="text-[11px] text-vs-muted mt-1">Interactive modules + rich note editor</p>
            </div>
            <div
              className="animate-fade-up p-4 bg-vs-surface border border-vs-border rounded-2xl shadow-sm"
              style={{ animationDelay: '100ms' }}
            >
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-500 flex items-center justify-center font-bold text-sm mb-2">2</div>
              <h4 className="text-xs font-bold text-vs-text">Real Challenge</h4>
              <p className="text-[11px] text-vs-muted mt-1">Locked editor with test case runner</p>
            </div>
            <div
              className="animate-fade-up p-4 bg-vs-surface border border-vs-border rounded-2xl shadow-sm"
              style={{ animationDelay: '200ms' }}
            >
              <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-500 flex items-center justify-center font-bold text-sm mb-2">3</div>
              <h4 className="text-xs font-bold text-vs-text">AI Viva Interview</h4>
              {/* Copy fix: removed hardcoded "5" */}
              <p className="text-[11px] text-vs-muted mt-1">Dynamic questions on your code</p>
            </div>
            <div
              className="animate-fade-up p-4 bg-vs-surface border border-vs-border rounded-2xl shadow-sm"
              style={{ animationDelay: '300ms' }}
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-sm mb-2">4</div>
              <h4 className="text-xs font-bold text-vs-text">Verified Skill Tag</h4>
              <p className="text-[11px] text-vs-muted mt-1">AI + Teacher sign-off portfolio entry</p>
            </div>
          </div>

        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        
        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-3 w-4 h-4 text-vs-muted" />
            <input
              type="text"
              placeholder="Search courses or skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-vs-surface border border-vs-border rounded-xl text-sm text-vs-text placeholder-vs-muted focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all btn-scale ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-vs-surface text-vs-muted hover:text-vs-text border border-vs-border'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

        </div>

        {/* Course Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-80 bg-vs-surface border border-vs-border rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-20 bg-vs-surface border border-vs-border rounded-2xl">
            <BookOpen className="w-12 h-12 text-vs-subtle mx-auto mb-3" />
            <h3 className="text-lg font-bold text-vs-text">No courses match your search</h3>
            <p className="text-xs text-vs-muted mt-1">Try clearing filters or search terms.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => {
              const enrollment = enrolledMap[course._id];
              const isEnrolled = Boolean(enrollment);

              return (
                <div
                  key={course._id}
                  className="group bg-vs-surface hover:bg-vs-surface border border-vs-border hover:border-indigo-500/40 rounded-2xl overflow-hidden transition-all duration-200 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:scale-[1.02] flex flex-col justify-between"
                >
                  <div>
                    {/* Thumbnail Image */}
                    <div className="relative h-44 overflow-hidden bg-vs-surface-2">
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-vs-surface via-transparent to-transparent" />
                      
                      <div className="absolute top-3 left-3 flex gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-vs-bg/80 backdrop-blur-md border border-vs-border text-[11px] font-bold text-indigo-500 dark:text-indigo-400">
                          {course.skill}
                        </span>
                      </div>

                      <div className="absolute bottom-3 right-3 text-right">
                        <span className="text-xs font-semibold text-vs-text">
                          ₹{course.price}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 space-y-3">
                      <h3 className="text-lg font-bold text-vs-text group-hover:text-indigo-500 transition-colors line-clamp-1">
                        {course.title}
                      </h3>
                      
                      <p className="text-xs text-vs-muted line-clamp-2 leading-relaxed">
                        {course.description}
                      </p>

                      <div className="pt-2 flex items-center justify-between text-xs text-vs-muted border-t border-vs-border-subtle">
                        <span>Instructor: <strong className="text-vs-text">{course.instructor}</strong></span>
                        <span className="flex items-center gap-1 text-purple-500 font-medium">
                          <Zap className="w-3 h-3" />
                          {course.videos?.length || 5} Videos
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-5 pt-0">
                    {isEnrolled ? (
                      <button
                        onClick={() => navigate(`/course/${course._id}`)}
                        className="w-full py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 text-xs font-bold transition-all btn-scale flex items-center justify-center gap-2"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        {enrollment.status === 'VERIFIED' ? 'Verified Skill • View Course' : 'Continue Learning'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEnrollClick(course)}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all btn-scale flex items-center justify-center gap-2"
                      >
                        Enroll Now • ₹{course.price}
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

      {/* Mock Purchase / Checkout Modal */}
      {showCheckout && selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-vs-bg/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-vs-surface border border-vs-border rounded-2xl shadow-2xl overflow-hidden text-vs-text">
            
            <div className="p-6 bg-gradient-to-r from-indigo-900/20 dark:from-indigo-900/50 to-vs-surface border-b border-vs-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-500" />
                <h3 className="text-lg font-bold text-vs-text">Mock Checkout</h3>
              </div>
              <button
                onClick={() => setShowCheckout(false)}
                className="p-1 rounded-lg text-vs-muted hover:text-vs-text"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex gap-3 bg-vs-surface-2 p-3 rounded-xl border border-vs-border">
                <img
                  src={selectedCourse.thumbnail}
                  alt={selectedCourse.title}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div>
                  <h4 className="text-sm font-bold text-vs-text line-clamp-1">{selectedCourse.title}</h4>
                  <p className="text-xs text-indigo-500 dark:text-indigo-400 font-semibold mt-0.5">Skill: {selectedCourse.skill}</p>
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
                  <span className="font-semibold text-emerald-500">FREE (Hackathon Demo)</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-vs-text pt-2 border-t border-vs-border">
                  <span>Total Amount</span>
                  <span className="text-indigo-500">₹{selectedCourse.price}</span>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-medium text-rose-500">
                  {error}
                </div>
              )}

              <button
                onClick={handleConfirmPurchase}
                disabled={enrolling}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-600 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-all btn-scale flex items-center justify-center gap-2"
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
