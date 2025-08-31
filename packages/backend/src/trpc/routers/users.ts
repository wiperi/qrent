import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPC } from '../trpc';
import { userService } from '@/services/UserService';
import { propertyService } from '@/services/PropertyService';

const t = createTRPC();

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required' });
  }
  return next();
});

export const usersRouter = t.router({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const profile = await userService.getProfile(ctx.userId!);
    return profile;
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(50),
        gender: z.number().int().min(0).max(255),
        emailPreferences: z.array(
          z.object({
            userId: z.number(),
            type: z.number().int(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const profile = await userService.updateProfile(ctx.userId!, input);
      return profile;
    }),

  getPreference: protectedProcedure.query(async ({ ctx }) => {
    const preferences = await propertyService.fetchPreference(ctx.userId!);
    return preferences;
  }),
});

export type UsersRouter = typeof usersRouter;
