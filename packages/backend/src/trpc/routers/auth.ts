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
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().min(1).max(50).optional(),
        gender: z.number().int().optional(),
        phone: z.string().length(11).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // AuthService.register expects a User, but we only need minimal fields here.
      // Prisma will apply defaults for optional fields.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const token = await authService.register(input as any);
      return { token };
    }),

  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const token = await authService.login(input);
      return { token };
    }),

  changeProfile: protectedProcedure
    .input(
      z.object({
        oldPassword: z.string().min(1),
        password: z.string().min(6).optional(),
        phone: z.string().length(11).optional(),
        email: z.string().email().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const updateData: Record<string, any> = {};
      if (input.password !== undefined) updateData.password = input.password;
      if (input.phone !== undefined) updateData.phone = input.phone;
      if (input.email !== undefined) updateData.email = input.email;

      const profile = await authService.changeAuthProfile(
        ctx.userId!,
        input.oldPassword,
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
});

export type AuthRouter = typeof authRouter;
