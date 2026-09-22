import type { Database } from 'bun:sqlite';

export interface ShareRow {
  share_id: string;
  created_at: number;
  deleted_at: number | null;
  snapshot_seq: number;
}

export interface SnapshotRow {
  seq: number;
  nonce: Uint8Array;
  ciphertext: Uint8Array;
  uploaded_by: string;
  uploaded_at: number;
}

export interface StoredOpRow {
  share_id: string;
  seq: number;
  device_id: string;
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  client_ts: number;
  server_ts: number;
}

export interface AcceptedOp {
  seq: number;
  clientTs: number;
}

export interface OpInput {
  deviceId: string;
  nonce: Uint8Array;
  ciphertext: Uint8Array;
  clientTs: number;
}

export type ShareState =
  | { kind: 'absent' }
  | { kind: 'active'; share: ShareRow }
  | { kind: 'deleted'; share: ShareRow };

export class ShareStore {
  constructor(private readonly db: Database) {}

  getShareState(shareId: string): ShareState {
    const row = this.db
      .query<ShareRow, [string]>('SELECT share_id, created_at, deleted_at, snapshot_seq FROM shares WHERE share_id = ?')
      .get(shareId);
    if (!row) return { kind: 'absent' };
    if (row.deleted_at !== null) return { kind: 'deleted', share: row };
    return { kind: 'active', share: row };
  }

  appendOps(shareId: string, ops: OpInput[]): { accepted: AcceptedOp[]; serverOps: StoredOpRow[] } {
    if (ops.length === 0) return { accepted: [], serverOps: [] };

    const now = Date.now();
    const accepted: AcceptedOp[] = [];
    const serverOps: StoredOpRow[] = [];

    const tx = this.db.transaction(() => {
      this.db.run(
        `INSERT INTO shares (share_id, created_at, snapshot_seq)
         VALUES (?, ?, 0)
         ON CONFLICT(share_id) DO NOTHING`,
        [shareId, now],
      );

      const maxSeqRow = this.db
        .query<{ max_seq: number | null }, [string]>('SELECT MAX(seq) AS max_seq FROM ops WHERE share_id = ?')
        .get(shareId);
      let nextSeq = (maxSeqRow?.max_seq ?? 0) + 1;

      const insert = this.db.prepare(
        `INSERT INTO ops (share_id, seq, device_id, ciphertext, nonce, client_ts, server_ts)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      );

      for (const op of ops) {
        insert.run(shareId, nextSeq, op.deviceId, op.ciphertext, op.nonce, op.clientTs, now);
        accepted.push({ seq: nextSeq, clientTs: op.clientTs });
        serverOps.push({
          share_id: shareId,
          seq: nextSeq,
          device_id: op.deviceId,
          ciphertext: op.ciphertext,
          nonce: op.nonce,
          client_ts: op.clientTs,
          server_ts: now,
        });
        nextSeq += 1;
      }
    });

    tx();
    return { accepted, serverOps };
  }

  getOpsSince(shareId: string, since: number, limit: number): StoredOpRow[] {
    return this.db
      .query<StoredOpRow, [string, number, number]>(
        `SELECT share_id, seq, device_id, ciphertext, nonce, client_ts, server_ts
         FROM ops
         WHERE share_id = ? AND seq > ?
         ORDER BY seq ASC
         LIMIT ?`,
      )
      .all(shareId, since, limit);
  }

  getMaxSeq(shareId: string): number {
    const row = this.db
      .query<{ max_seq: number | null }, [string]>('SELECT MAX(seq) AS max_seq FROM ops WHERE share_id = ?')
      .get(shareId);
    return row?.max_seq ?? 0;
  }

  getSnapshot(shareId: string): SnapshotRow | null {
    const row = this.db
      .query<
        {
          snapshot_seq: number;
          snapshot_ciphertext: Uint8Array | null;
          snapshot_nonce: Uint8Array | null;
          snapshot_uploaded_by: string | null;
          snapshot_uploaded_at: number | null;
        },
        [string]
      >(
        `SELECT snapshot_seq, snapshot_ciphertext, snapshot_nonce, snapshot_uploaded_by, snapshot_uploaded_at
         FROM shares WHERE share_id = ?`,
      )
      .get(shareId);
    if (!row || row.snapshot_ciphertext === null || row.snapshot_nonce === null) return null;
    return {
      seq: row.snapshot_seq,
      nonce: row.snapshot_nonce,
      ciphertext: row.snapshot_ciphertext,
      uploaded_by: row.snapshot_uploaded_by ?? '',
      uploaded_at: row.snapshot_uploaded_at ?? 0,
    };
  }

  putSnapshot(
    shareId: string,
    expectedSeq: number,
    ciphertext: Uint8Array,
    nonce: Uint8Array,
    uploadedBy: string,
  ): { ok: true } | { ok: false; reason: 'conflict'; currentSeq: number } | { ok: false; reason: 'deleted' } {
    const now = Date.now();
    let result: ReturnType<ShareStore['putSnapshot']> = { ok: true };

    const tx = this.db.transaction(() => {
      this.db.run(
        `INSERT INTO shares (share_id, created_at, snapshot_seq)
         VALUES (?, ?, 0)
         ON CONFLICT(share_id) DO NOTHING`,
        [shareId, now],
      );

      const row = this.db
        .query<ShareRow, [string]>('SELECT share_id, created_at, deleted_at, snapshot_seq FROM shares WHERE share_id = ?')
        .get(shareId);

      if (row && row.deleted_at !== null) {
        result = { ok: false, reason: 'deleted' };
        return;
      }

      const maxSeq = this.getMaxSeq(shareId);
      if (expectedSeq !== maxSeq) {
        result = { ok: false, reason: 'conflict', currentSeq: maxSeq };
        return;
      }

      this.db.run(
        `UPDATE shares
         SET snapshot_ciphertext = ?, snapshot_nonce = ?, snapshot_uploaded_by = ?, snapshot_uploaded_at = ?, snapshot_seq = ?
         WHERE share_id = ?`,
        [ciphertext, nonce, uploadedBy, now, expectedSeq, shareId],
      );
    });

    tx();
    return result;
  }

  deleteShare(shareId: string): { found: boolean; alreadyDeleted: boolean } {
    const now = Date.now();
    const row = this.db
      .query<ShareRow, [string]>('SELECT share_id, created_at, deleted_at, snapshot_seq FROM shares WHERE share_id = ?')
      .get(shareId);
    if (!row) {
      this.db.run(
        `INSERT INTO shares (share_id, created_at, deleted_at, snapshot_seq)
         VALUES (?, ?, ?, 0)`,
        [shareId, now, now],
      );
      return { found: false, alreadyDeleted: false };
    }
    if (row.deleted_at !== null) {
      return { found: true, alreadyDeleted: true };
    }
    this.db.run('UPDATE shares SET deleted_at = ? WHERE share_id = ?', [now, shareId]);
    return { found: true, alreadyDeleted: false };
  }
}
