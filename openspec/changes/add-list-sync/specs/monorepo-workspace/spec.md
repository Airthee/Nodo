## ADDED Requirements

### Requirement: Bun workspaces layout

The repository SHALL be organized as a Bun-managed monorepo with the following top-level structure:

```
apps/
  mobile/      # the Expo React Native application
  server/      # the Bun + Hono sync server
packages/
  shared/      # cross-cutting code reused by mobile and server
package.json   # workspace root, declares "workspaces": ["apps/*", "packages/*"]
bun.lock
tsconfig.base.json
```

The root `package.json` SHALL declare workspaces and SHALL NOT contain application-level dependencies. Application-level dependencies (Expo, React Native, Hono, etc.) SHALL live in their respective workspace packages.

#### Scenario: bun install resolves the entire workspace

- **WHEN** a contributor runs `bun install` at the repo root
- **THEN** dependencies for every workspace package are installed and `node_modules` is hoisted at the root with per-package overrides where required by Metro

#### Scenario: Internal dependency resolution works

- **WHEN** `apps/mobile` declares `"@nodo/shared": "workspace:*"` and imports from it
- **THEN** the import resolves to the local `packages/shared` source without publishing to a registry

### Requirement: Migrate the existing Expo app into apps/mobile without behavior change

The migration SHALL move every file currently under the repository root that belongs to the Expo app — `App.tsx`, `index.ts`, `src/`, `app.json`, `eas.json`, `metro.config.js`, `eslint.config.js`, `tsconfig.json`, `svg.d.ts`, `assets/`, `android/` — into `apps/mobile/`. The migration SHALL preserve TypeScript path aliases (`@application/*`, `@domain/*`, `@infrastructure/*`, `@presentation/*`) by relocating them in `apps/mobile/tsconfig.json`. The migration SHALL update `metro.config.js` to handle a monorepo (`watchFolders` includes the repo root, `nodeModulesPaths` includes both root and app `node_modules`). After the migration, all previously available developer commands SHALL still work, accessed from the root via Bun workspace scripts.

#### Scenario: Mobile dev server starts from the repo root

- **WHEN** a developer runs `bun --cwd apps/mobile start` (or an equivalent root-level alias such as `bun run mobile:start`)
- **THEN** the Expo dev server starts and serves the same app as before the migration

#### Scenario: Path aliases keep working

- **WHEN** TypeScript and Metro resolve `import { X } from '@application/use-cases/...'` from inside `apps/mobile`
- **THEN** the import resolves identically to the pre-migration behavior

#### Scenario: Android native build still works

- **WHEN** an EAS Android build runs after the migration
- **THEN** it produces an APK/AAB equivalent to the pre-migration build, with the same applicationId and version

#### Scenario: ESLint and TypeScript pass on the moved code

- **WHEN** `bun --cwd apps/mobile lint` and `bun --cwd apps/mobile tsc --noEmit` run
- **THEN** both complete with zero errors, given the pre-migration codebase compiles cleanly

### Requirement: packages/shared as the single source of truth for cross-cutting code

The `@nodo/shared` package SHALL contain the CRDT merge logic, encryption interface (with platform-specific adapters injected by consumers), BIP39 helpers, and the Zod schemas describing wire DTOs (operations, snapshots, error envelopes). The package SHALL be pure TypeScript with no React Native or Bun-specific imports at the source level. Both `apps/mobile` and `apps/server` SHALL depend on `@nodo/shared` and SHALL NOT duplicate any of its logic.

#### Scenario: Shared CRDT is referenced from both sides

- **WHEN** mobile applies a remote op and server validates a wire payload
- **THEN** both code paths import the same `@nodo/shared` modules and reach the same conclusions on identical inputs

#### Scenario: Shared package builds independently

- **WHEN** `bun --cwd packages/shared test` runs
- **THEN** all unit tests pass without needing mobile or server to be built

#### Scenario: No platform leakage

- **WHEN** the shared package is type-checked
- **THEN** it compiles without referencing `react-native`, `expo`, `bun:*`, `node:*`, or other platform-specific modules

### Requirement: Tooling and release workflow re-pointed at apps/mobile

`release-it` and any CI workflow SHALL be reconfigured to operate on `apps/mobile/package.json` for version bumps and changelog generation. The repository's git tags and release artifacts SHALL continue to track the mobile app version (the `nodo` user-facing product). The server and shared package SHALL be unversioned in the registry sense (private workspace packages) and SHALL evolve in lockstep with the mobile app via the same git tags.

#### Scenario: bun run release bumps the mobile app

- **WHEN** a maintainer runs the release command from the repo root
- **THEN** the version bump is applied to `apps/mobile/package.json` and the resulting commit/tag matches the prior format

#### Scenario: Server and shared version with the repo

- **WHEN** the mobile app is tagged `vX.Y.Z`
- **THEN** the same commit's `apps/server` and `packages/shared` are considered the matching versions; no separate tags are produced

### Requirement: Backwards-compatible developer entry points

The migration SHALL provide root-level scripts that mirror the most common pre-migration commands so muscle memory keeps working: `bun run mobile:start`, `bun run mobile:android`, `bun run mobile:ios`, `bun run mobile:web`, `bun run server:dev`, `bun run shared:test`. These SHALL be thin shims that delegate to the appropriate workspace.

#### Scenario: Root-level shim launches the mobile app

- **WHEN** a developer runs `bun run mobile:start` at the repo root
- **THEN** the Expo dev server starts (equivalent to the previous `bun start`)
