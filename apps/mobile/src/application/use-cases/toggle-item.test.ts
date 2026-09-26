import { describe, expect, it } from 'bun:test';
import { Checklist } from '../../domain/checklist';
import { ChecklistItem } from '../../domain/checklist-item';
import { InMemoryStorage } from '../test-helpers/in-memory-storage';
import { ToggleItemUseCase } from './toggle-item';

const setup = () => {
  const storage = new InMemoryStorage([
    Checklist.create('l', 'Groceries', {
      items: [ChecklistItem.create('milk', 'Milk', { addedAt: 10 }), ChecklistItem.create('eggs', 'Eggs', { addedAt: 20 })],
      createdAt: 1,
    }),
  ]);
  return { storage, useCase: new ToggleItemUseCase(storage) };
};

describe('ToggleItemUseCase', () => {
  it('toggles the item through a single atomic update', async () => {
    const { storage, useCase } = setup();

    const result = await useCase.execute('l', 'milk');

    expect(result?.items.find((i) => i.id === 'milk')?.checked).toBe(true);
    expect(await storage.getById('l')).toEqual(result);
    expect(storage.updateCalls).toBe(1);
    expect(storage.writes).toBe(1);
  });

  it('returns null without writing when the item is unknown', async () => {
    const { storage, useCase } = setup();

    expect(await useCase.execute('l', 'missing')).toBeNull();
    expect(storage.writes).toBe(0);
  });

  it('returns null without writing when the checklist is unknown', async () => {
    const { storage, useCase } = setup();

    expect(await useCase.execute('missing', 'milk')).toBeNull();
    expect(storage.updateCalls).toBe(1);
    expect(storage.writes).toBe(0);
  });
});
