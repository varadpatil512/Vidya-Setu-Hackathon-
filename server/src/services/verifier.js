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
 * Runs student JavaScript/HTML/CSS against a course's test cases and rubric.
 * Two modes per test case:
 *  - { fn, args, expected }  → run code, call fn(...args), compare return value
 *  - { expectedOutput }      → run whole program, capture console.log output, compare
 * If no testCases are specified (e.g. HTML/CSS/SQL challenges), checks rubric terms.
 * Returns { passed, results: [{ name, passed, expected, actual }] }
 */
export function verifyCode(code, testCases = [], rubric = '') {
  const results = [];
  const cleanCode = String(code || '').trim();

  if (!cleanCode) {
    return {
      passed: false,
      results: [{ name: 'Submission Check', passed: false, expected: 'non-empty code', actual: 'empty' }],
    };
  }

  if (Array.isArray(testCases) && testCases.length > 0) {
    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      try {
        if (tc.fn) {
          const sandbox = { console: { log() {} } };
          vm.createContext(sandbox);
          vm.runInContext(cleanCode, sandbox, { timeout: TIMEOUT_MS });
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
          vm.runInContext(cleanCode, sandbox, { timeout: TIMEOUT_MS });
          const actual = logs.join('\n').trim();
          const expected = String(tc.expectedOutput || '').trim();
          results.push({ name: `Test ${i + 1} — program output`, passed: actual === expected, expected, actual });
        }
      } catch (err) {
        results.push({ name: `Test ${i + 1}`, passed: false, expected: 'runs without error', actual: `error: ${err.message}` });
      }
    }
  }

  // Rubric / Keyword check if rubric is present
  if (rubric && typeof rubric === 'string' && rubric.trim()) {
    const terms = rubric
      .split(/[,;\n]/)
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 1);
    const lowerCode = cleanCode.toLowerCase();
    const covered = terms.filter(t => lowerCode.includes(t));
    const rubricPassed = terms.length === 0 || (covered.length / terms.length) >= 0.4;
    results.push({
      name: rubricPassed ? 'Code Completion Successful' : 'Code Review Needed',
      passed: rubricPassed,
      expected: rubricPassed ? 'Move to interview' : 'Refine your submission and resubmit',
      actual: rubricPassed ? 'Ready for AI Viva' : 'Some key concepts missing',
    });
  } else if (results.length === 0) {
    // Default verification for non-empty code submission
    results.push({
      name: 'Code Completion Successful',
      passed: true,
      expected: 'Move to interview',
      actual: 'Ready for AI Viva',
    });
  }

  const passed = results.length > 0 && results.every(r => r.passed);
  return { passed, results };
}

/**
 * Lightweight rubric check for text submissions: coverage of rubric terms only.
 */
export function verifyText(text, rubric = '') {
  const terms = rubric
    .split(/[,;\n]/)
    .map(t => t.trim().toLowerCase())
    .filter(t => t.length > 1);
  const lower = String(text || '').toLowerCase();
  const covered = terms.filter(t => lower.includes(t));
  const passed = terms.length === 0 || covered.length / terms.length >= 0.4;
  return {
    passed,
    results: [
      {
        name: passed ? 'Code Completion Successful' : 'Code Review Needed',
        passed,
        expected: passed ? 'Move to interview' : 'Refine your submission and resubmit',
        actual: passed ? 'Ready for AI Viva' : 'Some key concepts missing',
      },
    ],
  };
}
