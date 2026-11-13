import assert from 'node:assert/strict';
import test from 'node:test';
import { explicitRentCeiling } from '../../src/lib/rental-assistant/listings';
import { listingScenarios, searchChanges } from '../../src/lib/rental-assistant/search-context';

test('an explicit upper bound survives extraction by the model', () => {
  assert.equal(explicitRentCeiling('给我 UNSW 附近 Kingsford 每周最多 1 澳元的两房。'), 1);
  assert.equal(explicitRentCeiling('Newtown 周租 900 以内的两房'), 900);
  assert.equal(explicitRentCeiling('只看通勤 30 分钟以内的，预算改到每周 850。'), 850);
  assert.equal(explicitRentCeiling('Two bedrooms in Newtown under A$1,050/week'), 1050);
});

test('a commute limit, bedroom count or lower rent limit is not a rent ceiling', () => {
  assert.equal(explicitRentCeiling('通勤最多30分钟，2卧，周租最低 700'), undefined);
  assert.equal(explicitRentCeiling('Within 30 minutes of UNSW'), undefined);
  assert.equal(explicitRentCeiling('How much are two bedrooms in Newtown?'), undefined);
});

test('budget units, total rents and full campus names resolve into the intended filters', () => {
  assert.deepEqual(
    searchChanges('Find 2 bedrooms near University of Sydney with a monthly budget of A$4,000.'),
    {
      school: 'USYD',
      bedrooms: 2,
      bedroomOptions: null,
      maxRent: 923,
      perPersonRent: null,
      minRent: null,
    }
  );
  assert.equal(searchChanges('悉尼大学附近 2B，预算总共 900').maxRent, 900);
  assert.equal(searchChanges('周租 700 到 900，2B').minRent, 700);
  assert.equal(searchChanges('周租 700 到 900，2B').maxRent, 900);
  const scenarios = listingScenarios(searchChanges('3B 住 3 人和 2B 住 2 人，每人 500 刀'));
  assert.deepEqual(
    scenarios.map(item => item.input.maxRent),
    [1500, 1000]
  );
});

test('a whole-property budget cannot be mistaken for a per-person budget', () => {
  assert.deepEqual(
    listingScenarios(searchChanges('2B 或 3B，整套周租 500 刀以内')).map(
      item => item.input.maxRent
    ),
    [500, 500]
  );
});

test('a per-person range is applied independently to each bedroom option', () => {
  const scenarios = listingScenarios(searchChanges('每人每周 400 到 500 刀，找 2B 或 3B'));
  assert.deepEqual(
    scenarios.map(item => [item.input.bedrooms, item.input.minRent, item.input.maxRent]),
    [
      [2, 800, 1000],
      [3, 1200, 1500],
    ]
  );
});

test('a user can change the inherited transit cap using ordinary Chinese wording', () => {
  assert.equal(searchChanges('那只看 3B，公交改成 25 分钟内。').maxCommute, 25);
});
