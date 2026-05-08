## Context

`nodo` is currently a single-repo Expo / React Native app with hexagonal architecture (`src/{domain,application,infrastructure,presentation}`) and a single `AsyncStorage` adapter behind `ChecklistStoragePort`. There is no networking, no backend, and no concept of identity. Users want to share a list across devices (themselves or with someone else) and see edits in real time, without giving up offline-first behavior or leaking data to a server operator. We control the future server, so we can keep it small.

The constraints that shape this design:

- **Privacy**: the server must not be able to read titles or items. End-to-end encryption is required.
- **Offline-first**: a local edit must never block on the network. Sync is opportunistic.
- **Real-time when online**: a household shopping-list use case demands sub-second cross-device propagation when both devices are connected.
- **Bounded server scope**: the server is a relay/cache, not a source of truth and not a smart merger.
- **Small team / small repo**: tooling overhead must stay low — Bun workspaces over Turborepo / Nx.
- **Existing architecture**: hexagonal layering must be preserved on the mobile side; sync is a new infrastructure concern hidden behind ports.

## Goals / Non-Goals

**Goals:**
- Users can share any local checklist by generating a 24-word BIP39 phrase and joining from a second device by entering that phrase.
- All checklist content is encrypted on the device before leaving it; the server only sees ciphertext, share IDs, and device IDs.
- Concurrent edits from multiple devices merge without data loss using a per-item Last-Writer-Wins CRDT.
- Local edits succeed offline and are reconciled with the server when connectivity returns.
- Online devices receive remote edits in real time via Server-Sent Events; offline devices catch up on reconnect.
- Either device can stop sharing for itself only, or for everyone.
- The repository is reorganized as a Bun-workspaces monorepo with `apps/mobile`, `apps/server`, `packages/shared`, without breaking EAS builds, ESLint, Metro, TypeScript path aliases, or the release pipeline.

**Non-Goals:**
- User accounts, login, or any global identity. Identity exists only at the per-share scope.
- Sharing arbitrary content beyond checklists.
- Multi-list bulk sync, folders, or list-of-lists sharing.
- Recovery of a lost phrase. Loss of the phrase = loss of access.
- Push notifications when the app is backgrounded. Real-time only applies to foreground devices in this iteration.
- Three-way merge UI for textual conflicts. Field-level LWW is the documented behavior.
- Permission tiers (read-only, admin, etc.). All members of a share are equal.
- Self-hosting / multi-tenant deployment story for the server. Single deployment owned by us.

## Decisions

### Decision 1: Bun workspaces over Turborepo or polyrepo

**Choice**: Convert to a Bun workspaces monorepo. Layout:

```
apps/
  mobile/          # the existing Expo app, moved as-is
  server/          # new Hono + Bun + SQLite sync server
packages/
  shared/          # DTOs, CRDT logic, crypto primitives, BIP39 wordlist
package.json       # workspace root
tsconfig.base.json # shared TS config
```

