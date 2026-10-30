// This caller test replaces the service before import: no database or email I/O.
jest.mock(
  '@/services/PropertyService',
  () => ({
    propertyService: { getPropertiesByPreferences: jest.fn() },
  }),
  { virtual: true }
);
jest.mock('@/error/HttpError', () => jest.requireActual('../src/error/HttpError'), {
  virtual: true,
});

import { propertyService } from '@/services/PropertyService';
import { propertiesRouter } from '../src/trpc/routers/properties';
import type { TrpcContext } from '../src/trpc/trpc';

const search = propertyService.getPropertiesByPreferences as jest.Mock;
const context = { userId: 42, locale: 'zh', req: {}, res: {} } as TrpcContext;

describe('existing website search compatibility', () => {
  beforeEach(() => {
    search.mockReset();
    search.mockResolvedValue({
      properties: [{ id: 7, descriptionEn: 'English keywords', descriptionCn: '中文关键词' }],
      totalCount: 1,
      filteredCount: 1,
    });
  });

  it('prioritizes recent records for the legacy website without changing filters or localization', async () => {
    const result = await propertiesRouter.createCaller(context).search({
      targetSchool: 'UNSW',
      page: 2,
      pageSize: 12,
      regions: 'eastgardens',
      minPrice: 500,
      maxPrice: 1500,
      minRating: 14,
      maxCommuteTime: 40,
      orderBy: [{ averageScore: 'desc' }],
    });
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        targetSchool: 'UNSW',
        page: 2,
        pageSize: 12,
        regions: 'eastgardens',
        userId: 42,
        minPrice: 500,
        maxPrice: 1500,
        minRating: 14,
        maxCommuteTime: 40,
        orderBy: [{ publishedAt: 'desc' }, { averageScore: 'desc' }],
      })
    );
    expect(result.properties[0].description).toBe('中文关键词');
    expect(result.properties[0].descriptionEn).toBeUndefined();
  });

  it.each([
    [{ price: 'asc' }],
    [{ id: 'desc' }],
    [{ publishedAt: 'desc' }, { averageScore: 'desc' }],
    [{ averageScore: 'desc', price: 'asc' }],
  ])('preserves other explicitly requested orders: %j', async (...items) => {
    const orderBy = items as NonNullable<
      Parameters<ReturnType<typeof propertiesRouter.createCaller>['search']>[0]['orderBy']
    >;
    await propertiesRouter.createCaller(context).search({
      targetSchool: 'USYD',
      pageSize: 12,
      orderBy,
    });
    expect(search.mock.calls[0][0].orderBy).toEqual(orderBy);
  });

  it('preserves score-only requests from other API consumers', async () => {
    await propertiesRouter.createCaller(context).search({
      targetSchool: 'UTS',
      pageSize: 100,
      orderBy: [{ averageScore: 'desc' }],
    });
    expect(search.mock.calls[0][0].orderBy).toEqual([{ averageScore: 'desc' }]);
  });
});
