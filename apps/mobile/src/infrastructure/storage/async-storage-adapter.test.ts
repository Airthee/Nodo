import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Checklist } from '../../domain/checklist';
import { ChecklistItem } from '../../domain/checklist-item';

const store = new Map<string, string>();
let failNextSetItem = false;

const nextMacrotask = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const fakeStorage = {
  getItem: mock(async (key: string): Promise<string | null> => {
    await nextMacrotask();
    return store.get(key) ?? null;
  }),
  setItem: mock(async (key: string, value: string): Promise<void> => {
    await nextMacrotask();
    if (failNextSetItem) {
      failNextSetItem = false;
      throw new Error('disk full');
    }
    store.set(key, value);
  }),
};

mock.module('@react-native-async-storage/async-storage', () => ({ default: fakeStorage }));

const { AsyncStorageAdapter } = await import('./async-storage-adapter');

const item = (id: string, label: string, checked = false) => ChecklistItem.create(id, label, { checked, addedAt: 1 });

const a = Checklist.create('a', 'Groceries', { items: [item('a1', 'Milk', true)], createdAt: 10 });
const b = Checklist.create('b', 'Packing', { items: [item('b1', 'Passport')], createdAt: 20 });
const c = Checklist.create('c', 'Chores', { createdAt: 30 });

describe('AsyncStorageAdapter', () => {
  beforeEach(() => {
    store.clear();
    failNextSetItem = false;
    fakeStorage.getItem.mockClear();
    fakeStorage.setItem.mockClear();
  });

  it('returns an empty list on an empty store and rehydrates saved checklists', async () => {
    const adapter = new AsyncStorageAdapter();
    expect(await adapter.getAll()).toEqual([]);

    await adapter.save(a);

    const fresh = new AsyncStorageAdapter();
    const all = await fresh.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]).toBeInstanceOf(Checklist);
    expect(all[0].items[0]).toBeInstanceOf(ChecklistItem);
    expect(all[0]).toEqual(a);
  });

  it('keeps both checklists when two saves start without awaiting in between', async () => {
    const adapter = new AsyncStorageAdapter();

    void adapter.save(a);
    await adapter.save(b);

    expect((await adapter.getAll()).map((x) => x.id)).toEqual(['a', 'b']);
    expect(fakeStorage.setItem).toHaveBeenCalledTimes(2);
    const secondPayload = JSON.parse(fakeStorage.setItem.mock.calls[1][1]) as { id: string }[];
    expect(secondPayload.map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('replaces an existing checklist in place and deletes by id', async () => {
    const adapter = new AsyncStorageAdapter();
    await adapter.save(a);
    await adapter.save(b);
    await adapter.save(c);

    const renamedB = Checklist.create('b', 'Travel', { items: b.items, createdAt: b.createdAt });
    await adapter.save(renamedB);
    expect((await adapter.getAll()).map((x) => [x.id, x.name])).toEqual([
      ['a', 'Groceries'],
      ['b', 'Travel'],
      ['c', 'Chores'],
    ]);

    await adapter.delete('a');
    expect((await adapter.getAll()).map((x) => x.id)).toEqual(['b', 'c']);
    expect(await adapter.getById('a')).toBeNull();
  });

  it('rejects save and leaves the list unchanged when the write fails', async () => {
    const adapter = new AsyncStorageAdapter();
    await adapter.save(a);

    failNextSetItem = true;
    await expect(adapter.save(b)).rejects.toThrow('disk full');
    expect((await adapter.getAll()).map((x) => x.id)).toEqual(['a']);

    await adapter.save(c);
    expect((await adapter.getAll()).map((x) => x.id)).toEqual(['a', 'c']);
  });

  it('reads storage only once across getAll, getById and save', async () => {
    const adapter = new AsyncStorageAdapter();

    await adapter.getAll();
    await adapter.getById('a');
    await adapter.save(a);
    await adapter.getAll();

    expect(fakeStorage.getItem).toHaveBeenCalledTimes(1);
  });

  it('shares one in-flight load between concurrent first reads', async () => {
    const adapter = new AsyncStorageAdapter();

    await Promise.all([adapter.getAll(), adapter.getById('a'), adapter.getAll()]);

    expect(fakeStorage.getItem).toHaveBeenCalledTimes(1);
  });

  it('returns a copy so callers cannot mutate the cache', async () => {
    const adapter = new AsyncStorageAdapter();
    await adapter.save(a);

    const all = await adapter.getAll();
    all.push(b);

    expect((await adapter.getAll()).map((x) => x.id)).toEqual(['a']);
  });
});
