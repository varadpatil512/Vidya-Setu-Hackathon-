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

// Placeholder demo videos — 5 per course
const htmlCssVideos = [
  { title: 'HTML Tags & Document Structure', url: 'https://youtu.be/6qwOQe2BiYY?si=gn5JmGyjkHBFI61G', durationSec: 90 },
  { title: 'CSS Selectors & Syntax', url: 'https://www.youtube.com/watch?v=1PnVor36_40', durationSec: 100 },
  { title: 'Color, Typography & Fonts', url: 'https://www.youtube.com/watch?v=yfoY53QXEnI', durationSec: 110 },
  { title: 'Inline vs External CSS', url: 'https://www.youtube.com/watch?v=zJSY8tbf_ys', durationSec: 80 },
  { title: 'Building Your First Web Component', url: 'https://www.youtube.com/watch?v=cvvwmlBJ4g8', durationSec: 120 },
];

const pythonVideos = [
  { title: 'Python Syntax & Variables', url: 'https://www.youtube.com/watch?v=kqtD5dpn9C8', durationSec: 90 },
  { title: 'Booleans & Comparison Operators', url: 'https://www.youtube.com/watch?v=PkZNo7MFNFg', durationSec: 100 },
  { title: 'If & Else Decision Flow', url: 'https://www.youtube.com/watch?v=hdI2bqOjy3k', durationSec: 110 },
  { title: 'The Modulo Operator (%) Explained', url: 'https://www.youtube.com/watch?v=zJSY8tbf_ys', durationSec: 80 },
  { title: 'Writing Clean Conditionals', url: 'https://www.youtube.com/watch?v=cvvwmlBJ4g8', durationSec: 120 },
];

const jsVideos = [
  { title: 'Selecting Elements with querySelector', url: 'https://www.youtube.com/watch?v=l72i5B5m4jM', durationSec: 90 },
  { title: 'DOM Properties & Style Mutations', url: 'https://www.youtube.com/watch?v=ea0o2EITo5s', durationSec: 100 },
  { title: 'Click Events & onclick Handlers', url: 'https://www.youtube.com/watch?v=XF1_MlZ5l6w', durationSec: 110 },
  { title: 'Changing Dynamic Background Colors', url: 'https://www.youtube.com/watch?v=8f7OI5jAAys', durationSec: 80 },
  { title: 'Building Interactive Buttons', url: 'https://www.youtube.com/watch?v=3PHXvlpOkf4', durationSec: 120 },
];

const sqlVideos = [
  { title: 'Relational Database Fundamentals', url: 'https://www.youtube.com/watch?v=HXV3zeQKqGY', durationSec: 90 },
  { title: 'The SELECT Statement', url: 'https://www.youtube.com/watch?v=PkZNo7MFNFg', durationSec: 100 },
  { title: 'FROM & Table References', url: 'https://www.youtube.com/watch?v=hdI2bqOjy3k', durationSec: 110 },
  { title: 'Filtering Rows with WHERE', url: 'https://www.youtube.com/watch?v=zJSY8tbf_ys', durationSec: 80 },
  { title: 'Numeric & Comparison Conditions', url: 'https://www.youtube.com/watch?v=cvvwmlBJ4g8', durationSec: 120 },
];

const flexboxVideos = [
  { title: 'Flexbox Containers & Items', url: 'https://www.youtube.com/watch?v=fYq5PXgSsbE', durationSec: 90 },
  { title: 'Main Axis vs Cross Axis', url: 'https://www.youtube.com/watch?v=PkZNo7MFNFg', durationSec: 100 },
  { title: 'justify-content Deep Dive', url: 'https://www.youtube.com/watch?v=hdI2bqOjy3k', durationSec: 110 },
  { title: 'align-items & Vertical Alignment', url: 'https://www.youtube.com/watch?v=zJSY8tbf_ys', durationSec: 80 },
  { title: 'Perfect Centering Patterns', url: 'https://www.youtube.com/watch?v=cvvwmlBJ4g8', durationSec: 120 },
];

