import { Checklist } from '@domain/checklist';
import type { ChecklistStoragePort } from '../ports/storage-port';

export class GetChecklistUseCase {
  public constructor(private readonly storage: ChecklistStoragePort) {}

  async execute(id: string): Promise<Checklist | null> {
    return this.storage.getById(id);
  }
}
