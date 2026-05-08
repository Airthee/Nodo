import type { ChecklistItemState, ChecklistState } from './state';
import type { Operation } from './operation';
import { compareVersion, type VersionMeta } from './version';

const ZERO_VERSION: VersionMeta = { ts: 0, deviceId: '' };

const isNewer = (incoming: VersionMeta, current: VersionMeta): boolean =>
  compareVersion(incoming, current) > 0;

const withMinAddedAt = (item: ChecklistItemState, candidate: number): ChecklistItemState =>
  candidate < item.addedAt ? { ...item, addedAt: candidate } : item;

const maxVersion = (a: VersionMeta, b: VersionMeta): VersionMeta =>
  compareVersion(a, b) >= 0 ? a : b;

export function isItemAlive(item: ChecklistItemState): boolean {
  if (!item.deletedAt) return true;
  const latestEdit = maxVersion(item.versions.label, item.versions.checked);
  return compareVersion(latestEdit, item.deletedAt) > 0;
}

export function isListAlive(state: ChecklistState): boolean {
  if (!state.deletedAt) return true;
  return compareVersion(state.nameVersion, state.deletedAt) > 0;
}

export function applyOperation(state: ChecklistState, op: Operation): ChecklistState {
  switch (op.type) {
    case 'list-rename': {
      if (!isNewer(op.version, state.nameVersion)) return state;
      return { ...state, name: op.name, nameVersion: op.version };
    }

    case 'list-delete': {
      if (state.deletedAt && !isNewer(op.version, state.deletedAt)) return state;
      return { ...state, deletedAt: op.version };
    }

    case 'item-add': {
      const existing = state.items[op.itemId];
      if (existing) {
        let next = existing;
        if (isNewer(op.labelVersion, existing.versions.label)) {
          next = {
            ...next,
            label: op.label,
            versions: { ...next.versions, label: op.labelVersion },
          };
        }
        if (isNewer(op.checkedVersion, existing.versions.checked)) {
          next = {
            ...next,
            checked: false,
            versions: { ...next.versions, checked: op.checkedVersion },
          };
        }
        next = withMinAddedAt(next, op.addedAt);
        if (next === existing) return state;
        return { ...state, items: { ...state.items, [op.itemId]: next } };
      }
      const item: ChecklistItemState = {
        id: op.itemId,
        label: op.label,
        checked: false,
        addedAt: op.addedAt,
        versions: {
          label: op.labelVersion,
          checked: op.checkedVersion,
        },
      };
      return { ...state, items: { ...state.items, [op.itemId]: item } };
    }

    case 'item-relabel': {
      const existing = state.items[op.itemId];
      if (!existing) {
        const item: ChecklistItemState = {
          id: op.itemId,
          label: op.label,
          checked: false,
          addedAt: op.version.ts,
          versions: {
            label: op.version,
            checked: ZERO_VERSION,
          },
        };
        return { ...state, items: { ...state.items, [op.itemId]: item } };
      }
      let next = existing;
      if (isNewer(op.version, existing.versions.label)) {
        next = {
          ...next,
          label: op.label,
          versions: { ...next.versions, label: op.version },
        };
      }
      next = withMinAddedAt(next, op.version.ts);
      if (next === existing) return state;
      return { ...state, items: { ...state.items, [op.itemId]: next } };
    }

    case 'item-toggle': {
      const existing = state.items[op.itemId];
      if (!existing) {
        const item: ChecklistItemState = {
          id: op.itemId,
          label: '',
          checked: op.checked,
          addedAt: op.version.ts,
          versions: {
            label: ZERO_VERSION,
            checked: op.version,
          },
        };
        return { ...state, items: { ...state.items, [op.itemId]: item } };
      }
      let next = existing;
      if (isNewer(op.version, existing.versions.checked)) {
        next = {
          ...next,
          checked: op.checked,
          versions: { ...next.versions, checked: op.version },
        };
      }
      next = withMinAddedAt(next, op.version.ts);
      if (next === existing) return state;
      return { ...state, items: { ...state.items, [op.itemId]: next } };
    }

    case 'item-delete': {
      const existing = state.items[op.itemId];
      if (!existing) {
        const item: ChecklistItemState = {
          id: op.itemId,
          label: '',
          checked: false,
          addedAt: op.version.ts,
          versions: {
            label: ZERO_VERSION,
            checked: ZERO_VERSION,
          },
          deletedAt: op.version,
        };
        return { ...state, items: { ...state.items, [op.itemId]: item } };
      }
      let next = existing;
      if (!existing.deletedAt || isNewer(op.version, existing.deletedAt)) {
        next = { ...next, deletedAt: op.version };
      }
      next = withMinAddedAt(next, op.version.ts);
      if (next === existing) return state;
      return { ...state, items: { ...state.items, [op.itemId]: next } };
    }
  }
}

export function applyOperations(state: ChecklistState, ops: readonly Operation[]): ChecklistState {
  let next = state;
  for (const op of ops) {
    next = applyOperation(next, op);
  }
  return next;
}
