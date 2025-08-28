import { createTRPC } from '../trpc';
import { authRouter } from './auth';
import { propertiesRouter } from './properties';
import { usersRouter } from './users';

const t = createTRPC();

export const appRouter = t.router({
  auth: authRouter,
  properties: propertiesRouter,
  users: usersRouter,
});

export type AppRouter = typeof appRouter;
