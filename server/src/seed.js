import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import Course from './models/Course.js';
import Enrollment from './models/Enrollment.js';
import Note from './models/Note.js';
import Submission from './models/Submission.js';
import Interview from './models/Interview.js';
import TeacherReview from './models/TeacherReview.js';

// Placeholder demo videos — swap for your real 1–2 minute recordings via the Admin panel.
const jsVideos = [
  { title: 'Variables & Types in 90s', url: 'https://www.youtube.com/watch?v=W6NZfCO5SIk', durationSec: 90 },
  { title: 'Functions Fast', url: 'https://www.youtube.com/watch?v=PkZNo7MFNFg', durationSec: 100 },
  { title: 'Arrays & Loops Quick Tour', url: 'https://www.youtube.com/watch?v=hdI2bqOjy3k', durationSec: 110 },
  { title: 'Strings Essentials', url: 'https://www.youtube.com/watch?v=zJSY8tbf_ys', durationSec: 80 },
  { title: 'Putting It Together', url: 'https://www.youtube.com/watch?v=cvvwmlBJ4g8', durationSec: 120 },
];

const reactVideos = [
  { title: 'What is React?', url: 'https://www.youtube.com/watch?v=Tn6-PIqc4UM', durationSec: 100 },
  { title: 'useState in 2 Minutes', url: 'https://www.youtube.com/watch?v=SqcY0GlETPk', durationSec: 110 },
  { title: 'useEffect Basics', url: 'https://www.youtube.com/watch?v=bMknfKXIFA8', durationSec: 95 },
  { title: 'Components & Props', url: 'https://www.youtube.com/watch?v=TNhaCS_cuX0', durationSec: 105 },
  { title: 'Hooks Pitfalls to Avoid', url: 'https://www.youtube.com/watch?v=1wZo1R9Xg0M', durationSec: 115 },
];

const domVideos = [
  { title: 'The DOM in 100 Seconds', url: 'https://www.youtube.com/watch?v=l72i5B5m4jM', durationSec: 100 },
  { title: 'querySelector Crash', url: 'https://www.youtube.com/watch?v=ea0o2EITo5s', durationSec: 90 },
  { title: 'Events Simply', url: 'https://www.youtube.com/watch?v=XF1_MlZ5l6w', durationSec: 100 },
  { title: 'map/filter/reduce Speedrun', url: 'https://www.youtube.com/watch?v=8f7OI5jAAys', durationSec: 110 },
  { title: 'Refactor Like a Pro', url: 'https://www.youtube.com/watch?v=3PHXvlpOkf4', durationSec: 105 },
];

