import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createUnauthenticatedClient, createAuthenticatedClient } from '../setup/trpc-client';
import { generatePropertySearch, generateTestUser } from '../setup/test-data';
import { setupTestDatabase, teardownTestDatabase, createTestProperty, createTestUser } from '../setup/db-helpers';

describe('Properties Router - Client-Side tRPC', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await teardownTestDatabase();
  });

  describe('properties.search', () => {
    it('should search properties successfully with basic parameters via HTTP', async () => {
      const client = createUnauthenticatedClient();
      
      const searchParams = {
        targetSchool: 'UNSW',
        page: 1,
        pageSize: 10,
      };

      const result = await client.properties.search.mutate(searchParams);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('properties');
      expect(Array.isArray(result.properties)).toBe(true);
    });

    it('should search with price filters via HTTP', async () => {
      const client = createUnauthenticatedClient();
      
      const searchParams = {
        targetSchool: 'USYD',
        minPrice: 300,
        maxPrice: 800,
        page: 1,
        pageSize: 10,
      };

      const result = await client.properties.search.mutate(searchParams);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('properties');
    });

    it('should search with bedroom and bathroom filters via HTTP', async () => {
      const client = createUnauthenticatedClient();
      
      const searchParams = {
        targetSchool: 'UTS',
        minBedrooms: 2,
        maxBedrooms: 4,
        minBathrooms: 1,
        maxBathrooms: 3,
        page: 1,
        pageSize: 5,
      };

      const result = await client.properties.search.mutate(searchParams);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('properties');
    });

    it('should search with property type filter via HTTP', async () => {
      const client = createUnauthenticatedClient();
      
      const searchParams = {
        targetSchool: 'UNSW',
        propertyType: 1, // House
        page: 1,
        pageSize: 10,
      };

      const result = await client.properties.search.mutate(searchParams);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('properties');
    });

    it('should search with commute time filters', async () => {
      const client = createUnauthenticatedClient();
      
      const searchParams = {
        targetSchool: 'UNSW',
        minCommuteTime: 10,
        maxCommuteTime: 30,
        page: 1,
        pageSize: 10,
      };

      const result = await client.properties.search.mutate(searchParams);

      expect(result).toBeDefined();
    });

    it('should handle pagination correctly', async () => {
      const client = createUnauthenticatedClient();
      
      const searchParams = {
        targetSchool: 'UNSW',
        page: 2,
        pageSize: 5,
      };

      const result = await client.properties.search.mutate(searchParams);

      expect(result).toBeDefined();
    });

    it('should fail with invalid target school', async () => {
      const client = createUnauthenticatedClient();
      
      const searchParams = {
        targetSchool: 'INVALID_SCHOOL',
        page: 1,
        pageSize: 10,
      };

      // Depending on implementation, this might throw or return empty results
      await expect(client.properties.search.mutate(searchParams)).rejects.toThrow();
    });

    it('should fail with negative price values', async () => {
      const client = createUnauthenticatedClient();
      
      const searchParams = {
        targetSchool: 'UNSW',
        minPrice: -100,
        page: 1,
        pageSize: 10,
      };

      await expect(client.properties.search.mutate(searchParams)).rejects.toThrow();
    });
  });

  describe('properties.subscribe', () => {
    it('should subscribe to property successfully via HTTP', async () => {
      const client = createUnauthenticatedClient();
      const userData = generateTestUser();
      const testProperty = await createTestProperty();
      
      // Register and get token
      const registerResult = await client.auth.register.mutate(userData);
      const authToken = registerResult.token;
      const authenticatedClient = createAuthenticatedClient(authToken);

      const result = await authenticatedClient.properties.subscribe.mutate({
        propertyId: testProperty.id,
      });

      expect(result).toBeDefined();
    });

    it('should fail without authentication via HTTP', async () => {
      const testProperty = await createTestProperty();
      const client = createUnauthenticatedClient();

      await expect(client.properties.subscribe.mutate({
        propertyId: testProperty.id,
      })).rejects.toThrow();
    });

    it('should fail with invalid property ID via HTTP', async () => {
      const client = createUnauthenticatedClient();
      const userData = generateTestUser();
      
      // Register and get token
      const registerResult = await client.auth.register.mutate(userData);
      const authToken = registerResult.token;
      const authenticatedClient = createAuthenticatedClient(authToken);

      await expect(authenticatedClient.properties.subscribe.mutate({
        propertyId: 999999,
      })).rejects.toThrow();
    });

    it('should fail with negative property ID', async () => {
      const client = createUnauthenticatedClient();
      const userData = generateTestUser();
      
      // Register and get token
      const registerResult = await client.auth.register.mutate(userData);
      const authToken = registerResult.token;
      const authenticatedClient = createAuthenticatedClient(authToken);

      await expect(authenticatedClient.properties.subscribe.mutate({
        propertyId: -1,
      })).rejects.toThrow();
    });
  });

  describe('properties.unsubscribe', () => {
    it('should unsubscribe from property successfully', async () => {
      const client = createUnauthenticatedClient();
      const userData = generateTestUser();
      const testProperty = await createTestProperty();
      
      // Register and get token
      const registerResult = await client.auth.register.mutate(userData);
      const authToken = registerResult.token;
      const authenticatedClient = createAuthenticatedClient(authToken);

      // Subscribe first
      await authenticatedClient.properties.subscribe.mutate({
        propertyId: testProperty.id,
      });

      // Then unsubscribe
      const result = await authenticatedClient.properties.unsubscribe.mutate({
        propertyId: testProperty.id,
      });

      expect(result).toBeDefined();
    });

    it('should fail without authentication', async () => {
      const testProperty = await createTestProperty();
      const client = createUnauthenticatedClient();

      await expect(client.properties.unsubscribe.mutate({
        propertyId: testProperty.id,
      })).rejects.toThrow();
    });

    it('should fail with invalid property ID', async () => {
      const client = createUnauthenticatedClient();
      const userData = generateTestUser();
      
      // Register and get token
      const registerResult = await client.auth.register.mutate(userData);
      const authToken = registerResult.token;
      const authenticatedClient = createAuthenticatedClient(authToken);

      await expect(authenticatedClient.properties.unsubscribe.mutate({
        propertyId: 999999,
      })).rejects.toThrow();
    });
  });

  describe('properties.getSubscriptions', () => {
    it('should get empty subscriptions for new user via HTTP', async () => {
      const client = createUnauthenticatedClient();
      const userData = generateTestUser();
      
      // Register and get token
      const registerResult = await client.auth.register.mutate(userData);
      const authToken = registerResult.token;
      const authenticatedClient = createAuthenticatedClient(authToken);

      const result = await authenticatedClient.properties.getSubscriptions.query();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should get subscriptions after subscribing via HTTP', async () => {
      const client = createUnauthenticatedClient();
      const userData = generateTestUser();
      const testProperty = await createTestProperty();
      
      // Register and get token
      const registerResult = await client.auth.register.mutate(userData);
      const authToken = registerResult.token;
      const authenticatedClient = createAuthenticatedClient(authToken);

      // Subscribe to property
      await authenticatedClient.properties.subscribe.mutate({
        propertyId: testProperty.id,
      });

      // Get subscriptions
      const result = await authenticatedClient.properties.getSubscriptions.query();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should fail without authentication via HTTP', async () => {
      const client = createUnauthenticatedClient();

      await expect(client.properties.getSubscriptions.query()).rejects.toThrow();
    });
  });
});