import mongoose from 'mongoose';

const videoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  url: { type: String, required: true },
  durationSec: { type: Number, default: 90 },
}, { _id: false });

const testCaseSchema = new mongoose.Schema({
  // function-call mode: call this function with args, compare return value
  fn: { type: String },
  args: { type: [mongoose.Schema.Types.Mixed], default: undefined },
  // whole-program mode: capture console.log output and compare
  expectedOutput: { type: String },
  expected: { type: mongoose.Schema.Types.Mixed, default: undefined },
}, { _id: false });

const assignmentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  prompt: { type: String, required: true },
  type: { type: String, enum: ['code', 'text'], default: 'code' },
  language: { type: String, default: 'javascript' },
  starterCode: { type: String, default: '' },
  rubric: { type: String, default: '' },
  testCases: { type: [testCaseSchema], default: [] },
}, { _id: false });

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: { type: String, default: 'General', index: true },
  price: { type: Number, default: 0 },
  thumbnail: { type: String, default: '' },
  instructor: { type: String, default: 'Vidya-Setu Faculty' },
  skill: { type: String, required: true }, // the verified skill tag, e.g. "JavaScript Fundamentals"
  videos: { type: [videoSchema], default: [] },
  assignment: { type: assignmentSchema, required: true },
}, { timestamps: true });

courseSchema.statics.videoCount = () => Number(process.env.COURSE_VIDEO_COUNT || 5);

courseSchema.path('videos').validate(function (v) {
  return v.length === Course.videoCount();
}, `A course must have exactly {expectedCount} videos (COURSE_VIDEO_COUNT)`);

const Course = mongoose.model('Course', courseSchema);
export default Course;
