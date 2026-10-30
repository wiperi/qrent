import assert from 'node:assert/strict';
import test from 'node:test';
import { displayKeywords } from '../../src/lib/property-keywords';
import { rentalSearchPath } from '../../src/lib/rental-schools';
import { validPreviewRow } from '../../src/lib/rental-preview';

test('Chinese cards reuse the existing Chinese keywords without a model request', () => {
  assert.deepEqual(displayKeywords('zh', 'sunny, dishwasher', '采光充足、洗碗机'), [
    '采光充足',
    '洗碗机',
  ]);
  assert.deepEqual(displayKeywords('en', '["sunny", "dishwasher"]', '采光充足、洗碗机'), [
    'sunny',
    'dishwasher',
  ]);
  assert.deepEqual(displayKeywords('zh', '"sunny", "dishwasher"', ''), ['sunny', 'dishwasher']);
});
test('area links preserve multi-word region filters and the selected university', () => {
  const path = rentalSearchPath('zh', 'UTS', 'surry-hills');
  const url = new URL(path, 'https://www.qrent.rent');
  assert.equal(url.searchParams.get('university'), 'UTS');
  assert.equal(url.searchParams.get('areas'), 'surry hills');
  assert.equal(url.searchParams.get('page'), '1');
});
test('preview refuses unknown prices and unsafe or unrelated source links', () => {
  const row = {
    id: 1,
    address: '1 Test Street',
    region: 'Newtown',
    price: 600,
    url: 'https://www.domain.com.au/test',
  };
  assert.equal(validPreviewRow(row), true);
  for (const update of [
    { price: 0 },
    { price: NaN },
    { url: 'javascript:alert(1)' },
    { url: 'https://example.com' },
  ]) {
    assert.equal(validPreviewRow({ ...row, ...update }), false);
  }
});
