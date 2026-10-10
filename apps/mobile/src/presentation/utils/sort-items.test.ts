import { describe, expect, it } from 'bun:test';
import { ChecklistItem } from '../../domain/checklist-item';
import { sortByLastChecked, sortChecklistItems } from './sort-items';

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

describe('sortByLastChecked', () => {
  it('puts the most recently checked item first', () => {
    const items = [
      ChecklistItem.create('first', 'First', { checked: true, addedAt: 3, checkedAt: 10 }),
      ChecklistItem.create('last', 'Last', { checked: true, addedAt: 1, checkedAt: 30 }),
      ChecklistItem.create('middle', 'Middle', { checked: true, addedAt: 2, checkedAt: 20 }),
    ];

    expect(ids(sortByLastChecked(items))).toEqual(['last', 'middle', 'first']);
  });

  it('keeps items without a check date after dated ones, in their input order', () => {
    const items = [
      ChecklistItem.create('legacy-b', 'Bread', { checked: true, addedAt: 1 }),
      ChecklistItem.create('dated', 'Cheese', { checked: true, addedAt: 2, checkedAt: 5 }),
      ChecklistItem.create('legacy-a', 'Apple', { checked: true, addedAt: 3 }),
    ];

    expect(ids(sortByLastChecked(items))).toEqual(['dated', 'legacy-b', 'legacy-a']);
  });

  it('does not mutate the input array', () => {
    const items = [
      ChecklistItem.create('a', 'Apple', { checked: true, checkedAt: 1 }),
      ChecklistItem.create('b', 'Bread', { checked: true, checkedAt: 2 }),
    ];
    const snapshot = [...items];

    expect(sortByLastChecked(items)).not.toBe(items);
    expect(items).toEqual(snapshot);
  });
});
