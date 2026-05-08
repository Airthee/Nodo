import type { ChecklistItemState, ChecklistState } from './state';
import { compareVersion } from './version';

function mergeItem(a: ChecklistItemState, b: ChecklistItemState): ChecklistItemState {
  const labelWinner = compareVersion(a.versions.label, b.versions.label) >= 0 ? a : b;
  const checkedWinner = compareVersion(a.versions.checked, b.versions.checked) >= 0 ? a : b;
  let deletedAt = a.deletedAt;
  if (b.deletedAt) {
    if (!deletedAt || compareVersion(b.deletedAt, deletedAt) > 0) {
      deletedAt = b.deletedAt;
    }
  }
  return {
    id: a.id,
    addedAt: Math.min(a.addedAt, b.addedAt),
    label: labelWinner.label,
    checked: checkedWinner.checked,
    versions: {
      label: labelWinner.versions.label,
      checked: checkedWinner.versions.checked,
    },
    deletedAt,
  };
}

export function mergeStates(a: ChecklistState, b: ChecklistState): ChecklistState {
  if (a.id !== b.id) {
    throw new Error(`Cannot merge checklists with different ids: ${a.id} vs ${b.id}`);
  }

  const nameWinner = compareVersion(a.nameVersion, b.nameVersion) >= 0 ? a : b;

  let deletedAt = a.deletedAt;
  if (b.deletedAt) {
    if (!deletedAt || compareVersion(b.deletedAt, deletedAt) > 0) {
      deletedAt = b.deletedAt;
    }
  }

  const items: Record<string, ChecklistItemState> = {};
  const ids = new Set([...Object.keys(a.items), ...Object.keys(b.items)]);
  for (const id of ids) {
    const ai = a.items[id];
    const bi = b.items[id];
    if (ai && bi) items[id] = mergeItem(ai, bi);
    else items[id] = (ai ?? bi)!;
  }

  return {
    id: a.id,
    createdAt: Math.min(a.createdAt, b.createdAt),
    name: nameWinner.name,
    nameVersion: nameWinner.nameVersion,
    items,
    deletedAt,
  };
}
