import { prisma as p } from '@qrent/shared';

describe('Test Database Connection', () => {
  it('should have no users initially', async () => {
    await expect(p.user.count()).resolves.not.toThrow();
  });
});
