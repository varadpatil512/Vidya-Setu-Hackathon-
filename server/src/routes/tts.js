import { Router } from 'express';

const router = Router();

router.post('/', async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ message: 'Text is required' });
  }

  const cleanText = text.trim().slice(0, 1000);
  const geminiKey = process.env.GEMINI_API_KEY || '';
  const openaiKey = process.env.OPENAI_API_KEY || '';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    // 1. Try Gemini TTS if key present
    if (geminiKey) {
      try {
        const geminiModel = process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`;
        const payload = {
          contents: [{ parts: [{ text: cleanText }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: 'Puck',
                },
              },
            },
          },
        };

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (response.ok) {
          const data = await response.json();
          const part = data.candidates?.[0]?.content?.parts?.[0];
          const audioBase64 = part?.inlineData?.data;
          const mimeType = part?.inlineData?.mimeType || 'audio/mp3';
          if (audioBase64) {
            clearTimeout(timeout);
            return res.json({
              audioData: `data:${mimeType};base64,${audioBase64}`,
              provider: 'gemini-tts',
            });
          }
        }
      } catch (geminiErr) {
        console.warn('[tts] Gemini TTS request error/timeout:', geminiErr.message);
      }
    }

    // 2. Try OpenAI TTS if available
    if (openaiKey && !controller.signal.aborted) {
      try {
        const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
        const response = await fetch(`${baseUrl}/audio/speech`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'tts-1',
            input: cleanText,
            voice: 'alloy',
          }),
          signal: controller.signal,
        });

        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          clearTimeout(timeout);
          return res.json({
            audioData: `data:audio/mp3;base64,${base64}`,
            provider: 'openai-tts',
          });
        }
      } catch (openAiErr) {
        console.warn('[tts] OpenAI TTS request error/timeout:', openAiErr.message);
      }
    }

    clearTimeout(timeout);
    return res.status(503).json({ message: 'TTS services unavailable or timed out, fallback to browser' });
  } catch (err) {
    clearTimeout(timeout);
    return res.status(503).json({ message: 'TTS failed, fallback to browser speech synthesis' });
  }
});

export default router;
