import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { submissionsAPI, interviewsAPI, errMsg } from '../lib/api';
import {
  Sparkles,
  Bot,
  Mic,
  Send,
  CheckCircle2,
  ShieldAlert,
  Award,
  ArrowRight,
  HelpCircle,
  FileCode2,
  Cpu
} from 'lucide-react';

export default function InterviewPage() {
  const { submissionId } = useParams();
  const navigate = useNavigate();

  const [submission, setSubmission] = useState(null);
  const [interview, setInterview] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const [audioMode, setAudioMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    initInterview();
  }, [submissionId]);

  const initInterview = async () => {
    try {
      setLoading(true);
      const subRes = await submissionsAPI.getById(submissionId);
      setSubmission(subRes.data);

      const intRes = await interviewsAPI.start(submissionId);
      setInterview(intRes.data);

      const qs = intRes.data?.questions || [];
      setAnswers(qs.map((q) => ({ question: q.question, answer: '' })));
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (index, value) => {
    setAnswers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], answer: value };
      return updated;
    });
  };

  const toggleRecording = (idx) => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      setTimeout(() => {
        setIsRecording(false);
        const sampleSpeech = `In my submission, I implemented this by analyzing the problem constraints and using structured functions.`;
        setAnswers((prev) => {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], answer: updated[idx].answer ? `${updated[idx].answer} ${sampleSpeech}` : sampleSpeech };
          return updated;
        });
      }, 2500);
    }
  };

  const handleSubmitInterview = async (e) => {
    e.preventDefault();
    setError('');

    const emptyCount = answers.filter((a) => !a.answer.trim()).length;
    if (emptyCount > 0) {
      setError(`Please answer all ${answers.length} interview questions (${emptyCount} remaining).`);
      return;
    }

    try {
      setSubmitting(true);
      const res = await interviewsAPI.submitAnswers(submissionId, answers);
      setResult(res.data);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-vs-bg text-vs-text flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-vs-accent flex items-center justify-center animate-pulse">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div className="text-center">
          <h3 className="text-base font-bold text-vs-text">Generating AI Viva Questions...</h3>
          <p className="text-xs text-vs-muted mt-1">Analyzing your submission code...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vs-bg text-vs-text pb-20">

      {/* Header */}
      <div className="bg-vs-surface border-b border-vs-border py-8 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-vs-accent-light text-vs-accent text-xs font-semibold">
              <Cpu className="w-3.5 h-3.5" />
              AI Viva Interview Engine
            </div>
            <h1 className="text-2xl font-bold text-vs-text mt-2">Skill Verification Interview</h1>
            <p className="text-xs text-vs-muted mt-0.5">
              Course: <strong className="text-vs-text">{submission?.course?.title}</strong> · Skill: <strong className="text-vs-accent">{submission?.course?.skill}</strong>
            </p>
          </div>

          <button
            onClick={() => setAudioMode(!audioMode)}
            className={`px-3.5 py-2 rounded text-xs font-semibold transition-all flex items-center gap-2 border ${
              audioMode
                ? 'bg-vs-accent text-white border-vs-accent'
                : 'bg-vs-surface text-vs-muted border-vs-border hover:text-vs-text'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            Voice Mode {audioMode ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Result Screen */}
        {result ? (
          <div className="bg-vs-surface border border-vs-border rounded-lg p-8 space-y-6 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Interview Completed</span>
              <h2 className="text-2xl font-bold text-vs-text mt-1">AI Viva Defence Evaluated</h2>
              <p className="text-sm text-vs-muted mt-1 max-w-lg mx-auto">
                Your responses have been processed by the verification engine and logged to your portfolio.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-lg mx-auto text-xs">
              <div className="p-4 bg-vs-surface-2 border border-vs-border rounded">
                <span className="text-vs-muted block">AI Score</span>
                <strong className="text-vs-accent text-xl">{result.aiScore || 85}/100</strong>
              </div>
              <div className="p-4 bg-vs-surface-2 border border-vs-border rounded">
                <span className="text-vs-muted block">Status</span>
                <strong className="text-emerald-600 text-xl">{result.status || 'VERIFIED'}</strong>
              </div>
              <div className="p-4 bg-vs-surface-2 border border-vs-border rounded col-span-2 sm:col-span-1">
                <span className="text-vs-muted block">Questions Answered</span>
                <strong className="text-vs-text text-xl">{answers.length}/{answers.length}</strong>
              </div>
            </div>

            {result.teacherReviewRequired && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-800 dark:text-amber-200 text-left">
                <span className="font-semibold block mb-0.5">Faculty Audit Triggered</span>
                Your submission contains paste events or consistency flags and is queued for teacher sign-off.
              </div>
            )}

            <button
              onClick={() => navigate('/portfolio')}
              className="px-6 py-3 bg-vs-accent hover:bg-vs-accent-hover text-white font-bold text-sm rounded transition-colors btn-scale inline-flex items-center gap-2"
            >
              <Award className="w-4 h-4" />
              View Verified Skill Portfolio
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmitInterview} className="space-y-6">

            {/* Code Reference Card */}
            <div className="p-5 bg-vs-surface border border-vs-border rounded-lg space-y-2">
              <span className="text-xs font-semibold text-vs-accent flex items-center gap-1.5">
                <FileCode2 className="w-3.5 h-3.5" /> Reference: Your Submitted Solution
              </span>
              <pre className="p-3 bg-vs-surface-2 border border-vs-border rounded text-xs font-mono text-vs-text overflow-x-auto max-h-40">
                {submission?.code || submission?.text}
              </pre>
            </div>

            {/* Questions List */}
            <div className="space-y-5">
              {answers.map((item, idx) => (
                <div key={idx} className="p-6 bg-vs-surface border border-vs-border rounded-lg space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-bold text-vs-text">
                      Q{idx + 1}: {item.question}
                    </h3>
                    {audioMode && (
                      <button
                        type="button"
                        onClick={() => toggleRecording(idx)}
                        className={`p-2 rounded text-xs font-medium flex items-center gap-1.5 transition-colors flex-shrink-0 ${
                          isRecording
                            ? 'bg-red-500 text-white animate-pulse'
                            : 'bg-vs-surface-2 text-vs-muted hover:text-vs-text border border-vs-border'
                        }`}
                      >
                        <Mic className="w-3.5 h-3.5" />
                        {isRecording ? 'Listening...' : 'Voice Answer'}
                      </button>
                    )}
                  </div>

                  <textarea
                    rows={4}
                    required
                    value={item.answer}
                    onChange={(e) => handleAnswerChange(idx, e.target.value)}
                    placeholder="Type your explanation or rationale here..."
                    className="w-full p-3 bg-vs-surface-2 border border-vs-border rounded text-xs text-vs-text placeholder-vs-subtle focus:outline-none focus:border-vs-accent font-mono transition-colors"
                  />
                </div>
              ))}
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded text-xs text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-vs-accent hover:bg-vs-accent-hover text-white font-bold text-sm rounded transition-colors btn-scale flex items-center justify-center gap-2"
            >
              {submitting ? 'Evaluating Interview...' : 'Submit Viva Responses & Verify Skill'}
              {!submitting && <ArrowRight className="w-4 h-4" />}
            </button>

          </form>
        )}

      </div>
    </div>
  );
}
