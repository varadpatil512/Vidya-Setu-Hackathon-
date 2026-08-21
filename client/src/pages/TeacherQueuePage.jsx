import { useState, useEffect } from 'react';
import { teacherAPI, errMsg } from '../lib/api';
import { 
  ShieldAlert, 
  UserCheck, 
  XCircle, 
  RotateCcw, 
  CheckCircle2, 
  FileCode2, 
  Sparkles, 
  AlertTriangle, 
  HelpCircle, 
  ChevronRight,
  MessageSquare,
  Award
} from 'lucide-react';

export default function TeacherQueuePage() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState(null);
  
  const [decision, setDecision] = useState('APPROVE');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const res = await teacherAPI.getQueue();
      setQueue(res.data || []);
      if (res.data?.length > 0 && !selectedSub) {
        setSelectedSub(res.data[0]);
      }
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  const handleReviewDecision = async (e) => {
    e.preventDefault();
    if (!selectedSub) return;
    try {
      setSubmitting(true);
      setError('');
      await teacherAPI.review(selectedSub._id, decision, comments);
      setSuccessMsg(`Decision logged: ${decision} for ${selectedSub.student?.name}`);
      setTimeout(() => setSuccessMsg(''), 3000);
      setComments('');
      await fetchQueue();
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
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400">Loading Teacher Review Queue...</p>
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
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <ShieldAlert className="w-4 h-4" />
              Human Verification Layer (Teacher Audit)
            </div>
            <h1 className="text-2xl font-extrabold text-white mt-2">AI-Flagged Submission Queue</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Review flagged submissions, examine process logs & viva Q&A transcript before final sign-off.
            </p>
          </div>

          <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-xs font-bold text-slate-300">
            Pending Reviews: <span className="text-amber-400">{queue.length}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {queue.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/40 border border-slate-800 rounded-3xl space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-lg font-bold text-white">Review Queue is Clear!</h3>
            <p className="text-xs text-slate-400">All AI-flagged submissions have been verified or resolved.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Submissions List Sidebar */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                Flagged Submissions ({queue.length})
              </h3>

              <div className="space-y-2">
                {queue.map((sub) => {
                  const isSelected = selectedSub?._id === sub._id;
                  return (
                    <button
                      key={sub._id}
                      onClick={() => setSelectedSub(sub)}
                      className={`w-full p-4 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'bg-amber-950/40 border-amber-500/50 text-white shadow-lg'
                          : 'bg-slate-900/80 hover:bg-slate-900 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white line-clamp-1">{sub.student?.name}</span>
                        <span className="text-[10px] font-mono bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded font-bold">
                          FLAGGED
                        </span>
                      </div>

                      <p className="text-xs text-indigo-400 font-semibold line-clamp-1">{sub.course?.title}</p>

                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Paste events: {sub.pasteEvents}</span>
                        <span>AI Score: {sub.aiScore || 0}%</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submissions Detail Audit Panel */}
            {selectedSub && (
              <div className="lg:col-span-2 space-y-6">
                
                {successMsg && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs font-semibold text-emerald-400">
                    {successMsg}
                  </div>
                )}

                {/* Evidence Summary Header */}
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold text-white">{selectedSub.student?.name}</h2>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedSub.student?.email}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-indigo-400 block">{selectedSub.course?.skill}</span>
                      <span className="text-[11px] text-slate-500">{selectedSub.course?.title}</span>
                    </div>
                  </div>

                  {/* Flag Reason Alert Box */}
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-1">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" /> AI Flag Reason
                    </span>
                    <p className="text-xs text-amber-200/90 leading-relaxed">{selectedSub.flagReason || 'Low consistency score between viva answers and code submission.'}</p>
                  </div>

                  {/* Metrics Bar */}
                  <div className="grid grid-cols-3 gap-4 text-xs font-mono">
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                      <span className="text-slate-500 block">Paste Jump Events</span>
                      <strong className={selectedSub.pasteEvents > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                        {selectedSub.pasteEvents} event(s)
                      </strong>
                    </div>
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                      <span className="text-slate-500 block">AI Quality Score</span>
                      <strong className="text-indigo-400">{selectedSub.aiScore || 0}/100</strong>
                    </div>
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                      <span className="text-slate-500 block">Code Snapshots</span>
                      <strong className="text-purple-400">{selectedSub.snapshotCount || 0} captures</strong>
                    </div>
                  </div>
                </div>

                {/* Submitted Code / Text */}
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileCode2 className="w-4 h-4 text-indigo-400" />
                    Original Submission Content ({selectedSub.type.toUpperCase()})
                  </h3>

                  <pre className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-200 font-mono overflow-x-auto max-h-72">
                    {selectedSub.code || selectedSub.text}
                  </pre>
                </div>

                {/* Viva Interview Transcript */}
                {selectedSub.interview && (
                  <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-purple-400" />
                      AI Viva Q&A Transcript
                    </h3>

                    <div className="space-y-3">
                      {(selectedSub.interview.questions || []).map((qObj, idx) => {
                        const answerObj = (selectedSub.interview.answers || [])[idx];
                        return (
                          <div key={idx} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2 text-xs">
                            <p className="font-bold text-indigo-300">Q{idx + 1}: {qObj.question}</p>
                            <p className="text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800 font-mono leading-relaxed">
                              A: {answerObj?.answer || 'No answer provided'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Faculty Decision Action Form */}
                <form onSubmit={handleReviewDecision} className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 shadow-2xl">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    Teacher Review Decision
                  </h3>

                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setDecision('APPROVE')}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                        decision === 'APPROVE'
                          ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 shadow-md'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      ✓ Approve (Verify Skill)
                    </button>

                    <button
                      type="button"
                      onClick={() => setDecision('REQUEST_REVISION')}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                        decision === 'REQUEST_REVISION'
                          ? 'bg-amber-600/30 border-amber-500 text-amber-300 shadow-md'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      ↺ Request Revision
                    </button>

                    <button
                      type="button"
                      onClick={() => setDecision('REJECT')}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                        decision === 'REJECT'
                          ? 'bg-rose-600/30 border-rose-500 text-rose-300 shadow-md'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      ✗ Reject Submission
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Enter teacher review notes / rationale for student..."
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                  />

                  {error && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-medium text-rose-400">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-600 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
                  >
                    {submitting ? 'Submitting Decision...' : 'Confirm Faculty Decision'}
                  </button>
                </form>

              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
