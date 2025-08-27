import { beforeAll, afterAll } from 'vitest';
import { setupTestDatabase, teardownTestDatabase } from './db-helpers';

beforeAll(async () => {
  // Wait for backend server to be available
  console.log('Waiting for backend server at http://localhost:3201...');
  await waitForServer('http://localhost:3201/trpc', 5000);
  console.log('Backend server is ready!');
  
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

async function waitForServer(url: string, timeout: number = 10000): Promise<void> {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    try {
      // Try to make a simple request to the server
      const response = await fetch(url, {
        method: 'GET',
      });
      
      // If we get any response (even 404 or 405), the server is running
      if (response.status >= 200 && response.status < 600) {
        return;
      }
    } catch (error) {
      // Server not ready yet, continue waiting
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('ECONNREFUSED')) {
        // If it's not a connection refused error, the server might be up
        return;
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error(`Server at ${url} did not become available within ${timeout}ms`);
}