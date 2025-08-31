import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createUnauthenticatedClient, createAuthenticatedClient } from '../setup/trpc-client';
import { generateUserProfile, generateTestUser } from '../setup/test-data';
import { setupTestDatabase, teardownTestDatabase } from '../setup/db-helpers';

describe('Users Router - Client-Side tRPC', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await teardownTestDatabase();
  });

  describe('users.getProfile', () => {
    it('should get user profile successfully via HTTP', async () => {
      const client = createUnauthenticatedClient();
      const userData = generateTestUser();

      // Register and get token
      const registerResult = await client.auth.register.mutate(userData);
      const authToken = registerResult.token;
      const authenticatedClient = createAuthenticatedClient(authToken);

      const result = await authenticatedClient.users.getProfile.query();

      expect(result).toBeDefined();
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('name');
      expect(result.email).toBe(userData.email);
    });

    it('should fail without authentication via HTTP', async () => {
      const client = createUnauthenticatedClient();

      await expect(client.users.getProfile.query()).rejects.toThrow();
    });
  });

  describe('users.updateProfile', () => {
    it('should update user profile successfully via HTTP', async () => {
      const client = createUnauthenticatedClient();
      const userData = generateTestUser();

      // Register and get token
      const registerResult = await client.auth.register.mutate(userData);
      const authToken = registerResult.token;
      const authenticatedClient = createAuthenticatedClient(authToken);

      const updateData = {
        name: 'Updated Test User',
        gender: 0,
        emailPreferences: [
          {
            userId: 1, // Will be ignored by backend, uses token userId
            type: 1,
          },
        ],
      };

      const result = await authenticatedClient.users.updateProfile.mutate(updateData);

      expect(result).toBeDefined();
      expect(result.name).toBe(updateData.name);
      expect(result.gender).toBe(updateData.gender);
    });

    it('should fail without authentication via HTTP', async () => {
      const client = createUnauthenticatedClient();
      const updateData = generateUserProfile();

      await expect(client.users.updateProfile.mutate(updateData)).rejects.toThrow();
    });

    it('should fail with invalid name length', async () => {
      const testUser = await createTestUser();
      const caller = createAuthenticatedCaller(testUser.id);

      const updateData = {
        name: '', // Empty name
        gender: 1,
        emailPreferences: [],
      };

      await expect(caller.users.updateProfile(updateData)).rejects.toThrow();
    });

    it('should fail with name too long', async () => {
      const testUser = await createTestUser();
      const caller = createAuthenticatedCaller(testUser.id);

      const updateData = {
        name: 'a'.repeat(51), // Too long name (max 50 chars)
        gender: 1,
        emailPreferences: [],
      };

      await expect(caller.users.updateProfile(updateData)).rejects.toThrow();
    });

    it('should fail with invalid gender value', async () => {
      const testUser = await createTestUser();
      const caller = createAuthenticatedCaller(testUser.id);

      const updateData = {
        name: 'Valid Name',
        gender: 256, // Invalid gender (max 255 for UnsignedTinyInt)
        emailPreferences: [],
      };

      await expect(caller.users.updateProfile(updateData)).rejects.toThrow();
    });

    it('should update email preferences correctly', async () => {
      const testUser = await createTestUser();
      const caller = createAuthenticatedCaller(testUser.id);

      const updateData = {
        name: 'Test User',
        gender: 1,
        emailPreferences: [
          {
            userId: testUser.id,
            type: 1, // DailyPropertyRecommendation
          },
        ],
      };

      const result = await caller.users.updateProfile(updateData);

      expect(result).toBeDefined();
    });
  });

  describe('users.getPreference', () => {
    it('should get preferences for authenticated user via HTTP', async () => {
      const client = createUnauthenticatedClient();
      const userData = generateTestUser();

      // Register and get token
      const registerResult = await client.auth.register.mutate(userData);
      const authToken = registerResult.token;
      const authenticatedClient = createAuthenticatedClient(authToken);

      const result = await authenticatedClient.users.getPreference.query();

      // Should return user's preference data or null
      expect(result).toBeDefined();
    });

    it('should fail without authentication via HTTP', async () => {
      const client = createUnauthenticatedClient();

      await expect(client.users.getPreference.query()).rejects.toThrow();
    });
  });
});
