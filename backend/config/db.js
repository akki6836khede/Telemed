import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoMemoryServer = null;

export const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (mongoUri) {
      const conn = await mongoose.connect(mongoUri);
      console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
      return conn;
    }

    // Zero-config developer fallback: In-Memory MongoDB Server
    console.log('[Database] MONGODB_URI not provided. Starting in-memory MongoDB...');
    mongoMemoryServer = await MongoMemoryServer.create();
    const uri = mongoMemoryServer.getUri();
    const conn = await mongoose.connect(uri);
    console.log(`[Database] In-memory MongoDB running at: ${uri}`);
    return conn;
  } catch (error) {
    console.error(`[Database Error] ${error.message}`);
    process.exit(1);
  }
};

export const closeDB = async () => {
  await mongoose.connection.close();
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
  }
};
