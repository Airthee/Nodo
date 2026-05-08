import type { ChecklistStoragePort } from '../ports/storage-port';

export class DeleteChecklistUseCase {
  public constructor(private readonly storage: ChecklistStoragePort) {}

  async execute(id: string): Promise<void> {
    await this.storage.delete(id);
  }
}
