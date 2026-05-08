import { generateId } from '@application/utils/id';
import { Checklist } from '../../domain/checklist';
import type { ChecklistStoragePort } from '../ports/storage-port';

export class CreateChecklistUseCase {
  public constructor(private readonly storage: ChecklistStoragePort) {}

  async execute(name: string): Promise<Checklist> {
    const checklist = Checklist.create(generateId(), name);
    await this.storage.save(checklist);
    return checklist;
  }
}
