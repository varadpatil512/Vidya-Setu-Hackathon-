/**
 * AI Service Client for Vidya-Setu.
 * Calls the separate Python AI Orchestration Service (port 8000) for question generation
 * and interview scoring, per the project's two-service backend architecture.
 * 
 * Falls back to local heuristics if the Python service is offline.
 */

const PYTHON_AI_URL = process.env.PYTHON_AI_URL || 'http://localhost:8000';
const BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export function hasKey() {
  return Boolean(process.env.OPENAI_API_KEY);
}

// Helper for calling Python AI Service via internal HTTP call
async function callPythonService(endpoint, payload) {
  try {
    const res = await fetch(`${PYTHON_AI_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`[Node AI Client] Python AI Service unavailable at ${PYTHON_AI_URL}:`, err.message);
  }
  return null;
}

// ---------- question generation ----------

export async function generateQuestions({ course, submission }) {
  // First try the separate Python AI Service per architecture requirement
  const language = course.assignment?.language || 'code';
  const pyResult = await callPythonService('/api/generate-questions', {
    course,
    submission,
    questionCount: 2,
    language,
  });
  if (pyResult && Array.isArray(pyResult.questions) && pyResult.questions.length) {
    return { questions: pyResult.questions.slice(0, 2), generatedBy: pyResult.generatedBy || 'python-ai-service' };
  }

  // Direct OpenAI fallback if key available in Node
  const source = submission.type === 'code' ? submission.code : submission.text;
  const assignmentPrompt = course.assignment?.prompt || course.assignment?.title || course.description || '';
  const skillTag = course.skill || course.title || '';

  const isProgrammingLang = ['javascript', 'python'].includes(language);
  const langConstraint = isProgrammingLang
    ? `The submission is ${language} code — you may ask about logic, functions, conditionals, or loops only if those constructs actually appear in the submitted code.`
    : `The submission is ${language} — only ask about ${language === 'sql' ? 'SQL syntax, clauses, table references, and query logic' : 'layout, styling, selectors, properties, and structure'} actually present in the code. Do NOT ask about programming concepts such as loops, conditionals, functions, branching, edge cases, or exception handling — they are not applicable to this submission. For example, do not ask about "conditional branching" or "edge cases" for a CSS-only or SQL-only submission.`;

  if (hasKey()) {
    try {
      const out = await llmJson(
        `You are an AI examiner reviewing a student submission to generate interview questions. Return ONLY a JSON object containing a "questions" key with an array of 2 short question strings. ${langConstraint}`,
        `You are reviewing a student's submission for the assignment: '${assignmentPrompt}'. Skill being verified: '${skillTag}'. Language: ${language}. Here is their submission:\n---\n${String(source).slice(0, 6000)}\n---\nGenerate exactly 2 short interview questions that test whether the student understands their own submission — ask about specific choices they made (e.g. why a particular selector, property, or query clause was used), not generic definitions. ${langConstraint} Return ONLY a JSON object with a "questions" key containing an array of 2 question strings.`
      );
      if (Array.isArray(out.questions) && out.questions.length) {
        return { questions: out.questions.slice(0, 2), generatedBy: 'openai-direct' };
      }
    } catch (err) {
      console.warn('[ai] OpenAI question generation failed, using mock:', err.message);
    }
  }

  return { questions: mockQuestions(course, submission), generatedBy: 'node-fallback' };
}

// ---------- interview scoring ----------

export async function scoreInterview({ course, submission, answers }) {
  // First try Python AI Service
  const pyResult = await callPythonService('/api/score-interview', { course, submission, answers });
  if (pyResult && pyResult.verdict) {
    return {
      consistency: clamp01(pyResult.consistency),
      confidence: clamp01(pyResult.confidence),
      verdict: pyResult.verdict === 'FLAG' ? 'FLAG' : 'VERIFY',
      qualityScore: Math.round(clamp01((pyResult.qualityScore || 0) / 100) * 100),
      reasoning: String(pyResult.reasoning || ''),
      feedback: String(pyResult.feedback || ''),
      scoredBy: pyResult.scoredBy || 'python-ai-service',
    };
  }

  // Direct OpenAI fallback
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
        scoredBy: 'openai-direct',
      };
    } catch (err) {
      console.warn('[ai] Direct OpenAI scoring failed:', err.message);
    }
  }

  return mockScore(course, submission, answers);
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
  const content = data.choices[0].message.content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(content);
}

