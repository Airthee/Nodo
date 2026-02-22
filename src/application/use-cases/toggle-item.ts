import { Checklist } from '../../domain/checklist';
import type { ChecklistStoragePort } from '../ports/storage-port';

export class ToggleItemUseCase {
  public constructor(private readonly storage: ChecklistStoragePort) {}

  async execute(checklistId: string, itemId: string): Promise<Checklist | null> {
    const checklist = await this.storage.getById(checklistId);
    if (!checklist) return null;

    const itemIndex = checklist.items.findIndex((item) => item.id === itemId);
    if (itemIndex === -1) return null;

    const items = checklist.items.map((item, i) =>
      i === itemIndex ? item.toggle() : item,
    );
    const updated = Checklist.create(checklist.id, checklist.name, {
      items,
      createdAt: checklist.createdAt,
    });
    await this.storage.save(updated);
    return updated;
  }
}
