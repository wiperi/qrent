import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPC } from '../trpc';
import { authService } from '@/services/AuthService';

const t = createTRPC();

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required' });
  }
  return next();
});

export const authRouter = t.router({
  changeProfile: protectedProcedure
    .input(
      z.object({
        phone: z.string().length(11).optional(),
        email: z.string().email().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const updateData: Record<string, any> = {};
      if (input.phone !== undefined) updateData.phone = input.phone;
      if (input.email !== undefined) updateData.email = input.email;

      const profile = await authService.changeAuthProfile(
        ctx.userId!,
        updateData as any
      );
      return profile;
    }),

  sendVerificationEmail: protectedProcedure.mutation(async ({ ctx }) => {
    await authService.sendVerificationEmail(ctx.userId!);
    return { ok: true };
  }),

  verifyEmail: publicProcedure
    .input(z.object({ email: z.string().email(), code: z.number().int() }))
    .mutation(async ({ input }) => {
      await authService.verifyEmail(input.email, input.code);
      return { ok: true };
    }),

  googleOAuthLogin: publicProcedure
    .input(z.object({ idToken: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const token = await authService.googleOAuthLogin(input.idToken);
      return { token };
    }),
});

export type AuthRouter = typeof authRouter;
