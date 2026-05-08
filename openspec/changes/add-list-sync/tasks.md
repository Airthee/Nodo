## 1. Monorepo migration (no behavior change)

- [ ] 1.1 Create top-level `apps/` and `packages/` directories
- [ ] 1.2 Move `App.tsx`, `index.ts`, `src/`, `app.json`, `eas.json`, `metro.config.js`, `eslint.config.js`, `tsconfig.json`, `svg.d.ts`, `assets/`, `android/` into `apps/mobile/`
- [ ] 1.3 Promote root `package.json` to a workspace manifest (`"workspaces": ["apps/*", "packages/*"]`, no app deps)
- [ ] 1.4 Recreate `apps/mobile/package.json` from the previous root `package.json` (name `@nodo/mobile`, private, deps and scripts intact)
- [ ] 1.5 Update `apps/mobile/tsconfig.json` path aliases to be app-local; create `tsconfig.base.json` at the root
- [ ] 1.6 Update `apps/mobile/metro.config.js` to support the workspace (`watchFolders` rooted at the repo, `nodeModulesPaths` includes root and app `node_modules`)
- [ ] 1.7 Add root-level convenience scripts: `mobile:start`, `mobile:android`, `mobile:ios`, `mobile:web`
- [ ] 1.8 Re-point `release-it` config and `eas.json` to `apps/mobile`
- [ ] 1.9 Verify `bun install`, `bun --cwd apps/mobile start`, ESLint, and `tsc --noEmit` all pass
- [ ] 1.10 Run a full local Android build to verify EAS configuration is intact

## 2. packages/shared skeleton

- [ ] 2.1 Create `packages/shared/` with `package.json` (name `@nodo/shared`, private, ESM, no platform deps), `tsconfig.json` extending `tsconfig.base.json`, and `src/index.ts`
- [ ] 2.2 Add `zod` as a dependency to `packages/shared`
- [ ] 2.3 Define DTO Zod schemas in `src/dto/`: `OperationDto`, `OperationBatchDto`, `SnapshotDto`, `ErrorDto`
- [ ] 2.4 Define a platform-agnostic `CryptoAdapter` interface (`encryptAesGcm`, `decryptAesGcm`, `randomBytes`, `hkdfSha256`) in `src/crypto/types.ts`
- [ ] 2.5 Define a `MnemonicAdapter` interface (`generate24Words`, `phraseToSeed`, `validatePhrase`) in `src/mnemonic/types.ts`
- [ ] 2.6 Implement `deriveShareId(seed)` and `deriveEncryptionKey(seed)` using the injected `CryptoAdapter`
- [ ] 2.7 Set up a unit test runner in the package (Bun test) and add unit tests for the derivation helpers (deterministic across calls, distinct outputs, expected lengths)

## 3. CRDT in packages/shared

- [ ] 3.1 Define `VersionMeta = { ts: number; deviceId: string }` and `compareVersion(a, b)` returning `-1 | 0 | 1` (ts ASC, deviceId ASC)
- [ ] 3.2 Define `ChecklistItemState`, `ChecklistState`, and `Operation` types matching the design (per-field `versions`, `deletedAt` tombstone)
- [ ] 3.3 Implement `applyOperation(state, op)` returning new state, idempotent, with the LWW field-level rule
- [ ] 3.4 Implement `mergeStates(a, b)` for snapshot reconciliation (used on first sync) — equivalent to applying every op of one onto the other
- [ ] 3.5 Implement `nextLocalTs(shareClock)` enforcing `max(Date.now(), shareClock + 1)` and a `bumpClock(shareClock, remoteTs)` helper
- [ ] 3.6 Unit-test toggle-vs-toggle, label-vs-toggle, delete-vs-edit (both orders), tie-break on equal ts, idempotence on duplicate apply, and Lamport bump
- [ ] 3.7 Add fast-check property tests asserting commutativity, associativity, and idempotence over random op sequences

## 4. apps/server skeleton

- [ ] 4.1 Create `apps/server/` with `package.json` (name `@nodo/server`, private, deps: `hono`, `zod`, `@nodo/shared` via workspace, dev: `@types/bun`)
- [ ] 4.2 Create `apps/server/tsconfig.json` extending `tsconfig.base.json`
- [ ] 4.3 Wire a `bun run dev` script that runs `bun --hot src/index.ts`
- [ ] 4.4 Create `src/index.ts` with a Hono app, `/healthz`, and structured JSON request logging that never logs ciphertext bodies
- [ ] 4.5 Create the SQLite schema bootstrap (`shares`, `ops`) on first run using `bun:sqlite`; place migrations in `src/db/migrations/`
- [ ] 4.6 Implement input validation middleware that enforces 32-hex `shareId` and rejects malformed requests with 400

