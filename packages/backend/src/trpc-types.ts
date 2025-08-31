// Re-export the AppRouter type without implementation dependencies
import { appRouter } from './trpc/routers/index';

export type AppRouter = typeof appRouter;
