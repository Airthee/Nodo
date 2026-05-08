## ADDED Requirements

### Requirement: HTTP API for share operations

The server SHALL expose an HTTP API rooted at `/shares/:shareId` with the following endpoints:

- `POST /shares/:shareId/ops` — append one or more encrypted operations to the share's log. The body SHALL be a JSON array of `{ deviceId, nonce, ciphertext, clientTs }` items. The server SHALL assign a monotonic per-share `seq`, persist the entry, and return the assigned `seq` values.
- `GET /shares/:shareId/ops?since=<seq>` — return operations with `seq > since`, ordered by `seq` ascending, capped at 1000 per response.
- `GET /shares/:shareId/snapshot` — return the latest compacted snapshot ciphertext, its nonce, and its `seq`. Returns 404 if no snapshot has been uploaded yet.
- `PUT /shares/:shareId/snapshot` — accept a fresh snapshot. The body SHALL include `expectedSeq`; the server SHALL accept the snapshot only if it matches the latest `seq` on record (CAS), otherwise return 409.
- `GET /shares/:shareId/stream` — open an SSE stream that emits each newly accepted op as a `message` event and a `shareDeleted` event when the share is deleted, then closes.
- `DELETE /shares/:shareId` — mark the share as deleted. Subsequent reads SHALL return 410 Gone; the SSE stream SHALL emit `shareDeleted` and close.

#### Scenario: Push then pull round-trips an op

- **WHEN** a client pushes one op to a fresh share
- **THEN** a subsequent `GET /ops?since=0` returns that op with `seq=1`

#### Scenario: Pull is bounded

- **WHEN** the share has 5000 ops and a client requests `?since=0`
- **THEN** the response contains the first 1000 ops in `seq` order; the client must paginate using the highest returned `seq`

#### Scenario: Snapshot CAS prevents concurrent overwrite

- **WHEN** two clients simultaneously upload a snapshot, each with `expectedSeq=42`
- **THEN** the first request succeeds; the second receives HTTP 409 Conflict

#### Scenario: Reads on a deleted share return 410

- **WHEN** any GET endpoint is called for a `shareId` whose `deletedAt` is set
- **THEN** the response status is 410 Gone

### Requirement: Server is content-blind

The server SHALL store only ciphertext, nonces, identifiers (`shareId`, `deviceId`, `seq`), and timestamps. The server SHALL NOT possess the BIP39 phrase or any key derived from it, SHALL NOT decrypt any payload, and SHALL NOT validate the structure of decrypted content. Any code path that would log plaintext content is forbidden.

#### Scenario: Server logs contain no plaintext content

- **WHEN** the server logs requests at any verbosity level
- **THEN** logs contain no decrypted body, no item label, and no list name; only opaque identifiers and ciphertext lengths may appear

#### Scenario: Server cannot derive the encryption key

- **WHEN** the server attempts to operate on data without the phrase
- **THEN** it has no key material that would let it decrypt stored ciphertext

### Requirement: Real-time fan-out via SSE

When a `POST /ops` succeeds, the server SHALL immediately push the new op (the same `{ seq, deviceId, nonce, ciphertext, clientTs, serverTs }` shape) to every active SSE subscriber for that `shareId`. The server SHALL deliver the message to the originating device too (clients deduplicate by `seq`) for simplicity. Slow consumers SHALL NOT block other subscribers; if a write to one subscriber's stream fails, the server SHALL drop that subscription without affecting others.

#### Scenario: Two subscribers receive a new op

- **WHEN** devices B and C have open SSE streams to the same share, and device A pushes an op
- **THEN** B and C each receive the op as a `message` event before A's POST response completes (or within a few hundred ms)

#### Scenario: Slow subscriber does not block fan-out

- **WHEN** subscriber B's stream is unwriteable (back-pressured) while the server fans out to A, B, C
- **THEN** A and C receive the message; B's stream is dropped and B will reconnect on its own

### Requirement: Authentication via shareId knowledge

The server SHALL treat possession of a valid `shareId` as the only authorization. There SHALL be no user accounts, login, or token issuance. To mitigate enumeration and abuse, the server SHALL apply rate limiting per IP and per `shareId` (defaults configurable, on the order of tens of requests per minute per share). Requests with a `shareId` of incorrect format (not 32 hex chars) SHALL be rejected with 400.

#### Scenario: Unknown shareId is indistinguishable from no-content shareId

- **WHEN** a client requests `GET /ops` for a `shareId` that has never been written to
- **THEN** the server returns 200 with an empty op array (it does not leak existence by status code)

#### Scenario: Rate limit returns 429

- **WHEN** a single IP exceeds the per-IP request budget
- **THEN** further requests receive HTTP 429 with a `Retry-After` header

#### Scenario: Malformed shareId is rejected

- **WHEN** a client requests any endpoint with a `shareId` that is not 32 hex characters
- **THEN** the server returns 400 Bad Request without touching the database

### Requirement: SQLite storage with monotonic seq per share

The server SHALL persist all state in SQLite. The schema SHALL have a `shares` table (`share_id`, `created_at`, `deleted_at`, `snapshot_ciphertext`, `snapshot_nonce`, `snapshot_seq`) and an `ops` table (`share_id`, `seq`, `device_id`, `ciphertext`, `nonce`, `created_at`) with primary key `(share_id, seq)`. `seq` SHALL be monotonically increasing per share with no gaps for accepted writes.

#### Scenario: Concurrent pushes assign distinct seq

- **WHEN** two POST /ops requests for the same share arrive concurrently
- **THEN** each accepted op receives a distinct `seq`, and replaying ops in `seq` order produces the same final state on every client

#### Scenario: Snapshot upload updates snapshot_seq atomically

- **WHEN** a snapshot upload succeeds with `expectedSeq=N`
- **THEN** `snapshot_seq` becomes `N` in the same transaction that stores the ciphertext

### Requirement: Snapshot compaction allows clients to skip the op log

A client joining a share or starting a fresh session SHALL be able to fetch a snapshot that represents all operations up to some `seq=N`, then pull only `?since=N` to catch up. The server SHALL retain operations after the snapshot's `seq`. Operations with `seq <= snapshot_seq` MAY be pruned by an offline maintenance job; the live API does not perform pruning.

#### Scenario: New device fetches snapshot then incremental ops

- **WHEN** a freshly joined device pulls `/snapshot` (returning `seq=42`) and then `/ops?since=42`
- **THEN** applying the decrypted snapshot followed by the returned ops yields the same state as applying every op from `seq=1`

### Requirement: Health and observability endpoints

The server SHALL expose `GET /healthz` returning 200 with a small JSON payload (`{ status: "ok", uptimeSec, gitSha }`) for liveness checks. The server SHALL expose structured logs in JSON with one line per request including `method`, `path`, `shareIdHash` (first 8 hex chars to avoid full identifier in logs is acceptable, but full shareId is also acceptable since it is not secret), `status`, and `durationMs`. No checklist content SHALL appear in any log.

#### Scenario: Health endpoint responds without DB access

- **WHEN** a load balancer probes `/healthz`
- **THEN** the server returns 200 even if the database is momentarily unavailable, indicating the process is up; a separate `/readyz` (out of scope here) would be needed for DB checks
