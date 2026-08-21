import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { coursesAPI, enrollmentsAPI, notesAPI, submissionsAPI, errMsg } from '../lib/api';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { 
  Play, 
  CheckCircle2, 
  FileText, 
  Code2, 
  Sparkles, 
  Save, 
  Lock, 
  PlaySquare, 
  AlertTriangle, 
  Terminal, 
  ArrowRight,
  HelpCircle,
  Clock,
  ShieldCheck,
  Check
} from 'lucide-react';

export default function ClassroomPage() {
  const { id: courseId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [activeTab, setActiveTab] = useState('video'); // 'video' | 'notes' | 'assignment'
  const [currentVideoIdx, setCurrentVideoIdx] = useState(0);

  // Notes state
  const [notes, setNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSavedMsg, setNotesSavedMsg] = useState(false);

  // Assignment state
  const [submission, setSubmission] = useState(null);
  const [codeContent, setCodeContent] = useState('');
  const [textContent, setTextContent] = useState('');
  const [pasteEvents, setPasteEvents] = useState(0);
  const [snapshots, setSnapshots] = useState([]);
  
  // Test execution state
  const [testResults, setTestResults] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const lastLenRef = useRef(0);

  useEffect(() => {
    fetchCourseData();
    fetchNotesData();
    fetchSubmissionsData();
  }, [courseId]);

  const fetchCourseData = async () => {
    try {
      const courseRes = await coursesAPI.getById(courseId);
      setCourse(courseRes.data);

      const enrollRes = await enrollmentsAPI.getMine();
      const myEnrollment = (enrollRes.data || []).find(
        (e) => (e.course?._id || e.course) === courseId
      );
      if (!myEnrollment) {
        navigate('/');
        return;
      }
      setEnrollment(myEnrollment);

      // Default code prompt
      if (courseRes.data?.assignment?.type === 'code') {
        setCodeContent(courseRes.data.assignment.starterCode || '// Write your code solution here\n');
      } else {
        setTextContent(courseRes.data.assignment.starterText || '');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNotesData = async () => {
    try {
      const res = await notesAPI.getNotes(courseId);
      if (res.data?.content) {
        setNotes(res.data.content);
      }
    } catch (err) {
      // Notes optional
    }
  };

  const fetchSubmissionsData = async () => {
    try {
      const res = await submissionsAPI.getMine();
      const mySub = (res.data || []).find(
        (s) => (s.course?._id || s.course) === courseId
      );
      if (mySub) {
        setSubmission(mySub);
        if (mySub.code) setCodeContent(mySub.code);
        if (mySub.text) setTextContent(mySub.text);
        if (mySub.verifyResult) setTestResults(mySub.verifyResult);
        if (mySub.pasteEvents) setPasteEvents(mySub.pasteEvents);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleVideoWatched = async (index) => {
    try {
      const res = await enrollmentsAPI.markVideoWatched(courseId, index, true);
      setEnrollment(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveNotes = async () => {
    try {
      setNotesSaving(true);
      await notesAPI.saveNotes(courseId, notes);
      setNotesSavedMsg(true);
      setTimeout(() => setNotesSavedMsg(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setNotesSaving(false);
    }
  };

  // Locked Editor Paste Detection & Snapshot Logger
  const handleCodeChange = (value) => {
    setCodeContent(value);
    const diff = Math.abs(value.length - lastLenRef.current);
    lastLenRef.current = value.length;

    // Detect large paste (>150 chars jump)
    if (diff > 150) {
      setPasteEvents((prev) => prev + 1);
    }

    // Log process snapshot
    const newSnap = { at: new Date().toISOString(), length: value.length };
    setSnapshots((prev) => [...prev.slice(-50), newSnap]);
  };

  // Run Test Runner (Local Verification)
  const handleRunTests = async () => {
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        courseId,
        type: course.assignment.type,
        code: course.assignment.type === 'code' ? codeContent : '',
        text: course.assignment.type === 'text' ? textContent : '',
        snapshots,
      };
      const res = await submissionsAPI.submit(payload);
      setSubmission(res.data);
      if (res.data.verifyResult) {
        setTestResults(res.data.verifyResult);
      }
    } catch (err) {
      setError(errMsg(err));
    } fontally: {
      setSubmitting(false);
    }
  };

  const handleStartInterview = async () => {
    if (!submission) return;
    navigate(`/interview/${submission._id}`);
  };

  if (!course || !enrollment) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400">Loading VidyaSetu Classroom...</p>
        </div>
      </div>
    );
  }

  const allVideosWatched = enrollment.videoWatched && enrollment.videoWatched.every(Boolean);
  const videosCount = course.videos?.length || 5;
  const currentVideo = course.videos?.[currentVideoIdx] || { title: `Module ${currentVideoIdx + 1}`, duration: '12:00', url: '' };

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      
      {/* Top Header Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 sm:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold uppercase">
              {course.skill}
            </span>
            <h1 className="text-xl font-bold text-white">{course.title}</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">Instructor: {course.instructor}</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('video')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'video'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            Videos & Modules
          </button>
          
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'notes'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Notes Editor
          </button>

          <button
            onClick={() => setActiveTab('assignment')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'assignment'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            Assignment Challenge
            {!allVideosWatched && <Lock className="w-3 h-3 text-amber-400 ml-1" />}
          </button>
        </div>
      </div>

      {/* Tab 1: Video Learning & Modules */}
      {activeTab === 'video' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Video Screen */}
          <div className="lg:col-span-2 space-y-6">
            <div className="relative aspect-video bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-center items-center group shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-950/60 via-slate-950/80 to-purple-950/60" />
              
              <div className="relative z-10 text-center p-8 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600/80 text-white flex items-center justify-center mx-auto shadow-xl group-hover:scale-110 transition-transform">
                  <Play className="w-8 h-8 fill-current ml-1" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{currentVideo.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">Duration: {currentVideo.duration}</p>
                </div>
              </div>

              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-10 bg-slate-900/80 backdrop-blur-md p-3 rounded-xl border border-slate-800">
                <span className="text-xs font-semibold text-slate-300">
                  Module {currentVideoIdx + 1} of {videosCount}
                </span>
                
                <button
                  onClick={() => handleVideoWatched(currentVideoIdx)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    enrollment.videoWatched?.[currentVideoIdx]
                      ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-indigo-600 text-white hover:bg-indigo-500'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {enrollment.videoWatched?.[currentVideoIdx] ? 'Watched' : 'Mark as Watched'}
                </button>
              </div>
            </div>

            <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
              <h3 className="text-lg font-bold text-white">About this Module</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Watch all video modules in sequence. Your notes are automatically synchronized per course.
                Once all videos are completed, the Applied Challenge and AI Viva Interview will unlock.
              </p>
            </div>
          </div>

          {/* Module List Sidebar */}
          <div className="space-y-4">
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <h3 className="text-sm font-bold text-white mb-1">Course Content & Progress</h3>
              <p className="text-xs text-slate-400 mb-4">
                Watched {enrollment.videoWatched?.filter(Boolean).length || 0} of {videosCount} videos
              </p>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden mb-6">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-500"
                  style={{
                    width: `${((enrollment.videoWatched?.filter(Boolean).length || 0) / videosCount) * 100}%`,
                  }}
                />
              </div>

              {/* Modules List */}
              <div className="space-y-2">
                {(course.videos || []).map((vid, idx) => {
                  const watched = enrollment.videoWatched?.[idx];
                  const isCurrent = currentVideoIdx === idx;

                  return (
                    <button
                      key={idx}
                      onClick={() => setCurrentVideoIdx(idx)}
                      className={`w-full p-3 rounded-xl text-left border transition-all flex items-center justify-between ${
                        isCurrent
                          ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                          : 'bg-slate-950/60 hover:bg-slate-950 border-slate-800/80 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                          watched ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {watched ? <Check className="w-4 h-4" /> : idx + 1}
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold line-clamp-1">{vid.title}</h4>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" /> {vid.duration}
                          </span>
                        </div>
                      </div>

                      {isCurrent && <Play className="w-3.5 h-3.5 text-indigo-400 fill-current" />}
                    </button>
                  );
                })}
              </div>

              {allVideosWatched && (
                <button
                  onClick={() => setActiveTab('assignment')}
                  className="w-full mt-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  Proceed to Challenge & AI Viva
                </button>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Tab 2: Notes Editor */}
      {activeTab === 'notes' && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-400" />
                  Course Study Notes
                </h2>
                <p className="text-xs text-slate-400">
                  Notes are stored per course and persist automatically across sessions.
                </p>
              </div>

              <button
                onClick={handleSaveNotes}
                disabled={notesSaving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shadow-md shadow-indigo-600/20"
              >
                <Save className="w-4 h-4" />
                {notesSaving ? 'Saving...' : notesSavedMsg ? 'Saved!' : 'Save Notes'}
              </button>
            </div>

            <textarea
              rows={16}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Write your study notes, key takeaways, code logic, or thoughts here..."
              className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono leading-relaxed resize-y"
            />
          </div>
        </div>
      )}

      {/* Tab 3: Locked Coding Assignment & Test Runner */}
      {activeTab === 'assignment' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          
          {!allVideosWatched && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-3 text-amber-300 text-xs font-semibold">
              <Lock className="w-5 h-5 flex-shrink-0" />
              <span>Complete watching all video modules first before attempting the assignment challenge.</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Prompt & Instructions */}
            <div className="space-y-6">
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" /> Real Challenge Assignment
                </div>
                
                <h2 className="text-xl font-bold text-white">{course.assignment.title}</h2>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                  {course.assignment.prompt}
                </p>

                {/* Paste Detection Logger Indicator */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Paste Events Detected
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      pasteEvents > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {pasteEvents} paste event(s)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    VidyaSetu logs periodic code snapshots. Large copy-pastes will increase AI viva scrutiny or trigger teacher review.
                  </p>
                </div>
              </div>

              {/* Verification Status */}
              {submission && (
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Submission Status
                  </h3>

                  <div className="flex items-center justify-between text-xs p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-400">Current Status</span>
                    <span className="font-bold text-indigo-400 uppercase">{submission.status}</span>
                  </div>

                  {submission.status === 'CODE_VERIFIED' && (
                    <button
                      onClick={handleStartInterview}
                      className="w-full py-3 bg-gradient-to-r from-emerald-500 via-indigo-600 to-purple-600 hover:from-emerald-600 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      Start 5-Question AI Viva Interview
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Locked Editor & Test Runner */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Code/Text Editor */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                
                <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-400">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-indigo-400" />
                    <span>Locked Submission Editor ({course.assignment.type.toUpperCase()})</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">JS Sandbox Runtime</span>
                </div>

                {course.assignment.type === 'code' ? (
                  <div className="text-sm font-mono">
                    <CodeMirror
                      value={codeContent}
                      height="380px"
                      theme={oneDark}
                      extensions={[javascript({ jsx: true })]}
                      onChange={handleCodeChange}
                    />
                  </div>
                ) : (
                  <textarea
                    rows={14}
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Write your text submission here..."
                    className="w-full p-4 bg-slate-950 text-sm text-slate-200 placeholder-slate-600 focus:outline-none font-mono"
                  />
                )}

                <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    Snapshots captured: {snapshots.length}
                  </p>

                  <button
                    onClick={handleRunTests}
                    disabled={submitting}
                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
                  >
                    <PlaySquare className="w-4 h-4" />
                    {submitting ? 'Running Test Cases...' : 'Run Test Cases & Submit'}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs font-semibold text-rose-400">
                  {error}
                </div>
              )}

              {/* Test Case Output Terminal */}
              {testResults && (
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-emerald-400" />
                      Test Execution Results
                    </h3>

                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      testResults.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {testResults.passed ? 'ALL TEST CASES PASSED' : 'SOME TESTS FAILED'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {(testResults.results || []).map((res, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between ${
                          res.passed
                            ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                        }`}
                      >
                        <div>
                          <span className="font-bold">{res.name}</span>
                          <span className="block text-[11px] opacity-80 mt-0.5">
                            Expected: {res.expected} | Actual: {res.actual}
                          </span>
                        </div>
                        <span className="font-bold">{res.passed ? '✓ PASS' : '✗ FAIL'}</span>
                      </div>
                    ))}
                  </div>

                  {testResults.passed && (
                    <div className="pt-2 text-center">
                      <button
                        onClick={handleStartInterview}
                        className="w-full py-3 bg-gradient-to-r from-emerald-500 via-indigo-600 to-purple-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        Code Passed! Start AI Viva Interview Now
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
