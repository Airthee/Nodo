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
  async getAll(): Promise<Checklist[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RawChecklist[];
    return Array.isArray(parsed) ? parsed.map(rehydrateChecklist) : [];
  }

  async getById(id: string): Promise<Checklist | null> {
    const all = await this.getAll();
    return all.find((c) => c.id === id) ?? null;
  }

  async save(checklist: Checklist): Promise<void> {
    const all = await this.getAll();
    const index = all.findIndex((c) => c.id === checklist.id);
    const next = index >= 0 ? all.map((c, i) => (i === index ? checklist : c)) : [...all, checklist];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  async delete(id: string): Promise<void> {
    const all = await this.getAll();
    const next = all.filter((c) => c.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
}
