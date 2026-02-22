import type { Checklist } from '../../domain/checklist';
import type { ChecklistStoragePort } from '../ports/storage-port';

export class UpdateItemUseCase {
  public constructor(private readonly storage: ChecklistStoragePort) {}

  async execute(checklistId: string, itemId: string, newLabel: string): Promise<Checklist | null> {
    const checklist = await this.storage.getById(checklistId);
    if (!checklist) return null;
    const trimmed = newLabel.trim();
    const items = checklist.items.map((item) =>
      item.id === itemId ? { ...item, label: trimmed } : item,
    );
    const updated = { ...checklist, items };
    await this.storage.save(updated);
    return updated;
  }
}
