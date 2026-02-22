import type { Checklist } from '../../domain/checklist';
import type { ChecklistStoragePort } from '../ports/storage-port';

export class RemoveItemUseCase {
  public constructor(private readonly storage: ChecklistStoragePort) {}

  async execute(checklistId: string, itemId: string): Promise<Checklist | null> {
    const checklist = await this.storage.getById(checklistId);
    if (!checklist) return null;
    const items = checklist.items.filter((item) => item.id !== itemId);
    const updated = { ...checklist, items };
    await this.storage.save(updated);
    return updated;
  }
}
