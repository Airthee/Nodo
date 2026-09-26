import { describe, expect, it } from 'bun:test';
import { Checklist } from '../../domain/checklist';
import { ChecklistItem } from '../../domain/checklist-item';
import { InMemoryStorage } from '../test-helpers/in-memory-storage';
import { UpdateItemUseCase } from './update-item';

const setup = () => {
  const list = Checklist.create('l', 'Groceries', {
    items: [
      ChecklistItem.create('milk', 'Milk', { addedAt: 10 }),
      ChecklistItem.create('eggs', 'Eggs', { checked: true, addedAt: 20 }),
    ],
    createdAt: 1,
  });
  const storage = new InMemoryStorage([list]);
  return { list, storage, useCase: new UpdateItemUseCase(storage) };
};

describe('UpdateItemUseCase', () => {
  it('renames the target item with a trimmed label and keeps its other fields', async () => {
    const { storage, useCase } = setup();

    const result = await useCase.execute('l', 'eggs', '  Free-range eggs  ');

    const eggs = result?.items.find((i) => i.id === 'eggs');
    expect(eggs?.label).toBe('Free-range eggs');
    expect(eggs?.checked).toBe(true);
    expect(eggs?.addedAt).toBe(20);
    expect(result?.items.map((i) => i.id)).toEqual(['milk', 'eggs']);
    expect(result).toBeInstanceOf(Checklist);
    expect(await storage.getById('l')).toEqual(result);
    expect(storage.writes).toBe(1);
  });

  it('allows changing only the case of the item own label', async () => {
    const { useCase } = setup();

    const result = await useCase.execute('l', 'milk', 'MILK');

    expect(result?.items.find((i) => i.id === 'milk')?.label).toBe('MILK');
  });

  it('returns the checklist unchanged without writing when the label is blank', async () => {
    const { list, storage, useCase } = setup();

    expect(await useCase.execute('l', 'milk', '   ')).toBe(list);
    expect(storage.writes).toBe(0);
  });

  it('returns the checklist unchanged without writing when another item has the same label', async () => {
    const { list, storage, useCase } = setup();

    expect(await useCase.execute('l', 'milk', '  eGGs ')).toBe(list);
    expect(storage.writes).toBe(0);
  });

  it('returns the checklist unchanged without writing when the item is unknown', async () => {
    const { list, storage, useCase } = setup();

    expect(await useCase.execute('l', 'missing', 'Bread')).toBe(list);
    expect(storage.writes).toBe(0);
  });

  it('returns null when the checklist is unknown', async () => {
    const { storage, useCase } = setup();

    expect(await useCase.execute('missing', 'milk', 'Bread')).toBeNull();
    expect(storage.writes).toBe(0);
    expect(storage.updateCalls).toBe(1);
  });
});
