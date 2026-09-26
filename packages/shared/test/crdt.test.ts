import { describe, it, expect } from 'bun:test';
import fc from 'fast-check';
import {
  applyOperation,
  applyOperations,
  mergeStates,
  compareVersion,
  createDeviceClock,
  isItemAlive,
  type ChecklistState,
  type Operation,
  type VersionMeta,
} from '../src';

const dev = (name: string) => name;

const seed = (id = 'list-1', deviceId = dev('A')): ChecklistState => ({
  id,
  name: 'My list',
  createdAt: 100,
  nameVersion: { ts: 100, deviceId },
  items: {},
});

const v = (ts: number, deviceId: string): VersionMeta => ({ ts, deviceId });

describe('compareVersion', () => {
  it('orders by ts then deviceId', () => {
    expect(compareVersion(v(1, 'A'), v(2, 'A'))).toBe(-1);
    expect(compareVersion(v(2, 'A'), v(1, 'A'))).toBe(1);
    expect(compareVersion(v(1, 'A'), v(1, 'B'))).toBe(-1);
    expect(compareVersion(v(1, 'B'), v(1, 'A'))).toBe(1);
    expect(compareVersion(v(1, 'A'), v(1, 'A'))).toBe(0);
  });
});

describe('createDeviceClock', () => {
  it('issues strictly increasing ts when now() is frozen', () => {
    const clock = createDeviceClock(0, () => 1_000);
    const a = clock.next();
    const b = clock.next();
    expect(a).toBe(1_000);
    expect(b).toBeGreaterThan(a);
  });

  it('observing a future ts makes the next ts exceed it', () => {
    const clock = createDeviceClock(0, () => 1_000);
    clock.observe(5_000);
    expect(clock.next()).toBeGreaterThan(5_000);
  });

  it('observing a past ts does not move the clock back', () => {
    const clock = createDeviceClock(0, () => 1_000);
    const issued = clock.next();
    clock.observe(10);
    expect(clock.current()).toBe(issued);
    expect(clock.next()).toBeGreaterThan(issued);
  });

  it('ignores non-finite observed ts', () => {
    const clock = createDeviceClock(0, () => 1_000);
    const issued = clock.next();
    clock.observe(NaN);
    clock.observe(Infinity);
    expect(clock.current()).toBe(issued);
    expect(clock.next()).toBe(issued + 1);
  });

  it('seeds current() with the initial value', () => {
    const clock = createDeviceClock(42, () => 0);
    expect(clock.current()).toBe(42);
    expect(clock.next()).toBe(43);
  });

  it('issues a strictly increasing ts sequence for any next/observe interleaving', () => {
    const step = fc.oneof(
      fc.record({ kind: fc.constant('next' as const), now: fc.integer({ min: 0, max: 1_000_000 }) }),
      fc.record({ kind: fc.constant('observe' as const), ts: fc.integer({ min: 0, max: 1_000_000 }) }),
    );
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1_000_000 }), fc.array(step, { maxLength: 50 }), (initial, steps) => {
        let now = 0;
        const clock = createDeviceClock(initial, () => now);
        const issued: number[] = [];
        for (const s of steps) {
          if (s.kind === 'next') {
            now = s.now;
            issued.push(clock.next());
          } else {
            clock.observe(s.ts);
          }
        }
        return issued.every((ts, i) => i === 0 || ts > issued[i - 1]!);
      }),
      { numRuns: 200 },
    );
  });
});

