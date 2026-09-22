import { describe, it, expect } from 'bun:test';
import { buildApp } from '../src/app';
import { createTestDb, VALID_SHARE_ID, VALID_DEVICE_ID, b64 } from './helpers';

interface ParsedEvent {
  event: string;
  data: string;
}

async function readEvents(stream: ReadableStream<Uint8Array>, count: number, timeoutMs = 1500): Promise<ParsedEvent[]> {
  const events: ParsedEvent[] = [];
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const deadline = Date.now() + timeoutMs;

  while (events.length < count && Date.now() < deadline) {
    const remaining = Math.max(50, deadline - Date.now());
    const result = await Promise.race([
      reader.read(),
      new Promise<{ done: true; value?: undefined }>((resolve) =>
        setTimeout(() => resolve({ done: true }), remaining),
      ),
    ]);
    if (result.done || !result.value) break;
    buffer += decoder.decode(result.value, { stream: true });

    let idx = buffer.indexOf('\n\n');
    while (idx !== -1) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const event: ParsedEvent = { event: 'message', data: '' };
      for (const line of block.split('\n')) {
        if (line.startsWith('event: ')) event.event = line.slice(7);
        else if (line.startsWith('data: ')) event.data += line.slice(6);
      }
      if (event.data || event.event !== 'message') {
        events.push(event);
        if (events.length >= count) break;
      }
      idx = buffer.indexOf('\n\n');
    }
  }

  reader.releaseLock();
  return events;
}

describe('SSE fan-out', () => {
  it('delivers a new op to two subscribers', async () => {
    const { app } = buildApp({
      db: createTestDb(),
      rateLimit: {
        perIp: { capacity: 10000, refillPerSecond: 1000 },
        perShare: { capacity: 10000, refillPerSecond: 1000 },
      },
    });

    const subA = await app.fetch(new Request(`http://test/shares/${VALID_SHARE_ID}/stream`));
    const subB = await app.fetch(new Request(`http://test/shares/${VALID_SHARE_ID}/stream`));
    expect(subA.status).toBe(200);
    expect(subB.status).toBe(200);
    expect(subA.body).not.toBeNull();
    expect(subB.body).not.toBeNull();

    // Wait briefly so both SSE handlers have registered
    await new Promise((r) => setTimeout(r, 50));

    const post = await app.fetch(
      new Request(`http://test/shares/${VALID_SHARE_ID}/ops`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          operations: [
            { deviceId: VALID_DEVICE_ID, nonce: b64('nonce'), ciphertext: b64('cipher'), clientTs: 42 },
          ],
        }),
      }),
    );
    expect(post.status).toBe(200);

    const [eventsA, eventsB] = await Promise.all([
      readEvents(subA.body!, 2),
      readEvents(subB.body!, 2),
    ]);

    const messageA = eventsA.find((e) => e.event === 'message');
    const messageB = eventsB.find((e) => e.event === 'message');
    expect(messageA).toBeDefined();
    expect(messageB).toBeDefined();
    const opA = JSON.parse(messageA!.data);
    expect(opA.seq).toBe(1);
    expect(opA.deviceId).toBe(VALID_DEVICE_ID);
  });

  it('emits shareDeleted on DELETE', async () => {
    const { app } = buildApp({
      db: createTestDb(),
      rateLimit: {
        perIp: { capacity: 10000, refillPerSecond: 1000 },
        perShare: { capacity: 10000, refillPerSecond: 1000 },
      },
    });

    const sub = await app.fetch(new Request(`http://test/shares/${VALID_SHARE_ID}/stream`));
    expect(sub.status).toBe(200);
    await new Promise((r) => setTimeout(r, 50));

    const del = await app.fetch(
      new Request(`http://test/shares/${VALID_SHARE_ID}`, { method: 'DELETE' }),
    );
    expect(del.status).toBe(200);

    const events = await readEvents(sub.body!, 2);
    const deletedEvent = events.find((e) => e.event === 'shareDeleted');
    expect(deletedEvent).toBeDefined();
  });
});
