/**
 * AI layer for Vidya-Setu.
 * Uses the OpenAI Chat Completions API when OPENAI_API_KEY is set.
 * Falls back to deterministic heuristics ("mock mode") otherwise, so the
 * full course → assignment → interview → badge loop always demos, even offline.
 */

const BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export function hasKey() {
  return Boolean(process.env.OPENAI_API_KEY);
}

async function llmJson(system, user) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

// ---------- question generation ----------

export async function generateQuestions({ course, submission }) {
  const source = submission.type === 'code' ? submission.code : submission.text;
  if (hasKey()) {
    try {
      const out = await llmJson(
        'You are an examiner generating a short viva interview to verify a student truly understands work they submitted. Return JSON: {"questions": ["...", ...]} with exactly 5 specific questions grounded in THEIR submission (reference functions, choices, or claims it contains). Never generic trivia.',
        `Course: ${course.title} (skill: ${course.skill})\nAssignment: ${course.assignment.title}\nPrompt: ${course.assignment.prompt}\n\nStudent submission:\n${String(source).slice(0, 6000)}`
      );
      if (Array.isArray(out.questions) && out.questions.length) {
        return { questions: out.questions.slice(0, 5), generatedBy: 'openai' };
      }
    } catch (err) {
      console.warn('[ai] OpenAI question generation failed, using mock:', err.message);
    }
  }
  return { questions: mockQuestions(course, submission), generatedBy: 'mock' };
}

function codeFacts(code) {
  const fns = [...String(code).matchAll(/function\s+([A-Za-z_$][\w$]*)/g)].map(m => m[1]);
  const arrowFns = [...String(code).matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:\([^)]*\)|[\w$]+)\s*=>/g)].map(m => m[1]);
  const names = [...new Set([...fns, ...arrowFns])];
  const loops = /(for|while)\s*\(/.test(code);
  const usesMap = /\.map\(/.test(code);
  const usesCond = /(if|switch|ternary|\?)/.test(code);
  return { names, loops, usesMap, usesCond, lines: String(code).split('\n').length };
}

function mockQuestions(course, submission) {
  const qs = [];
  if (submission.type === 'code') {
    const { names, loops, usesMap, usesCond, lines } = codeFacts(submission.code);
    if (names.length) {
      qs.push(`Walk me through what your function \`${names[0]}\` does, input to output.`);
      if (names.length > 1) qs.push(`Why did you split the logic between \`${names[0]}\` and \`${names[1]}\` instead of writing one function?`);
    } else {
      qs.push(`Explain the overall structure of your solution and why you organised it this way.`);
    }
    if (loops) qs.push(`You used a loop in your solution — what exactly does each iteration do, and what would break if you removed it?`);
    if (usesMap) qs.push(`Where does \`.map()\` get used in your code, and what would change if you replaced it with \`.forEach()\`?`);
    if (usesCond) qs.push(`Describe a specific input where your conditional logic takes the other branch, and why.`);
    qs.push(`If the assignment's test cases changed to handle negative numbers, what would you need to modify in your code and why?`);
  } else {
    const firstSentence = String(submission.text).split(/[.!?\n]/).map(s => s.trim()).filter(Boolean)[0] || 'your answer';
    qs.push(`Your submission opens with: "${firstSentence.slice(0, 120)}..." — defend that claim in your own words.`);
    qs.push(`What alternative approach did you consider and reject for this assignment, and why?`);
    qs.push(`Which part of the course videos most directly shaped your submission? Be specific.`);
    qs.push(`If a reviewer challenged the weakest part of your submission, which part would that be and how would you respond?`);
    qs.push(`How would your answer change if the constraint in the assignment were doubled?`);
  }
  qs.push(`Finally: in one sentence, what is the single biggest limitation of your own submission?`);
  return qs.slice(0, 5);
}

// ---------- interview scoring ----------

const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'on', 'for', 'is', 'are', 'was', 'it', 'i', 'you', 'my', 'your', 'this', 'that', 'with', 'as', 'at', 'be', 'have', 'has', 'do', 'does', 'would', 'will', 'can', 'could', 'should', 'if', 'then', 'else', 'not', 'but', 'from', 'by', 'so', 'we', 'they', 'me', 'am']);

