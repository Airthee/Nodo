import type { VersionMeta } from './version';

export type Operation =
  | {
      type: 'list-rename';
      version: VersionMeta;
      name: string;
    }
  | {
      type: 'list-delete';
      version: VersionMeta;
    }
  | {
      type: 'item-add';
      itemId: string;
      label: string;
      addedAt: number;
      labelVersion: VersionMeta;
      checkedVersion: VersionMeta;
    }
  | {
      type: 'item-relabel';
      itemId: string;
      label: string;
      version: VersionMeta;
    }
  | {
      type: 'item-toggle';
      itemId: string;
      checked: boolean;
      version: VersionMeta;
    }
  | {
      type: 'item-delete';
      itemId: string;
      version: VersionMeta;
    };