const courses = [
  {
    title: 'JavaScript Fundamentals Sprint',
    description: 'Five 90-second videos, one real challenge. Finish the videos, pass the code verifier, clear the AI interview — earn a verified JavaScript skill badge.',
    category: 'Programming',
    price: 499,
    thumbnail: 'https://images.unsplash.com/photo-1579468118864-1b9ea3181be6?w=600',
    instructor: 'Ananya Sharma',
    skill: 'JavaScript Fundamentals',
    videos: jsVideos,
    assignment: {
      title: 'Palindrome & FizzBuzz Utilities',
      prompt: 'Write two functions:\n1. isPalindrome(str) — returns true if the string reads the same reversed (ignore case, spaces and punctuation).\n2. fizzbuzz(n) — for 1..n return an array where multiples of 3 are "Fizz", of 5 are "Buzz", of both "FizzBuzz", else the number itself.',
      type: 'code',
      language: 'javascript',
      starterCode: 'function isPalindrome(str) {\n  // your code\n}\n\nfunction fizzbuzz(n) {\n  // your code\n}\n',
      rubric: '',
      testCases: [
        { fn: 'isPalindrome', args: ['A man, a plan, a canal: Panama'], expected: true },
        { fn: 'isPalindrome', args: ['hello'], expected: false },
        { fn: 'isPalindrome', args: [''], expected: true },
        { fn: 'fizzbuzz', args: [5], expected: [1, 2, 'Fizz', 4, 'Buzz'] },
        { fn: 'fizzbuzz', args: [15], expected: [1, 2, 'Fizz', 4, 'Buzz', 'Fizz', 7, 8, 'Fizz', 'Buzz', 11, 'Fizz', 13, 14, 'FizzBuzz'] },
      ],
    },
  },
  {
    title: 'React Hooks Essentials',
    description: 'Five micro-lessons on state and effects, verified by a written design explanation plus an AI viva that checks you can defend your choices.',
    category: 'Web Development',
    price: 599,
    thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600',
    instructor: 'Rohan Verma',
    skill: 'React Hooks',
    videos: reactVideos,
    assignment: {
      title: 'Defend a useEffect Design',
      prompt: 'In 200+ words, explain how you would fetch data in a React component using useEffect: the dependency array, cleanup, race conditions, and why you would not fetch in the render body. Use concrete code references.',
      type: 'text',
      language: 'javascript',
      starterCode: '',
      rubric: 'useEffect, dependency array, cleanup, race condition, loading state, error handling, stale closure',
      testCases: [],
    },
  },
  {
    title: 'DOM Manipulation & Array Methods',
    description: 'Select, listen, transform. A short sharp sprint ending in a code-verified challenge and an AI interview about your own solution.',
    category: 'Programming',
    price: 399,
    thumbnail: 'https://images.unsplash.com/photo-1627398242457-45c50f8fc400?w=600',
    instructor: 'Meera Iyer',
    skill: 'DOM & Array Methods',
    videos: domVideos,
    assignment: {
      title: 'Text Statistics Toolkit',
      prompt: 'Write three pure functions:\n1. wordCount(sentence) — number of words (split on whitespace).\n2. topWord(sentence) — the most frequent word, lowercase; ties broken by first appearance.\n3. titleCase(sentence) — capitalise the first letter of every word.',
      type: 'code',
      language: 'javascript',
      starterCode: 'function wordCount(sentence) {\n  // your code\n}\n\nfunction topWord(sentence) {\n  // your code\n}\n\nfunction titleCase(sentence) {\n  // your code\n}\n',
      rubric: '',
      testCases: [
        { fn: 'wordCount', args: ['the quick brown fox'], expected: 4 },
        { fn: 'wordCount', args: [''], expected: 0 },
        { fn: 'topWord', args: ['the cat and the dog'], expected: 'the' },
        { fn: 'topWord', args: ['a b b a c'], expected: 'a' },
        { fn: 'titleCase', args: ['hello world again'], expected: 'Hello World Again' },
      ],
    },
  },
];

const demoUsers = [
  { name: 'Vidya Admin', email: 'admin@vidyasetu.dev', password: 'password123', role: 'ADMIN' },
  { name: 'Priya Teacher', email: 'teacher@vidyasetu.dev', password: 'password123', role: 'TEACHER' },
  { name: 'Aarav Student', email: 'student@vidyasetu.dev', password: 'password123', role: 'STUDENT' },
  { name: 'Diya Student', email: 'diya@vidyasetu.dev', password: 'password123', role: 'STUDENT' },
];

export async function seedDatabase({ silentIfNotEmpty = false } = {}) {
  const userCount = await User.countDocuments();
  if (userCount > 0) {
    if (!silentIfNotEmpty) console.log('[seed] users already exist — skipping seed (drop the database first to reseed)');
    return;
  }

  const users = await User.create(demoUsers);
  const createdCourses = await Course.create(courses);

  console.log('[seed] created users:');
  demoUsers.forEach(u => console.log(`   ${u.role.padEnd(7)} ${u.email} / ${u.password}`));
  console.log(`[seed] created ${createdCourses.length} courses (5 videos each)`);
}

// run directly: npm run seed (uses MONGO_URI, or in-memory DB if none set)
if (import.meta.url === `file://${process.argv[1]}`) {
  connectDB()
    .then(() => seedDatabase())
    .then(() => mongoose.disconnect())
    .then(() => console.log('[seed] done'))
    .catch((err) => {
      console.error('[seed] failed:', err.message);
      process.exit(1);
    });
}
