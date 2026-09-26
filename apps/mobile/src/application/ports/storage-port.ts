import type { Checklist } from '../../domain/checklist';

export interface ChecklistStoragePort {
  getAll(): Promise<Checklist[]>;
  getById(id: string): Promise<Checklist | null>;
  save(checklist: Checklist): Promise<void>;
  /** Atomically read, transform and persist one checklist. Returns null (without writing) when the id is unknown. */
  update(id: string, mutate: (current: Checklist) => Checklist): Promise<Checklist | null>;
  delete(id: string): Promise<void>;
}
