## ADDED Requirements

### Requirement: Generate a sharing phrase for a local checklist

The mobile app SHALL allow a user viewing any local (non-shared) checklist to start sharing it. Starting a share SHALL produce a 24-word BIP39 English mnemonic with at least 256 bits of entropy, generated on-device using a cryptographically secure random source. The mnemonic SHALL be the only credential needed to join the share. The app SHALL display the mnemonic to the user, render it as a scannable QR code, and warn the user that the phrase cannot be recovered if lost.

#### Scenario: User starts sharing a previously local list

- **WHEN** the user opens an unshared checklist and taps "Start sharing"
- **THEN** the app generates a 24-word BIP39 mnemonic, persists the share locally, displays the words and a QR code, and the checklist's status changes to "shared"

#### Scenario: Phrase has sufficient entropy

- **WHEN** a phrase is generated
- **THEN** it consists of exactly 24 words drawn from the BIP39 English wordlist and corresponds to 256 bits of entropy

#### Scenario: User is warned that the phrase cannot be recovered

- **WHEN** the share screen displays a freshly generated phrase
- **THEN** the UI shows a non-dismissable notice explaining that losing the phrase makes the share unrecoverable

### Requirement: Join an existing share from a second device

The mobile app SHALL allow a user to join an existing share by entering its 24-word phrase or scanning its QR code. On successful join, the app SHALL pull the latest server snapshot and operation log for that share, decrypt them locally, and persist the resulting checklist as a shared checklist on the device. The device SHALL register itself with a locally generated `deviceId`. If the phrase is invalid (wrong length, words not in the wordlist, or fails BIP39 checksum) the app SHALL reject it with an explanatory error and SHALL NOT contact the server.

#### Scenario: Joining with a valid phrase succeeds

- **WHEN** the user enters a valid 24-word phrase that corresponds to an existing active share
- **THEN** the app fetches and decrypts the snapshot, creates the checklist locally with `shareId` set, registers a fresh `deviceId`, and the new device starts receiving updates

#### Scenario: Joining with an invalid phrase fails offline

- **WHEN** the user enters a phrase that fails BIP39 checksum validation
- **THEN** the app displays an inline error and makes no network request

#### Scenario: Joining a share that no longer exists

- **WHEN** the user enters a valid phrase but the corresponding share has been deleted server-side (HTTP 410 Gone)
- **THEN** the app shows a "this share no longer exists" message and does not create a local checklist

### Requirement: End-to-end encryption of checklist content

All checklist content (list name, item labels, item state) leaving the device SHALL be encrypted with a symmetric key derived from the share's BIP39 phrase. The server SHALL never see plaintext content. The encryption key SHALL be derived as `HKDF-SHA256(seed = bip39ToSeed(phrase), info = "nodo:enc-key:v1", length = 32)` and used with AES-256-GCM and a fresh random 12-byte nonce per ciphertext. The `shareId` sent to the server SHALL be derived as `HKDF-SHA256(seed = bip39ToSeed(phrase), info = "nodo:share-id:v1", length = 16)` and SHALL be deterministic for a given phrase.

#### Scenario: Outbound payload is encrypted

- **WHEN** the app pushes an operation to the server
- **THEN** the request body contains only ciphertext, the random nonce, and the share/device identifiers — no plaintext checklist content is present

#### Scenario: Same phrase produces same shareId on different devices

- **WHEN** two devices derive identifiers from the same 24-word phrase
- **THEN** they produce identical `shareId` and identical encryption key bytes

#### Scenario: Server cannot decrypt content

- **WHEN** an operator inspects the server database
- **THEN** the operator SHALL be unable to read titles, item labels, or item states without the phrase, which is never sent to the server

### Requirement: Per-item Last-Writer-Wins CRDT merge

