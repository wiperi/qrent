import express, { NextFunction, Request, Response, Router } from 'express';
import process from 'process';
import { prisma } from '@qrent/shared';
import HttpError from '@/error/HttpError';
import router from '@/routes';
import morgan from 'morgan';
import dotenv from 'dotenv';


const app = express();

/////////////////////////////////////////////////////////////////////
// Server Setup
/////////////////////////////////////////////////////////////////////

// Load environment variables
dotenv.config();

// Middleware to parse JSON bodies
app.use(express.json());

// Request logging middleware
app.use(morgan('dev'));

/////////////////////////////////////////////////////////////////////
// Routes
/////////////////////////////////////////////////////////////////////

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
