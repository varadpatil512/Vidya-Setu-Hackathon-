import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { portfolioAPI, errMsg } from '../lib/api';
import {
  Award,
  CheckCircle2,
  FileCode2,
  Share2,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
  X,
  Clock,
  Hourglass,
  AlertCircle,
} from 'lucide-react';

export default function PortfolioPage() {
  const { userId } = useParams();
  const { user: currentUser, loading: authLoading } = useAuth();

  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (authLoading) return; // Delay fetch until AuthContext confirms auth status
    if (!userId && !currentUser) {
      setLoading(false);
      return;
    }
    fetchPortfolio();
  }, [userId, currentUser, authLoading]);

  const fetchPortfolio = async () => {
    setError('');
    try {
      setLoading(true);
      let res;
      if (userId) {
        res = await portfolioAPI.getByUser(userId);
      } else {
        res = await portfolioAPI.getMine();
      }
      setPortfolio(res.data);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCopyShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-vs-bg flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-vs-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-vs-muted">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  const profileUser = portfolio?.user || currentUser;
  const verifiedSkills = portfolio?.verifiedSkills || [];
  const pendingReview = portfolio?.pendingReview || [];

  return (
    <div className="min-h-screen bg-vs-bg text-vs-text pb-20">

      {/* Profile Header */}
      <div className="bg-vs-surface border-b border-vs-border py-10 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">

          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-vs-accent flex items-center justify-center font-bold text-2xl text-white flex-shrink-0">
              {profileUser?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-vs-text">{profileUser?.name}</h1>
                {verifiedSkills.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified Skills Profile
                  </span>
                )}
              </div>
              <p className="text-sm text-vs-muted mt-0.5">{profileUser?.email}</p>
              <p className="text-xs text-vs-muted mt-1.5 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-vs-accent" />
                {verifiedSkills.length} verified skill{verifiedSkills.length !== 1 ? 's' : ''}
                {pendingReview.length > 0 && ` · ${pendingReview.length} pending review`}
                {' '}&mdash; backed by code submissions, AI viva, and faculty review.
              </p>
            </div>
          </div>

          <button
            onClick={handleCopyShare}
            className="flex items-center gap-2 px-4 py-2 bg-vs-surface border border-vs-border hover:border-vs-accent/40 text-vs-text text-sm font-medium rounded transition-colors btn-scale"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
            {copied ? 'Link copied!' : 'Share Portfolio'}
          </button>

        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Pending Faculty Review Section */}
        {pendingReview.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex-shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-vs-text flex items-center gap-2">
                  Pending Faculty Review
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30">
                    {pendingReview.length} in queue
                  </span>
                </h2>
                <p className="text-xs text-vs-muted mt-0.5">
                  These submissions completed the AI Viva defence and are queued for teacher verification. Once approved, your badge will appear below automatically.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingReview.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-vs-surface border border-amber-500/30 dark:border-amber-500/20 rounded-xl p-5 shadow-sm space-y-3 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <Hourglass className="w-5 h-5 text-amber-500 animate-pulse" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">
                          {item.status === 'FLAGGED' ? 'Awaiting Faculty Audit' : 'Processing Defence'}
                        </span>
                        <h3 className="text-sm font-bold text-vs-text line-clamp-1">{item.skill}</h3>
                      </div>
                    </div>

                    {item.aiScore && (
                      <span className="px-2 py-0.5 rounded bg-vs-surface-2 text-vs-accent text-xs font-bold border border-vs-border font-mono flex-shrink-0">
                        AI Score: {item.aiScore}/100
                      </span>
                    )}
                  </div>

                  <div className="p-3 bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20 rounded-lg text-xs text-amber-800 dark:text-amber-200">
                    <span className="font-semibold block mb-0.5">Status: {item.statusLabel}</span>
                    <p className="text-[11px] opacity-90 leading-relaxed">{item.flagReason}</p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-vs-muted pt-1 border-t border-vs-border">
                    <span className="truncate max-w-[200px]">{item.courseTitle}</span>
                    <span>Submitted {new Date(item.submittedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-lg font-bold text-vs-text">Verified Skill Badges ({verifiedSkills.length})</h2>
          <p className="text-sm text-vs-muted mt-0.5">
            Each badge is backed by transparent evidence — code submission, AI viva score, and faculty sign-off.
          </p>
        </div>

        {verifiedSkills.length === 0 ? (
          <div className="text-center py-20 bg-vs-surface border border-vs-border rounded-lg">
            <Award className="w-10 h-10 text-vs-subtle mx-auto mb-4" />
            <h3 className="text-base font-semibold text-vs-text mb-1">No verified skills yet</h3>
            <p className="text-sm text-vs-muted max-w-sm mx-auto">
              Complete a course, pass the assignment challenge, and clear the AI viva to earn your first verified skill badge.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {verifiedSkills.map((entry, idx) => (
              <div
                key={idx}
                className="bg-vs-surface border border-vs-border rounded-lg p-5 hover:shadow-md hover:border-vs-accent/30 transition-all flex flex-col gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center flex-shrink-0">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Verified</span>
                      <h3 className="text-base font-bold text-vs-text line-clamp-1">{entry.skill}</h3>
                    </div>
                  </div>
                  {entry.aiScore && (
                    <span className="px-2 py-1 rounded bg-vs-accent-light text-vs-accent text-xs font-bold flex-shrink-0">
                      {entry.aiScore}/100
                    </span>
                  )}
                </div>

                <div className="text-xs text-vs-muted space-y-1">
                  <div className="flex justify-between">
                    <span>Course</span>
                    <span className="font-medium text-vs-text truncate max-w-[180px]">{entry.courseTitle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Verified by</span>
                    <span className="font-medium text-emerald-600">{entry.verifiedBy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date</span>
                    <span className="text-vs-text">{new Date(entry.verifiedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedEntry(entry)}
                  className="w-full py-2 border border-vs-accent text-vs-accent hover:bg-vs-accent hover:text-white text-xs font-semibold rounded transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Proof Record
                </button>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Proof Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl bg-vs-surface border border-vs-border rounded-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col">

            <div className="px-6 py-4 border-b border-vs-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <h3 className="text-base font-bold text-vs-text">Proof Record</h3>
              </div>
              <button onClick={() => setSelectedEntry(null)} className="p-1.5 rounded text-vs-muted hover:text-vs-text hover:bg-vs-surface-2 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-sm">

              <div className="p-4 bg-vs-surface-2 border border-vs-border rounded">
                <span className="text-xs font-semibold text-vs-accent">{selectedEntry.skill}</span>
                <h4 className="text-base font-bold text-vs-text mt-0.5">{selectedEntry.courseTitle}</h4>
                <p className="text-xs text-vs-muted mt-1">
                  Verified via <strong className="text-emerald-600">{selectedEntry.verifiedBy}</strong> on {new Date(selectedEntry.verifiedAt).toLocaleString()}
                </p>
              </div>

              <div>
                <span className="text-xs font-semibold text-vs-text block mb-2">Submitted Work:</span>
                <pre className="p-4 bg-vs-bg border border-vs-border rounded text-vs-muted font-mono overflow-x-auto max-h-48 text-xs">
                  {selectedEntry.evidence?.submissionExcerpt}...
                </pre>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                {[
                  { label: 'Paste Events', value: selectedEntry.evidence?.pasteEvents || 0, color: 'text-emerald-600' },
                  { label: 'Viva Questions', value: `${selectedEntry.evidence?.interviewQuestions || 5} answered`, color: 'text-vs-accent' },
                  { label: 'Code Snapshots', value: selectedEntry.evidence?.snapshotCount || 0, color: 'text-vs-text' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="p-3 bg-vs-surface-2 border border-vs-border rounded">
                    <span className="text-vs-muted block text-[11px]">{label}</span>
                    <strong className={`${color} text-sm`}>{value}</strong>
                  </div>
                ))}
              </div>

              {selectedEntry.teacherReview && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded">
                  <span className="font-semibold text-amber-700 dark:text-amber-400 block text-xs mb-1">Faculty Review:</span>
                  <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">{selectedEntry.teacherReview.comments}</p>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
