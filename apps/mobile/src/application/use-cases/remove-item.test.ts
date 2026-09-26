import { describe, expect, it } from 'bun:test';
import { Checklist } from '../../domain/checklist';
import { ChecklistItem } from '../../domain/checklist-item';
import { InMemoryStorage } from '../test-helpers/in-memory-storage';
import { RemoveItemUseCase } from './remove-item';

const setup = () => {
  const storage = new InMemoryStorage([
    Checklist.create('l', 'Groceries', {
      items: [ChecklistItem.create('milk', 'Milk', { addedAt: 10 }), ChecklistItem.create('eggs', 'Eggs', { addedAt: 20 })],
      createdAt: 1,
    }),
  ]);
  return { storage, useCase: new RemoveItemUseCase(storage) };
};

describe('RemoveItemUseCase', () => {
  it('removes the item through a single atomic update', async () => {
    const { storage, useCase } = setup();

    const result = await useCase.execute('l', 'milk');

    expect(result?.items.map((i) => i.id)).toEqual(['eggs']);
    expect(await storage.getById('l')).toEqual(result);
    expect(storage.updateCalls).toBe(1);
    expect(storage.writes).toBe(1);
  });

  it('returns null without writing when the checklist is unknown', async () => {
    const { storage, useCase } = setup();

    expect(await useCase.execute('missing', 'milk')).toBeNull();
    expect(storage.updateCalls).toBe(1);
    expect(storage.writes).toBe(0);
  });
});