function clamp01(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
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
    const code = String(submission.code || '');
    const { names, loops, usesCond } = codeFacts(code);

    const hasId = /#|id\s*=/.test(code);
    const hasClass = /\.|class\s*=/.test(code);
    const hasStyle = /style|color|background|font/.test(code);

    if (hasId && hasClass) {
      const classMatches = [...code.matchAll(/class=["']([^"']+)["']|\.([A-Za-z0-9_-]+)/g)].map(m => m[1] || m[2]);
      const idMatches = [...code.matchAll(/id=["']([^"']+)["']|#([A-Za-z0-9_-]+)/g)].map(m => m[1] || m[2]);
      const cName = classMatches[0] || 'class';
      const iName = idMatches[0] || 'id';
      qs.push(`Why did you use the \`#${iName}\` ID selector for unique elements while using the \`.${cName}\` class selector for reusable styling in your code?`);
    } else if (hasClass) {
      const classMatches = [...code.matchAll(/class=["']([^"']+)["']|\.([A-Za-z0-9_-]+)/g)].map(m => m[1] || m[2]);
      const cName = classMatches[0] ? `.${classMatches[0]}` : 'class';
      qs.push(`Why did you choose to define the \`${cName}\` class selector for your styling instead of applying inline styles?`);
    } else if (hasId) {
      const idMatches = [...code.matchAll(/id=["']([^"']+)["']|#([A-Za-z0-9_-]+)/g)].map(m => m[1] || m[2]);
      const iName = idMatches[0] ? `#${idMatches[0]}` : 'ID';
      qs.push(`Why did you use the \`${iName}\` ID selector here, and in what scenario would a class selector be more appropriate?`);
    } else if (names.length) {
      qs.push(`Walk me through what your function \`${names[0]}\` does, input to output.`);
    } else {
      qs.push(`Explain why you selected this specific structural approach for your ${course.skill || 'assignment'} solution.`);
    }

    if (hasStyle) {
      const colorMatches = [...code.matchAll(/(color|background-color|background|font-size)\s*:\s*([^;}\n]+)/g)].map(m => [m[1], m[2]]);
      if (colorMatches.length) {
        const [prop, val] = colorMatches[0];
        qs.push(`Why did you choose \`${val.trim()}\` for the \`${prop.trim()}\` property in your submission?`);
      } else {
        qs.push(`How do the CSS styling rules in your submission establish visual hierarchy for the user?`);
      }
    } else if (loops) {
      qs.push(`You used a loop in your solution — what exactly does each iteration do, and what would break if you removed it?`);
    } else if (usesCond) {
      qs.push(`Describe a specific input where your conditional logic takes the other branch, and why.`);
    } else {
      qs.push(`What alternative implementation or property did you evaluate before finalizing this submission?`);
    }
  } else {
    // text-type (HTML/CSS/SQL rubric submissions): stay domain-specific, no logic jargon
    const source2 = String(submission.text || submission.code || '');
    const firstSentence = source2.split(/[.!?\n]/).map(s => s.trim()).filter(Boolean)[0] || 'your answer';
    qs.push(`Your submission reads: "${firstSentence.slice(0, 120)}" — explain in your own words why you wrote it this way.`);
    qs.push(`What specific ${course.skill || 'concept'} technique or keyword in your submission was the most important choice you made, and why?`);
  }
  return qs.slice(0, 2);
}

const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'on', 'for', 'is', 'are', 'was', 'it', 'i', 'you', 'my', 'your', 'this', 'that', 'with', 'as', 'at', 'be', 'have', 'has', 'do', 'does', 'would', 'will', 'can', 'could', 'should', 'if', 'then', 'else', 'not', 'but', 'from', 'by', 'so', 'we', 'they', 'me', 'am']);

function words(s) {
  return String(s || '').toLowerCase().match(/[a-z0-9_$]+/g) || [];
}

function overlap(answerWords, sourceSet) {
  if (!answerWords.length) return 0;
  const hits = answerWords.filter(w => sourceSet.has(w)).length;
  return hits / answerWords.length;
}

function mockScore(course, submission, answers) {
  const source = submission.type === 'code' ? submission.code : submission.text;
  const { names } = submission.type === 'code' ? codeFacts(submission.code) : { names: [] };
  const sourceSet = new Set(words(source));
  names.forEach(n => sourceSet.add(n.toLowerCase()));

  let total = 0;
  const perAnswer = answers.map(qa => {
    const ws = words(qa.answer);
    const lenScore = Math.min(1, ws.filter(w => !STOP.has(w)).length / 25);
    const ov = overlap(ws.filter(w => !STOP.has(w)), sourceSet);
    const mentionsName = names.some(n => qa.answer.toLowerCase().includes(n.toLowerCase())) ? 0.15 : 0;
    return Math.min(1, 0.45 * lenScore + 0.55 * ov + mentionsName);
  });
  total = perAnswer.length ? perAnswer.reduce((a, b) => a + b, 0) / perAnswer.length : 0;

  const pastePenalty = Math.min(0.25, (submission.pasteEvents || 0) * 0.1);
  const consistency = clamp01(total - pastePenalty);
  const questionCount = 2;
  const confidence = clamp01(consistency * 0.9 + (perAnswer.length >= Math.max(1, questionCount - 1) ? 0.05 : 0));
  const verdict = consistency >= 0.45 && confidence >= 0.4 ? 'VERIFY' : 'FLAG';
  const qualityScore = Math.round(consistency * 100);

  const reasoning = verdict === 'VERIFY'
    ? `Node Fallback: Answers consistent (${(consistency * 100).toFixed(0)}%).`
    : `Node Fallback: Low consistency (${(consistency * 100).toFixed(0)}%). Flagged.`;
  const feedback = verdict === 'VERIFY'
    ? 'Your interview answers show genuine ownership of the work.'
    : 'Your answers did not connect clearly to your submitted work.';

  return { consistency, confidence, verdict, qualityScore, reasoning, feedback, scoredBy: 'node-fallback' };
}
