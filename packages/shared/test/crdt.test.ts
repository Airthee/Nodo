import { describe, it, expect } from 'bun:test';
import {
  applyOperation,
  applyOperations,
  mergeStates,
  compareVersion,
  bumpClock,
  nextLocalTs,
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

describe('clock helpers', () => {
  it('nextLocalTs is at least shareClock + 1', () => {
    const past = Date.now() - 10_000_000;
    expect(nextLocalTs(past)).toBeGreaterThan(past);

    const future = Date.now() + 10_000_000;
    expect(nextLocalTs(future)).toBe(future + 1);
  });

  it('bumpClock moves only forward', () => {
    expect(bumpClock(100, 200)).toBe(200);
    expect(bumpClock(200, 100)).toBe(200);
    expect(bumpClock(50, 50)).toBe(50);
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