## 5. Sync server endpoints

- [ ] 5.1 Implement `POST /shares/:shareId/ops` — validate body (Zod), assign monotonic `seq` per share inside a single transaction, persist, return assigned seqs
- [ ] 5.2 Implement `GET /shares/:shareId/ops?since=` — return ops ordered by `seq` ASC, capped at 1000, with the highest `seq` echoed for pagination
- [ ] 5.3 Implement `GET /shares/:shareId/snapshot` and `PUT /shares/:shareId/snapshot` with `expectedSeq` CAS (return 409 on mismatch)
- [ ] 5.4 Implement `DELETE /shares/:shareId` — set `deleted_at`; subsequent GETs return 410 Gone
- [ ] 5.5 Implement an in-memory `SseHub` (`Map<shareId, Set<Stream>>`) and `GET /shares/:shareId/stream` returning `text/event-stream`; on each accepted POST, fan out the new op
- [ ] 5.6 Emit a `shareDeleted` event from the SSE hub when a DELETE succeeds and close affected streams
- [ ] 5.7 Implement per-IP and per-shareId rate limiting middleware (token bucket); return 429 with `Retry-After` when exceeded
- [ ] 5.8 Add integration tests covering: push/pull round-trip, pagination, snapshot CAS conflict, 410 Gone after delete, SSE fan-out (two subscribers + one publisher), 400 on malformed shareId

## 6. Mobile crypto and BIP39 adapters

- [ ] 6.1 Add mobile dependencies: `@scure/bip39`, `react-native-quick-crypto`, `react-native-sse`, `qrcode-svg`, `@react-native-community/netinfo`
- [ ] 6.2 Configure `react-native-quick-crypto` (Babel/Metro config plugin per its docs); confirm a dev client builds and runs
- [ ] 6.3 Implement `apps/mobile/src/infrastructure/crypto/quick-crypto-adapter.ts` against the `CryptoAdapter` interface from `@nodo/shared`
- [ ] 6.4 Implement `apps/mobile/src/infrastructure/mnemonic/bip39-adapter.ts` against the `MnemonicAdapter` interface, using `@scure/bip39` English wordlist
- [ ] 6.5 Unit-test that adapters round-trip a sample plaintext through encrypt/decrypt, that mnemonic generation is 24 words and validates, and that derivation outputs match the same `@nodo/shared` deterministic vectors as the server-side adapter

## 7. On-device data model and migration

- [ ] 7.1 Extend `Checklist` with `name` version meta, `shareId?: string`, `deletedAt?: VersionMeta`
- [ ] 7.2 Extend `ChecklistItem` with per-field `versions: { label, checked }` and `deletedAt?: VersionMeta`
- [ ] 7.3 Update use-cases (`add-item`, `toggle-item`, `update-item`, `remove-item`, `create-checklist`, `delete-checklist`, `save-checklist`) to bump version metadata and call `nextLocalTs`
- [ ] 7.4 Update `AsyncStorageAdapter` to (de)serialize the new fields and to filter tombstoned items/lists from default reads
- [ ] 7.5 Implement a one-shot migration in the adapter: detect legacy schema, backfill `versions = { ts, deviceId: localDeviceId }`, write a `schemaVersion` marker; idempotent on re-run
- [ ] 7.6 Generate and persist a stable local `deviceId` (UUID v4) on first launch in `AsyncStorage`
- [ ] 7.7 Add an `OutboxPort` and an `AsyncStorageOutbox` adapter (FIFO append, drain in order, peek, ack)
- [ ] 7.8 Unit-test legacy → new migration with a fixture of pre-existing data; assert idempotence

## 8. Sync ports, adapters, and coordinator

- [ ] 8.1 Define `SyncTransportPort` (push ops, pull ops since seq, fetch snapshot, put snapshot, subscribe SSE, delete share) in `apps/mobile/src/application/ports/`
- [ ] 8.2 Implement `HttpSyncTransport` adapter using `fetch` and `react-native-sse` against the server endpoints
- [ ] 8.3 Implement a `SyncCoordinator` use-case orchestrating: drain outbox → on success, advance local cursor; pull `?since=cursor`; subscribe SSE while screen is foreground; apply remote ops via `applyOperation`
- [ ] 8.4 Wire `NetInfo` and `AppState` so the coordinator pauses cleanly when offline / backgrounded and resumes on connectivity / foreground
- [ ] 8.5 Implement an SSE-failure counter; after three consecutive failures, fall back to 30s polling for the rest of the session
- [ ] 8.6 Implement HTTP 410 handling: on any 410, run a "stop on this device" detach for that share and surface a one-time notice
- [ ] 8.7 Wire the coordinator into `ChecklistContext` so screens can subscribe to a `syncStatus` observable (online/offline, last sync time, pending count)

