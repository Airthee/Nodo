## Why

Today every checklist lives in `AsyncStorage` on a single device. There is no way for two people (or two devices owned by the same person) to share a list — typical use cases like a household shopping list or a couple's to-do list cannot be addressed. We need a privacy-respecting way to share and live-sync a checklist across devices, while keeping the offline-first experience intact.

## What Changes

- Convert the repository to a Bun-workspaces monorepo: `apps/mobile` (the existing Expo app), `apps/server` (new Hono + Bun + SQLite sync server), `packages/shared` (DTOs, CRDT logic, crypto helpers shared by client and server).
- Add a "Share this list" action on each checklist that generates a 24-word BIP39 secret phrase. The phrase is the only credential needed to join the share from another device.
- Derive a per-share encryption key from the phrase (PBKDF2/HKDF) so the server only ever stores end-to-end encrypted blobs — it cannot read titles or items.
- Add an HTTP sync server with three responsibilities: store the latest encrypted CRDT blob per share, accept signed CRDT operation pushes, and broadcast operations to other devices over Server-Sent Events for real-time updates.
- Implement a per-item Last-Writer-Wins CRDT on the client so concurrent offline edits merge deterministically (toggle, label change, add, remove) without losing data.
- Make sync offline-tolerant: local writes always succeed against AsyncStorage; pending operations are queued and flushed when connectivity returns.
- Add a "Stop sharing" flow with two outcomes: (1) **Only this device** detaches the local list from the share chain, and (2) **For everyone** tombstones the share server-side so every device falls back to a local-only copy.
- **BREAKING (internal)**: the on-disk schema gains per-item version vectors, a `shareId` field on `Checklist`, and an outbox of pending ops. A one-shot migration upgrades existing local data.

## Capabilities

### New Capabilities
- `list-sync`: end-to-end encrypted, multi-device, real-time and offline-tolerant synchronization of checklists between devices that share a 24-word secret phrase.
- `sync-server`: minimal HTTP + SSE relay that authenticates devices via share-derived tokens, persists encrypted snapshots and operation logs, and fans operations out to subscribed devices.
- `monorepo-workspace`: Bun workspaces layout (`apps/mobile`, `apps/server`, `packages/shared`) with shared TypeScript types and tooling conventions.

### Modified Capabilities
<!-- No existing specs in openspec/specs/; nothing to modify at the requirements level. -->

## Impact

- **Repo layout**: top-level files (`App.tsx`, `src/`, `package.json`, `tsconfig.json`, `eslint.config.js`, `metro.config.js`, `app.json`, `eas.json`, `index.ts`, `assets/`, `android/`) move under `apps/mobile/`. Path aliases (`@application`, `@domain`, `@infrastructure`, `@presentation`) become app-local.
- **Domain**: `Checklist` and `ChecklistItem` gain `updatedAt`, `deletedAt` (tombstones) and a per-field version metadata structure. New `Share` aggregate (shareId, deviceId, derivedKey reference, status).
- **Application**: new use cases — `start-sharing`, `join-share`, `stop-sharing`, `apply-remote-op`, `flush-pending-ops`. New ports — `SyncTransportPort`, `CryptoPort`, `MnemonicPort`.
- **Infrastructure**: new adapters — Hono-based `HttpSyncTransport`, `SseSubscription`, `WebCryptoAdapter` (or `react-native-quick-crypto`), `Bip39Adapter`. Existing `AsyncStorageAdapter` extended with an outbox.
- **Presentation**: new `ShareChecklistScreen` (display phrase, QR, connected devices, stop-sharing actions); new "Join shared list" entry on `ChecklistListScreen`; share icon on `ChecklistDetailScreen`. `ChecklistContext` gains sync lifecycle hooks.
- **New dependencies (mobile)**: `@scure/bip39`, a crypto library compatible with React Native (`react-native-quick-crypto` or `expo-crypto` + `@noble/ciphers`), an SSE polyfill (`react-native-sse`), `qrcode-svg`.
- **New dependencies (server)**: `hono`, `bun:sqlite`, `zod`.
- **Tooling**: root `package.json` becomes a workspace manifest. CI / EAS / release-it configurations need to be re-pointed at `apps/mobile`.
- **Privacy & security**: server operator (including us) cannot read user data; phrase loss = unrecoverable share (documented to user).