const courses = [
  {
    title: 'HTML & CSS Basics Sprint',
    description: 'Master structural markup and basic styling. Learn HTML tags, CSS selectors, and properties, then complete a direct code challenge verified by AI viva.',
    category: 'Web Development',
    price: 399,
    thumbnail: 'https://res.cloudinary.com/drbvpdn4t/image/upload/v1787310787/magnific_modern-htmlcss-course-thu_WDdaxSgcXe.png',
    instructor: 'Ananya Sharma',
    skill: 'HTML & CSS Fundamentals',
    videos: htmlCssVideos,
    assignment: {
      title: 'Styled Heading Challenge',
      prompt: 'Write a heading in HTML and give it a color using CSS. Paste your code as your answer.',
      type: 'text',
      language: 'html',
      starterCode: '',
      rubric: 'h1, h2, h3, color, style',
      testCases: [],
    },
  },
  {
    title: 'Python Conditionals Essentials',
    description: 'Learn logic flow and branching in Python. Practice if, elif, and else statements, then submit your solution for AI viva verification.',
    category: 'Programming',
    price: 499,
    thumbnail: 'https://res.cloudinary.com/drbvpdn4t/image/upload/v1787311515/ChatGPT_Image_Aug_21_2026_04_55_03_PM.png',
    instructor: 'Rohan Verma',
    skill: 'Python Conditionals',
    videos: pythonVideos,
    assignment: {
      title: 'Even or Odd Checker',
      prompt: 'Take one number and, using if-else, write code that checks whether it is Even or Odd. No function needed — just the plain if-else code. Paste your code as your answer.',
      type: 'text',
      language: 'python',
      starterCode: '',
      rubric: 'if, else, %, even, odd',
      testCases: [],
    },
  },
  {
    title: 'JavaScript DOM Basics',
    description: 'Interact with webpage elements dynamically. Master querySelector, element styles, and click handlers, followed by an AI viva interview.',
    category: 'Web Development',
    price: 499,
    thumbnail: 'https://res.cloudinary.com/drbvpdn4t/image/upload/v1787312047/ChatGPT_Image_Aug_21_2026_05_03_58_PM.png',
    instructor: 'Meera Iyer',
    skill: 'JavaScript DOM Basics',
    videos: jsVideos,
    assignment: {
      title: 'Dynamic Button Styling',
      prompt: 'Write code that changes a button\'s background color when clicked, using onclick and querySelector. No function wrapper needed — just the direct code. Paste your code as your answer.',
      type: 'text',
      language: 'javascript',
      starterCode: '',
      rubric: 'queryselector, onclick, style, background',
      testCases: [],
    },
  },
  {
    title: 'SQL Querying Fundamentals',
    description: 'Learn relational databases and SQL syntax. Write SELECT statements, filter with WHERE clauses, and prove your database skills.',
    category: 'Data & Databases',
    price: 599,
    thumbnail: 'https://res.cloudinary.com/drbvpdn4t/image/upload/v1787311737/ChatGPT_Image_Aug_21_2026_04_58_43_PM.png',
    instructor: 'Vikram Malhotra',
    skill: 'SQL Fundamentals',
    videos: sqlVideos,
    assignment: {
      title: 'Student Filtering Query',
      prompt: 'Write a SQL query to fetch all records from a students table where age is greater than 18. Paste your query as your answer.',
      type: 'text',
      language: 'sql',
      starterCode: '',
      rubric: 'select, from, where, age',
      testCases: [],
    },
  },
  {
    title: 'CSS Flexbox Layout Mastery',
    description: 'Build modern responsive web layouts with Flexbox. Learn flex-direction, alignment, and centering techniques, verified through applied challenge and viva.',
    category: 'Web Development',
    price: 449,
    thumbnail: 'https://res.cloudinary.com/drbvpdn4t/image/upload/v1787311905/ChatGPT_Image_Aug_21_2026_05_01_37_PM.png',
    instructor: 'Sneha Kapoor',
    skill: 'CSS Layout (Flexbox)',
    videos: flexboxVideos,
    assignment: {
      title: 'Perfect Centering with Flexbox',
      prompt: 'Write CSS that centers a div both horizontally and vertically using Flexbox. Paste your CSS as your answer.',
      type: 'text',
      language: 'css',
      starterCode: '',
      rubric: 'display: flex, justify-content, align-items, center',
      testCases: [],
    },
  },
];

const demoUsers = [
  { name: 'Vidya Admin', email: 'admin@vidyasetu.dev', password: 'password123', role: 'ADMIN' },
  { name: 'Priya Teacher', email: 'teacher@vidyasetu.dev', password: 'password123', role: 'TEACHER' },
  { name: 'Aarav Student', email: 'student@vidyasetu.dev', password: 'password123', role: 'STUDENT' },
  { name: 'Diya Student', email: 'diya@vidyasetu.dev', password: 'password123', role: 'STUDENT' },
];

export async function seedDatabase({ silentIfNotEmpty = false, force = false } = {}) {
  const userCount = await User.countDocuments();
  if (userCount > 0 && !force) {
    if (!silentIfNotEmpty) console.log('[seed] users already exist — skipping seed (pass force: true or drop database to reseed)');
    return;
  }

  if (force) {
    await Promise.all([
      User.deleteMany({}),
      Course.deleteMany({}),
      Enrollment.deleteMany({}),
      Note.deleteMany({}),
      Submission.deleteMany({}),
      Interview.deleteMany({}),
      TeacherReview.deleteMany({}),
    ]);
  }

  const users = await User.create(demoUsers);
  const createdCourses = await Course.create(courses);

  console.log('[seed] created users:');
  demoUsers.forEach(u => console.log(`   ${u.role.padEnd(7)} ${u.email} / ${u.password}`));
  console.log(`[seed] created ${createdCourses.length} courses (5 videos each)`);
}

// run directly: npm run seed (uses MONGO_URI, or in-memory DB if none set)
if (process.argv[1] && process.argv[1].includes('seed.js')) {
  connectDB()
    .then(() => seedDatabase({ force: true }))
    .then(() => mongoose.disconnect())
    .then(() => console.log('[seed] done'))
    .catch((err) => {
      console.error('[seed] failed:', err.message);
      process.exit(1);
    });
}

