import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { plan, sourceUrl } from './plan.mjs';

const load = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const currentPolicy = load('../../data/editorial/policy.json');
const intake = load('../../data/editorial/pilot-intake.json');
const initial = load('../../data/editorial/initial-state.json');
const date = '2026-09-16T22:00:00Z';
const policy = structuredClone(currentPolicy);
for (const source of policy.sources) source.checkedAt = date;

test('pilot reserves three briefs without model calls or publication', () => {
  const result = plan(intake, policy, initial, date);
  assert.equal(result.selected.length, 3);
  assert.equal(result.budget.reservedThisRun, 24000);
  assert.equal(result.budget.modelCalls, 0);
  assert.ok(result.nextState.jobs.every(job => job.publishable === false));
  assert.deepEqual(initial.months, {});
});

test('reruns preserve the queue without reserving tokens again', () => {
  const first = plan(intake, policy, initial, date);
  const second = plan(intake, policy, first.nextState, date);
  assert.equal(second.selected.length, 0);
  assert.equal(second.pending.length, 3);
  assert.equal(second.budget.reservedThisMonth, 24000);
  assert.deepEqual(second.nextState, first.nextState);
});

test('tracking variants and repeated signals deduplicate; changed facts remain new', () => {
  const signal = intake.signals[0];
  const input = { inventory: [], signals: [signal, { ...signal, url: `${signal.url}?utm_source=test#fragment` }] };
  const result = plan(input, policy, initial, date);
  assert.equal(result.selected.length, 1);
  assert.equal(result.nextState.jobs[0].eventIds.length, 1);
  const state = result.nextState;
  state.jobs[0].status = 'completed';
  const changed = plan({ inventory: [], signals: [{ ...signal, facts: ['New fixture fact; test evidence only.'] }] }, policy, state, date);
  assert.equal(changed.selected.length, 1);
});

test('multiple source records for one reader job share a brief', () => {
  const signal = intake.signals[0];
  const result = plan({ inventory: [], signals: [signal, { ...signal, url: 'https://www.samsung.com/test-fixture', facts: ['A separate primary source observation.'] }] }, policy, initial, date);
  assert.equal(result.selected.length, 1);
  assert.equal(result.nextState.jobs[0].sources.length, 2);
});

test('product packet source indexes include every reciprocal claim reference', () => {
  const packetDirectory = new URL('../../data/editorial/packets/', import.meta.url);
  for (const name of readdirSync(packetDirectory).filter(value => value.endsWith('.json'))) {
    const packet = JSON.parse(readFileSync(new URL(name, packetDirectory), 'utf8'));
    if (!packet.sources.some(source => Array.isArray(source.claimIds))) continue;
    const sources = new Map(packet.sources.map(source => [source.id, source]));
    for (const claim of packet.claims) {
      for (const sourceId of claim.sourceIds) {
        const source = sources.get(sourceId);
        assert.ok(source, `${name}: claim ${claim.id} references missing source ${sourceId}`);
        assert.ok(Array.isArray(source.claimIds) && source.claimIds.includes(claim.id), `${name}: source ${sourceId} omits claim ${claim.id}`);
      }
    }
  }
});

test('latest durable run replays without a duplicate brief or reservation', () => {
  const latest = load('../../data/editorial/runs/2026-10-22-held-release-condition-recheck.json');
  const replay = plan(latest.normalizedIntake, currentPolicy, latest.nextState, '2026-10-22T06:43:49Z');
  assert.deepEqual(replay.selected, []);
  assert.equal(replay.budget.reservedThisRun, 0);
  assert.deepEqual(replay.nextState, latest.nextState);
});

test('unregistered hosts, unsafe URLs, missing/future/stale timestamps are rejected', () => {
  for (const patch of [
    { url: 'https://news.samsung.com.evil.example/a' },
    { url: 'http://news.samsung.com/a' },
    { url: 'https://user:pass@news.samsung.com/a' },
    { checkedAt: undefined }, { checkedAt: '2027-01-01' }, { checkedAt: '2025-01-01' },
  ]) {
    const result = plan({ inventory: [], signals: [{ ...intake.signals[0], ...patch }] }, policy, initial, date);
    assert.equal(result.selected.length, 0);
    assert.equal(result.rejected.length, 1);
  }
});

test('stale source directory cannot accept fresh observations', () => {
  const changed = structuredClone(policy);
  changed.sources[1].checkedAt = '2025-01-01';
  const result = plan({ inventory: [], signals: [intake.signals[0]] }, changed, initial, date);
  assert.match(result.rejected[0].reason, /directory needs recheck/);
});

test('run and monthly caps defer work without dropping it', () => {
  const small = plan(intake, { ...policy, maxRunTokens: 8000 }, initial, date);
  assert.equal(small.selected.length, 1);
  assert.equal(small.deferred.length, 2);
  const state = { ...initial, months: { '2026-09': { reservedTokens: 236000 } } };
  const exhausted = plan(intake, policy, state, date);
  assert.equal(exhausted.selected.length, 0);
  assert.equal(exhausted.deferred.length, 3);
  assert.equal(exhausted.budget.reservedThisMonth, 236000);
});

test('new calendar month has a separate allowance but outstanding work still blocks expansion', () => {
  const first = plan(intake, policy, initial, date);
  const later = structuredClone(intake);
  later.signals = later.signals.map(signal => ({ ...signal, checkedAt: '2026-10-01T00:00:00Z', facts: ['A changed fixture fact requiring review.'] }));
  const result = plan(later, policy, first.nextState, '2026-10-01T00:00:00Z');
  assert.equal(result.selected.length, 0);
  assert.equal(result.budget.reservedThisMonth, 0);
  assert.equal(result.nextState.months['2026-09'].reservedTokens, 24000);
});

test('existing canonical intent routes to a refresh', () => {
  const signal = intake.signals[0];
  const result = plan({ signals: [signal], inventory: [{ productId: signal.productId, intentId: signal.intentId, canonicalUrl: 'https://starlight.technology/guides/example' }] }, policy, initial, date);
  assert.equal(result.nextState.jobs[0].action, 'refresh-existing');
});

test('a completed or failed attempt cannot erase its monthly reservation', () => {
  const result = plan(intake, policy, initial, date);
  const state = result.nextState;
  state.jobs[0].status = 'held';
  state.months['2026-09'].reservedTokens = 0;
  assert.throws(() => plan(intake, policy, state, date), /discard prior reservations/);
});

test('source normalization preserves unknown query parameters; malformed budget fails closed', () => {
  assert.equal(sourceUrl('https://www.apple.com/a?variant=2&utm_campaign=x', ['www.apple.com']), 'https://www.apple.com/a?variant=2');
  assert.throws(() => plan(intake, policy, { ...initial, months: { '2026-09': { reservedTokens: -1 } } }, date), /reservation/);
  assert.throws(() => plan(intake, { ...policy, maxMonthTokens: NaN }, initial, date), /policy/);
  assert.throws(() => plan(intake, policy, null, date), /durable state/);
});
