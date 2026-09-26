import { Checklist } from '../../domain/checklist';
import type { ChecklistStoragePort } from '../ports/storage-port';

const normalize = (label: string) => label.trim().toLowerCase();

export class UpdateItemUseCase {
  public constructor(private readonly storage: ChecklistStoragePort) {}

  execute(checklistId: string, itemId: string, newLabel: string): Promise<Checklist | null> {
    return this.storage.update(checklistId, (current) => {
      const trimmed = newLabel.trim();
      if (!trimmed) return current;
      if (!current.items.some((item) => item.id === itemId)) return current;

      // Silent no-op on duplicates: the row UI reopens the editor with the stored label.
      const normalized = normalize(trimmed);
      if (current.items.some((item) => item.id !== itemId && normalize(item.label) === normalized)) return current;

      const items = current.items.map((item) => (item.id === itemId ? item.withLabel(trimmed) : item));
      return Checklist.create(current.id, current.name, { items, createdAt: current.createdAt });
    });
  }
}
