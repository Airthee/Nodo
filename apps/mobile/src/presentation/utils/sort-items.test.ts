import { describe, expect, it } from 'bun:test';
import { ChecklistItem } from '../../domain/checklist-item';
import { sortChecklistItems } from './sort-items';

const ids = (items: ChecklistItem[]) => items.map((item) => item.id);

describe('sortChecklistItems', () => {
  it('sorts alphabetically, ignoring case', () => {
    const items = [
      ChecklistItem.create('c', 'cherry', { addedAt: 1 }),
      ChecklistItem.create('a', 'Apple', { addedAt: 2 }),
      ChecklistItem.create('b', 'banana', { addedAt: 3 }),
    ];

    expect(ids(sortChecklistItems(items, 'alphabetical'))).toEqual(['a', 'b', 'c']);
  });

  it('keeps the input order for labels that compare equal', () => {
    const items = [
      ChecklistItem.create('first', 'milk', { addedAt: 1 }),
      ChecklistItem.create('second', 'Milk', { addedAt: 2 }),
      ChecklistItem.create('third', 'MILK', { addedAt: 3 }),
    ];

    expect(ids(sortChecklistItems(items, 'alphabetical'))).toEqual(['first', 'second', 'third']);
  });

  it('sorts by addedAt, newest first', () => {
    const items = [
      ChecklistItem.create('old', 'Old', { addedAt: 1 }),
      ChecklistItem.create('new', 'New', { addedAt: 3 }),
      ChecklistItem.create('mid', 'Mid', { addedAt: 2 }),
    ];

    expect(ids(sortChecklistItems(items, 'lastAdded'))).toEqual(['new', 'mid', 'old']);
  });

  it('sorts checked items too, without moving them after unchecked ones', () => {
    const items = [
      ChecklistItem.create('b', 'Bread', { checked: true, addedAt: 1 }),
      ChecklistItem.create('c', 'Cheese', { checked: false, addedAt: 2 }),
      ChecklistItem.create('a', 'Apple', { checked: true, addedAt: 3 }),
    ];

    expect(ids(sortChecklistItems(items, 'alphabetical'))).toEqual(['a', 'b', 'c']);
    expect(ids(sortChecklistItems(items, 'lastAdded'))).toEqual(['a', 'c', 'b']);
  });

  it('does not mutate the input array', () => {
    const items = [
      ChecklistItem.create('b', 'Bread', { addedAt: 1 }),
      ChecklistItem.create('a', 'Apple', { addedAt: 2 }),
    ];
    const snapshot = [...items];

    const sorted = sortChecklistItems(items, 'alphabetical');

    expect(sorted).not.toBe(items);
    expect(items).toEqual(snapshot);
  });
});