describe('applyOperation - item add/relabel/toggle/delete', () => {
  it('adds a new item', () => {
    const s = seed();
    const op: Operation = {
      type: 'item-add',
      itemId: 'i1',
      label: 'milk',
      addedAt: 110,
      labelVersion: v(110, 'A'),
      checkedVersion: v(110, 'A'),
    };
    const next = applyOperation(s, op);
    expect(next.items.i1?.label).toBe('milk');
    expect(next.items.i1?.checked).toBe(false);
  });

  it('relabel updates only when newer', () => {
    let s = seed();
    s = applyOperation(s, {
      type: 'item-add',
      itemId: 'i1',
      label: 'milk',
      addedAt: 100,
      labelVersion: v(100, 'A'),
      checkedVersion: v(100, 'A'),
    });
    s = applyOperation(s, { type: 'item-relabel', itemId: 'i1', label: 'oat milk', version: v(50, 'A') });
    expect(s.items.i1?.label).toBe('milk');
    s = applyOperation(s, { type: 'item-relabel', itemId: 'i1', label: 'oat milk', version: v(200, 'A') });
    expect(s.items.i1?.label).toBe('oat milk');
  });

  it('toggle wins when newer', () => {
    let s = seed();
    s = applyOperation(s, {
      type: 'item-add',
      itemId: 'i1',
      label: 'milk',
      addedAt: 100,
      labelVersion: v(100, 'A'),
      checkedVersion: v(100, 'A'),
    });
    s = applyOperation(s, { type: 'item-toggle', itemId: 'i1', checked: true, version: v(150, 'A') });
    expect(s.items.i1?.checked).toBe(true);
    s = applyOperation(s, { type: 'item-toggle', itemId: 'i1', checked: false, version: v(140, 'B') });
    expect(s.items.i1?.checked).toBe(true);
    s = applyOperation(s, { type: 'item-toggle', itemId: 'i1', checked: false, version: v(160, 'A') });
    expect(s.items.i1?.checked).toBe(false);
  });

  it('tie-break by deviceId is deterministic', () => {
    let sA = seed();
    let sB = seed();
    sA = applyOperation(sA, {
      type: 'item-add',
      itemId: 'i1',
      label: 'x',
      addedAt: 0,
      labelVersion: v(0, 'A'),
      checkedVersion: v(0, 'A'),
    });
    sB = sA;
    sA = applyOperation(sA, { type: 'item-toggle', itemId: 'i1', checked: true, version: v(100, 'A') });
    sA = applyOperation(sA, { type: 'item-toggle', itemId: 'i1', checked: false, version: v(100, 'B') });

    sB = applyOperation(sB, { type: 'item-toggle', itemId: 'i1', checked: false, version: v(100, 'B') });
    sB = applyOperation(sB, { type: 'item-toggle', itemId: 'i1', checked: true, version: v(100, 'A') });

    expect(sA.items.i1?.checked).toBe(sB.items.i1?.checked);
    expect(sA.items.i1?.checked).toBe(false);
  });

  it('tombstone wins over older edit; newer edit wakes the item', () => {
    let s = seed();
    s = applyOperation(s, {
      type: 'item-add',
      itemId: 'i1',
      label: 'milk',
      addedAt: 100,
      labelVersion: v(100, 'A'),
      checkedVersion: v(100, 'A'),
    });
    s = applyOperation(s, { type: 'item-relabel', itemId: 'i1', label: 'milk-2', version: v(150, 'A') });
    s = applyOperation(s, { type: 'item-delete', itemId: 'i1', version: v(200, 'B') });
    expect(s.items.i1?.deletedAt).toEqual(v(200, 'B'));
    expect(isItemAlive(s.items.i1!)).toBe(false);
    s = applyOperation(s, { type: 'item-relabel', itemId: 'i1', label: 'wake', version: v(300, 'A') });
    expect(s.items.i1?.label).toBe('wake');
    expect(isItemAlive(s.items.i1!)).toBe(true);
  });

  it('list-rename last writer wins', () => {
    let s = seed();
    s = applyOperation(s, { type: 'list-rename', version: v(150, 'B'), name: 'New' });
    expect(s.name).toBe('New');
    s = applyOperation(s, { type: 'list-rename', version: v(140, 'A'), name: 'Older' });
    expect(s.name).toBe('New');
  });

  it('idempotent: applying the same op twice is a no-op', () => {
    let s = seed();
    const op: Operation = {
      type: 'item-add',
      itemId: 'i1',
      label: 'milk',
      addedAt: 100,
      labelVersion: v(100, 'A'),
      checkedVersion: v(100, 'A'),
    };
    s = applyOperation(s, op);
    const after1 = s;
    s = applyOperation(s, op);
    expect(s).toBe(after1);
  });

  it('toggle on unknown item creates a stub the merge can refine', () => {
    let s = seed();
    s = applyOperation(s, { type: 'item-toggle', itemId: 'i1', checked: true, version: v(100, 'A') });
    expect(s.items.i1?.checked).toBe(true);
  });
});

describe('mergeStates', () => {
  it('reconciles independent histories deterministically', () => {
    const initialOps: Operation[] = [
      {
        type: 'item-add',
        itemId: 'i1',
        label: 'milk',
        addedAt: 100,
        labelVersion: v(100, 'A'),
        checkedVersion: v(100, 'A'),
      },
    ];
    const a0 = applyOperations(seed(), initialOps);
    const b0 = a0;

    const aOps: Operation[] = [
      { type: 'item-relabel', itemId: 'i1', label: 'oat milk', version: v(150, 'A') },
    ];
    const bOps: Operation[] = [
      { type: 'item-toggle', itemId: 'i1', checked: true, version: v(160, 'B') },
    ];

    const a = applyOperations(a0, aOps);
    const b = applyOperations(b0, bOps);

    const m1 = mergeStates(a, b);
    const m2 = mergeStates(b, a);

    expect(m1).toEqual(m2);
    expect(m1.items.i1?.label).toBe('oat milk');
    expect(m1.items.i1?.checked).toBe(true);
  });

  it('throws when ids differ', () => {
    expect(() => mergeStates(seed('a'), seed('b'))).toThrow();
  });
});
