import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (uri) {
    try {
      await mongoose.connect(uri);
      console.log(`[db] Connected to MongoDB Atlas cloud database (${mongoose.connection.host})`);
      return;
    } catch (err) {
      console.error('[db] Failed to connect to MongoDB Atlas:', err.message);
      console.error('[db] Please verify MONGO_URI credentials and check that your current IP address is whitelisted in MongoDB Atlas Network Access (e.g. 0.0.0.0/0).');
      throw err;
    }
  }
  if (process.env.MONGO_MEMORY === 'true') {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mem = await MongoMemoryServer.create();
    await mongoose.connect(mem.getUri('vidya-setu'));
    console.log('[db] WARNING: Using in-memory MongoDB (dev/demo mode). Data will NOT persist across server restarts. Uncomment MONGO_URI in server/.env to persist data to MongoDB Atlas.');
    return;
  }
  throw new Error('No MONGO_URI set and MONGO_MEMORY is not true. Add your Atlas URI to server/.env');
}
