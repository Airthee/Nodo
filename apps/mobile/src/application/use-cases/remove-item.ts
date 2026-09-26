import { Checklist } from '../../domain/checklist';
import type { ChecklistStoragePort } from '../ports/storage-port';

export class RemoveItemUseCase {
  public constructor(private readonly storage: ChecklistStoragePort) {}

  execute(checklistId: string, itemId: string): Promise<Checklist | null> {
    return this.storage.update(checklistId, (current) => {
      const items = current.items.filter((item) => item.id !== itemId);
      return Checklist.create(current.id, current.name, { items, createdAt: current.createdAt });
    });
  }
}
