import vm from 'node:vm';

const TIMEOUT_MS = 2000;

function stringify(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Runs student JavaScript against a course's test cases.
 * Two modes per test case:
 *  - { fn, args, expected }  → run code, call fn(...args), compare return value
 *  - { expectedOutput }      → run whole program, capture console.log output, compare
 * Returns { passed, results: [{ name, passed, expected, actual }] }
 */
export function verifyCode(code, testCases = []) {
  const results = [];
  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    try {
      if (tc.fn) {
        const sandbox = { console: { log() {} } };
        vm.createContext(sandbox);
        vm.runInContext(String(code), sandbox, { timeout: TIMEOUT_MS });
        const fn = sandbox[tc.fn];
        if (typeof fn !== 'function') {
          results.push({ name: `Test ${i + 1}`, passed: false, expected: `function ${tc.fn}() defined`, actual: 'not defined' });
          continue;
        }
        const actual = fn(...(tc.args || []));
        const expected = tc.expected;
        const passed = stringify(actual) === stringify(expected);
        results.push({ name: `Test ${i + 1} — ${tc.fn}(${(tc.args || []).map(stringify).join(', ')})`, passed, expected: stringify(expected), actual: stringify(actual) });
      } else {
        const logs = [];
        const sandbox = { console: { log: (...a) => logs.push(a.map(stringify).join(' ')) } };
        vm.createContext(sandbox);
        vm.runInContext(String(code), sandbox, { timeout: TIMEOUT_MS });
        const actual = logs.join('\n').trim();
        const expected = String(tc.expectedOutput || '').trim();
        results.push({ name: `Test ${i + 1} — program output`, passed: actual === expected, expected, actual });
      }
    } catch (err) {
      results.push({ name: `Test ${i + 1}`, passed: false, expected: 'runs without error', actual: `error: ${err.message}` });
    }
  }
  return { passed: results.length > 0 && results.every(r => r.passed), results };
}

/**
 * Lightweight rubric check for text submissions: coverage of rubric terms only.
 * A submission passes when at least 50% of the rubric terms are present in the text.
 * (The real judgement happens later in the AI interview step.)
 * No length-based check — short but complete answers are accepted.
 */
export function verifyText(text, rubric = '') {
  const terms = rubric
    .split(/[,;\n]/)
    .map(t => t.trim().toLowerCase())
    .filter(t => t.length > 3);
  const lower = String(text || '').toLowerCase();
  const covered = terms.filter(t => lower.includes(t));
  const passed = terms.length === 0 || covered.length / terms.length >= 0.5;
  return {
    passed,
    results: [
      { name: 'Rubric term coverage', passed, expected: terms.length ? terms.join(', ') : 'no rubric terms', actual: covered.join(', ') || 'none' },
    ],
  };
}

