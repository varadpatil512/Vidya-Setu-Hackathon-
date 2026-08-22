import { Router } from 'express';
import multer from 'multer';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

router.post('/', upload.single('audio'), async (req, res) => {
  try {
    const file = req.file;
    if (!file || !file.buffer || file.buffer.length === 0) {
      return res.status(400).json({ message: 'No audio file provided' });
    }

    const groqKey = process.env.GROQ_API_KEY || '';
    const openaiKey = process.env.OPENAI_API_KEY || '';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000); // 6s timeout

    // 1. Try Groq Whisper API (whisper-large-v3-turbo)
    if (groqKey) {
      try {
        const formData = new FormData();
        const blob = new Blob([file.buffer], { type: file.mimetype || 'audio/webm' });
        formData.append('file', blob, file.originalname || 'audio.webm');
        formData.append('model', 'whisper-large-v3-turbo');
        formData.append('language', 'en');
        formData.append('response_format', 'json');

        const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${groqKey}`,
          },
          body: formData,
          signal: controller.signal,
        });

        if (groqRes.ok) {
          const data = await groqRes.json();
          clearTimeout(timeout);
          return res.json({
            text: data.text || '',
            provider: 'groq-whisper-large-v3-turbo',
          });
        } else {
          const errText = await groqRes.text();
          console.warn('[transcribe] Groq Whisper error:', groqRes.status, errText);
        }
      } catch (groqErr) {
        console.warn('[transcribe] Groq request failed/timed out:', groqErr.message);
      }
    }

    // 2. Fallback to OpenAI Whisper if key present
    if (openaiKey && !controller.signal.aborted) {
      try {
        const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
        const formData = new FormData();
        const blob = new Blob([file.buffer], { type: file.mimetype || 'audio/webm' });
        formData.append('file', blob, file.originalname || 'audio.webm');
        formData.append('model', 'whisper-1');

        const openAiRes = await fetch(`${baseUrl}/audio/transcriptions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openaiKey}`,
          },
          body: formData,
          signal: controller.signal,
        });

        if (openAiRes.ok) {
          const data = await openAiRes.json();
          clearTimeout(timeout);
          return res.json({
            text: data.text || '',
            provider: 'openai-whisper-1',
          });
        }
      } catch (openAiErr) {
        console.warn('[transcribe] OpenAI Whisper request failed/timed out:', openAiErr.message);
      }
    }

    clearTimeout(timeout);
    return res.status(503).json({
      message: 'Whisper API unavailable or timed out, fallback to local recognition',
    });
  } catch (err) {
    console.error('[transcribe] route error:', err);
    return res.status(500).json({ message: 'Transcription processing error' });
  }
});

export default router;
