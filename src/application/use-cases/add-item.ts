import type { Checklist } from '../../domain/checklist';
import type { ChecklistItem } from '../../domain/checklist-item';
import type { ChecklistStoragePort } from '../ports/storage-port';

export class AddItemUseCase {
  public constructor(private readonly storage: ChecklistStoragePort) {}

  async execute(checklistId: string, item: ChecklistItem): Promise<Checklist | null> {
    const checklist = await this.storage.getById(checklistId);
    if (!checklist) return null;
    const items = [...checklist.items, item];
    const updated = { ...checklist, items };
    await this.storage.save(updated);
    return updated;
  }
}
