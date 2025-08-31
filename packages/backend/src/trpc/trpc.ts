import { initTRPC, TRPCError } from '@trpc/server';
import { ZodError } from 'zod';
import HttpError from '@/error/HttpError';

export const createTRPC = () => {
  return initTRPC.context<TrpcContext>().create({
    errorFormatter({ shape, error }) {
      console.log('TRPC Error:', error);
      // 统一处理 HttpError 转换
      if (error.cause instanceof HttpError) {
        const httpError = error.cause as HttpError;
        return {
          ...shape,
          message: httpError.message,
          data: {
            ...shape.data,
            code: httpStatusToTrpcCode(httpError.statusCode),
            httpStatus: httpError.statusCode,
          },
        };
      }

      // Zod 错误处理
      const zodIssues = error.cause instanceof ZodError ? error.cause.flatten() : null;
      return {
        ...shape,
        data: {
          ...shape.data,
          zodIssues,
        },
      };
    },
  });
};

export type TrpcContext = {
  userId?: number;
  req: import('express').Request;
  res: import('express').Response;
};

export function httpStatusToTrpcCode(statusCode: number): TRPCError['code'] {
  if (statusCode === 400) return 'BAD_REQUEST';
  if (statusCode === 401) return 'UNAUTHORIZED';
  if (statusCode === 403) return 'FORBIDDEN';
  if (statusCode === 404) return 'NOT_FOUND';
  if (statusCode === 409) return 'CONFLICT';
  if (statusCode === 422) return 'UNPROCESSABLE_CONTENT';
  return 'INTERNAL_SERVER_ERROR';
}
