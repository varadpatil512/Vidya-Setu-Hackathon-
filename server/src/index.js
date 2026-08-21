import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import courseRoutes from './routes/courses.js';
import enrollmentRoutes from './routes/enrollments.js';
import noteRoutes from './routes/notes.js';
import submissionRoutes from './routes/submissions.js';
import interviewRoutes from './routes/interviews.js';
import teacherRoutes from './routes/teacher.js';
import portfolioRoutes from './routes/portfolio.js';
import { seedDatabase } from './seed.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/portfolio', portfolioRoutes);

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON body' });
  }
  console.error('[server] unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = Number(process.env.PORT || 5000);

connectDB()
  .then(async () => {
    // auto-seed empty in-memory dev databases so the demo always has data
    if (!process.env.MONGO_URI && process.env.MONGO_MEMORY === 'true') {
      await seedDatabase({ silentIfNotEmpty: true });
    }
    app.listen(PORT, () => console.log(`[server] Vidya-Setu API listening on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('[server] failed to start:', err.message);
    process.exit(1);
  });
