import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleMotion } from '../src/motion.js';

test('idle and listening never move the mouth', () => {
  for (const state of ['idle', 'listening', 'thinking', 'praise']) {
    assert.equal(sampleMotion(state, 2.4).mouth, 0);
  }
});

test('speaking opens the mouth but never exceeds a natural expression weight', () => {
  const samples = Array.from({ length: 100 }, (_, n) => sampleMotion('speaking', n / 20));
  assert.ok(samples.some(pose => pose.mouth > 0.3));
  assert.ok(samples.every(pose => pose.mouth >= 0 && pose.mouth <= 0.65));
});

test('reduced motion freezes the body even while speech retains mouth movement', () => {
  const first = sampleMotion('speaking', 0.2, true);
  const later = sampleMotion('speaking', 7.4, true);
  for (const key of ['headX', 'headY', 'headZ', 'bodyX', 'bodyY']) assert.equal(first[key], later[key]);
  assert.notEqual(first.mouth, later.mouth);
});

test('listening tilts the head and praise visibly increases the smile', () => {
  assert.ok(sampleMotion('listening', 0).headZ > 0.08);
  assert.ok(sampleMotion('praise', 0).smile > sampleMotion('idle', 0).smile + 0.3);
});

test('unknown states fall back to idle without opening the mouth', () => {
  assert.deepEqual(sampleMotion('not-a-state', 1), sampleMotion('idle', 1));
});
