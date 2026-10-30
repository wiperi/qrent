export async function verifyBackend(base, request = fetch, { checkLatest = true } = {}) {
  const echo = await request(`${base}/echo`, { signal: AbortSignal.timeout(10000) });
  if (!echo.ok) throw new Error('Backend echo failed');
  const checks = [
    { targetSchool: 'UNSW' },
    { targetSchool: 'USYD' },
    { targetSchool: 'UTS' },
    { targetSchool: 'UNSW', regions: 'eastgardens' },
  ];
  const results = [];
  for (const check of checks) {
    const input = { ...check, page: 1, pageSize: 12, orderBy: [{ averageScore: 'desc' }] };
    const response = await request(`${base}/trpc/properties.search?input=${encodeURIComponent(JSON.stringify(input))}`, {
      headers: { 'x-locale': 'zh' },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('Backend search failed');
    const rows = (await response.json())?.result?.data?.properties;
    if (!Array.isArray(rows) || rows.length === 0) throw new Error('Backend search has no verified results');
    let previous;
    for (const row of rows) {
      const time = Date.parse(row.publishedAt);
      if (!Number.isFinite(time) || !Number.isFinite(row.averageScore)) throw new Error('Invalid search ordering fields');
      if (checkLatest && previous && (time > previous.time || (time === previous.time && row.averageScore > previous.score))) {
        throw new Error('Legacy website search is not ordered by date then score');
      }
      previous = { time, score: row.averageScore };
    }
    if (checkLatest) {
      const referenceInput = { ...input, orderBy: [{ publishedAt: 'desc' }, { averageScore: 'desc' }] };
      const reference = await request(`${base}/trpc/properties.search?input=${encodeURIComponent(JSON.stringify(referenceInput))}`, {
        headers: { 'x-locale': 'zh' }, signal: AbortSignal.timeout(10000),
      });
      if (!reference.ok) throw new Error('Latest-page reference search failed');
      const expected = (await reference.json())?.result?.data?.properties;
      const ranking = list => list.map(row => [Date.parse(row.publishedAt), row.averageScore]);
      // Different IDs tied on both ordering keys are valid; compare ranks.
      if (!Array.isArray(expected) || JSON.stringify(ranking(expected)) !== JSON.stringify(ranking(rows))) {
        throw new Error('Legacy website search does not return the latest page');
      }
    }
    results.push({ ...check, returned: rows.length, firstId: rows[0].id });
  }
  return { status: 'verified', checks: results };
}

if (!process.argv[1] || process.argv[1].endsWith('/verify_backend.mjs')) {
  const port = Number(process.env.BACKEND_LISTEN_PORT);
  try {
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid backend port');
    console.log(JSON.stringify(await verifyBackend(`http://127.0.0.1:${port}`, fetch,
      { checkLatest: process.env.QRENT_VERIFY_MODE !== 'rollback' })));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
