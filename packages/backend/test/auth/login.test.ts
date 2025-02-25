import { login } from '@qrent/shared/utils/requestHelpers';

describe('login', () => {
  it('should login', async () => {
    const result = await login({ email: 'test@test.com', password: 'test' });
    expect(result).toBeDefined();
  });
});