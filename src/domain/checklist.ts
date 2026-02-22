import type { ChecklistItem } from './checklist-item';

export class Checklist {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly items: ChecklistItem[],
    public readonly createdAt: number,
  ) {}

  static create(id: string, name: string, options?: { items?: ChecklistItem[]; createdAt?: number }): Checklist {
    return new Checklist(id, name, options?.items ?? [], options?.createdAt ?? Date.now());
  }
}
