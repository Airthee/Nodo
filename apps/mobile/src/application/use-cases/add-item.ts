import { Checklist } from '../../domain/checklist';
import type { ChecklistItem } from '../../domain/checklist-item';
import type { ChecklistStoragePort } from '../ports/storage-port';

const normalize = (label: string) => label.trim().toLowerCase();

export class AddItemUseCase {
  public constructor(private readonly storage: ChecklistStoragePort) {}

  execute(checklistId: string, item: ChecklistItem): Promise<Checklist | null> {
    return this.storage.update(checklistId, (current) => {
      const normalized = normalize(item.label);
      const existing = current.items.find((i) => normalize(i.label) === normalized);

      // Re-adding an existing label revives it (unchecked, fresh addedAt) and keeps its id.
      const items = existing
        ? current.items.map((i) => (i.id === existing.id ? existing.revive(item.addedAt) : i))
        : [...current.items, item];

      return Checklist.create(current.id, current.name, { items, createdAt: current.createdAt });
    });
  }
}
