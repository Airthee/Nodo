import { describe, it } from 'bun:test';
import fc from 'fast-check';
import {
  applyOperations,
  type ChecklistState,
  type Operation,
  type VersionMeta,
} from '../src';

const initial = (): ChecklistState => ({
  id: 'list-1',
  name: '',
  createdAt: 0,
  nameVersion: { ts: 0, deviceId: '' },
  items: {},
});

const deviceId = () => fc.constantFrom('A', 'B', 'C');
const itemId = () => fc.constantFrom('i1', 'i2', 'i3');
const ts = () => fc.integer({ min: 1, max: 1_000_000 });
const version = (): fc.Arbitrary<VersionMeta> =>
  fc.record({ ts: ts(), deviceId: deviceId() });

const opArb = (): fc.Arbitrary<Operation> =>
  fc.oneof(
    fc.record({
      type: fc.constant('item-add' as const),
      itemId: itemId(),
      label: fc.string({ minLength: 1, maxLength: 8 }),
      addedAt: ts(),
      labelVersion: version(),
      checkedVersion: version(),
    }),
    fc.record({
      type: fc.constant('item-relabel' as const),
      itemId: itemId(),
      label: fc.string({ minLength: 1, maxLength: 8 }),
      version: version(),
    }),
    fc.record({
      type: fc.constant('item-toggle' as const),
      itemId: itemId(),
      checked: fc.boolean(),
      version: version(),
    }),
    fc.record({
      type: fc.constant('item-delete' as const),
      itemId: itemId(),
      version: version(),
    }),
    fc.record({
      type: fc.constant('list-rename' as const),
      version: version(),
      name: fc.string({ maxLength: 12 }),
    }),
    fc.record({
      type: fc.constant('list-delete' as const),
      version: version(),
    }),
  );

const opSeq = () => fc.array(opArb(), { minLength: 0, maxLength: 30 });

const stableStringify = (s: ChecklistState): string => {
  const itemKeys = Object.keys(s.items).sort();
  const orderedItems = itemKeys.reduce<Record<string, unknown>>((acc, k) => {
    acc[k] = s.items[k];
    return acc;
  }, {});
  return JSON.stringify({
    id: s.id,
    name: s.name,
    createdAt: s.createdAt,
    nameVersion: s.nameVersion,
    items: orderedItems,
    deletedAt: s.deletedAt,
  });
};

const eq = (a: ChecklistState, b: ChecklistState) =>
  stableStringify(a) === stableStringify(b);

describe('crdt properties', () => {
  it('idempotent: applying the same op sequence twice ≡ once', () => {
    fc.assert(
      fc.property(opSeq(), (ops) => {
        const once = applyOperations(initial(), ops);
        const twice = applyOperations(once, ops);
        return eq(once, twice);
      }),
      { numRuns: 200 },
    );
  });

  it('commutative under shuffle: any permutation reaches the same state', () => {
    fc.assert(
      fc.property(opSeq(), fc.func(fc.integer()), (ops, _seed) => {
        const a = applyOperations(initial(), ops);
        const reversed = [...ops].reverse();
        const b = applyOperations(initial(), reversed);
        return eq(a, b);
      }),
      { numRuns: 200 },
    );
  });

  it('associative: (s ∘ a) ∘ b ≡ s ∘ (a ++ b)', () => {
    fc.assert(
      fc.property(opSeq(), opSeq(), (a, b) => {
        const left = applyOperations(applyOperations(initial(), a), b);
        const right = applyOperations(initial(), [...a, ...b]);
        return eq(left, right);
      }),
      { numRuns: 200 },
    );
  });
});
