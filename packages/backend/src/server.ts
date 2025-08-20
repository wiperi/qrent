import express, { NextFunction, Request, Response, Router } from 'express';
import process from 'process';
import { prisma } from '@qrent/shared';
import HttpError from '@/error/HttpError';
import router from '@/routes';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './trpc/routers';
import { createTRPCContext } from './trpc/context';
import { authenticate } from './utils/helper';
import path from 'path';

const app = express();

/////////////////////////////////////////////////////////////////////
// Server Setup
/////////////////////////////////////////////////////////////////////

// Load environment variables
if (process.env.NODE_ENV === 'development') {
  dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
}

// Middleware to parse JSON bodies
app.use(express.json());

// // Use middleware that allows for access from other domains
// const allowedOrigins =
//   process.env.NODE_ENV === 'production'
//     ? [process.env.FRONTEND_URL || 'https://yourdomain.com'] // Production origins
//     : ['http://localhost:3000']; // Development origins

// app.use(
//   cors({
//     origin: (origin, callback) => {
//       // Allow requests with no origin (like mobile apps, curl requests)
//       if (!origin) return callback(null, true);

//       if (allowedOrigins.indexOf(origin) === -1) {
//         const msg =
//           'The CORS policy for this site does not allow access from the specified Origin.';
//         return callback(new Error(msg), false);
//       }
//       return callback(null, true);
//     },
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
//     credentials: true, // Allow cookies to be sent with requests
//     maxAge: 86400, // Cache preflight request results for 24 hours (in seconds)
//   })
// );

app.use(cors());

// Request logging middleware
app.use(morgan('dev'));

/////////////////////////////////////////////////////////////////////
// Routes
/////////////////////////////////////////////////////////////////////

import rentalLetterRoutes from './routes/rentalLetter';

// Mount tRPC before global authenticate so public procedures can be accessed
app.use('/trpc', createExpressMiddleware({
  router: appRouter,
  createContext: createTRPCContext,
}));

app.use(authenticate);
app.use('/api/generate-rental-letter', rentalLetterRoutes);
app.use('/', router);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  console.log(err);
  res.status(500).json({ error: { ...err, message: err.message } });
  return;
});

/////////////////////////////////////////////////////////////////////
// Server Start
/////////////////////////////////////////////////////////////////////

// Start server
if (!process.env.BACKEND_LISTEN_PORT) {
  console.error('BACKEND_LISTEN_PORT environment variable is not set.');
  process.exit(1);
}

if (!process.env.BACKEND_LISTEN_HOST) {
  console.error('BACKEND_LISTEN_HOST environment variable is not set.');
  process.exit(1);
}

const BACKEND_LISTEN_PORT = Number(process.env.BACKEND_LISTEN_PORT);
const BACKEND_LISTEN_HOST = process.env.BACKEND_LISTEN_HOST;

const server = app.listen(BACKEND_LISTEN_PORT, BACKEND_LISTEN_HOST, async () => {
  console.log(`⚡️ Server started on port ${BACKEND_LISTEN_PORT} at ${BACKEND_LISTEN_HOST}`);

  const userCount = await prisma.user.count().catch(err => {
    console.log(err);
  });
  const propertyCount = await prisma.property.count().catch(err => {
    console.log(err);
  });
  console.log(`You have ${userCount} users in your database`);
  console.log(`You have ${propertyCount} properties in your database`);
});

// Handle shutdown gracefully
process.on('SIGINT', () => {
  server.close(async () => {
    console.log('Shutting down server gracefully.');
    await prisma.$disconnect();
    console.log('Database disconnected');
    process.exit();
  });
});
