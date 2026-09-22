import type { StoredOperationDto } from '@nodo/shared';

export type SseEvent =
  | { type: 'op'; op: StoredOperationDto }
  | { type: 'shareDeleted' };

export interface Subscriber {
  id: string;
  send: (event: SseEvent) => Promise<void>;
  close: () => void;
}

export class SseHub {
  private subscribers = new Map<string, Set<Subscriber>>();

  subscribe(shareId: string, sub: Subscriber): () => void {
    let set = this.subscribers.get(shareId);
    if (!set) {
      set = new Set();
      this.subscribers.set(shareId, set);
    }
    set.add(sub);
    return () => {
      const current = this.subscribers.get(shareId);
      if (!current) return;
      current.delete(sub);
      if (current.size === 0) this.subscribers.delete(shareId);
    };
  }

  async publish(shareId: string, event: SseEvent): Promise<void> {
    const set = this.subscribers.get(shareId);
    if (!set || set.size === 0) return;

    await Promise.all(
      Array.from(set).map(async (sub) => {
        try {
          await sub.send(event);
        } catch {
          set.delete(sub);
          try {
            sub.close();
          } catch {
            // ignore
          }
        }
      }),
    );
  }

  closeAll(shareId: string): void {
    const set = this.subscribers.get(shareId);
    if (!set) return;
    for (const sub of set) {
      try {
        sub.close();
      } catch {
        // ignore
      }
    }
    this.subscribers.delete(shareId);
  }

  subscriberCount(shareId: string): number {
    return this.subscribers.get(shareId)?.size ?? 0;
  }
}
