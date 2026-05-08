import type { VersionMeta } from './version';

export interface ChecklistItemState {
  id: string;
  label: string;
  checked: boolean;
  addedAt: number;
  versions: {
    label: VersionMeta;
    checked: VersionMeta;
  };
  deletedAt?: VersionMeta;
}

export interface ChecklistState {
  id: string;
  name: string;
  createdAt: number;
  nameVersion: VersionMeta;
  items: Record<string, ChecklistItemState>;
  deletedAt?: VersionMeta;
}
