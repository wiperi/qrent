import assert from 'node:assert/strict';
import test from 'node:test';
import { explicitRentCeiling } from '../../src/lib/rental-assistant/listings';

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
