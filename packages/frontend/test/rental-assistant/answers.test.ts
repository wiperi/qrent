import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatRentalAnswer } from '../../src/lib/rental-assistant/answers';
import type { AssistantEvidence } from '../../src/lib/rental-assistant/contracts';

test('rent comparisons use exact Qrent aggregates even when the model supplies different numbers', () => {
  const results: AssistantEvidence[] = [
    {
      kind: 'listings',
      id: 'R1',
      school: 'UNSW',
      suburb: 'Eastgardens',
      matches: 36,
      averageWeeklyRent: 1175,
      filters: { bedrooms: 2 },
      readAt: '2026-11-08T13:30:00Z',
      examples: [],
    },
    {
      kind: 'listings',
      id: 'R2',
      school: 'UNSW',
      suburb: 'Randwick',
      matches: 114,
      averageWeeklyRent: 980,
      filters: { bedrooms: 2 },
      readAt: '2026-11-08T13:30:00Z',
      examples: [],
    },
  ];
  const answer = formatRentalAnswer(
    'Eastgardens 周租 A$600，比 Randwick 离学校近 [R1]。',
    results,
    'zh',
    'UNSW 附近的两房周租各是多少？'
  );
  assert.match(answer, /36 条匹配房源，平均周租 A\$1,175 \[R1\]/);
  assert.match(answer, /114 条匹配房源，平均周租 A\$980 \[R2\]/);
  assert.match(answer, /可以先看 Randwick/);
  assert.doesNotMatch(answer, /600|离学校近/);
});
