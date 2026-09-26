import type { Checklist } from '../../domain/checklist';
import type { ChecklistStoragePort } from '../ports/storage-port';

/** In-memory ChecklistStoragePort fake for use-case tests; `writes` counts persisted changes. */
export class InMemoryStorage implements ChecklistStoragePort {
  public writes = 0;
  public updateCalls = 0;
  private checklists: Checklist[];

  public constructor(initial: Checklist[] = []) {
    this.checklists = [...initial];
  }

  async getAll(): Promise<Checklist[]> {
    return [...this.checklists];
  }

  async getById(id: string): Promise<Checklist | null> {
    return this.checklists.find((c) => c.id === id) ?? null;
  }

  async save(checklist: Checklist): Promise<void> {
    const index = this.checklists.findIndex((c) => c.id === checklist.id);
    this.checklists =
      index >= 0 ? this.checklists.map((c, i) => (i === index ? checklist : c)) : [...this.checklists, checklist];
    this.writes += 1;
  }

  async update(id: string, mutate: (current: Checklist) => Checklist): Promise<Checklist | null> {
    this.updateCalls += 1;
    const index = this.checklists.findIndex((c) => c.id === id);
    if (index < 0) return null;
    const current = this.checklists[index];
    const updated = mutate(current);
    if (updated === current) return current;
    this.checklists = this.checklists.map((c, i) => (i === index ? updated : c));
    this.writes += 1;
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.checklists = this.checklists.filter((c) => c.id !== id);
    this.writes += 1;
  }
}
