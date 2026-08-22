import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import Course from './models/Course.js';

const VALID_DEMO_COURSES = [
  'HTML & CSS Basics Sprint',
  'Python Conditionals Essentials',
  'JavaScript DOM Basics',
  'SQL Querying Fundamentals',
  'CSS Flexbox Layout Mastery',
];

async function inspectAndCleanup() {
  await connectDB();
  console.log('--- Inspecting Current Courses in DB ---');
  const allCourses = await Course.find();
  console.log(`Total courses found: ${allCourses.length}`);

  const dummyIds = [];
  for (const c of allCourses) {
    const isStandard = VALID_DEMO_COURSES.includes(c.title);
    const isDummy = !isStandard && (
      c.title.toLowerCase().includes('draft') ||
      c.title.toLowerCase().includes('unsound') ||
      c.title.toLowerCase().includes('vue 3') ||
      c.title.toLowerCase().includes('vue') ||
      c.title.toLowerCase().includes('test') ||
      c.title.toLowerCase().includes('dummy')
    );
    console.log(`- [${c.status}] "${c.title}" (ID: ${c._id}) -> ${isDummy ? 'DELETE DUMMY' : 'KEEP'}`);
    if (isDummy) {
      dummyIds.push(c._id);
    }
  }

  if (dummyIds.length > 0) {
    const deleteRes = await Course.deleteMany({ _id: { $in: dummyIds } });
    console.log(`Deleted ${deleteRes.deletedCount} dummy course(s).`);
  } else {
    console.log('No dummy courses found in current DB collection.');
  }

  // Ensure all remaining standard demo courses have status: 'approved'
  const updateRes = await Course.updateMany(
    { title: { $in: VALID_DEMO_COURSES } },
    { status: 'approved' }
  );
  if (updateRes.modifiedCount > 0) {
    console.log(`Updated ${updateRes.modifiedCount} standard course(s) to status: 'approved'.`);
  }

  await mongoose.disconnect();
}

inspectAndCleanup().catch(console.error);