## 9. Sharing use-cases

- [ ] 9.1 Implement `start-sharing` use-case: generate phrase, derive shareId + key, mark checklist as shared, encrypt initial snapshot, `PUT /snapshot`, register the device locally
- [ ] 9.2 Implement `join-share` use-case: validate phrase, derive ids, fetch snapshot (404-tolerant), pull ops, decrypt and merge into a new local checklist, persist `shareId`
- [ ] 9.3 Implement `stop-sharing-this-device` use-case: clear `shareId`, drop outbox entries for that share, close SSE, best-effort `DELETE /shares/:shareId/devices/:deviceId` (queued if offline)
- [ ] 9.4 Implement `stop-sharing-for-everyone` use-case: confirm dialog → `DELETE /shares/:shareId` → on success run `stop-sharing-this-device` locally; on 410 still run the local detach
- [ ] 9.5 Unit-test each use-case with mocked transport and crypto, asserting both happy and offline paths

## 10. Mobile UI for sharing

- [ ] 10.1 Add a share icon to `ChecklistDetailScreen` header, navigating to a new `ShareChecklistScreen`
- [ ] 10.2 Build `ShareChecklistScreen` with three states: `not-shared` (CTA), `sharing` (phrase + QR + device list + sync status + stop actions), `error`
- [ ] 10.3 Render the phrase as 24 numbered chips and provide a single tap-to-copy and a tap-to-show-QR (using `qrcode-svg`)
- [ ] 10.4 Render an unmissable warning that the phrase cannot be recovered if lost
- [ ] 10.5 Add a "Join a shared list" entry on `ChecklistListScreen` opening a modal with 24 word inputs (BIP39 autocomplete) and a Scan QR button (use `expo-camera` if available, otherwise paste-only and defer scanning to a follow-up)
- [ ] 10.6 Implement confirmation dialogs for both stop-sharing actions, with explicit copy about the cross-device effect of "Stop for everyone"
- [ ] 10.7 Add an in-app toast/inline notice "Sharing was stopped" triggered by `shareDeleted` events and 410 responses
- [ ] 10.8 Add localized strings (English at minimum, French if it already exists in `src/i18n`) under a `share.*` namespace

## 11. Offline-first end-to-end verification

- [ ] 11.1 Manual test: edit while airplane mode is on, then re-enable network; verify outbox drains, server accepts, other devices receive
- [ ] 11.2 Manual test: two devices both edit the same item offline, then both reconnect; verify deterministic LWW outcome on both
- [ ] 11.3 Manual test: SSE real-time path — toggle on device A appears on device B within 1 second
- [ ] 11.4 Manual test: stop-for-everyone — initiating device, live-connected device, and offline device that reconnects later all reach the local-only state without crashes
- [ ] 11.5 Manual test: invalid phrase rejected without a network call; valid phrase against a deleted share returns a clear "no longer exists" error

## 12. Hardening

- [ ] 12.1 Implement Lamport-style share-clock bump on every applied remote op
- [ ] 12.2 Implement client-side snapshot compaction: when local op log since last snapshot exceeds N (e.g., 200), upload a fresh encrypted snapshot via `PUT /snapshot` with `expectedSeq`, retry once on 409
- [ ] 12.3 Cap outbox at 10 000 entries; surface a non-blocking warning to the user when 80% full
- [ ] 12.4 Audit server logs to ensure no plaintext (no decrypted content, no item labels) appears in any code path; add a regression test that scans logs in CI
- [ ] 12.5 Document the privacy model and the irrecoverability of the phrase in `apps/mobile`'s in-app help screen and README

## 13. Release

- [ ] 13.1 Wrap all UI entry points in a `EXPO_PUBLIC_SYNC_ENABLED` flag; default it to `true` only after the previous sections are green
- [ ] 13.2 Update `apps/mobile`'s changelog and bump version via `release-it`
- [ ] 13.3 Provision the server (host TBD) and confirm `/healthz` is reachable from a real device before flipping the flag
- [ ] 13.4 Run `openspec archive add-list-sync` once the change is shipped and stable
