import { createTRPC } from '../trpc';
import { authRouter } from './auth';
import { propertiesRouter } from './properties';
import { usersRouter } from './users';
import { propertyStatsRouter } from './propertyStats';

const t = createTRPC();

export const appRouter = t.router({
  auth: authRouter,
  properties: propertiesRouter,
  users: usersRouter,
  propertyStats: propertyStatsRouter,
});

export type AppRouter = typeof appRouter;
