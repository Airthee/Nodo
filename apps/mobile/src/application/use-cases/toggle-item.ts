import { Checklist } from '../../domain/checklist';
import type { ChecklistStoragePort } from '../ports/storage-port';

export class ToggleItemUseCase {
  public constructor(private readonly storage: ChecklistStoragePort) {}

  async execute(checklistId: string, itemId: string): Promise<Checklist | null> {
    let found = false;
    const updated = await this.storage.update(checklistId, (current) => {
      const toggledItem = current.items.find((item) => item.id === itemId)?.toggle();
      if (!toggledItem) return current;
      found = true;

      const items = [...current.items.filter((item) => item.id !== itemId), toggledItem];
      return Checklist.create(current.id, current.name, { items, createdAt: current.createdAt });
    });
    return found ? updated : null;
  }
}
