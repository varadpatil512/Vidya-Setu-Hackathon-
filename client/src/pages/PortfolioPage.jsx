import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { portfolioAPI, errMsg } from '../lib/api';
import { 
  Award, 
  CheckCircle2, 
  FileCode2, 
  Share2, 
  UserCheck, 
  Sparkles, 
  ShieldCheck, 
  ExternalLink,
  MessageSquare,
  Copy,
  Check
} from 'lucide-react';

export default function PortfolioPage() {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();

  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchPortfolio();
  }, [userId, currentUser]);

  const fetchPortfolio = async () => {
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
      <div className="min-h-screen bg-vs-bg text-vs-text flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-vs-muted">Building Process-Transparent Portfolio...</p>
        </div>
      </div>
    );
  }

  const profileUser = portfolio?.user || currentUser;
  const verifiedSkills = portfolio?.verifiedSkills || [];

  return (
    <div className="min-h-screen bg-vs-bg text-vs-text pb-20">
      
      {/* Profile Header */}
      <div className="bg-gradient-to-b from-vs-surface via-indigo-950/10 dark:via-indigo-950/40 to-vs-bg border-b border-vs-border py-12 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 via-indigo-500 to-purple-600 flex items-center justify-center font-extrabold text-3xl text-white shadow-2xl shadow-emerald-500/20">
              {profileUser?.name?.[0] || 'V'}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-vs-text">{profileUser?.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 text-xs font-bold uppercase">
                  Verified Skills Profile
                </span>
              </div>
              
              <p className="text-xs text-vs-muted mt-1 font-mono">{profileUser?.email}</p>
              <p className="text-xs text-vs-muted mt-2 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-500" />
                Proven capability through real code submissions, AI viva defence, & faculty sign-off.
              </p>
            </div>
          </div>

          <div>
            <button
              onClick={handleCopyShare}
              className="px-4 py-2.5 bg-vs-surface hover:bg-vs-surface-2 border border-vs-border text-vs-text font-semibold text-xs rounded-xl transition-all btn-scale flex items-center gap-2 shadow-sm"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4 text-indigo-500" />}
              {copied ? 'Link Copied!' : 'Share Portfolio'}
            </button>
          </div>

        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs font-semibold text-rose-500">
            {error}
          </div>
        )}

        <div>
          <h2 className="text-xl font-bold text-vs-text mb-1">Verified Skill Badges ({verifiedSkills.length})</h2>
          <p className="text-xs text-vs-muted">
            Every badge is backed by transparent submission evidence, AI viva scores, and verification logs.
          </p>
        </div>

        {verifiedSkills.length === 0 ? (
          <div className="text-center py-20 bg-vs-surface border border-vs-border rounded-3xl space-y-3">
            <Award className="w-12 h-12 text-vs-subtle mx-auto" />
            <h3 className="text-lg font-bold text-vs-text">No Verified Skills Yet</h3>
            <p className="text-xs text-vs-muted max-w-sm mx-auto">
              Complete a course, pass the assignment challenge, and clear the AI viva interview to earn verified skill entries.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {verifiedSkills.map((entry, idx) => (
              <div
                key={idx}
                className="p-6 bg-vs-surface hover:bg-vs-surface border border-vs-border hover:border-indigo-500/30 rounded-3xl space-y-5 transition-all hover:scale-[1.01] shadow-sm hover:shadow-lg hover:shadow-indigo-500/10 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 flex items-center justify-center font-bold">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">
                          Verified Skill
                        </span>
                        <h3 className="text-lg font-extrabold text-vs-text line-clamp-1">{entry.skill}</h3>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-lg bg-vs-surface-2 border border-vs-border text-[11px] font-mono text-indigo-500 dark:text-indigo-400 font-bold">
                      {entry.aiScore ? `${entry.aiScore}/100 AI Score` : 'VERIFIED'}
                    </span>
                  </div>

                  <p className="text-xs text-vs-muted mt-3 line-clamp-1">
                    Course: <strong className="text-vs-text">{entry.courseTitle}</strong>
                  </p>

                  <div className="mt-4 p-3 bg-vs-surface-2 rounded-2xl border border-vs-border space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-vs-muted text-[11px]">
                      <span>Verification Mode</span>
                      <span className="font-semibold text-emerald-500">{entry.verifiedBy}</span>
                    </div>
                    <div className="flex items-center justify-between text-vs-muted text-[11px]">
                      <span>Verified On</span>
                      <span className="font-mono text-vs-text">
                        {new Date(entry.verifiedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedEntry(entry)}
                  className="w-full py-2.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-500 dark:text-indigo-300 border border-indigo-500/30 text-xs font-bold rounded-xl transition-all btn-scale flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Inspect Process-Transparent Proof
                </button>

              </div>
            ))}
          </div>
        )}

      </div>

      {/* Proof Inspection Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-vs-bg/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl bg-vs-surface border border-vs-border rounded-3xl shadow-2xl overflow-hidden text-vs-text max-h-[90vh] flex flex-col">
            
            <div className="p-6 bg-vs-surface-2 border-b border-vs-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <h3 className="text-lg font-bold text-vs-text">Process-Transparent Proof Record</h3>
              </div>
              <button onClick={() => setSelectedEntry(null)} className="p-1 text-vs-muted hover:text-vs-text">
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              
              <div className="p-4 bg-vs-surface-2 border border-vs-border rounded-2xl space-y-2">
                <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400">Skill: {selectedEntry.skill}</span>
                <h4 className="text-base font-bold text-vs-text">{selectedEntry.courseTitle}</h4>
                <p className="text-vs-muted text-[11px]">
                  Verified via: <strong className="text-emerald-500">{selectedEntry.verifiedBy}</strong> on {new Date(selectedEntry.verifiedAt).toLocaleString()}
                </p>
              </div>

              {/* Evidence Excerpt */}
              <div className="space-y-2">
                <span className="font-bold text-vs-text block">Submitted Work Excerpt:</span>
                <pre className="p-4 bg-vs-bg border border-vs-border rounded-2xl text-vs-subtle font-mono overflow-x-auto max-h-48 text-[11px]">
                  {selectedEntry.evidence?.submissionExcerpt}...
                </pre>
              </div>

              {/* Evidence Metrics */}
              <div className="grid grid-cols-3 gap-3 text-mono">
                <div className="p-3 bg-vs-surface-2 border border-vs-border rounded-xl">
                  <span className="text-vs-muted block">Paste Events</span>
                  <strong className="text-emerald-500">{selectedEntry.evidence?.pasteEvents || 0}</strong>
                </div>
                <div className="p-3 bg-vs-surface-2 border border-vs-border rounded-xl">
                  <span className="text-vs-muted block">Viva Questions</span>
                  <strong className="text-purple-500">{selectedEntry.evidence?.interviewQuestions || 5} answered</strong>
                </div>
                <div className="p-3 bg-vs-surface-2 border border-vs-border rounded-xl">
                  <span className="text-vs-muted block">Snapshots</span>
                  <strong className="text-indigo-500">{selectedEntry.evidence?.snapshotCount || 0}</strong>
                </div>
              </div>

              {selectedEntry.teacherReview && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-1">
                  <span className="font-bold text-amber-500 block">Faculty Review Sign-Off:</span>
                  <p className="text-amber-600 dark:text-amber-200/90 leading-relaxed">{selectedEntry.teacherReview.comments}</p>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