Each checklist item SHALL carry per-field version metadata (`label`, `checked`) consisting of a numeric timestamp and the originating `deviceId`. The checklist itself SHALL carry the same metadata for its `name`. Items and the checklist itself SHALL support tombstones (`deletedAt`). When applying a remote operation, the app SHALL replace a field if and only if the remote version is strictly greater than the local version, where ordering is `(ts ASC, deviceId ASC)`. Tombstones SHALL behave like any other field for ordering purposes.

#### Scenario: Remote toggle wins over older local toggle

- **WHEN** device A toggles an item at ts=100 and device B toggles the same item at ts=200, and B's op reaches A
- **THEN** the resulting `checked` value on A reflects B's ts=200 toggle

#### Scenario: Concurrent edits on different fields both apply

- **WHEN** device A renames an item at ts=150 and device B toggles the same item at ts=160
- **THEN** after both ops are exchanged, the item carries A's label and B's checked state

#### Scenario: Tombstone wins over older edit

- **WHEN** device A renames an item at ts=100 and device B deletes the same item at ts=200
- **THEN** after merge the item is tombstoned and not displayed

#### Scenario: Edit after tombstone "wakes" the item only if newer

- **WHEN** device A renames an item at ts=300 after device B deleted it at ts=200
- **THEN** the item is live again with A's label; the tombstone is overwritten

#### Scenario: Tie-break by deviceId is deterministic

- **WHEN** two devices toggle the same item at the same timestamp
- **THEN** the device with the lexicographically smaller `deviceId` loses, and both devices reach the same final state

### Requirement: Lamport-style timestamp protection against clock skew

When the app applies a remote operation whose timestamp is greater than its local clock, the device SHALL bump its internal "share clock" so that the next locally produced timestamp is at least `remote.ts + 1`. Locally produced timestamps SHALL be `max(Date.now(), shareClock + 1)`. This SHALL apply per-share, not globally.

#### Scenario: Remote op from skewed clock bumps local share clock

- **WHEN** device A receives a remote op with ts=10000000000 (year 2286) and device A's wall clock is ts=1700000000 (year 2023)
- **THEN** the next op A produces has ts >= 10000000001

### Requirement: Offline-first local writes with outbox

A local edit SHALL succeed immediately against the on-device store and the UI SHALL reflect it without waiting for the network. The app SHALL append the corresponding encrypted operation to a persistent outbox before any network call. The flusher SHALL drain the outbox in FIFO order and SHALL remove an entry only after the server returns 2xx. On network error or 5xx, the entry SHALL remain in the outbox and SHALL be retried when connectivity returns or the app foregrounds.

#### Scenario: Edit while offline is persisted and surfaced

- **WHEN** the device is offline and the user toggles an item in a shared checklist
- **THEN** the UI updates immediately, the item state is persisted locally, and an op is appended to the outbox

#### Scenario: Outbox flushes on reconnect

- **WHEN** the device regains network connectivity with non-empty outbox
- **THEN** the app pushes outbox entries in order; on 2xx each entry is removed; the operation appears on other connected devices

#### Scenario: Duplicate delivery is harmless

- **WHEN** the app retries an op that the server already accepted (e.g., 200 was lost)
- **THEN** applying the op a second time on any device produces the same final state as applying it once

### Requirement: Real-time delivery while online

While a shared checklist is open and the device has network connectivity, the app SHALL maintain a Server-Sent Events subscription to that share. Operations broadcast by the server SHALL be applied to local state and reflected in the UI within a target of one second on a typical mobile network. The subscription SHALL automatically reconnect after transient network errors. If SSE cannot be established (e.g., proxy blocking), the app SHALL fall back to polling the operations endpoint at most every 30 seconds while the share screen is in foreground.

#### Scenario: Toggle on device A appears on device B in real time

- **WHEN** devices A and B both have the same shared checklist open and online
- **AND** A toggles an item
- **THEN** B reflects the toggle within 1 second without manual refresh

#### Scenario: Reconnect after transient drop

- **WHEN** the SSE connection drops due to a network blip and connectivity returns within 30 seconds
- **THEN** the app re-establishes the subscription, fetches any operations missed during the gap, and applies them

