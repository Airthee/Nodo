import AsyncStorage from '@react-native-async-storage/async-storage';
import { Checklist } from '../../domain/checklist';
import { ChecklistItem } from '../../domain/checklist-item';
import type { ChecklistStoragePort } from '../../application/ports/storage-port';

const STORAGE_KEY = '@nodo/data';

type RawItem = { id: string; label: string; checked: boolean; addedAt: number };
type RawChecklist = { id: string; name: string; items: RawItem[]; createdAt: number };

function rehydrateChecklist(raw: RawChecklist): Checklist {
  const items = raw.items.map((i) =>
    ChecklistItem.create(i.id, i.label, { checked: i.checked, addedAt: i.addedAt }),
  );
  return Checklist.create(raw.id, raw.name, { items, createdAt: raw.createdAt });
}

export class AsyncStorageAdapter implements ChecklistStoragePort {
  private cache: Checklist[] | null = null;
  private loading: Promise<Checklist[]> | null = null;
  // Tail of the write chain; it never rejects. Reads await it for read-your-writes.
  private queue: Promise<void> = Promise.resolve();

  async getAll(): Promise<Checklist[]> {
    await this.queue;
    return [...(await this.loadAll())];
  }

  async getById(id: string): Promise<Checklist | null> {
    await this.queue;
    const all = await this.loadAll();
    return all.find((c) => c.id === id) ?? null;
  }

  save(checklist: Checklist): Promise<void> {
    return this.enqueue(async () => {
      const all = await this.loadAll();
      const index = all.findIndex((c) => c.id === checklist.id);
      const next = index >= 0 ? all.map((c, i) => (i === index ? checklist : c)) : [...all, checklist];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      this.cache = next;
    });
  }

  update(id: string, mutate: (current: Checklist) => Checklist): Promise<Checklist | null> {
    return this.enqueue(async () => {
      const all = await this.loadAll();
      const index = all.findIndex((c) => c.id === id);
      if (index < 0) return null;
      const current = all[index];
      const updated = mutate(current);
      if (updated === current) return current;
      const next = all.map((c, i) => (i === index ? updated : c));
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      this.cache = next;
      return updated;
    });
  }

  delete(id: string): Promise<void> {
    return this.enqueue(async () => {
      const all = await this.loadAll();
      const next = all.filter((c) => c.id !== id);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      this.cache = next;
    });
  }

  private async loadAll(): Promise<Checklist[]> {
    if (this.cache) return this.cache;
    if (!this.loading) {
      this.loading = this.readFromStorage()
        .then((all) => {
          this.cache = all;
          return all;
        })
        .finally(() => {
          this.loading = null;
        });
    }
    return this.loading;
  }

  private async readFromStorage(): Promise<Checklist[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RawChecklist[];
    return Array.isArray(parsed) ? parsed.map(rehydrateChecklist) : [];
  }

  private enqueue<T>(job: () => Promise<T>): Promise<T> {
    const result = this.queue.then(job);
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}
