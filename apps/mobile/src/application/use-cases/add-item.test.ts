import { describe, expect, it } from 'bun:test';
import { Checklist } from '../../domain/checklist';
import { ChecklistItem } from '../../domain/checklist-item';
import { InMemoryStorage } from '../test-helpers/in-memory-storage';
import { AddItemUseCase } from './add-item';

const setup = (items: ChecklistItem[]) => {
  const storage = new InMemoryStorage([Checklist.create('l', 'Groceries', { items, createdAt: 1 })]);
  return { storage, useCase: new AddItemUseCase(storage) };
};

describe('AddItemUseCase', () => {
  it('reactivates a checked item with the same label: unchecked, new addedAt, same id, no duplicate', async () => {
    const { storage, useCase } = setup([
      ChecklistItem.create('milk', 'Milk', { checked: true, addedAt: 10 }),
      ChecklistItem.create('eggs', 'Eggs', { addedAt: 20 }),
    ]);

    const result = await useCase.execute('l', ChecklistItem.create('new-id', 'Milk', { addedAt: 99 }));

    expect(result?.items).toHaveLength(2);
    const milk = result?.items.find((i) => i.label === 'Milk');
    expect(milk?.id).toBe('milk');
    expect(milk?.checked).toBe(false);
    expect(milk?.addedAt).toBe(99);
    expect(result?.items.some((i) => i.id === 'new-id')).toBe(false);
    expect(await storage.getById('l')).toEqual(result);
    expect(storage.writes).toBe(1);
  });

  it('refreshes addedAt when re-adding an unchecked existing label and keeps one item', async () => {
    const { storage, useCase } = setup([ChecklistItem.create('milk', 'Milk', { addedAt: 10 })]);

    const result = await useCase.execute('l', ChecklistItem.create('new-id', 'Milk', { addedAt: 50 }));

    expect(result?.items).toHaveLength(1);
    expect(result?.items[0]?.id).toBe('milk');
    expect(result?.items[0]?.checked).toBe(false);
    expect(result?.items[0]?.addedAt).toBe(50);
    expect(storage.writes).toBe(1);
  });

  it('matches existing labels ignoring case and surrounding whitespace', async () => {
    const { useCase } = setup([ChecklistItem.create('milk', 'Milk', { checked: true, addedAt: 10 })]);

    const result = await useCase.execute('l', ChecklistItem.create('new-id', '  mILK  ', { addedAt: 70 }));

    expect(result?.items).toHaveLength(1);
    expect(result?.items[0]?.id).toBe('milk');
    expect(result?.items[0]?.label).toBe('Milk');
    expect(result?.items[0]?.checked).toBe(false);
    expect(result?.items[0]?.addedAt).toBe(70);
  });

  it('appends a new item when no label matches', async () => {
    const { storage, useCase } = setup([ChecklistItem.create('milk', 'Milk', { addedAt: 10 })]);
    const bread = ChecklistItem.create('bread', 'Bread', { addedAt: 30 });

    const result = await useCase.execute('l', bread);

    expect(result?.items.map((i) => i.id)).toEqual(['milk', 'bread']);
    expect(result).toBeInstanceOf(Checklist);
    expect(await storage.getById('l')).toEqual(result);
    expect(storage.updateCalls).toBe(1);
  });

  it('returns null without writing when the checklist is unknown', async () => {
    const { storage, useCase } = setup([]);

    expect(await useCase.execute('missing', ChecklistItem.create('x', 'X'))).toBeNull();
    expect(storage.writes).toBe(0);
  });
});
