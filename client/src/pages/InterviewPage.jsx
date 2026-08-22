import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { submissionsAPI, interviewsAPI, ttsAPI, transcribeAPI, errMsg } from '../lib/api';
import {
  Sparkles,
  Bot,
  Mic,
  MicOff,
  Volume2,
  Send,
  CheckCircle2,
  Award,
  ArrowRight,
  FileCode2,
  Cpu,
  Video,
  VideoOff,
  Loader2,
} from 'lucide-react';
import InterviewFeedbackModal from '../components/InterviewFeedbackModal';

// Detect browser fallback SpeechRecognition support
const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

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

  // Voice mode defaults to TRUE for all courses
  const [voiceModeOn, setVoiceModeOn] = useState(true);
  const [recordingIdx, setRecordingIdx] = useState(null); // index of currently recording question
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [camStream, setCamStream] = useState(null);
  // Liveness state: 'idle' | 'speaking' | 'listening' | 'processing' | 'transcribing'
  const [livenessState, setLivenessState] = useState('idle');

  // Refs for audio player, MediaRecorder, mic stream, audio analyser, timers, video
  const videoRef = useRef(null);
  const currentAudioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const micStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserIntervalRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const hasSpokenRef = useRef(false);
  const lastSpokenTimeRef = useRef(0);
  const recognizerRef = useRef(null); // fallback speech recognition

  // ─── STOP ALL AUDIO / SPEECH PLAYBACK ──────────────────────────────────────
  const stopAllAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // ─── STOP RECORDING & CLEANUP AUDIO CONTEXT ────────────────────────────────
  const stopRecording = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (analyserIntervalRef.current) {
      clearInterval(analyserIntervalRef.current);
      analyserIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn('[VoiceMode] Error stopping MediaRecorder:', err);
      }
    }

    if (recognizerRef.current) {
      try {
        recognizerRef.current.stop();
      } catch {}
      recognizerRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }

    setRecordingIdx(null);
  }, []);

  // ─── SEND AUDIO BLOB TO GROQ WHISPER ───────────────────────────────────────
  const handleAudioTranscription = useCallback(
    async (audioBlob, targetIdx) => {
      if (!audioBlob || audioBlob.size < 1000) {
        setLivenessState('idle');
        return;
      }

      setLivenessState('transcribing');
      setIsTranscribing(true);

      try {
        const res = await transcribeAPI.transcribe(audioBlob);
        const text = (res.data?.text || '').trim();

        if (text) {
          setAnswers((prev) => {
            const updated = [...prev];
            const existing = updated[targetIdx]?.answer || '';
            const merged = existing ? `${existing} ${text}` : text;
            updated[targetIdx] = {
              ...updated[targetIdx],
              answer: merged,
            };
            return updated;
          });
        }
      } catch (err) {
        console.warn('[VoiceMode] Groq Whisper transcription failed, checking fallback:', err.message);
      } finally {
        setIsTranscribing(false);
        setLivenessState('idle');
      }
    },
    []
  );

  // ─── START RECORDING WITH MEDIARECORDER + WEBAUDIO SILENCE DETECTION ───────
  const startRecording = useCallback(
    async (idx) => {
      stopAllAudio();
      stopRecording();

      setRecordingIdx(idx);
      setLivenessState('listening');
      hasSpokenRef.current = false;
      lastSpokenTimeRef.current = Date.now();

      // 1. Try MediaRecorder + Web Audio API Analyser for Groq Whisper
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia && typeof window.MediaRecorder !== 'undefined') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStreamRef.current = stream;

          // Attach Web Audio API AnalyserNode for volume / silence detection
          try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
              const audioCtx = new AudioContextClass();
              audioContextRef.current = audioCtx;
              const source = audioCtx.createMediaStreamSource(stream);
              const analyser = audioCtx.createAnalyser();
              analyser.fftSize = 256;
              source.connect(analyser);

              const bufferLength = analyser.frequencyBinCount;
              const dataArray = new Uint8Array(bufferLength);

              // Periodic volume check (every 100ms)
              analyserIntervalRef.current = setInterval(() => {
                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                  sum += dataArray[i];
                }
                const avgVolume = sum / bufferLength;

                // Threshold for voice activity
                if (avgVolume > 14) {
                  hasSpokenRef.current = true;
                  lastSpokenTimeRef.current = Date.now();
                } else if (hasSpokenRef.current) {
                  // If user has spoken and stayed quiet for > 2.5s, auto-stop
                  const quietDuration = Date.now() - lastSpokenTimeRef.current;
                  if (quietDuration > 2500) {
                    stopRecording();
                  }
                }
              }, 100);
            }
          } catch (audioCtxErr) {
            console.warn('[VoiceMode] AnalyserNode setup error:', audioCtxErr);
          }

          // Setup MediaRecorder
          const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : '';

          const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
          mediaRecorderRef.current = recorder;
          const chunks = [];

          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              chunks.push(e.data);
            }
          };

          recorder.onstop = () => {
            const finalBlob = new Blob(chunks, { type: mimeType || 'audio/webm' });
            handleAudioTranscription(finalBlob, idx);
          };

          recorder.start(250); // Slice every 250ms
          return;
        } catch (mediaErr) {
          console.warn('[VoiceMode] getUserMedia or MediaRecorder error:', mediaErr);
        }
      }

      // 2. Fallback to browser SpeechRecognition if MediaRecorder unsupported
      if (SpeechRecognitionAPI) {
        try {
          const rec = new SpeechRecognitionAPI();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = 'en-US';

          const baseAnswer = answers[idx]?.answer || '';
          rec.onresult = (e) => {
            let interimText = '';
            let finalText = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
              const t = e.results[i][0].transcript;
              if (e.results[i].isFinal) finalText += t + ' ';
              else interimText += t;
            }

            setAnswers((prev) => {
              const updated = [...prev];
              const combined = (baseAnswer + (baseAnswer ? ' ' : '') + finalText + interimText).trim();
              updated[idx] = { ...updated[idx], answer: combined };
              return updated;
            });
          };

          rec.onerror = () => stopRecording();
          rec.onend = () => {
            if (recordingIdx === idx) {
              setRecordingIdx(null);
              setLivenessState('idle');
            }
          };

          recognizerRef.current = rec;
          rec.start();
          return;
        } catch (sttErr) {
          console.warn('[VoiceMode] Fallback SpeechRecognition error:', sttErr);
        }
      }

      // If all recording fails, revert to idle for manual typing
      setLivenessState('idle');
      setRecordingIdx(null);
    },
    [answers, recordingIdx, stopAllAudio, stopRecording, handleAudioTranscription]
  );

  const toggleRecording = useCallback(
    (idx) => {
      if (recordingIdx === idx) {
        stopRecording();
      } else {
        startRecording(idx);
      }
    },
    [recordingIdx, startRecording, stopRecording]
  );

  // ─── TTS WITH FALLBACK & AUTO-LISTEN ON COMPLETION ──────────────────────────
  const handleSpeechEnded = useCallback(
    (questionIdx) => {
      if (voiceModeOn) {
        startRecording(questionIdx);
      } else {
        setLivenessState('idle');
      }
    },
    [voiceModeOn, startRecording]
  );

  const fallbackBrowserTTS = useCallback(
    (text, questionIdx) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        handleSpeechEnded(questionIdx);
        return;
      }

      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = 0.95;
      utt.pitch = 1;

      utt.onstart = () => {
        setLivenessState('speaking');
      };

      utt.onend = () => {
        handleSpeechEnded(questionIdx);
      };

      utt.onerror = () => {
        handleSpeechEnded(questionIdx);
      };

      window.speechSynthesis.speak(utt);
    },
    [handleSpeechEnded]
  );

  const playQuestionAudio = useCallback(
    async (text, questionIdx) => {
      stopAllAudio();
      stopRecording();
      setLivenessState('processing');

      try {
        // Attempt Gemini TTS from backend (with ~3.5s timeout)
        const res = await ttsAPI.generate(text);
        if (res.data?.audioData) {
          const audio = new Audio(res.data.audioData);
          currentAudioRef.current = audio;

          audio.onplay = () => {
            setLivenessState('speaking');
          };

          audio.onended = () => {
            currentAudioRef.current = null;
            handleSpeechEnded(questionIdx);
          };

          audio.onerror = () => {
            currentAudioRef.current = null;
            fallbackBrowserTTS(text, questionIdx);
          };

          await audio.play();
          return;
        }
      } catch (err) {
        console.warn('[VoiceMode] Gemini TTS failed/timed out, falling back to browser TTS:', err.message);
      }

      // Automatic fallback to browser SpeechSynthesis
      fallbackBrowserTTS(text, questionIdx);
    },
    [stopAllAudio, stopRecording, handleSpeechEnded, fallbackBrowserTTS]
  );

  // ─── WEBCAM PREVIEW (VISUAL ONLY) ──────────────────────────────────────────
  const startCam = useCallback(async () => {
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setCamStream(stream);
        return true;
      }
    } catch (camErr) {
      // Permission denied or unavailable — visual only
      console.log('[VoiceMode] Camera permission skipped or denied:', camErr.message);
    }
    return false;
  }, []);

  const stopCam = useCallback(() => {
    if (camStream) {
      camStream.getTracks().forEach((t) => t.stop());
      setCamStream(null);
    }
  }, [camStream]);

  useEffect(() => {
    if (videoRef.current && camStream) {
      videoRef.current.srcObject = camStream;
    }
  }, [camStream]);

  // ─── VOICE MODE TOGGLE ─────────────────────────────────────────────────────
  const handleVoiceToggle = useCallback(async () => {
    if (voiceModeOn) {
      // Turn OFF voice mode
      stopAllAudio();
      stopCam();
      stopRecording();
      setVoiceModeOn(false);
      setLivenessState('idle');
    } else {
      // Turn ON voice mode
      setVoiceModeOn(true);
      await startCam();
      if (interview?.questions?.length) {
        playQuestionAudio(interview.questions[0].question, 0);
      }
    }
  }, [voiceModeOn, stopAllAudio, stopCam, stopRecording, startCam, interview, playQuestionAudio]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      stopAllAudio();
      stopCam();
      stopRecording();
    };
  }, [stopAllAudio, stopCam, stopRecording]);

  // ─── INITIALIZE INTERVIEW & AUTO-TRIGGER VOICE MODE ON LOAD ────────────────
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

      // Auto-start Voice Mode by default when loaded
      if (qs.length > 0) {
        setTimeout(async () => {
          try {
            await startCam();
            playQuestionAudio(qs[0].question, 0);
          } catch (initVoiceErr) {
            console.warn('[VoiceMode] Auto-init voice mode error:', initVoiceErr);
          }
        }, 500);
      }
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
      stopAllAudio();
      stopRecording();
      const res = await interviewsAPI.submitAnswers(submissionId, answers);
      setResult(res.data);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ─── LOADING SCREEN ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-vs-bg text-vs-text flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-vs-accent flex items-center justify-center animate-pulse shadow-lg shadow-vs-accent/20">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div className="text-center">
          <h3 className="text-base font-bold text-vs-text">Generating AI Viva Questions...</h3>
          <p className="text-xs text-vs-muted mt-1">Analyzing your submission constructs & preparing live viva...</p>
        </div>
      </div>
    );
  }

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-vs-bg text-vs-text pb-20">

      {/* Header Bar */}
      <div className="bg-vs-surface border-b border-vs-border py-8 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-vs-accent-light text-vs-accent text-xs font-semibold">
              <Cpu className="w-3.5 h-3.5" />
              AI Viva Interview Engine · Groq Whisper Enabled
            </div>
            <h1 className="text-2xl font-bold text-vs-text mt-2">Skill Verification Interview</h1>
            <p className="text-xs text-vs-muted mt-0.5">
              Course: <strong className="text-vs-text">{submission?.course?.title}</strong> · Skill:{' '}
              <strong className="text-vs-accent">{submission?.course?.skill}</strong>
            </p>
          </div>

          {/* Voice Mode Toggle & Controls */}
          <div className="flex flex-col items-start sm:items-end gap-2">
            <div className="flex items-center gap-3">
              {/* Liveness Presence Indicator */}
              {voiceModeOn && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-vs-surface-2 border border-vs-border text-xs font-semibold animate-fade-in shadow-inner">
                  {livenessState === 'speaking' && (
                    <>
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      <span className="text-emerald-500 font-bold">AI Speaking...</span>
                    </>
                  )}

                  {livenessState === 'listening' && (
                    <>
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                      </span>
                      <span className="text-rose-500 font-bold animate-pulse">Listening to you...</span>
                    </>
                  )}

                  {livenessState === 'transcribing' && (
                    <>
                      <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                      <span className="text-indigo-400 font-bold">Transcribing with Whisper...</span>
                    </>
                  )}

                  {livenessState === 'processing' && (
                    <>
                      <Loader2 className="w-3.5 h-3.5 text-vs-accent animate-spin" />
                      <span className="text-vs-accent font-bold">Loading Natural Voice...</span>
                    </>
                  )}

                  {livenessState === 'idle' && (
                    <>
                      <span className="h-2 w-2 rounded-full bg-emerald-500 opacity-80"></span>
                      <span className="text-vs-muted">Voice Active</span>
                    </>
                  )}
                </div>
              )}

              <button
                onClick={handleVoiceToggle}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all btn-scale flex items-center gap-2 border shadow-sm ${
                  voiceModeOn
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-transparent shadow-indigo-500/20'
                    : 'bg-vs-surface-2 text-vs-muted border-vs-border hover:text-vs-text hover:border-vs-accent'
                }`}
              >
                <Mic className={`w-3.5 h-3.5 ${voiceModeOn ? 'animate-pulse text-white' : ''}`} />
                Voice Mode {voiceModeOn ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Webcam preview — visual only, displayed when voice mode is ON */}
        {voiceModeOn && (
          <div className="p-4 bg-vs-surface border border-vs-border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-fade-in">
            <div className="flex items-center gap-3">
              {camStream ? (
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-36 h-24 object-cover rounded-xl border border-vs-border bg-black shadow-inner"
                  />
                  <span className="absolute bottom-1.5 right-1.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
              ) : (
                <div className="w-36 h-24 rounded-xl bg-vs-surface-2 border border-vs-border flex flex-col items-center justify-center text-vs-muted text-center p-2">
                  <VideoOff className="w-5 h-5 mb-1 opacity-50" />
                  <span className="text-[10px]">Camera optional</span>
                </div>
              )}

              <div className="space-y-1">
                <p className="flex items-center gap-1.5 text-xs font-bold text-vs-text">
                  <Video className="w-3.5 h-3.5 text-indigo-500" />
                  Live Interview Self-Preview
                </p>
                <p className="text-[11px] text-vs-muted leading-relaxed max-w-sm">
                  Interactive viva room. Audio is transcribed via Groq Whisper. Video stays purely local — not recorded or sent anywhere.
                </p>
              </div>
            </div>

            <div className="text-right text-[11px] text-vs-muted border-t sm:border-t-0 pt-2 sm:pt-0 border-vs-border">
              <span className="font-semibold text-vs-accent">Whisper Voice Mode Active</span>
              <p className="text-[10px] opacity-75">Auto-listens after questions & auto-stops on silence</p>
            </div>
          </div>
        )}

        {/* Result Screen */}
        {result ? (
          <div className="bg-vs-surface border border-vs-border rounded-2xl p-8 space-y-6 text-center animate-fade-in shadow-sm">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto shadow-md shadow-emerald-500/10">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Interview Completed</span>
              <h2 className="text-2xl font-bold text-vs-text mt-1">AI Viva Defence Evaluated</h2>
              <p className="text-sm text-vs-muted mt-1 max-w-lg mx-auto">
                Your viva responses have been verified against your submission constructs and logged to your proof-of-work portfolio.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-lg mx-auto text-xs">
              <div className="p-4 bg-vs-surface-2 border border-vs-border rounded-xl shadow-inner">
                <span className="text-vs-muted block">AI Score</span>
                <strong className="text-vs-accent text-xl font-mono">{result.qualityScore || result.aiScore || 85}/100</strong>
              </div>
              <div className="p-4 bg-vs-surface-2 border border-vs-border rounded-xl shadow-inner">
                <span className="text-vs-muted block">Status</span>
                <strong className="text-emerald-500 text-xl font-bold">{result.verdict || result.status || 'VERIFIED'}</strong>
              </div>
              <div className="p-4 bg-vs-surface-2 border border-vs-border rounded-xl shadow-inner col-span-2 sm:col-span-1">
                <span className="text-vs-muted block">Questions Answered</span>
                <strong className="text-vs-text text-xl font-mono">{answers.length}/{answers.length}</strong>
              </div>
            </div>

            {result.teacherReviewRequired && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200 text-left">
                <span className="font-semibold block mb-0.5">Faculty Audit Triggered</span>
                Your submission contains paste events or consistency flags and is queued for teacher sign-off.
              </div>
            )}

            {/* Post-AI-Interview Feedback Prompt */}
            <InterviewFeedbackModal
              submissionId={submissionId}
              onComplete={() => navigate('/portfolio')}
            />

            <button
              onClick={() => navigate('/portfolio')}
              className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-sm rounded-xl transition-all btn-scale inline-flex items-center gap-2 mt-4 shadow-lg shadow-indigo-500/20"
            >
              <Award className="w-4 h-4" />
              View Verified Skill Portfolio
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmitInterview} className="space-y-6">

            {/* Code Reference Card */}
            <div className="p-5 bg-vs-surface border border-vs-border rounded-2xl space-y-2 shadow-sm">
              <span className="text-xs font-semibold text-vs-accent flex items-center gap-1.5">
                <FileCode2 className="w-3.5 h-3.5" /> Reference: Your Submitted Solution
              </span>
              <pre className="p-3.5 bg-vs-surface-2 border border-vs-border rounded-xl text-xs font-mono text-vs-text overflow-x-auto max-h-40 shadow-inner">
                {submission?.code || submission?.text}
              </pre>
            </div>

            {/* Questions List */}
            <div className="space-y-5">
              {answers.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-6 bg-vs-surface border rounded-2xl space-y-3.5 transition-all shadow-sm ${
                    recordingIdx === idx
                      ? 'border-indigo-500/60 ring-2 ring-indigo-500/20'
                      : 'border-vs-border'
                  }`}
                >
                  {/* Question header row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-vs-surface-2 text-vs-accent border border-vs-border font-mono">
                          Q{idx + 1}
                        </span>
                        <h3 className="text-sm font-bold text-vs-text leading-snug">
                          {item.question}
                        </h3>
                      </div>
                    </div>

                    {/* Question audio & voice controls */}
                    {voiceModeOn && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Play / Replay Question Audio (Gemini Natural TTS with fallback) */}
                        <button
                          type="button"
                          onClick={() => playQuestionAudio(item.question, idx)}
                          title="Play question audio"
                          className="px-2.5 py-1.5 rounded-lg border border-vs-border bg-vs-surface-2 text-vs-muted hover:text-vs-accent hover:border-vs-accent transition-all flex items-center gap-1.5 text-xs font-semibold btn-scale"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Hear Q{idx + 1}</span>
                        </button>

                        {/* Mic recording toggle */}
                        <button
                          type="button"
                          onClick={() => toggleRecording(idx)}
                          disabled={isTranscribing && recordingIdx === idx}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all btn-scale border ${
                            recordingIdx === idx
                              ? 'bg-rose-500 text-white border-rose-600 animate-pulse shadow-md shadow-rose-500/20'
                              : 'bg-vs-surface-2 text-vs-muted hover:text-vs-text border-vs-border hover:border-vs-accent'
                          }`}
                        >
                          {recordingIdx === idx ? (
                            <>
                              <MicOff className="w-3.5 h-3.5" />
                              Stop
                            </>
                          ) : (
                            <>
                              <Mic className="w-3.5 h-3.5" />
                              Voice Answer
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Live speech feedback banner */}
                  {voiceModeOn && recordingIdx === idx && (
                    <div className="px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center justify-between animate-fade-in font-medium">
                      <span className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                        </span>
                        Recording speech... (auto-stops on silence, transcribes with Whisper)
                      </span>
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="text-[11px] font-bold underline hover:opacity-80 ml-2"
                      >
                        Done speaking
                      </button>
                    </div>
                  )}

                  {/* Transcribing feedback banner */}
                  {voiceModeOn && isTranscribing && recordingIdx === null && (
                    <div className="px-3.5 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs flex items-center gap-2 animate-fade-in font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                      Transcribing your answer via Groq Whisper...
                    </div>
                  )}

                  {/* Editable Answer Textarea */}
                  <textarea
                    rows={4}
                    required
                    value={item.answer}
                    onChange={(e) => handleAnswerChange(idx, e.target.value)}
                    placeholder={
                      voiceModeOn
                        ? 'Dictate with your mic or type your explanation here...'
                        : 'Type your explanation or rationale here...'
                    }
                    className="w-full p-3.5 bg-vs-surface-2 border border-vs-border rounded-xl text-xs text-vs-text placeholder-vs-muted focus:outline-none focus:border-vs-accent font-mono transition-all shadow-inner leading-relaxed"
                  />
                </div>
              ))}
            </div>

            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs font-semibold text-rose-500">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-sm rounded-xl transition-all btn-scale flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Evaluating Interview Defence...
                </>
              ) : (
                <>
                  Submit Viva Responses & Verify Skill
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </form>
        )}

      </div>
    </div>
  );
}
