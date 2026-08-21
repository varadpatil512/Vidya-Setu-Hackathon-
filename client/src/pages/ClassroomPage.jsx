import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { coursesAPI, enrollmentsAPI, notesAPI, submissionsAPI, errMsg } from '../lib/api';
import Editor from '@monaco-editor/react';
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



const getYouTubeId = (url) => {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : null;
};

export default function ClassroomPage() {
  const { id: courseId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [activeTab, setActiveTab] = useState('video'); // 'video' | 'notes' | 'assignment'
  const [currentVideoIdx, setCurrentVideoIdx] = useState(0);
  const [canMarkWatched, setCanMarkWatched] = useState(false);
  const [useHtmlFallback, setUseHtmlFallback] = useState(false);

  useEffect(() => {
    setUseHtmlFallback(false);
  }, [currentVideoIdx]);

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
  const videoRef = useRef(null);

  useEffect(() => {
    fetchCourseData();
    fetchNotesData();
    fetchSubmissionsData();
  }, [courseId]);

  useEffect(() => {
    const isAlreadyWatched = !!enrollment?.videoWatched?.[currentVideoIdx];
    setCanMarkWatched(isAlreadyWatched);
  }, [currentVideoIdx, enrollment]);

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
      if (courseRes.data?.assignment?.type === 'code' || courseRes.data?.assignment?.language) {
        setCodeContent(courseRes.data.assignment.starterCode || '');
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
      setCanMarkWatched(true);
    } catch (err) {
      console.error(err);
    }
  };

  // HTML5 Video 90% duration tracker
  const handleTimeUpdate = (e) => {
    const { currentTime, duration } = e.target;
    if (duration > 0 && currentTime / duration >= 0.9) {
      if (!enrollment?.videoWatched?.[currentVideoIdx]) {
        setCanMarkWatched(true);
        handleVideoWatched(currentVideoIdx);
      }
    }
  };

  const currentVideoUrl = course?.videos?.[currentVideoIdx]?.url || '';
  const ytId = getYouTubeId(currentVideoUrl);

  // YouTube embed postMessage & IFrame API 90% threshold tracker
  useEffect(() => {
    if (!ytId) return;

    let interval;

    const handleWindowMessage = (event) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data && data.info) {
          const { currentTime, duration } = data.info;
          if (duration > 0 && currentTime / duration >= 0.9) {
            if (!enrollment?.videoWatched?.[currentVideoIdx]) {
              setCanMarkWatched(true);
              handleVideoWatched(currentVideoIdx);
            }
          }
        }
      } catch (err) {
        // ignore non-json messages
      }
    };

    window.addEventListener('message', handleWindowMessage);

    let ytPlayer;
    if (window.YT && window.YT.Player) {
      try {
        ytPlayer = new window.YT.Player('yt-video-frame', {
          events: {
            onStateChange: (evt) => {
              if (evt.data === window.YT.PlayerState.PLAYING) {
                interval = setInterval(() => {
                  if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function' && typeof ytPlayer.getDuration === 'function') {
                    const cur = ytPlayer.getCurrentTime();
                    const dur = ytPlayer.getDuration();
                    if (dur > 0 && cur / dur >= 0.9) {
                      if (!enrollment?.videoWatched?.[currentVideoIdx]) {
                        setCanMarkWatched(true);
                        handleVideoWatched(currentVideoIdx);
                      }
                      if (interval) clearInterval(interval);
                    }
                  }
                }, 800);
              } else {
                if (interval) clearInterval(interval);
              }
            },
          },
        });
      } catch (e) {}
    } else {
      interval = setInterval(() => {
        const frame = document.getElementById('yt-video-frame');
        if (frame && frame.contentWindow) {
          frame.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), '*');
        }
      }, 1000);
    }

    return () => {
      window.removeEventListener('message', handleWindowMessage);
      if (interval) clearInterval(interval);
    };
  }, [currentVideoIdx, ytId, enrollment]);

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

  // Intercept & block copy-paste events
  const handlePasteAttempt = (e) => {
    e.preventDefault();
    setPasteEvents((prev) => prev + 1);
    const newSnap = { at: new Date().toISOString(), length: codeContent.length || textContent.length, content: '[PASTE_BLOCKED]' };
    setSnapshots((prev) => [...prev.slice(-50), newSnap]);
  };

  // Block right-click context menu in editor
  const handleContextMenu = (e) => {
    e.preventDefault();
  };

  const handleEditorBeforeMount = (monaco) => {
    // HTML autocomplete — include CSS and JS completions inside HTML
    monaco.languages.html.htmlDefaults.setOptions({
      suggest: { html5: true },
      validate: true,
      format: { enable: true },
    });
    // CSS autocomplete
    monaco.languages.css.cssDefaults.setOptions({ validate: true });
    monaco.languages.css.scssDefaults.setOptions({ validate: true });
    // JS/TS autocomplete
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.Latest,
      allowNonTsExtensions: true,
      lib: ['dom', 'es2020'],
    });
  };

  const handleEditorDidMount = (editor, monaco) => {
    // Intercept keyboard paste (Ctrl+V / Cmd+V) inside Monaco Editor
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {
      handlePasteAttempt({ preventDefault: () => {} });
    });
    // Trigger suggestions immediately on mount
    editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
  };
  const handleCodeChange = (value) => {
    setCodeContent(value);
    const diff = Math.abs(value.length - lastLenRef.current);
    lastLenRef.current = value.length;

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
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartInterview = async () => {
    if (!submission) return;
    navigate(`/interview/${submission._id}`);
  };

  if (!course || !enrollment) {
    return (
      <div className="min-h-screen bg-vs-bg text-vs-text flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-vs-muted">Loading VidyaSetu Classroom...</p>
        </div>
      </div>
    );
  }

  const allVideosWatched = enrollment.videoWatched && enrollment.videoWatched.every(Boolean);
  const videosCount = course.videos?.length || 5;
  const currentVideo = course.videos?.[currentVideoIdx] || { title: `Module ${currentVideoIdx + 1}`, duration: '12:00', url: '' };

  const isWatched = !!enrollment.videoWatched?.[currentVideoIdx];

  return (
    <div className="min-h-screen bg-vs-bg text-vs-text pb-20">
      
      {/* Top Header Bar */}
      <div className="bg-vs-surface border-b border-vs-border px-4 sm:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-500 dark:text-indigo-400 text-xs font-semibold uppercase">
              {course.skill}
            </span>
            <h1 className="text-xl font-bold text-vs-text">{course.title}</h1>
          </div>
          <p className="text-xs text-vs-muted mt-1">Instructor: {course.instructor}</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 bg-vs-surface-2 p-1 rounded-xl border border-vs-border">
          <button
            onClick={() => setActiveTab('video')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all btn-scale flex items-center gap-2 ${
              activeTab === 'video'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-vs-muted hover:text-vs-text'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            Videos & Modules
          </button>
          
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all btn-scale flex items-center gap-2 ${
              activeTab === 'notes'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-vs-muted hover:text-vs-text'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Notes Editor
          </button>

          <button
            onClick={() => setActiveTab('assignment')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all btn-scale flex items-center gap-2 ${
              activeTab === 'assignment'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-vs-muted hover:text-vs-text'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            Assignment Challenge
            {!allVideosWatched && <Lock className="w-3 h-3 text-amber-500 ml-1" />}
          </button>
        </div>
      </div>

      {/* Tab 1: Video Learning & Modules */}
      {activeTab === 'video' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          
            {/* Main Video Screen */}
            <div className="lg:col-span-2 space-y-6">
              <div className="relative aspect-video bg-vs-surface border border-vs-border rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-center items-center">
                {ytId && !useHtmlFallback ? (
                  <iframe
                    key={ytId}
                    id="yt-video-frame"
                    src={`https://www.youtube.com/embed/${ytId}?autoplay=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`}
                    title={currentVideo.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    key={currentVideoUrl + (useHtmlFallback ? '-fallback' : '')}
                    ref={videoRef}
                    src={!useHtmlFallback && currentVideo.url && !ytId ? currentVideo.url : "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"}
                    autoPlay
                    controls
                    className="w-full h-full object-cover"
                    onTimeUpdate={handleTimeUpdate}
                  />
                )}
              </div>

              {/* Status Bar Placed Below Video Player */}
              <div className="p-4 bg-vs-surface/90 border border-vs-border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-500 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                    {currentVideoIdx + 1}
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-vs-muted font-semibold block">
                      {videosCount > 1 ? `Module ${currentVideoIdx + 1} of ${videosCount}` : `Module ${currentVideoIdx + 1}`}
                    </span>
                    <h3 className="text-sm font-bold text-vs-text line-clamp-1">{currentVideo.title}</h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {ytId && (
                    <button
                      onClick={() => setUseHtmlFallback((prev) => !prev)}
                      className="px-3 py-1.5 rounded-lg bg-vs-surface-2 hover:bg-vs-surface text-vs-muted hover:text-vs-text text-[11px] font-semibold border border-vs-border transition-all btn-scale"
                    >
                      {useHtmlFallback ? 'Switch to YouTube Player' : 'Fallback HTML5 Player'}
                    </button>
                  )}

                  <button
                    onClick={() => handleVideoWatched(currentVideoIdx)}
                    disabled={!canMarkWatched && !isWatched}
                    title={
                      !canMarkWatched && !isWatched
                        ? 'Watch at least 90% of the video to continue'
                        : ''
                    }
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all btn-scale flex items-center gap-2 ${
                      isWatched
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/50 shadow-sm shadow-emerald-500/10'
                        : canMarkWatched
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 cursor-pointer'
                        : 'bg-vs-surface-2 text-vs-muted border border-vs-border cursor-not-allowed opacity-60'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isWatched
                      ? 'Watched ✓'
                      : canMarkWatched
                      ? 'Mark as Watched'
                      : 'Watch 90% to Continue'}
                  </button>
                </div>
              </div>

            <div className="p-6 bg-vs-surface border border-vs-border rounded-2xl space-y-3 shadow-sm">
              <h3 className="text-lg font-bold text-vs-text">About this Module</h3>
              <p className="text-xs text-vs-muted leading-relaxed">
                Watch all video modules in sequence (at least 90% duration). Once you reach 90%, the module will automatically mark watched and turn green.
                When all modules are completed, the Applied Assignment Challenge and AI Viva Interview will unlock.
              </p>
            </div>
          </div>

          {/* Module List Sidebar */}
          <div className="space-y-4">
            <div className="p-5 bg-vs-surface border border-vs-border rounded-2xl shadow-sm">
              <h3 className="text-sm font-bold text-vs-text mb-1">Course Content & Progress</h3>
              <p className="text-xs text-vs-muted mb-4">
                Watched {enrollment.videoWatched?.filter(Boolean).length || 0} of {videosCount} videos
              </p>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-vs-surface-2 rounded-full overflow-hidden mb-6">
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
                      className={`w-full p-3 rounded-xl text-left border transition-all btn-scale flex items-center justify-between ${
                        watched
                          ? 'bg-emerald-950/10 dark:bg-emerald-950/20 border-emerald-500/40 text-emerald-600 dark:text-emerald-300'
                          : isCurrent
                          ? 'bg-indigo-600/10 dark:bg-indigo-600/20 border-indigo-500/50 text-indigo-600 dark:text-indigo-300'
                          : 'bg-vs-surface-2/60 hover:bg-vs-surface-2 border-vs-border text-vs-text'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                          watched ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' : 'bg-vs-surface border border-vs-border text-vs-muted'
                        }`}>
                          {watched ? <Check className="w-4 h-4 text-emerald-500" /> : idx + 1}
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold line-clamp-1">{vid.title}</h4>
                          <span className="text-[10px] text-vs-muted flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" /> {vid.duration || '10:00'}
                          </span>
                        </div>
                      </div>

                      {isCurrent && <Play className="w-3.5 h-3.5 text-indigo-500 fill-current" />}
                    </button>
                  );
                })}
              </div>

              {allVideosWatched && (
                <button
                  onClick={() => setActiveTab('assignment')}
                  className="w-full mt-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 transition-all btn-scale flex items-center justify-center gap-2"
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
          <div className="p-6 bg-vs-surface border border-vs-border rounded-2xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-vs-text flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-500" />
                  Course Study Notes
                </h2>
                <p className="text-xs text-vs-muted">
                  Notes are stored per course and persist automatically across sessions.
                </p>
              </div>

              <button
                onClick={handleSaveNotes}
                disabled={notesSaving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all btn-scale flex items-center gap-2 shadow-md shadow-indigo-600/20"
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
              className="w-full p-4 bg-vs-surface-2 border border-vs-border rounded-xl text-sm text-vs-text placeholder-vs-muted focus:outline-none focus:border-indigo-500 font-mono leading-relaxed resize-y"
            />
          </div>
        </div>
      )}

      {/* Tab 3: Locked Coding Assignment & Test Runner */}
      {activeTab === 'assignment' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          
          {!allVideosWatched && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-3 text-amber-500 dark:text-amber-300 text-xs font-semibold">
              <Lock className="w-5 h-5 flex-shrink-0" />
              <span>Complete watching all video modules first before attempting the assignment challenge.</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Prompt & Instructions */}
            <div className="space-y-6">
              <div className="p-6 bg-vs-surface border border-vs-border rounded-2xl space-y-4 shadow-sm">
                <div className="flex items-center gap-2 text-purple-500 dark:text-purple-400 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" /> Real Challenge Assignment
                </div>
                
                <h2 className="text-xl font-bold text-vs-text">{course.assignment.title}</h2>
                <p className="text-xs text-vs-text leading-relaxed bg-vs-surface-2 p-4 rounded-xl border border-vs-border">
                  {course.assignment.prompt}
                </p>

                {/* Paste Detection Logger Indicator */}
                <div className="p-4 bg-vs-surface-2 border border-vs-border rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-vs-muted flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Paste Attempts Blocked
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      pasteEvents > 0 ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/20 text-emerald-500'
                    }`}>
                      {pasteEvents} attempt(s) blocked
                    </span>
                  </div>
                  <p className="text-[11px] text-vs-muted">
                    Direct copy-pasting and right-click paste are blocked in the editor. All paste attempts are logged.
                  </p>
                </div>
              </div>

              {/* Verification Status */}
              {submission && (
                <div className="p-6 bg-vs-surface border border-vs-border rounded-2xl space-y-4 shadow-sm">
                  <h3 className="text-sm font-bold text-vs-text flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    Submission Status
                  </h3>

                  <div className="flex items-center justify-between text-xs p-3 bg-vs-surface-2 rounded-xl border border-vs-border">
                    <span className="text-vs-muted">Current Status</span>
                    <span className="font-bold text-indigo-500 uppercase">{submission.status}</span>
                  </div>

                  {submission.status === 'CODE_VERIFIED' && (
                    <button
                      onClick={handleStartInterview}
                      className="w-full py-3 bg-gradient-to-r from-emerald-500 via-indigo-600 to-purple-600 hover:from-emerald-600 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all btn-scale flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      Start {course.assignment?.questionCount || 5}-Question AI Viva Interview
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Locked Editor & Test Runner */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Code/Text Editor Container with paste and right-click blocking */}
              <div 
                onPaste={handlePasteAttempt}
                onContextMenu={handleContextMenu}
                className="bg-vs-surface border border-vs-border rounded-2xl overflow-hidden shadow-2xl"
              >
                
                <div className="p-4 bg-vs-surface-2 border-b border-vs-border flex items-center justify-between text-xs font-semibold text-vs-muted">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-indigo-500" />
                    <span>Locked Submission Editor ({course.assignment.type.toUpperCase()})</span>
                  </div>
                  <span className="text-[11px] text-indigo-500 dark:text-indigo-400 font-mono uppercase bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/30">
                    {course.assignment?.language || 'plain text'}
                  </span>
                </div>

                {course.assignment?.type === 'code' || course.assignment?.language ? (
                  <div className="text-sm font-mono">
                    <Editor
                      height="380px"
                      theme="vs-dark"
                      defaultLanguage={course.assignment?.language || 'javascript'}
                      language={course.assignment?.language || 'javascript'}
                      value={codeContent}
                      onChange={handleCodeChange}
                      beforeMount={handleEditorBeforeMount}
                      onMount={handleEditorDidMount}
                      options={{
                        suggestOnTriggerCharacters: true,
                        quickSuggestions: { other: true, comments: true, strings: true },
                        quickSuggestionsDelay: 0,
                        wordBasedSuggestions: 'currentDocument',
                        snippetSuggestions: 'inline',
                        tabCompletion: 'on',
                        acceptSuggestionOnEnter: 'on',
                        minimap: { enabled: false },
                        fontSize: 14,
                        contextmenu: false,
                        formatOnType: true,
                        formatOnPaste: false,
                        automaticLayout: true,
                      }}
                    />
                  </div>
                ) : (
                  <textarea
                    rows={14}
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    onPaste={handlePasteAttempt}
                    onContextMenu={handleContextMenu}
                    placeholder="Write your text submission here..."
                    className="w-full p-4 bg-vs-surface-2 text-sm text-vs-text placeholder-vs-muted focus:outline-none font-mono"
                  />
                )}

                <div className="p-4 bg-vs-surface-2 border-t border-vs-border flex items-center justify-between">
                  <p className="text-xs text-vs-muted">
                    Snapshots captured: {snapshots.length}
                  </p>

                  <button
                    onClick={handleRunTests}
                    disabled={submitting}
                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all btn-scale flex items-center gap-2"
                  >
                    <PlaySquare className="w-4 h-4" />
                    {submitting ? 'Running Test Cases...' : 'Run Test Cases & Submit'}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs font-semibold text-rose-500">
                  {error}
                </div>
              )}

              {/* Test Case Output Terminal */}
              {testResults && (
                <div className="p-6 bg-vs-surface border border-vs-border rounded-2xl space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-vs-text flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-emerald-500" />
                      Test Execution Results
                    </h3>

                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      testResults.passed ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'
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
                            ? 'bg-emerald-950/10 dark:bg-emerald-950/30 border-emerald-500/30 text-emerald-600 dark:text-emerald-300'
                            : 'bg-rose-950/10 dark:bg-rose-950/30 border-rose-500/30 text-rose-600 dark:text-rose-300'
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
                        className="w-full py-3 bg-gradient-to-r from-emerald-500 via-indigo-600 to-purple-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all btn-scale flex items-center justify-center gap-2"
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
