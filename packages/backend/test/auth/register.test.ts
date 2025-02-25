import { register } from '@qrent/shared/utils/requestHelpers';
import { clearDb } from '@qrent/shared/utils/db';
import dotenv from 'dotenv';


beforeAll(() => {
  dotenv.config();
});

beforeEach(async () => {
  await clearDb();
});

describe('User Register', () => {
  it('should register a user', async () => {
    const res = await register({
      email: 'test@test.com',
      password: 'test',
      name: 'test',
      username: 'test',
      gender: 1,
      phone: '12345678901',
    });

    expect(res).toBeDefined();
    expect(res.userId).toBeDefined();
  });
});