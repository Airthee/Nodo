import type { ChecklistItem } from '../../domain/checklist-item';

export type ItemSortOrder = 'alphabetical' | 'lastAdded';

export function sortChecklistItems(
  items: ChecklistItem[],
  order: ItemSortOrder
): ChecklistItem[] {
  const copy = [...items];
  if (order === 'alphabetical') {
    copy.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
  } else {
    copy.sort((a, b) => b.addedAt - a.addedAt);
  }
  return copy;
}

export function sortByLastChecked(items: ChecklistItem[]): ChecklistItem[] {
  return [...items].sort((a, b) => (b.checkedAt ?? 0) - (a.checkedAt ?? 0));
}
