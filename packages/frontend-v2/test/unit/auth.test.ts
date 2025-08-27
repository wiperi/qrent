import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createUnauthenticatedClient, createAuthenticatedClient } from '../setup/trpc-client';
import { generateTestUser, createTestEmail } from '../setup/test-data';
import { setupTestDatabase, teardownTestDatabase } from '../setup/db-helpers';

describe('Auth Router - Client-Side tRPC', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await teardownTestDatabase();
  });

  describe('auth.register', () => {
    it('should register a new user successfully via HTTP', async () => {
      const client = createUnauthenticatedClient();
      const userData = generateTestUser();

      const result = await client.auth.register.mutate(userData);

      expect(result).toHaveProperty('token');
      expect(typeof result.token).toBe('string');
      expect(result.token.length).toBeGreaterThan(0);
    });

    it('should fail with duplicate email via HTTP', async () => {
      const client = createUnauthenticatedClient();
      const userData = generateTestUser();

      // Register first user
      await client.auth.register.mutate(userData);

      // Try to register with same email
      await expect(client.auth.register.mutate(userData)).rejects.toThrow();
    });

    it('should fail with invalid email format via HTTP', async () => {
      const client = createUnauthenticatedClient();
      const userData = {
        ...generateTestUser(),
        email: 'invalid-email',
      };

      await expect(client.auth.register.mutate(userData)).rejects.toThrow();
    });

    it('should fail with short password via HTTP', async () => {
      const client = createUnauthenticatedClient();
      const userData = {
        ...generateTestUser(),
        password: '123',
      };

      await expect(client.auth.register.mutate(userData)).rejects.toThrow();
    });
  });

  describe('auth.login', () => {
    it('should login with valid credentials via HTTP', async () => {
      const client = createUnauthenticatedClient();
      const userData = generateTestUser();

      // Register user first
      await client.auth.register.mutate(userData);

      // Login
      const result = await client.auth.login.mutate({
        email: userData.email,
        password: userData.password,
      });

      expect(result).toHaveProperty('token');
      expect(typeof result.token).toBe('string');
    });

    it('should fail with invalid email via HTTP', async () => {
      const client = createUnauthenticatedClient();

      await expect(client.auth.login.mutate({
        email: 'nonexistent@test.com',
        password: 'password123',
      })).rejects.toThrow();
    });

    it('should fail with wrong password via HTTP', async () => {
      const client = createUnauthenticatedClient();
      const userData = generateTestUser();

      // Register user
      await client.auth.register.mutate(userData);

      // Try login with wrong password
      await expect(client.auth.login.mutate({
        email: userData.email,
        password: 'wrongpassword',
      })).rejects.toThrow();
    });
  });

  describe('auth.changeProfile', () => {
    it('should change password successfully via HTTP', async () => {
      const client = createUnauthenticatedClient();
      const userData = generateTestUser();

      // Register and get user
      const registerResult = await client.auth.register.mutate(userData);
      const authToken = registerResult.token;

      // Create authenticated client
      const authenticatedClient = createAuthenticatedClient(authToken);

      const result = await authenticatedClient.auth.changeProfile.mutate({
        oldPassword: userData.password,
        password: 'newpassword123',
      });

      expect(result).toBeDefined();
    });

    it('should fail without authentication via HTTP', async () => {
      const client = createUnauthenticatedClient();

      await expect(client.auth.changeProfile.mutate({
        oldPassword: 'oldpass',
        password: 'newpass123',
      })).rejects.toThrow();
    });
  });

  describe('auth.sendVerificationEmail', () => {
    it('should send verification email for authenticated user via HTTP', async () => {
      const client = createUnauthenticatedClient();
      const userData = generateTestUser();

      // Register and get token
      const registerResult = await client.auth.register.mutate(userData);
      const authToken = registerResult.token;

      // Create authenticated client
      const authenticatedClient = createAuthenticatedClient(authToken);

      const result = await authenticatedClient.auth.sendVerificationEmail.mutate();

      expect(result).toEqual({ ok: true });
    });

    it('should fail without authentication via HTTP', async () => {
      const client = createUnauthenticatedClient();

      await expect(client.auth.sendVerificationEmail.mutate()).rejects.toThrow();
    });
  });

  describe('auth.verifyEmail', () => {
    it('should handle email verification via HTTP', async () => {
      const client = createUnauthenticatedClient();
      const userData = generateTestUser();

      // Register user first to have a valid email in system
      await client.auth.register.mutate(userData);

      const result = await client.auth.verifyEmail.mutate({
        email: userData.email,
        code: 123456,
      });

      expect(result).toEqual({ ok: true });
    });

    it('should fail with invalid email format via HTTP', async () => {
      const client = createUnauthenticatedClient();

      await expect(client.auth.verifyEmail.mutate({
        email: 'invalid-email',
        code: 123456,
      })).rejects.toThrow();
    });
  });
});