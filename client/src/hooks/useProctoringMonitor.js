import { useEffect, useRef, useCallback, useState } from 'react';
import { interviewsAPI } from '../lib/api';

/**
 * useProctoringMonitor
 *
 * Lightweight AI-proctoring hook for the AI Interview session.
 * Signals are purely informational — no auto-fail logic.
 *
 * Monitors:
 *  - Tab switch / focus loss (visibilitychange + window blur)
 *  - Fullscreen exit (fullscreenchange)
 *  - Face detection: no face / multiple faces (face-api.js TinyFaceDetector, every 4s)
 *
 * @param {string|null} submissionId  - used to POST flags to backend
 * @param {MediaStream|null} camStream - webcam stream (must already be active)
 * @param {boolean} active            - only monitor while true (interview in progress)
 *
 * Returns:
 *  { flags, flagSummary, isFullscreen, requestFullscreen, toasts, dismissToast }
 */
export default function useProctoringMonitor({ submissionId, camStream, active }) {
  const [flags, setFlags] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [toasts, setToasts] = useState([]);

  const faceDetectionRef = useRef(null);
  const faceApiLoadedRef = useRef(false);
  const videoElRef = useRef(null);
  const lastTabSwitchRef = useRef(0);
  const lastFocusLossRef = useRef(0);
  const DEDUP_MS = 3000;

  // ─── Toast helpers ──────────────────────────────────────────────────────────
  const addToast = useCallback((message, color = 'amber') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, color }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ─── Log flag to state + backend ───────────────────────────────────────────
  const logFlag = useCallback(
    async (type, details = '') => {
      const flag = { type, timestamp: new Date().toISOString(), details };
      setFlags((prev) => [...prev, flag]);
      if (submissionId) {
        try {
          await interviewsAPI.logProctoringFlag(submissionId, flag);
        } catch {
          // silent — proctoring must never interrupt the interview
        }
      }
    },
    [submissionId]
  );

  // ─── Fullscreen ─────────────────────────────────────────────────────────────
  const requestFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Safari or blocked by browser policy
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // silent
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await requestFullscreen();
    } else {
      await exitFullscreen();
    }
  }, [requestFullscreen, exitFullscreen]);

  useEffect(() => {
    const onFsChange = () => {
      const inFs = !!document.fullscreenElement;
      setIsFullscreen(inFs);
      if (!inFs && active) {
        logFlag('FULLSCREEN_EXIT', 'Exited fullscreen during interview');
        addToast('⚠ Fullscreen exited — please return to fullscreen to continue.', 'amber');
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [active, logFlag, addToast]);

  // ─── Tab switch & focus loss ─────────────────────────────────────────────────
  useEffect(() => {
    if (!active) return;

    const onVisibility = () => {
      if (document.hidden) {
        const now = Date.now();
        if (now - lastTabSwitchRef.current > DEDUP_MS) {
          lastTabSwitchRef.current = now;
          logFlag('TAB_SWITCH', 'Student navigated away from the interview tab');
          addToast('⚠ Tab switch detected — please stay on this page.', 'rose');
        }
      }
    };

    const onBlur = () => {
      const now = Date.now();
      if (now - lastFocusLossRef.current > DEDUP_MS) {
        lastFocusLossRef.current = now;
        logFlag('FOCUS_LOSS', 'Browser window lost focus');
        addToast('⚠ Window focus lost — keep this window active during the interview.', 'amber');
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
    };
  }, [active, logFlag, addToast]);

  // ─── Face detection ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!active || !camStream) return;
    let destroyed = false;

    const startFaceDetection = async () => {
      if (faceApiLoadedRef.current) return;
      try {
        const faceapi = await import('@vladmandic/face-api');
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        faceApiLoadedRef.current = true;
        if (destroyed) return;

        const video = document.createElement('video');
        video.srcObject = camStream;
        video.muted = true;
        video.playsInline = true;
        videoElRef.current = video;
        await video.play().catch(() => {});

        faceDetectionRef.current = setInterval(async () => {
          if (destroyed || !videoElRef.current) return;
          if (videoElRef.current.readyState < 2) return; // ensure video frame data is ready
          try {
            const detections = await faceapi.detectAllFaces(
              videoElRef.current,
              new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
            );
            if (detections.length === 0) {
              logFlag('NO_FACE', 'No face detected in webcam frame');
              addToast('⚠ No face detected — ensure your face is visible in the camera.', 'rose');
            } else if (detections.length > 1) {
              logFlag('MULTIPLE_FACES', `${detections.length} faces detected in webcam frame`);
              addToast('⚠ Multiple faces detected — interviews must be taken individually.', 'rose');
            }
          } catch {
            // silent
          }
        }, 4000);
      } catch (err) {
        console.warn('[Proctor] face-api load failed (non-critical):', err.message);
      }
    };

    startFaceDetection();

    return () => {
      destroyed = true;
      if (faceDetectionRef.current) {
        clearInterval(faceDetectionRef.current);
        faceDetectionRef.current = null;
      }
      if (videoElRef.current) {
        videoElRef.current.srcObject = null;
        videoElRef.current = null;
      }
    };
  }, [active, camStream, logFlag, addToast]);

  const flagSummary = flags.reduce((acc, f) => {
    acc[f.type] = (acc[f.type] || 0) + 1;
    return acc;
  }, {});

  return { flags, flagSummary, isFullscreen, requestFullscreen, exitFullscreen, toggleFullscreen, toasts, dismissToast };
}