#### Scenario: Polling fallback when SSE is blocked

- **WHEN** SSE fails to establish three times in a row
- **THEN** the app stops attempting SSE for the current session and polls `/ops?since=` every 30 seconds while the share screen is in foreground

### Requirement: Stop sharing — only this device

The app SHALL provide an action that detaches the current device from a share without affecting other members. Performing this action SHALL clear the local `shareId`, drop pending outbox entries for that share, close the SSE subscription, and best-effort notify the server that this `deviceId` has left. The checklist SHALL remain on the device with its current content as a plain local checklist. Other devices SHALL continue to sync among themselves.

#### Scenario: Detach makes the local list local-only

- **WHEN** the user taps "Stop on this device" and confirms
- **THEN** the local checklist no longer has a `shareId`, the outbox no longer contains entries for that share, and subsequent edits on this device do not propagate

#### Scenario: Other devices keep syncing after one device detaches

- **WHEN** device A detaches from a 3-device share
- **THEN** devices B and C continue to receive each other's edits

#### Scenario: Server unreachable does not block local detach

- **WHEN** the user taps "Stop on this device" while offline
- **THEN** the local detach completes immediately; the server-side leave-notify is queued as a best-effort retry but does not block the UX

### Requirement: Stop sharing — for everyone

The app SHALL provide an action that terminates the share for all devices. Performing this action SHALL issue a `DELETE /shares/:shareId` request and, on success, perform the same local detach as "only this device". Other devices SHALL receive a `shareDeleted` SSE event (or, on next reconnect, an HTTP 410 Gone) and SHALL automatically perform a local detach, surfacing a non-blocking notice "Sharing was stopped". This action SHALL require a confirmation step in the UI given its destructive cross-device effect.

#### Scenario: Initiating device terminates the share

- **WHEN** the user taps "Stop for everyone" and confirms
- **THEN** the server marks the share deleted, the local checklist becomes a plain local list, and the share is no longer joinable with that phrase

#### Scenario: Other connected device is notified live

- **WHEN** another device has the SSE subscription open at the moment of deletion
- **THEN** the device receives a `shareDeleted` event, performs a local detach, and shows "Sharing was stopped"

#### Scenario: Other device catches up on next sync

- **WHEN** another device was offline at the time of deletion and later attempts to sync
- **THEN** the next request returns HTTP 410 Gone, the device performs a local detach, and shows "Sharing was stopped"

#### Scenario: Action is gated by confirmation

- **WHEN** the user taps "Stop for everyone"
- **THEN** the app displays an explicit confirmation dialog that names the destructive cross-device effect before issuing the request

### Requirement: Migration of pre-sync local data

On first launch after the sync feature ships, the app SHALL transparently upgrade existing locally stored checklists to the augmented schema (per-field version metadata, tombstone field, optional `shareId`). Default version metadata SHALL be `{ ts: existingCreatedAt|addedAt, deviceId: localDeviceId }`. Existing checklists SHALL remain local-only (no `shareId`) and visually identical to before the upgrade.

#### Scenario: Existing checklists keep working unchanged

- **WHEN** a user upgrades the app and opens an existing checklist that pre-dates the migration
- **THEN** the checklist displays exactly the same items in the same order, has no share state, and is fully editable

#### Scenario: Migration is idempotent

- **WHEN** the migration code runs more than once (e.g., crash mid-migration)
- **THEN** the second run detects the upgraded schema and is a no-op

### Requirement: Local device identity per install

On first launch the app SHALL generate and persist a random `deviceId` (UUID v4) in `AsyncStorage`. This identifier SHALL be reused across share joins and SHALL never be sent to the server until and unless the device joins a share. Reinstalling the app SHALL produce a new `deviceId`.

#### Scenario: Device id is stable across app restarts

- **WHEN** the app is closed and reopened
- **THEN** the same `deviceId` is reused

#### Scenario: Device id is sent only when sharing

- **WHEN** no checklist is shared
- **THEN** no network request is made and `deviceId` is not transmitted
