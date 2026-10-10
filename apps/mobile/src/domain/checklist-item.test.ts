import { describe, expect, it } from 'bun:test';
import { ChecklistItem } from './checklist-item';

describe('ChecklistItem', () => {
  it('records when it gets checked and forgets it when unchecked', () => {
    const item = ChecklistItem.create('milk', 'Milk', { addedAt: 1 });
    expect(item.checkedAt).toBeUndefined();

    const checked = item.toggle(42);
    expect(checked.checked).toBe(true);
    expect(checked.checkedAt).toBe(42);

    const unchecked = checked.toggle(50);
    expect(unchecked.checked).toBe(false);
    expect(unchecked.checkedAt).toBeUndefined();
  });

  it('keeps checkedAt when renamed and drops it when revived', () => {
    const checked = ChecklistItem.create('milk', 'Milk', { checked: true, addedAt: 1, checkedAt: 42 });

    expect(checked.withLabel('Oat milk').checkedAt).toBe(42);
    expect(checked.revive(60).checkedAt).toBeUndefined();
  });

  it('ignores checkedAt on an unchecked item', () => {
    expect(ChecklistItem.create('milk', 'Milk', { checked: false, checkedAt: 42 }).checkedAt).toBeUndefined();
  });
});
