import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { submissionsAPI, interviewsAPI, errMsg } from '../lib/api';
import { 
  Sparkles, 
  Bot, 
  Mic, 
  MicOff, 
  Send, 
  CheckCircle2, 
  ShieldAlert, 
  Award, 
  ArrowRight,
  HelpCircle,
  BarChart3,
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

  // Audio simulation state
  const [audioMode, setAudioMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);

  useEffect(() => {
    initInterview();
  }, [submissionId]);

  const initInterview = async () => {
    try {
      setLoading(true);
      const subRes = await submissionsAPI.getById(submissionId);
      setSubmission(subRes.data);

      // Start / fetch interview questions
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
      // Simulate audio speech-to-text input after 3s
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

    // Check all questions answered
    const emptyCount = answers.filter((a) => !a.answer.trim()).length;
    if (emptyCount > 0) {
      setError(`Please provide an answer to all 5 interview questions (${emptyCount} remaining).`);
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
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 animate-pulse flex items-center justify-center">
            <Bot className="w-8 h-8 text-white" />
          </div>
        </div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-white">Generating AI Viva Questions...</h3>
          <p className="text-xs text-slate-400 mt-1">Python AI Service analyzing submission code & grounded logic...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      
      {/* Top Banner */}
      <div className="bg-slate-900 border-b border-slate-800 py-6 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              Python AI Orchestration Service Active
            </div>
            <h1 className="text-2xl font-extrabold text-white mt-2">AI Viva Interview & Defence</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Course: <strong className="text-slate-200">{submission?.course?.title}</strong> • Skill: <strong className="text-indigo-400">{submission?.course?.skill}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAudioMode(!audioMode)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border ${
                audioMode
                  ? 'bg-purple-600/20 text-purple-300 border-purple-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              <Mic className="w-4 h-4 text-pink-400" />
              Voice Mode {audioMode ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        
        {/* Submission Context Card */}
        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              <FileCode2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white block">Submitted Code/Text Solution</span>
              <span className="text-slate-400 text-[11px]">
                Paste events: {submission?.pasteEvents || 0} • Status: {submission?.status}
              </span>
            </div>
          </div>
          <span className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px]">
            {submission?.type?.toUpperCase()} SUBMISSION
          </span>
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs font-semibold text-rose-400">
            {error}
          </div>
        )}

        {/* Result Screen Modal */}
        {result ? (
          <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl space-y-6 shadow-2xl animate-fade-in text-center">
            
            <div className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center shadow-xl ${
              result.verdict === 'VERIFY'
                ? 'bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-emerald-500/20'
                : 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-amber-500/20'
            }`}>
              {result.verdict === 'VERIFY' ? (
                <Award className="w-10 h-10" />
              ) : (
                <ShieldAlert className="w-10 h-10" />
              )}
            </div>

            <div>
              <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                result.verdict === 'VERIFY' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              }`}>
                {result.verdict === 'VERIFY' ? 'SKILL VERIFIED INSTANTLY' : 'FLAGGED FOR TEACHER REVIEW'}
              </span>

              <h2 className="text-2xl font-extrabold text-white mt-3">
                {result.verdict === 'VERIFY' ? 'Congratulations! Applied Skill Proven.' : 'Under Review by Faculty'}
              </h2>
            </div>

            {/* Score Breakdown Cards */}
            <div className="grid grid-cols-3 gap-4 text-left max-w-xl mx-auto">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                <span className="text-[11px] text-slate-500 font-semibold uppercase">Consistency</span>
                <p className="text-xl font-bold text-indigo-400 mt-1">{Math.round((result.consistency || 0) * 100)}%</p>
              </div>
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                <span className="text-[11px] text-slate-500 font-semibold uppercase">AI Confidence</span>
                <p className="text-xl font-bold text-purple-400 mt-1">{Math.round((result.confidence || 0) * 100)}%</p>
              </div>
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                <span className="text-[11px] text-slate-500 font-semibold uppercase">Quality Score</span>
                <p className="text-xl font-bold text-emerald-400 mt-1">{result.qualityScore}/100</p>
              </div>
            </div>

            <div className="p-5 bg-slate-950/80 border border-slate-800 rounded-2xl text-left space-y-2 max-w-xl mx-auto text-xs">
              <span className="font-bold text-slate-300 block">AI Reasoning:</span>
              <p className="text-slate-400 leading-relaxed">{result.reasoning}</p>
              
              <span className="font-bold text-indigo-300 block pt-2">Constructive Feedback:</span>
              <p className="text-slate-400 leading-relaxed">{result.feedback}</p>
            </div>

            <div className="pt-4 flex justify-center gap-4">
              <button
                onClick={() => navigate('/portfolio')}
                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2"
              >
                <Award className="w-4 h-4" />
                View Skill Portfolio
              </button>
            </div>

          </div>
        ) : (
          /* Q&A Form */
          <form onSubmit={handleSubmitInterview} className="space-y-6">
            
            {(interview?.questions || []).map((qObj, idx) => (
              <div
                key={idx}
                className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 shadow-xl relative"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center flex-shrink-0">
                      Q{idx + 1}
                    </div>
                    <h3 className="text-sm font-bold text-white leading-snug">
                      {qObj.question}
                    </h3>
                  </div>

                  {audioMode && (
                    <button
                      type="button"
                      onClick={() => toggleRecording(idx)}
                      className={`p-2 rounded-xl border transition-all ${
                        isRecording && activeQuestionIdx === idx
                          ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                      title="Speak Answer"
                    >
                      {isRecording && activeQuestionIdx === idx ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                    </button>
                  )}
                </div>

                {isRecording && activeQuestionIdx === idx && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-xs font-semibold text-rose-400 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Listening to speech input... Translating speech to viva answer text.
                  </div>
                )}

                <textarea
                  rows={4}
                  required
                  value={answers[idx]?.answer || ''}
                  onChange={(e) => handleAnswerChange(idx, e.target.value)}
                  placeholder="Explain your thought process, logic, and design choices in your own words..."
                  className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 leading-relaxed"
                />

                <div className="flex justify-between items-center text-[11px] text-slate-500">
                  <span>Grounding Check: Reference specific functions or claims in your work.</span>
                  <span>{(answers[idx]?.answer || '').length} chars</span>
                </div>

              </div>
            ))}

            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 via-indigo-600 to-purple-600 hover:from-emerald-600 hover:to-purple-700 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Python AI Service Scoring Consistency...' : 'Submit AI Viva Answers'}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}
