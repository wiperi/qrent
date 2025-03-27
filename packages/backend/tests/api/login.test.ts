import { register, login } from '@qrent/shared/utils/requestHelpers';
import { clearDb } from '@qrent/shared/utils/db';

beforeEach(async () => {
  await clearDb();
});

describe('Auth API Tests', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'testPassword123',
  };

  describe('User Register', () => {
    it('should register a new user successfully', async () => {
      const res = await register(testUser);

      expect(res).toBeDefined();
      expect(res).toHaveProperty('token');
    });
  });

  describe('User Login', () => {
    beforeEach(async () => {
      // Register a user before testing login
      await register(testUser);
    });

    it('should login with correct credentials', async () => {
      const res = await login(testUser);

      expect(res).toBeDefined();
      expect(res).toHaveProperty('token');
    });

    it('should not login with incorrect password', async () => {
      await expect(
        login({
          email: testUser.email,
          password: 'wrongPassword',
        })
      ).rejects.toThrow();
    });

    it('should not login with non-existent email', async () => {
      await expect(
        login({
          email: 'nonexistent@example.com',
          password: 'testPassword123',
        })
      ).rejects.toThrow();
    });
  });
});
