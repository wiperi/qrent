import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createUnauthenticatedClient, createAuthenticatedClient } from '../setup/trpc-client';
import { generateTestUser, generatePropertySearch } from '../setup/test-data';
import { setupTestDatabase, teardownTestDatabase, createTestProperty } from '../setup/db-helpers';

describe('User Workflows Integration - Client-Side tRPC', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await teardownTestDatabase();
  });

  describe('Complete Registration and Profile Workflow', () => {
    it('should register → verify email → login → update profile via HTTP', async () => {
      const client = createUnauthenticatedClient();
      const userData = generateTestUser();

      // Step 1: Register user
      const registerResult = await client.auth.register.mutate(userData);
      expect(registerResult).toHaveProperty('token');
      const authToken = registerResult.token;

      // Step 2: Verify email
      const verifyResult = await client.auth.verifyEmail.mutate({
        email: userData.email,
        code: 123456,
      });
      expect(verifyResult).toEqual({ ok: true });

      // Step 3: Login (verify token works)
      const loginResult = await client.auth.login.mutate({
        email: userData.email,
        password: userData.password,
      });
      expect(loginResult).toHaveProperty('token');

      // Step 4: Use authenticated client
      const authenticatedClient = createAuthenticatedClient(authToken);

      // Step 5: Update profile
      const profileUpdate = {
        name: 'Updated Name',
        gender: 0,
        emailPreferences: [{ userId: 1, type: 1 }],
      };

      const updateResult = await authenticatedClient.users.updateProfile.mutate(profileUpdate);
      expect(updateResult).toBeDefined();
      expect(updateResult.name).toBe(profileUpdate.name);
    });

    it('should handle registration → password change workflow via HTTP', async () => {
      const client = createUnauthenticatedClient();
      const userData = generateTestUser();

      // Register user
      const registerResult = await client.auth.register.mutate(userData);
      const authToken = registerResult.token;

      // Login to verify current password
      await client.auth.login.mutate({
        email: userData.email,
        password: userData.password,
      });

      // Change password using authenticated client
      const authenticatedClient = createAuthenticatedClient(authToken);
      const changeResult = await authenticatedClient.auth.changeProfile.mutate({
        oldPassword: userData.password,
        password: 'newpassword123',
      });

      expect(changeResult).toBeDefined();
    });
  });

  describe('Property Search and Subscription Workflow', () => {
    it('should login → search properties → subscribe → get subscriptions via HTTP', async () => {
      // Setup test data
      const testProperty = await createTestProperty();
      const client = createUnauthenticatedClient();
      const userData = generateTestUser();

      // Step 1: Register and login
      const registerResult = await client.auth.register.mutate(userData);
      const authToken = registerResult.token;
      expect(registerResult).toHaveProperty('token');

      // Step 2: Search properties (public endpoint)
      const searchParams = generatePropertySearch();
      const searchResult = await client.properties.search.mutate(searchParams);
      expect(searchResult).toBeDefined();
      expect(searchResult).toHaveProperty('properties');

      // Step 3: Subscribe to property (authenticated)
      const authenticatedClient = createAuthenticatedClient(authToken);
      const subscribeResult = await authenticatedClient.properties.subscribe.mutate({
        propertyId: testProperty.id,
      });
      expect(subscribeResult).toBeDefined();

      // Step 4: Get subscriptions
      const subscriptions = await authenticatedClient.properties.getSubscriptions.query();
      expect(Array.isArray(subscriptions)).toBe(true);
      expect(subscriptions.length).toBeGreaterThan(0);

      // Step 5: Unsubscribe
      const unsubscribeResult = await authenticatedClient.properties.unsubscribe.mutate({
        propertyId: testProperty.id,
      });
      expect(unsubscribeResult).toBeDefined();

      // Step 6: Verify unsubscribed
      const finalSubscriptions = await authenticatedClient.properties.getSubscriptions.query();
      expect(finalSubscriptions.length).toBe(0);
    });

    it('should handle multiple property subscriptions via HTTP', async () => {
      // Create multiple test properties
      const property1 = await createTestProperty();
      const property2 = await createTestProperty();
      const property3 = await createTestProperty();

      const client = createUnauthenticatedClient();
      const userData = generateTestUser();

      // Register and login
      const registerResult = await client.auth.register.mutate(userData);
      const authToken = registerResult.token;

      const authenticatedClient = createAuthenticatedClient(authToken);

      // Subscribe to multiple properties
      await authenticatedClient.properties.subscribe.mutate({ propertyId: property1.id });
      await authenticatedClient.properties.subscribe.mutate({ propertyId: property2.id });
      await authenticatedClient.properties.subscribe.mutate({ propertyId: property3.id });

      // Get all subscriptions
      const subscriptions = await authenticatedClient.properties.getSubscriptions.query();
      expect(subscriptions.length).toBe(3);

      // Unsubscribe from one
      await authenticatedClient.properties.unsubscribe.mutate({ propertyId: property2.id });

      // Verify remaining subscriptions
      const remainingSubscriptions = await authenticatedClient.properties.getSubscriptions.query();
      expect(remainingSubscriptions.length).toBe(2);
    });
  });

  describe('User Preferences and Property Search Workflow', () => {
    it('should update profile → set preferences → search with preferences via HTTP', async () => {
      const client = createUnauthenticatedClient();
      const userData = generateTestUser();

      // Register and login
      const registerResult = await client.auth.register.mutate(userData);
      const authToken = registerResult.token;

      const authenticatedClient = createAuthenticatedClient(authToken);

      // Update profile with preferences
      await authenticatedClient.users.updateProfile.mutate({
        name: 'Test User',
        gender: 1,
        emailPreferences: [{ userId: 1, type: 1 }],
      });

      // Get preferences
      const preferences = await authenticatedClient.users.getPreference.query();
      expect(preferences).toBeDefined();

      // Search properties with specific criteria (can use unauthenticated client for search)
      const searchResult = await client.properties.search.mutate({
        targetSchool: 'UNSW',
        minPrice: 400,
        maxPrice: 800,
        propertyType: 1,
        page: 1,
        pageSize: 10,
      });

      expect(searchResult).toBeDefined();
      expect(searchResult).toHaveProperty('properties');
    });
  });

  describe('Error Handling Workflows', () => {
    it('should handle authentication failures gracefully via HTTP', async () => {
      const client = createUnauthenticatedClient();

      // Try authenticated endpoints without login
      await expect(client.users.getProfile.query()).rejects.toThrow();
      await expect(client.users.getPreference.query()).rejects.toThrow();
      await expect(client.properties.getSubscriptions.query()).rejects.toThrow();
    });

    it('should handle duplicate registration attempts via HTTP', async () => {
      const client = createUnauthenticatedClient();
      const userData = generateTestUser();

      // First registration should succeed
      await client.auth.register.mutate(userData);

      // Second registration with same email should fail
      await expect(client.auth.register.mutate(userData)).rejects.toThrow();
    });

    it('should handle invalid property subscription attempts via HTTP', async () => {
      const client = createUnauthenticatedClient();
      const userData = generateTestUser();

      const registerResult = await client.auth.register.mutate(userData);
      const authToken = registerResult.token;

      const authenticatedClient = createAuthenticatedClient(authToken);

      // Try to subscribe to non-existent property
      await expect(authenticatedClient.properties.subscribe.mutate({
        propertyId: 999999,
      })).rejects.toThrow();
    });
  });
});