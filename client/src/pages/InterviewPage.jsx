import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { submissionsAPI, interviewsAPI, ttsAPI, transcribeAPI, errMsg } from '../lib/api';
import {
  Bot,
  Mic,
  MicOff,
  Volume2,
  CheckCircle2,
  Award,
  ArrowRight,
  FileCode2,
  Cpu,
  Video,
  VideoOff,
  Loader2,
  ShieldCheck,
  Maximize2,
  RotateCcw,
  X,
} from 'lucide-react';
import InterviewFeedbackModal from '../components/InterviewFeedbackModal';
import useProctoringMonitor from '../hooks/useProctoringMonitor';

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

  // Mic Issue Gated Fallback State
  const [micIssueReason, setMicIssueReason] = useState('');
  const [showMicModal, setShowMicModal] = useState(false);
  const [micFormReason, setMicFormReason] = useState('');
  const [micFormError, setMicFormError] = useState('');

  // Pre-Interview Permission Step: 'CHECK' | 'GRANTED' | 'DENIED' | 'DONE'
  const [permStep, setPermStep] = useState('CHECK');
  const [permissionsGranted, setPermissionsGranted] = useState(true);
  const [permReasonInput, setPermReasonInput] = useState('');
  const [permReasonError, setPermReasonError] = useState('');
  const [requestingPerms, setRequestingPerms] = useState(false);

  // Proctoring: active while interview is loaded and not yet submitted
  const proctorActive = !!interview && !result;
  const { flags, flagSummary, isFullscreen, requestFullscreen, toasts, dismissToast } =
    useProctoringMonitor({ submissionId, camStream, active: proctorActive });

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
  const camStreamRef = useRef(null);

  const startCam = useCallback(async () => {
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        if (camStreamRef.current && camStreamRef.current.active) {
          setCamStream(camStreamRef.current);
          return true;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        camStreamRef.current = stream;
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
    if (camStreamRef.current) {
      camStreamRef.current.getTracks().forEach((t) => t.stop());
      camStreamRef.current = null;
    }
    setCamStream(null);
  }, []);

  const videoRefCallback = useCallback((node) => {
    if (node) {
      videoRef.current = node;
      if (camStream && node.srcObject !== camStream) {
        node.srcObject = camStream;
      }
    }
  }, [camStream]);

  useEffect(() => {
    if (videoRef.current && camStream && videoRef.current.srcObject !== camStream) {
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
      stopRecording();
      if (camStreamRef.current) {
        camStreamRef.current.getTracks().forEach((t) => t.stop());
        camStreamRef.current = null;
      }
    };
  }, [stopAllAudio, stopRecording]);

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

      if (intRes.data?.answers?.length > 0) {
        setPermStep('DONE');
      } else {
        setPermStep('CHECK');
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
      const res = await interviewsAPI.submitAnswers(submissionId, answers, micIssueReason, {
        permissionsGranted,
        permissionIssueReason: micIssueReason,
      });
      setResult(res.data);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestPermissions = async () => {
    try {
      setRequestingPerms(true);
      setPermReasonError('');
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        camStreamRef.current = stream;
        setCamStream(stream);
        setPermissionsGranted(true);
        setPermStep('GRANTED');
      } else {
        setPermissionsGranted(false);
        setPermStep('DENIED');
      }
    } catch (err) {
      console.log('[PermissionsCheck] getUserMedia access denied or device error:', err.message);
      setPermissionsGranted(false);
      setPermStep('DENIED');
    } finally {
      setRequestingPerms(false);
    }
  };

  const handleStartAfterPermissionGrant = () => {
    setPermStep('DONE');
    requestFullscreen();
    if (interview?.questions?.length && voiceModeOn) {
      playQuestionAudio(interview.questions[0].question, 0);
    }
  };

  const handleStartAfterPermissionDenied = (e) => {
    e.preventDefault();
    const reason = permReasonInput.trim();
    if (!reason || reason.length < 5) {
      setPermReasonError('Please describe the camera/microphone issue (at least 5 characters required).');
      return;
    }
    setMicIssueReason(reason);
    setPermissionsGranted(false);
    setPermReasonError('');
    stopAllAudio();
    stopRecording();
    setVoiceModeOn(false);
    setLivenessState('idle');
    setPermStep('DONE');
    requestFullscreen();
  };

  const handleMicReasonSubmit = (e) => {
    e.preventDefault();
    const reason = micFormReason.trim();
    if (!reason || reason.length < 5) {
      setMicFormError('Please describe the issue you are experiencing (at least 5 characters required).');
      return;
    }
    setMicIssueReason(reason);
    setShowMicModal(false);
    setMicFormError('');
    stopAllAudio();
    stopRecording();
    setVoiceModeOn(false);
    setLivenessState('idle');
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
          <p className="text-xs text-vs-muted mt-1">Analyzing your submission constructs &amp; preparing live viva...</p>
        </div>
      </div>
    );
  }

  // ─── PRE-INTERVIEW READINESS & PERMISSION CHECK SCREEN ────────────────────
  if (permStep !== 'DONE') {
    return (
      <div className="min-h-screen bg-vs-bg text-vs-text flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="max-w-xl w-full bg-vs-surface border border-vs-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl animate-fade-in">
          
          {/* Header Badge & Title */}
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-vs-accent-light text-vs-accent text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" />
              AI Viva Readiness &amp; Hardware Check
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-vs-text">
              Camera &amp; Microphone Readiness
            </h2>
            <p className="text-xs text-vs-muted">
              Course: <strong className="text-vs-text">{submission?.course?.title}</strong> · Skill:{' '}
              <strong className="text-vs-accent">{submission?.course?.skill}</strong>
            </p>
          </div>

          {/* STEP 1: INITIAL CHECK PROMPT */}
          {permStep === 'CHECK' && (
            <div className="space-y-6">
              <div className="p-4 bg-vs-surface-2 border border-vs-border rounded-2xl space-y-3 text-xs text-vs-text leading-relaxed">
                <p className="font-semibold text-vs-text">
                  Before entering your AI Interview, please explicitly grant camera and microphone access:
                </p>
                <ul className="space-y-2 text-vs-muted">
                  <li className="flex items-start gap-2">
                    <span className="text-vs-accent font-bold">📷</span>
                    <span><strong>Camera:</strong> Used to display your live top-right self-view and run local anti-cheating proctoring verification.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-vs-accent font-bold">🎙</span>
                    <span><strong>Microphone:</strong> Used to answer AI viva questions directly by speaking, transcribed via Groq Whisper.</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={handleRequestPermissions}
                disabled={requestingPerms}
                className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-sm rounded-2xl transition-all btn-scale flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25"
              >
                {requestingPerms ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Requesting Browser Permissions...
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4" />
                    Allow Camera &amp; Microphone
                  </>
                )}
              </button>
            </div>
          )}

          {/* STEP 2A: PERMISSIONS GRANTED CONFIRMATION */}
          {permStep === 'GRANTED' && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-3 text-xs">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  Hardware Access Verified Successfully
                </div>
                <div className="space-y-1.5 pt-1 text-emerald-300 font-medium">
                  <p className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                    Camera detected &amp; top-right self-view ready
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                    Microphone detected &amp; Groq Whisper voice mode ready
                  </p>
                </div>
              </div>

              <button
                onClick={handleStartAfterPermissionGrant}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm rounded-2xl transition-all btn-scale flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25"
              >
                <span>Start AI Interview</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 2B: PERMISSIONS DENIED / HARDWARE ISSUE EXPLANATION */}
          {permStep === 'DENIED' && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-1 text-xs text-amber-300">
                <div className="flex items-center gap-2 font-bold text-amber-400">
                  <VideoOff className="w-4 h-4" />
                  Camera / Microphone Access Unavailable
                </div>
                <p className="text-[11px] text-vs-muted pt-1 leading-relaxed">
                  We couldn't access your camera or microphone. Please describe the technical issue below so your reviewing teacher has context for typed mode.
                </p>
              </div>

              <form onSubmit={handleStartAfterPermissionDenied} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-vs-text mb-1.5">
                    Describe the issue experienced <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={permReasonInput}
                    onChange={(e) => {
                      setPermReasonInput(e.target.value);
                      if (permReasonError) setPermReasonError('');
                    }}
                    placeholder="e.g. Browser blocked camera permission, microphone not detected on OS, hardware broken..."
                    className="w-full p-3.5 bg-vs-surface-2 border border-vs-border rounded-xl text-xs text-vs-text placeholder-vs-muted focus:outline-none focus:border-vs-accent font-sans transition-all shadow-inner"
                  />
                  {permReasonError && (
                    <p className="text-[11px] font-semibold text-rose-500 mt-1">
                      {permReasonError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-vs-bg font-bold text-sm rounded-2xl transition-all btn-scale flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  <span>Start Test (Typed Mode Fallback)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    );
  }

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-vs-bg text-vs-text pb-20">

      {/* ── Proctoring Toast Stack (Centered Top) ────────────────────────── */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 max-w-sm w-full px-4 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-2 px-4 py-3 rounded-xl shadow-xl text-xs font-semibold animate-fade-in pointer-events-auto ${
              t.color === 'rose'
                ? 'bg-rose-950/90 text-rose-200 border border-rose-800'
                : 'bg-amber-950/90 text-amber-200 border border-amber-800'
            }`}
          >
            <span className="flex-1">{t.message}</span>
            <button onClick={() => dismissToast(t.id)} className="ml-1 opacity-70 hover:opacity-100"><X className="w-3 h-3" /></button>
          </div>
        ))}
      </div>

      {/* ── Floating Top-Right Self-View Camera Window ──────────────────────── */}
      {voiceModeOn && camStream && !result && (
        <div className="fixed top-4 right-4 z-40 flex flex-col items-end gap-1.5 animate-fade-in pointer-events-auto">
          <div className="relative group overflow-hidden rounded-2xl border-2 border-indigo-500/40 bg-black/90 shadow-2xl shadow-indigo-500/20 backdrop-blur-md transition-all hover:border-indigo-500">
            <video
              ref={videoRefCallback}
              autoPlay
              muted
              playsInline
              className="w-44 h-28 sm:w-48 sm:h-32 object-cover rounded-xl -scale-x-100 bg-black"
            />

            {/* Live REC Indicator */}
            <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>LIVE</span>
            </div>

            {/* AI Monitoring Badge */}
            {proctorActive && (
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-2 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-white/10 text-[10px] font-medium text-emerald-300">
                <span className="flex items-center gap-1 font-semibold truncate">
                  <ShieldCheck className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                  Monitoring active
                </span>
                {flags.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-500/30 text-amber-300 font-bold text-[9px] border border-amber-500/40">
                    {flags.length} flag{flags.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Fullscreen-exit banner ──────────────────────────────────────────── */}
      {proctorActive && !isFullscreen && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-amber-900/95 border border-amber-600 text-amber-200 text-xs font-semibold shadow-2xl animate-fade-in">
          <Maximize2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>Fullscreen required during interview</span>
          <button
            onClick={requestFullscreen}
            className="ml-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold rounded-lg transition-all text-[11px]"
          >
            Re-enter Fullscreen
          </button>
        </div>
      )}

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

              <button
                type="button"
                onClick={requestFullscreen}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all btn-scale flex items-center gap-1.5 border shadow-sm ${
                  isFullscreen
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                {isFullscreen ? 'Fullscreen Active' : 'Enter Fullscreen'}
              </button>

              {!micIssueReason && (
                <button
                  type="button"
                  onClick={() => setShowMicModal(true)}
                  className="text-[11px] font-semibold text-vs-muted hover:text-vs-accent underline transition-colors"
                >
                  Having mic trouble? Switch to typing
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Camera / Mic Hardware Not Detected Warning Bar */}
        {voiceModeOn && !camStream && !micIssueReason && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/40 rounded-2xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-300 animate-fade-in shadow-sm">
            <div className="flex items-center gap-2.5">
              <VideoOff className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <strong className="block text-vs-text text-xs">Webcam or Microphone Not Detected</strong>
                <span className="text-[11px] text-vs-muted">Your browser could not access the camera/mic feed. If you have hardware issues, report the trouble to your teacher to switch to typed mode.</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowMicModal(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-xs transition-all btn-scale flex-shrink-0"
            >
              Report Hardware Trouble to Teacher
            </button>
          </div>
        )}

        {/* Viva Session Info Banner */}
        {voiceModeOn && !micIssueReason && (
          <div className="p-4 bg-vs-surface border border-vs-border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
                <Video className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <p className="flex items-center gap-1.5 text-xs font-bold text-vs-text">
                  Live AI Defence Session &amp; Self-View
                </p>
                <p className="text-[11px] text-vs-muted leading-relaxed max-w-md">
                  Audio is transcribed in real-time via Groq Whisper AI. Your self-view camera and anti-cheating proctoring remain strictly local on your browser for privacy.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-1.5 border-t sm:border-t-0 pt-2 sm:pt-0 border-vs-border text-[11px]">
              <span className="font-semibold text-vs-accent">Whisper AI Voice Active</span>
              {proctorActive && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-400 text-[10px] font-semibold">
                  <ShieldCheck className="w-3 h-3" />
                  Proctoring Active
                </div>
              )}
            </div>
          </div>
        )}

        {/* Typed Mode Unlocked Banner */}
        {micIssueReason && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs flex items-center justify-between text-amber-400 font-medium animate-fade-in shadow-sm">
            <span className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">TYPED MODE</span>
              <span>Hardware / Mic Trouble Logged for Teacher: <strong>"{micIssueReason}"</strong></span>
            </span>
            <button
              type="button"
              onClick={() => setShowMicModal(true)}
              className="text-[11px] font-bold underline hover:opacity-80"
            >
              Update Reason
            </button>
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
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {voiceModeOn && (
                        <>
                          {/* Play / Replay Question Audio */}
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
                        </>
                      )}

                      {/* Clear Response Button */}
                      {item.answer.trim().length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleAnswerChange(idx, '')}
                          title="Clear response to re-record or re-type"
                          className="px-2.5 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/50 transition-all flex items-center gap-1.5 text-xs font-semibold btn-scale"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Clear Response</span>
                        </button>
                      )}
                    </div>
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
                    readOnly={voiceModeOn && !micIssueReason}
                    value={item.answer}
                    onChange={(e) => handleAnswerChange(idx, e.target.value)}
                    placeholder={
                      micIssueReason
                        ? 'Type your explanation or rationale here...'
                        : voiceModeOn
                        ? 'Dictate with your mic above. To type directly, click "Having mic trouble?"'
                        : 'Type your explanation or rationale here...'
                    }
                    className={`w-full p-3.5 border rounded-xl text-xs text-vs-text placeholder-vs-muted focus:outline-none font-mono transition-all shadow-inner leading-relaxed ${
                      voiceModeOn && !micIssueReason
                        ? 'bg-vs-surface-2/60 border-vs-border cursor-not-allowed opacity-90'
                        : 'bg-vs-surface-2 border-vs-border focus:border-vs-accent'
                    }`}
                  />
                  {item.answer.trim().length > 0 && (
                    <div className="flex items-center justify-between text-[11px] pt-0.5">
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Response recorded
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAnswerChange(idx, '')}
                        className="text-rose-400 hover:text-rose-300 font-semibold underline flex items-center gap-1 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" /> Clear &amp; Re-answer
                      </button>
                    </div>
                  )}
                  {voiceModeOn && !micIssueReason && (
                    <p className="text-[10px] text-vs-muted italic">
                      💡 Voice viva is standard. Dictate your response above, or click{' '}
                      <button
                        type="button"
                        onClick={() => setShowMicModal(true)}
                        className="text-vs-accent underline font-semibold"
                      >
                        Having mic trouble?
                      </button>{' '}
                      to provide a reason and switch to typing.
                    </p>
                  )}
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

      {/* ── Microphone / Camera Hardware Issue Explanation Modal ────────────────────────────── */}
      {showMicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-vs-surface border border-vs-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-vs-border pb-3">
              <h3 className="text-sm font-bold text-vs-text flex items-center gap-2">
                <MicOff className="w-4 h-4 text-amber-500" />
                Hardware Issue Confirmation &amp; Faculty Report
              </h3>
              <button
                type="button"
                onClick={() => setShowMicModal(false)}
                className="text-vs-muted hover:text-vs-text p-1 rounded-lg hover:bg-vs-surface-2 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-vs-muted leading-relaxed">
              Voice and camera proctoring are standard for AI skill verification. If your microphone or camera is not detected or broken, please describe the problem below. This explanation will be logged and sent directly to your faculty teacher for review in the Test Review Section.
            </p>

            <form onSubmit={handleMicReasonSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-vs-text mb-1.5">
                  Describe your microphone or camera hardware issue <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={micFormReason}
                  onChange={(e) => {
                    setMicFormReason(e.target.value);
                    if (micFormError) setMicFormError('');
                  }}
                  placeholder="e.g. Microphone not detected by browser, camera hardware failure, heavy background noise, driver error..."
                  className="w-full p-3 bg-vs-surface-2 border border-vs-border rounded-xl text-xs text-vs-text placeholder-vs-muted focus:outline-none focus:border-vs-accent font-sans transition-all shadow-inner"
                />
                {micFormError && (
                  <p className="text-[11px] font-semibold text-rose-500 mt-1">
                    {micFormError}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-vs-border">
                <button
                  type="button"
                  onClick={() => setShowMicModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-vs-muted hover:text-vs-text transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-vs-bg font-bold text-xs rounded-xl shadow-md transition-all btn-scale"
                >
                  Confirm &amp; Log Trouble for Teacher Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
