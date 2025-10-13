describe('Sample Test Suite', () => {
  test('should pass a basic test', () => {
    expect(2 + 2).toBe(4);
  });

  test('should handle string comparison', () => {
    const str = 'Hello World';
    expect(str).toContain('Hello');
    expect(str.length).toBe(11);
  });
});