Mobile imports from `@nodo/shared`; server imports from `@nodo/shared`. Internal package built as ESM with `bun build` (or consumed directly in dev via Bun's transpiler).

**Why**:
- Native to the existing toolchain — `bun.lock` already exists, no new install runner.
- Zero-config workspace dependency resolution (`"@nodo/shared": "workspace:*"`).
- Polyrepo would force duplicating CRDT and crypto code on both sides, where divergence is the most dangerous bug we can ship.
- Turborepo / Nx add task pipelines and caches we don't need at this size.

**Trade-off**: Metro must be told about the workspace layout. Standard fix: `metro.config.js` uses `watchFolders` to include the repo root and `nodeModulesPaths` to resolve hoisted deps. Documented and well-trodden.

### Decision 2: End-to-end encryption keyed by the BIP39 phrase

**Choice**: The 24-word phrase is the user-facing credential **and** the seed of the encryption key.

- Generate phrase: `@scure/bip39` with the English wordlist; 256 bits of entropy (24 words).
- Derive keys: `mnemonicToSeed(phrase)` → HKDF-SHA256 with two info labels:
  - `"nodo:share-id:v1"` → 16-byte `shareId` (server-visible identifier; deterministic from the phrase, no DB lookup needed to find a share).
  - `"nodo:enc-key:v1"` → 32-byte symmetric key for AES-256-GCM (or XChaCha20-Poly1305, see Decision 5).
- Each operation and each snapshot is encrypted with this key before being sent. The server stores ciphertext + a per-message random nonce.
- Devices authenticate to the server by holding a `deviceId` (random UUID generated locally on join) and proving knowledge of the share by presenting `shareId`. The server has no auth beyond rate-limiting per IP and per `shareId`. (See Decision 4 for why this is acceptable.)

**Why**:
- The phrase is already a high-entropy secret; reusing it as a key seed avoids a separate enrollment step.
- HKDF with explicit info labels lets us rotate purposes (e.g., a future signing key) without touching key material.
- Brave Sync, Standard Notes, and others use this same pattern and it has held up to scrutiny.

**Trade-off**: anyone with the phrase has full read/write. There is no per-device revocation that the server can enforce — "stop sharing for everyone" works by tombstoning the share server-side and rotating to a new phrase if users want to keep collaborating. This matches the user's stated mental model.

### Decision 3: Per-item Last-Writer-Wins CRDT, item-level tombstones

**Choice**: Each `ChecklistItem` carries:

```ts
{
  id: string;             // stable UUID, generated at creation
  label: string;
  checked: boolean;
  addedAt: number;
  // CRDT metadata:
  versions: {
    label:   { ts: number; deviceId: string };
    checked: { ts: number; deviceId: string };
  };
  deletedAt?: { ts: number; deviceId: string }; // tombstone; null/absent = live
}
```

The `Checklist` itself carries `name` with the same per-field version structure plus a `deletedAt` for the whole list.

Merge rule per field: pick the value with the larger `ts`. Tie-breaker: lexicographic compare of `deviceId`. Operation log entries reference `(itemId, field, ts, deviceId)` so they can be replayed in any order and converge.

**Why**:
- LWW per field is the simplest CRDT that handles every conflict in this app correctly:
  - Two devices toggle the same item → last toggle wins, deterministic.
  - Two devices rename the same item → last rename wins.
  - One device deletes, another renames → tombstone wins if newer; otherwise rename "wakes" the item.
  - Add is conflict-free by construction (new UUID).
- Avoids RGA / Yjs / Automerge complexity, which we don't need for flat lists of short strings.
- Server stays dumb: it just stores ops and forwards them.

**Trade-off**:
- Clock skew can give a "wrong" winner if a device has a badly skewed clock. Mitigation: `ts = max(localNow, lastSeenTsForShare + 1)` (Lamport-ish bump) so a device can never produce a timestamp lower than ones it has already observed.
- Tombstones accumulate. Mitigation: server compacts the op log into a fresh encrypted snapshot every N ops or every X minutes; clients fetch the snapshot on first sync of a session.

### Decision 4: HTTP REST + Server-Sent Events, no WebSocket

**Choice**: Three endpoints behind Hono, all scoped by `:shareId`:

```
POST   /shares/:shareId/ops           # push: body = encrypted op batch
GET    /shares/:shareId/ops?since=... # pull: ops the device hasn't seen
GET    /shares/:shareId/snapshot      # latest compacted ciphertext snapshot
GET    /shares/:shareId/stream        # SSE: server pushes new ops in real time
DELETE /shares/:shareId               # "stop for everyone": tombstone the share
```

Client opens an EventSource on `/stream` whenever it has a foreground share and the OS reports network connectivity. The server holds an in-memory `Map<shareId, Set<Response>>` of subscribers and writes to all of them on every accepted POST.

**Why**:
- SSE is the simplest mechanism that satisfies the "instant cross-device" requirement: server-to-client is the only direction that needs streaming; the client already pushes via plain POST.
- No protocol negotiation, no ping/pong loop, no framing — just `text/event-stream`. Reconnection is built into `EventSource` on web; on React Native we use `react-native-sse` which exposes the same API.
- WebSockets would require a server library (or a hand-rolled upgrade), bidirectional state machines, and explicit heartbeat. Overkill given the asymmetry.
- Polling stays as a fallback (every 30 s in foreground) for environments where SSE is blocked by a captive portal or proxy. SSE is the optimization on top.

**Trade-off**: SSE on RN historically had quirks; `react-native-sse` is mature but adds a dependency we'd otherwise avoid. Acceptable.

### Decision 5: AES-256-GCM via `react-native-quick-crypto` (with a fallback)

**Choice**: Symmetric crypto = AES-256-GCM with a 12-byte random nonce per message. On mobile we use `react-native-quick-crypto` which exposes the Node `crypto` API and is JSI-backed (fast, native). On the server we use Bun's built-in `crypto.subtle`. In `packages/shared`, the crypto wrapper is an interface; both sides inject their adapter.

**Why over XChaCha20-Poly1305**: Bun and Node `webcrypto` both ship AES-GCM out of the box; `react-native-quick-crypto` does too. XChaCha is arguably nicer (longer nonce, no counter risk) but would require `@noble/ciphers` and a polyfill on the server. Not worth the deviation.

**Why over `expo-crypto` only**: `expo-crypto` is hash/random-only; it doesn't do symmetric encryption.

**Trade-off**: `react-native-quick-crypto` requires a config-plugin and a dev client (no Expo Go). The project already uses bare-workflow features (custom Android folder is present) so this is acceptable. If it becomes a blocker, fall back to `@noble/ciphers/aes` (pure JS, slower but workable).

### Decision 6: Outbox pattern for offline writes

**Choice**: Every state-changing local operation is appended to an `Outbox` table in `AsyncStorage` *before* it is sent. The flusher repeatedly drains the outbox: encrypt op → POST → on 2xx, drop from outbox; on network error, leave in place and retry on next connectivity event or app foreground.

**Why**: classic offline-first pattern. Keeps the UI snappy (writes never await network), guarantees at-least-once delivery, and CRDT idempotence makes duplicates harmless. The flusher is gated on a `NetInfo` listener (Expo provides this) and on `AppState === 'active'`.

**Trade-off**: outbox can grow unbounded if a device is offline for a very long time. Mitigation: cap at e.g. 10k entries; warn the user when approaching the cap (deferred — not in v1).

### Decision 7: Stop-sharing semantics

- **"Only this device"** ("only for me"):
  1. Locally clear `shareId`, version metadata, outbox entries for this list.
  2. Best-effort `DELETE /shares/:shareId/devices/:deviceId` (cosmetic; the server can also forget the device after N days of inactivity).
  3. The list remains on this device with its current content but becomes a plain local list.
  4. Other devices keep syncing among themselves; from their point of view this device just stopped pushing.
- **"For everyone"**:
  1. Locally do the "only this device" steps.
  2. `DELETE /shares/:shareId` on the server. The server marks the share `deletedAt = now` and stops accepting new ops; SSE streams emit a final `{type:"shareDeleted"}` event and close.
  3. Every other connected device receives the event, treats it as a normal "only this device" detach, and surfaces a non-blocking notice ("Sharing was stopped").
  4. Devices that come back online after the deletion get a `410 Gone` and run the same detach.

**Why**: gives the user the two outcomes they specified, with a clear local-first action on the originating device and graceful catch-up on the others. No retroactive content erasure — once a phrase is shared, content already pulled cannot be un-revealed. This is documented to the user.

### Decision 8: SQLite schema (server side)

```sql
CREATE TABLE shares (
  share_id TEXT PRIMARY KEY,           -- hex(16)
  created_at INTEGER NOT NULL,
  deleted_at INTEGER,                  -- null = active
  snapshot_ciphertext BLOB,            -- latest compacted snapshot
  snapshot_nonce BLOB,
  snapshot_seq INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE ops (
  share_id TEXT NOT NULL,
  seq INTEGER NOT NULL,                -- monotonic per share, server-assigned
  device_id TEXT NOT NULL,
  ciphertext BLOB NOT NULL,
  nonce BLOB NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (share_id, seq),
  FOREIGN KEY (share_id) REFERENCES shares(share_id)
);

CREATE INDEX ops_by_share_seq ON ops(share_id, seq);
```

`seq` is the cursor clients use for `?since=`. Compaction = take ops up to `seq=N`, encrypt nothing extra (snapshot is computed on the *clients*, encrypted, and uploaded by whichever client wins a lightweight lease — see open question 1). Server never decrypts.

### Decision 9: Mobile UX surface

- New screen: `ShareChecklistScreen` (`apps/mobile/src/presentation/screens/ShareChecklistScreen.tsx`) reachable from a share icon in `ChecklistDetailScreen`'s header. States:
  - **Not shared** → primary CTA "Start sharing" generates a phrase, transitions to **Sharing**.
  - **Sharing** → shows the phrase, a QR code of the phrase, sync status (last sync, online indicator), list of known device IDs (truncated), two destructive buttons "Stop on this device" and "Stop for everyone".
- New entry on `ChecklistListScreen`: "Join a shared list" → modal with a phrase input (24 inputs with autocomplete from BIP39 wordlist) and a "Scan QR" affordance.
- `ChecklistContext` gains `shareService` exposing `startSharing`, `joinShare`, `stopSharing(scope)`, plus a subscription to a `syncStatus` observable used by the UI to render online indicators.

## Risks / Trade-offs

- **[Phrase loss is unrecoverable]** → Communicate clearly in the UI ("Save this phrase. We can't recover it."). Suggest screenshot / password manager. Future: optional encrypted backup to iCloud/Google Drive (out of scope).
- **[Server compromise still leaks metadata]** — even though content is encrypted, the server learns which `shareId`s exist, when they sync, and from which IPs. → Document this honestly. Future hardening (Tor-friendly endpoint, padding) is out of scope.
- **[Clock skew on a device produces "stuck" wins]** — a device with a clock 2 hours ahead would beat every other edit. → Lamport-style bump when applying remote ops (`local.ts = max(local.ts, remote.ts + 1)`) limits damage. Document but accept.
- **[`react-native-quick-crypto` requires a dev client]** — Expo Go users can't run sync builds. → Already off Expo Go in practice (bare android folder); CI/EAS already build dev clients. Update docs.
- **[Monorepo migration is broad]** — every dev tool config moves. → Migration is the first task block; lock CI green before any sync code lands. Keep the migration in its own commit so it can be reverted independently.
- **[SSE behind corporate proxies may be buffered/closed]** — some proxies break `text/event-stream`. → Polling fallback every 30 s in foreground covers this. Document limitation.
- **[Server is a single point of failure]** — one VM/host. → Acceptable for v1. Bun + SQLite + Litestream-style backup is the obvious operational evolution; out of scope for the change itself.
- **[CRDT correctness regressions are silent]** — a bug merges wrong without throwing. → Heavy unit-test coverage of the merge function in `packages/shared` is mandatory before any UI work. Property-based tests with fast-check are recommended.

## Migration Plan

Sequenced so each step is independently revertable:

1. **Workspace migration (no behavior change)**:
   - Create `apps/mobile/`, move every project file except `openspec/`, `.git/`, `node_modules/`, `bun.lock`, root `CLAUDE.md`, root `GUIDELINE.md`, `.claude/`.
   - Promote `package.json` to a workspace root with `"workspaces": ["apps/*", "packages/*"]` and minimal scripts.
   - Add `apps/mobile/package.json` (former root content), update path aliases in `apps/mobile/tsconfig.json`.
   - Update `metro.config.js` for monorepo (`watchFolders`, `disableHierarchicalLookup: false`, `nodeModulesPaths`).
   - Ensure `bun install`, `bun --cwd apps/mobile start`, ESLint, and TypeScript still pass.
   - Re-point `release-it`, EAS (`eas.json`), and Android build paths.
2. **`packages/shared` skeleton**: domain-agnostic CRDT, crypto interface, DTO Zod schemas. Pure TS, fully unit-tested.
3. **Server skeleton**: `apps/server` with Hono, SQLite schema, three routes returning placeholder responses. Add `bun --cwd apps/server dev`. Deploy target deferred.
4. **On-device data model migration**: extend `Checklist` and `ChecklistItem` with version metadata + tombstone, write a one-shot migration in `AsyncStorageAdapter` keyed off the existing `@nodo/data` blob. Backfill `versions = { ts: createdAt|addedAt, deviceId: localDeviceId }`.
5. **Sync infrastructure (still no UI)**: ports (`SyncTransportPort`, `CryptoPort`, `MnemonicPort`, `OutboxPort`), adapters, and a `SyncCoordinator` orchestration class. All wired but disabled until a share exists.
6. **UI: start/join/stop sharing flows**.
7. **Real-time SSE**: layered on top of working pull/push. App is fully usable without it.
8. **Hardening**: Lamport bumps, snapshot compaction, polling fallback, error UI for `410 Gone`.

Rollback strategy:
- The monorepo migration is one commit; revert to fall back to the current layout.
- Sync features ship behind a `EXPO_PUBLIC_SYNC_ENABLED` flag (default `false`) until step 8 lands; flipping the flag off re-hides the share UI without touching the data model. The augmented data model is forward-compatible (extra fields are ignored by old code, but old code wouldn't ship anymore — purely a "in-progress safety" measure).

## Open Questions

1. **Snapshot compaction lease**: who triggers compaction? Simplest answer — every client, with a server-side "last compaction at" timestamp; the first client whose pull crosses a threshold uploads a fresh snapshot. Needs a small CAS endpoint (`If-Match` on `snapshot_seq`). Defer detailed design to implementation.
2. **Rate limiting**: per-IP and per-shareId. Numeric limits TBD during server implementation; out of scope here.
3. **Phrase entry ergonomics**: 24 inputs vs. a single textarea. Lean toward 24 chips with autocomplete; revisit during UI work.
4. **Server hosting**: not decided. Plausibly Fly.io or a small VPS. Doesn't affect this change's scope but affects operational planning.
5. **i18n strings for new UI**: the project uses `i18n-js`. New keys go under a `share.*` namespace; full translations land with the UI tasks.
