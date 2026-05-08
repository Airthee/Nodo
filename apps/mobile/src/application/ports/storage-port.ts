import type { Checklist } from '../../domain/checklist';

export interface ChecklistStoragePort {
  getAll(): Promise<Checklist[]>;
  getById(id: string): Promise<Checklist | null>;
  save(checklist: Checklist): Promise<void>;
  delete(id: string): Promise<void>;
}
