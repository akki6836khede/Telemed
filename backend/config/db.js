// import mongoose from 'mongoose';
// import { MongoMemoryServer } from 'mongodb-memory-server';

// let mongoMemoryServer = null;

// export const connectDB = async () => {
//   try {
//     const mongoUri = process.env.MONGODB_URI;

//     if (mongoUri) {
//       const conn = await mongoose.connect(mongoUri);
//       console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
//       return conn;
//     }

//     // Zero-config developer fallback: In-Memory MongoDB Server
//     console.log('[Database] MONGODB_URI not provided. Starting in-memory MongoDB...');
//     mongoMemoryServer = await MongoMemoryServer.create();
//     const uri = mongoMemoryServer.getUri();
//     const conn = await mongoose.connect(uri);
//     console.log(`[Database] In-memory MongoDB running at: ${uri}`);
//     return conn;
//   } catch (error) {
//     console.error(`[Database Error] ${error.message}`);
//     process.exit(1);
//   }
// };

// export const closeDB = async () => {
//   await mongoose.connection.close();
//   if (mongoMemoryServer) {
//     await mongoMemoryServer.stop();
//   }
// };


// backend/config/db.js

import mongoose from 'mongoose';

/*
  NOTE:
  The previous in‑memory MongoDB fallback (mongodb‑memory‑server) has been removed.
  All deployments must provide a real MongoDB connection string via the
  MONGODB_URI environment variable. This keeps the production image lightweight
  and avoids “ERR_MODULE_NOT_FOUND” errors.
*/

export const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      console.error('[Database Error] MONGODB_URI environment variable not set.');
      // Stop the process – the app cannot run without a database.
      process.exit(1);
    }

    const conn = await mongoose.connect(mongoUri);
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[Database Error] ${error.message}`);
    process.exit(1);
  }
};

export const closeDB = async () => {
  await mongoose.connection.close();
};
