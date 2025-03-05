import express, { NextFunction, Request, Response, Router } from 'express';
import process from 'process';
import { prisma } from '@qrent/shared';
import HttpError from '@/error/HttpError';
import router from '@/routes';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cors from 'cors';
import { authenticate } from './utils/helper';

const app = express();

/////////////////////////////////////////////////////////////////////
// Server Setup
/////////////////////////////////////////////////////////////////////

// Load environment variables
dotenv.config();

// Middleware to parse JSON bodies
app.use(express.json());

// Use middleware that allows for access from other domains
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [process.env.FRONTEND_URL || 'https://yourdomain.com'] // Production origins
  : ['http://localhost:3000']; // Development origins

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true, // Allow cookies to be sent with requests
  maxAge: 86400, // Cache preflight request results for 24 hours (in seconds)
}));

// Request logging middleware
app.use(morgan('dev'));

/////////////////////////////////////////////////////////////////////
// Routes
/////////////////////////////////////////////////////////////////////

app.use(authenticate);
app.use('/', router);

app.use((err: HttpError, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode);
  res.json({ error: message });
});

/////////////////////////////////////////////////////////////////////
// Server Start
/////////////////////////////////////////////////////////////////////

// Start server
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || 'localhost';
const server = app.listen(PORT, HOST, async () => {
  console.log(`⚡️ Server started on port ${PORT} at ${HOST}`);

  const userCount = await prisma.user.count();
  console.log(`You have ${userCount} users in your database`);
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
