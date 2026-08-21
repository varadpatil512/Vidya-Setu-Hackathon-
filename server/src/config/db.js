import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (uri) {
    await mongoose.connect(uri);
    console.log(`[db] successfully connected to MongoDB Atlas cloud database (${mongoose.connection.host})`);
    return;
  }
  if (process.env.MONGO_MEMORY === 'true') {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mem = await MongoMemoryServer.create();
    await mongoose.connect(mem.getUri('vidya-setu'));
    console.log('[db] using in-memory MongoDB (dev/demo mode — data is lost on restart)');
    return;
  }
  throw new Error('No MONGO_URI set and MONGO_MEMORY is not true. Add your Atlas URI to server/.env');
}
