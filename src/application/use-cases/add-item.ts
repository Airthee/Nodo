import type { Checklist } from '../../domain/checklist';
import type { ChecklistItem } from '../../domain/checklist-item';
import type { ChecklistStoragePort } from '../ports/storage-port';

export class AddItemUseCase {
  public constructor(private readonly storage: ChecklistStoragePort) {}

  async execute(checklistId: string, item: ChecklistItem): Promise<Checklist | null> {
    const checklist = await this.storage.getById(checklistId);
    if (!checklist) return null;

    const normalized = item.label.toLowerCase();
    const existing = checklist.items.find((i) => i.label.toLowerCase() === normalized);

    if (existing) {
      if (!existing.checked) return checklist;
      const toggled = existing.toggle();
      const items = checklist.items.map((i) => (i.id === existing.id ? toggled : i));
      const updated = { ...checklist, items };
      await this.storage.save(updated);
      return updated;
    }

    const items = [...checklist.items, item];
    const updated = { ...checklist, items };
    await this.storage.save(updated);
    return updated;
  }
}
