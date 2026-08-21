import { useState, useEffect } from 'react';
import { teacherAPI, errMsg } from '../lib/api';
import {
  ShieldAlert,
  UserCheck,
  CheckCircle2,
  FileCode2,
  AlertTriangle,
  MessageSquare,
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
      <div className="min-h-screen bg-vs-bg flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-vs-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-vs-muted">Loading review queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vs-bg text-vs-text pb-20">

      {/* Header */}
      <div className="bg-vs-surface border-b border-vs-border py-8 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-xs font-semibold">
              <ShieldAlert className="w-3.5 h-3.5" />
              Faculty Verification Queue
            </div>
            <h1 className="text-2xl font-bold text-vs-text mt-2">AI-Flagged Submissions</h1>
            <p className="text-sm text-vs-muted mt-0.5">
              Review process logs, code submissions, and viva transcripts before final skill sign-off.
            </p>
          </div>

          <div className="bg-vs-surface-2 px-4 py-2 rounded border border-vs-border text-xs font-semibold text-vs-text">
            Pending: <span className="text-vs-accent font-bold">{queue.length}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {queue.length === 0 ? (
          <div className="text-center py-20 bg-vs-surface border border-vs-border rounded-lg space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h3 className="text-base font-bold text-vs-text">Queue is clear!</h3>
            <p className="text-sm text-vs-muted">All flagged submissions have been reviewed.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Sidebar list */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-vs-muted uppercase tracking-wider">
                Pending ({queue.length})
              </h3>

              <div className="space-y-2">
                {queue.map((sub) => {
                  const isSelected = selectedSub?._id === sub._id;
                  return (
                    <button
                      key={sub._id}
                      onClick={() => setSelectedSub(sub)}
                      className={`w-full p-4 rounded border text-left transition-all ${
                        isSelected
                          ? 'bg-vs-accent-light border-vs-accent text-vs-text'
                          : 'bg-vs-surface hover:bg-vs-surface-2 border-vs-border text-vs-text'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-vs-text truncate">{sub.student?.name}</span>
                        <span className="text-[10px] font-mono bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 px-2 py-0.5 rounded font-semibold">
                          FLAGGED
                        </span>
                      </div>
                      <p className="text-xs text-vs-accent font-medium truncate">{sub.course?.title}</p>
                      <div className="mt-2 flex items-center justify-between text-xs text-vs-muted">
                        <span>Pastes: {sub.pasteEvents}</span>
                        <span>AI Score: {sub.aiScore || 0}%</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Detail Audit */}
            {selectedSub && (
              <div className="lg:col-span-2 space-y-6">

                {successMsg && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    {successMsg}
                  </div>
                )}

                {/* Evidence Summary Header */}
                <div className="p-6 bg-vs-surface border border-vs-border rounded-lg space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-lg font-bold text-vs-text">{selectedSub.student?.name}</h2>
                      <p className="text-xs text-vs-muted font-mono">{selectedSub.student?.email}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-vs-accent block">{selectedSub.course?.skill}</span>
                      <span className="text-xs text-vs-muted">{selectedSub.course?.title}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded text-xs">
                    <span className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Flag Reason
                    </span>
                    <p className="text-amber-800 dark:text-amber-200">{selectedSub.flagReason || 'Low consistency score between viva answers and code submission.'}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-vs-surface-2 border border-vs-border rounded">
                      <span className="text-vs-muted block text-[11px]">Paste Jump Events</span>
                      <strong className={selectedSub.pasteEvents > 0 ? 'text-red-600' : 'text-emerald-600'}>
                        {selectedSub.pasteEvents} event(s)
                      </strong>
                    </div>
                    <div className="p-3 bg-vs-surface-2 border border-vs-border rounded">
                      <span className="text-vs-muted block text-[11px]">AI Quality Score</span>
                      <strong className="text-vs-accent">{selectedSub.aiScore || 0}/100</strong>
                    </div>
                    <div className="p-3 bg-vs-surface-2 border border-vs-border rounded">
                      <span className="text-vs-muted block text-[11px]">Code Snapshots</span>
                      <strong className="text-vs-text">{selectedSub.snapshotCount || 0} captures</strong>
                    </div>
                  </div>
                </div>

                {/* Submitted Content */}
                <div className="p-6 bg-vs-surface border border-vs-border rounded-lg space-y-3">
                  <h3 className="text-sm font-bold text-vs-text flex items-center gap-2">
                    <FileCode2 className="w-4 h-4 text-vs-accent" />
                    Original Submission ({selectedSub.type.toUpperCase()})
                  </h3>
                  <pre className="p-4 bg-vs-surface-2 border border-vs-border rounded text-xs font-mono text-vs-text overflow-x-auto max-h-64">
                    {selectedSub.code || selectedSub.text}
                  </pre>
                </div>

                {/* Viva Transcript */}
                {selectedSub.interview && (
                  <div className="p-6 bg-vs-surface border border-vs-border rounded-lg space-y-3">
                    <h3 className="text-sm font-bold text-vs-text flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-vs-accent" />
                      AI Viva Q&A Transcript
                    </h3>
                    <div className="space-y-3">
                      {(selectedSub.interview.questions || []).map((qObj, idx) => {
                        const answerObj = (selectedSub.interview.answers || [])[idx];
                        return (
                          <div key={idx} className="p-3 bg-vs-surface-2 border border-vs-border rounded text-xs space-y-1">
                            <p className="font-semibold text-vs-accent">Q{idx + 1}: {qObj.question}</p>
                            <p className="text-vs-text bg-vs-surface p-2.5 rounded border border-vs-border font-mono">
                              A: {answerObj?.answer || 'No answer provided'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Action Form */}
                <form onSubmit={handleReviewDecision} className="p-6 bg-vs-surface border border-vs-border rounded-lg space-y-4">
                  <h3 className="text-sm font-bold text-vs-text flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    Review Decision
                  </h3>

                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setDecision('APPROVE')}
                      className={`p-3 rounded border text-xs font-semibold transition-all ${
                        decision === 'APPROVE'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                          : 'bg-vs-surface-2 border-vs-border text-vs-muted'
                      }`}
                    >
                      ✓ Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => setDecision('REQUEST_REVISION')}
                      className={`p-3 rounded border text-xs font-semibold transition-all ${
                        decision === 'REQUEST_REVISION'
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-700 dark:text-amber-300'
                          : 'bg-vs-surface-2 border-vs-border text-vs-muted'
                      }`}
                    >
                      ↺ Revision
                    </button>
                    <button
                      type="button"
                      onClick={() => setDecision('REJECT')}
                      className={`p-3 rounded border text-xs font-semibold transition-all ${
                        decision === 'REJECT'
                          ? 'bg-red-50 dark:bg-red-950/40 border-red-500 text-red-700 dark:text-red-300'
                          : 'bg-vs-surface-2 border-vs-border text-vs-muted'
                      }`}
                    >
                      ✗ Reject
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Enter teacher notes / rationale..."
                    className="w-full p-3 bg-vs-surface-2 border border-vs-border rounded text-xs text-vs-text placeholder-vs-subtle focus:outline-none focus:border-vs-accent font-mono"
                  />

                  {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded text-xs text-red-600 dark:text-red-400">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 bg-vs-accent hover:bg-vs-accent-hover text-white font-semibold text-xs rounded transition-colors btn-scale"
                  >
                    {submitting ? 'Submitting...' : 'Confirm Decision'}
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
