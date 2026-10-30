import {
  registerInput,
  loginInput,
  changeAuthInput,
  verificationInput,
} from '../src/utils/auth-input';

describe('account input boundaries shared by REST and tRPC', () => {
  it('normalizes email and strips privilege, identity and relation assignments', () => {
    expect(
      registerInput.parse({
        email: ' Owner@Example.com ',
        password: 'new-password-123',
        name: 'Owner',
        id: 1,
        emailVerified: true,
        userSessions: { create: { token: 'forged' } },
      })
    ).toEqual({ email: 'owner@example.com', password: 'new-password-123', name: 'Owner' });
  });

  it('accepts an existing six-character password at login without weakening new passwords', () => {
    expect(loginInput.parse({ email: 'old@example.com', password: '123456' }).password).toBe(
      '123456'
    );
    expect(registerInput.safeParse({ email: 'new@example.com', password: '123456' }).success).toBe(
      false
    );
  });

  it('rejects passwords bcrypt would silently truncate, including multibyte input', () => {
    for (const password of ['x'.repeat(73), '租'.repeat(25)]) {
      expect(registerInput.safeParse({ email: 'new@example.com', password }).success).toBe(false);
    }
    expect(
      registerInput.safeParse({ email: 'new@example.com', password: 'x'.repeat(72) }).success
    ).toBe(true);
  });

  it('matches production column bounds and only accepts a six-digit verification code', () => {
    expect(
      registerInput.safeParse({ email: 'x'.repeat(45) + '@test.com', password: 'good-pass-123' })
        .success
    ).toBe(false);
    for (const code of [0, -1, 12345, 1234567, 123456.5]) {
      expect(verificationInput.safeParse({ email: 'a@example.com', code }).success).toBe(false);
    }
    expect(verificationInput.parse({ email: 'a@example.com', code: 123456 }).code).toBe(123456);
  });

  it('does not accept unbounded or unvalidated profile changes', () => {
    expect(changeAuthInput.safeParse({ oldPassword: 'old', password: '123' }).success).toBe(false);
    expect(changeAuthInput.safeParse({ oldPassword: 'old', phone: 'bad-phone' }).success).toBe(
      false
    );
    expect(changeAuthInput.parse({ oldPassword: 'old', emailVerified: true })).toEqual({
      oldPassword: 'old',
    });
  });
});
