import type { Checklist } from '../../domain/checklist';
import type { ChecklistStoragePort } from '../ports/storage-port';

export class ToggleItemUseCase {
  public constructor(private readonly storage: ChecklistStoragePort) {}

  async execute(checklistId: string, itemId: string): Promise<Checklist | null> {
    const checklist = await this.storage.getById(checklistId);
    if (!checklist) return null;

    const itemIndex = checklist.items.findIndex((item) => item.id === itemId);
    if (itemIndex === -1) return null;
    checklist.items[itemIndex] = checklist.items[itemIndex].toggle();

    await this.storage.save(checklist);
    return checklist;
  }
}
