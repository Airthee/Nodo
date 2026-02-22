import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Checklist } from '../../domain/checklist';
import type { ChecklistStoragePort } from '../../application/ports/storage-port';

const STORAGE_KEY = '@nodo/data';

export class AsyncStorageAdapter implements ChecklistStoragePort {
  async getAll(): Promise<Checklist[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Checklist[];
    return Array.isArray(parsed) ? parsed : [];
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
