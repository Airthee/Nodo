import type { ChecklistItem } from '../../domain/checklist-item';

export type ItemSortOrder = 'alphabetical' | 'lastAdded';

export function sortChecklistItems(
  items: ChecklistItem[],
  order: ItemSortOrder
): ChecklistItem[] {
  const uncheckedItems = items.filter((item) => !item.checked);
  const checkedItems = items.filter((item) => item.checked);

  const copy = [...uncheckedItems];
  if (order === 'alphabetical') {
    copy.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
  } else {
    copy.sort((a, b) => b.addedAt - a.addedAt);
  }
  return [...copy, ...checkedItems];
}
