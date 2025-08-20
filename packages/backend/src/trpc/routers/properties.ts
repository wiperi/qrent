import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPC } from '../trpc';
import { propertyService } from '@/services/PropertyService';

const t = createTRPC();

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required' });
  }
  return next();
});

// Preference input schema based on Prisma model
const preferenceSchema = z.object({
  targetSchool: z.string().max(100),
  minPrice: z.number().int().positive().optional(),
  maxPrice: z.number().int().positive().optional(),
  minBedrooms: z.number().int().min(0).max(255).optional(),
  maxBedrooms: z.number().int().min(0).max(255).optional(),
  minBathrooms: z.number().int().min(0).max(255).optional(),
  maxBathrooms: z.number().int().min(0).max(255).optional(),
  regions: z.string().regex(/^[a-z-]+(\s[a-z-]+)*$/, 'Regions must be space-separated words containing only lowercase letters and hyphens').optional(),
  propertyType: z.number().int().min(1).max(2).optional(), // 1: House, 2: Apartment
  minRating: z.number().optional(),
  minCommuteTime: z.number().int().positive().optional(),
  maxCommuteTime: z.number().int().positive().optional(),
  moveInDate: z.date().optional(),
});

export const propertiesRouter = t.router({
  search: publicProcedure
    .input(
      preferenceSchema.extend({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Extract pagination params
      const { page, pageSize, ...preferences } = input;
      
      // Create preference with proper null conversion
      const createPreferenceData = {
        targetSchool: preferences.targetSchool,
        minPrice: preferences.minPrice ?? null,
        maxPrice: preferences.maxPrice ?? null,
        minBedrooms: preferences.minBedrooms ?? null,
        maxBedrooms: preferences.maxBedrooms ?? null,
        minBathrooms: preferences.minBathrooms ?? null,
        maxBathrooms: preferences.maxBathrooms ?? null,
        regions: preferences.regions ?? null,
        propertyType: preferences.propertyType ?? null,
        minRating: preferences.minRating ?? null,
        minCommuteTime: preferences.minCommuteTime ?? null,
        maxCommuteTime: preferences.maxCommuteTime ?? null,
        moveInDate: preferences.moveInDate ?? null,
        userId: ctx.userId ?? null,
      };

      await propertyService.createPreference(createPreferenceData);

      // Search properties with all params including pagination
      const properties = await propertyService.getPropertiesByPreferences({
        ...createPreferenceData,
        page,
        pageSize,
      });
      
      return properties;
    }),

  subscribe: protectedProcedure
    .input(z.object({ propertyId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const result = await propertyService.subscribeToProperty(ctx.userId!, input.propertyId);
      return result;
    }),

  unsubscribe: protectedProcedure
    .input(z.object({ propertyId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const result = await propertyService.unsubscribeFromProperty(ctx.userId!, input.propertyId);
      return result;
    }),

  getSubscriptions: protectedProcedure
    .query(async ({ ctx }) => {
      const result = await propertyService.fetchSubscriptions(ctx.userId!);
      return result;
    }),
});

export type PropertiesRouter = typeof propertiesRouter;
