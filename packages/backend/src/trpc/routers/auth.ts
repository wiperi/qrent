import { TRPCError } from '@trpc/server';
import { createTRPC } from '../trpc';
import { authService } from '@/services/AuthService';
import {
  registerInput,
  loginInput,
  changeAuthInput,
  verificationInput,
} from '../../utils/auth-input';
import { bearerToken } from '../../utils/auth-session';
import { limitAuthRequest } from '../../utils/auth-request-limit';

const t = createTRPC();

export const publicProcedure = t.procedure.use(async ({ ctx, path, next }) => {
  if (path !== 'auth.capabilities') await limitAuthRequest(ctx.req, path);
  return next();
});

export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required' });
  }
  return next();
});

export const authRouter = t.router({
  capabilities: publicProcedure.query(() => authService.capabilities()),
  register: publicProcedure.input(registerInput).mutation(async ({ input }) => {
    const token = await authService.register(input);
    return { token };
  }),

  login: publicProcedure.input(loginInput).mutation(async ({ input }) => {
    const token = await authService.login(input);
    return { token };
  }),

  changeProfile: protectedProcedure.input(changeAuthInput).mutation(async ({ input, ctx }) => {
    const updateData: Record<string, any> = {};
    if (input.password !== undefined) updateData.password = input.password;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.email !== undefined) updateData.email = input.email;

    const profile = await authService.changeAuthProfile(ctx.userId!, input.oldPassword, updateData);
    return profile;
  }),

  sendVerificationEmail: protectedProcedure.mutation(async ({ ctx }) => {
    await authService.sendVerificationEmail(ctx.userId!);
    return { ok: true };
  }),

  verifyEmail: publicProcedure.input(verificationInput).mutation(async ({ input }) => {
    await authService.verifyEmail(input.email, input.code);
    return { ok: true };
  }),
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    const token = bearerToken(ctx.req.headers.authorization);
    if (!token) throw new TRPCError({ code: 'UNAUTHORIZED' });
    await authService.logout(ctx.userId!, token);
    return { ok: true };
  }),
});

export type AuthRouter = typeof authRouter;
