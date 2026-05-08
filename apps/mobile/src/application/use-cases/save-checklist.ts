import type { Checklist } from '../../domain/checklist';
import type { ChecklistStoragePort } from '../ports/storage-port';

export class SaveChecklistUseCase {
  public constructor(private readonly storage: ChecklistStoragePort) {}

  async execute(checklist: Checklist): Promise<void> {
    await this.storage.save(checklist);
  }
}