function words(s) {
  return String(s || '').toLowerCase().match(/[a-z0-9_$]+/g) || [];
}

function overlap(answerWords, sourceSet) {
  if (!answerWords.length) return 0;
  const hits = answerWords.filter(w => sourceSet.has(w)).length;
  return hits / answerWords.length;
}

export async function scoreInterview({ course, submission, answers }) {
  if (hasKey()) {
    try {
      const source = submission.type === 'code' ? submission.code : submission.text;
      const out = await llmJson(
        'You are verifying authorship and understanding. The student submitted work, then answered a viva interview about it. Score how consistent their answers are with the submission and whether they demonstrate genuine understanding. Return JSON: {"consistency": 0-1 number, "confidence": 0-1 number, "verdict": "VERIFY" or "FLAG", "qualityScore": 0-100, "reasoning": "1-3 sentences", "feedback": "2-3 sentences of constructive feedback for the student"}. Be suspicious of vague or generic answers that could apply to anyone\'s work.',
        `Course: ${course.title}\nAssignment prompt: ${course.assignment.prompt}\n\nSubmission:\n${String(source).slice(0, 6000)}\n\nInterview Q&A:\n${answers.map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`).join('\n\n')}\n\nPaste-detection events during coding: ${submission.pasteEvents || 0}`
      );
      return {
        consistency: clamp01(out.consistency),
        confidence: clamp01(out.confidence),
        verdict: out.verdict === 'FLAG' ? 'FLAG' : 'VERIFY',
        qualityScore: Math.round(clamp01(out.qualityScore / 100) * 100),
        reasoning: String(out.reasoning || ''),
        feedback: String(out.feedback || ''),
        scoredBy: 'openai',
      };
    } catch (err) {
      console.warn('[ai] OpenAI scoring failed, using mock:', err.message);
    }
  }
  return mockScore(course, submission, answers);
}

function clamp01(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function mockScore(course, submission, answers) {
  const source = submission.type === 'code' ? submission.code : submission.text;
  const { names } = submission.type === 'code' ? codeFacts(submission.code) : { names: [] };
  const sourceSet = new Set(words(source));
  names.forEach(n => sourceSet.add(n.toLowerCase()));

  let total = 0;
  const perAnswer = answers.map(qa => {
    const ws = words(qa.answer);
    const lenScore = Math.min(1, ws.filter(w => !STOP.has(w)).length / 25); // depth
    const ov = overlap(ws.filter(w => !STOP.has(w)), sourceSet); // grounded in their own work
    const mentionsName = names.some(n => qa.answer.toLowerCase().includes(n.toLowerCase())) ? 0.15 : 0;
    return Math.min(1, 0.45 * lenScore + 0.55 * ov + mentionsName);
  });
  total = perAnswer.length ? perAnswer.reduce((a, b) => a + b, 0) / perAnswer.length : 0;

  const pastePenalty = Math.min(0.25, (submission.pasteEvents || 0) * 0.1);
  const consistency = clamp01(total - pastePenalty);
  const confidence = clamp01(consistency * 0.9 + (perAnswer.length >= 4 ? 0.05 : 0));
  const verdict = consistency >= 0.45 && confidence >= 0.4 ? 'VERIFY' : 'FLAG';
  const qualityScore = Math.round(consistency * 100);

  const reasoning = verdict === 'VERIFY'
    ? `Answers consistently reference specifics of the submission (consistency ${(consistency * 100).toFixed(0)}%). Paste-detection events: ${submission.pasteEvents || 0}.`
    : `Answers are too vague or inconsistent with the submission (consistency ${(consistency * 100).toFixed(0)}%)${submission.pasteEvents ? ` and ${submission.pasteEvents} large paste event(s) were detected during coding` : ''}. Flagged for teacher review.`;
  const feedback = verdict === 'VERIFY'
    ? 'Your interview answers show genuine ownership of the work. Keep deepening the "why" behind your design choices.'
    : 'Your answers did not connect clearly to your submitted work. Revisit your solution until you can explain every part of it, then try again.';

  return { consistency, confidence, verdict, qualityScore, reasoning, feedback, scoredBy: 'mock' };
}
