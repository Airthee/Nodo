import { Checklist } from '@domain/checklist';
import type { ChecklistStoragePort } from '../ports/storage-port';

export class ListChecklistsUseCase {
  public constructor(private readonly storage: ChecklistStoragePort) {}

  async execute(): Promise<Checklist[]> {
    return this.storage.getAll();
  }
}
