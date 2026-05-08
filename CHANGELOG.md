# Changelog

All notable changes to this project are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased] — targeting 1.1.0

### Added
- **Edit-parent modal**: hover any nested field to reveal a pencil button that opens a YAML editor for the entire parent object (map or list). Apply replaces all children atomically; Cancel leaves values unchanged.
- **Blank parent-edit clears container**: leaving the textarea empty and clicking Apply sets a list parent back to `[]` or a map parent back to `{}` — the modal hint shows which empty value will be used.
- **Dotted YAML key support**: YAML keys that contain a literal dot (e.g. `argocd.argoproj.io/sync-options`) are now encoded with bracket notation (`["key"]`) in paths so they never collide with nested object paths. Read, write, revert, and history all handle them correctly.

### Fixed
- Revert selected / Undo all now correctly reverts fields that were created by filling an originally-empty `[]` or `{}` container (previously those fields had no revert path and were silently skipped).
- Diff badge and Undo button state now update correctly after removing a chart via "×".
- Phantom amber highlight removed: dotted YAML keys no longer create a ghost nested structure that caused unrelated fields to appear changed on load.
- `snapshotOriginal` uses first-wins deduplication matching the order `renderValues` uses, eliminating mismatched original values for duplicate-key YAML files.
- `cleanStaleBracketKeys` now called after every `jsyaml.load` in all edit handlers (apply, parent-edit, revert, undo) — prevents stale literal `key[0]` string artifacts corrupting YAML output.
- `getNestedVal` and `setNestedPath` use bracket-aware `parsePath` — dotted key segments no longer split on the dot.
- Duplicate `const` / function declarations removed from index.html that caused `SyntaxError` on some runtimes.
- New child fields (added via parent-edit to an empty container) show amber highlight immediately and do not show a history button until the field is directly edited.
- Parent-edit path resolution for list items now uses bracket-aware `parentPathOf` — `imagePullSecrets[0]` correctly resolves parent as `imagePullSecrets`.

### Tests
- 31 new e2e lifecycle tests (`apply-lifecycle.spec.js`): re-apply scalars, type-coercion CSS class changes, undo-all value restoration, revert-selected restoration, history "Use" value verification, list/map full apply→undo→re-apply cycle.
- 17 new e2e value tests (`apply-values.spec.js`): verifies actual `.val-val` text and CSS class after apply for string, number, list (YAML mode), map (YAML mode), view-switch persistence, and multi-field apply.
- 14 new e2e dotted-key tests (`dotted-keys.spec.js`): bracket path display, apply, revert, sibling isolation.
- Extended `parent-edit.spec.js`, `revert.spec.js`, `presets.spec.js`, `batch.spec.js`, `field-history.spec.js` with missing edge cases identified in full audit.
- 139 unit tests covering `parsePath`, `parentPathOf`, dotted-key flatten/set/get, and collision-cleanup edge cases.

### CI / DevOps
- ESLint (flat config, `eslint.config.mjs`) — lint step blocks merge on errors; `npm run lint` / `npm run lint:fix` locally.
- Prettier — format check blocks merge; `npm run format` to auto-fix locally.
- `npm audit --audit-level=high` — blocks merge on HIGH/CRITICAL CVEs in dependencies.
- Code coverage via `--experimental-test-coverage` printed in CI unit test log.
- `npm cache` (`cache: 'npm'` in `actions/setup-node`) added to both `release.yml` and `e2e.yml` — ~30s saved per run.
- Lighthouse CI workflow (`lighthouse.yml`) — runs on PRs to `main`; scores performance ≥ 0.8 and accessibility ≥ 0.9; posts report URL to PR. Permissions locked to `contents: read`.
- Stale bot (`stale.yml`) — labels inactive issues/PRs after 60 days, closes after 14 more; runs every Monday.
- `release-please.yml` — automates Release PRs and CHANGELOG from conventional commits going forward.
- CI and E2E test status badges added to README.
- `docs/development.md` — full developer guide: Mermaid CI/CD flow diagram, tool usage, release process, secrets reference, project structure.

## [1.0.7] - 2026-05-03

### Fixed
- CI unit test failure: updated `coerceValue('null', ...)` test to expect actual `null` (not the string `'null'`) following intentional behavior change
- E2E CI failures: removed dead `autoSizeValuesPanel()` call that caused a `ReferenceError` on every render, showing as a false "Error scanning directory" toast
- Playwright strict-mode violations: added `.first()` to all multi-match toast locators across batch, changed-filter, diff-badge, revert, and presets specs

---

## [1.0.6] - 2026-05-03

### Added
- Hover tooltip on field rows: hovering any row shows a fixed popup with the full `path = value [type]` — useful for long lines that are truncated
- Ellipsis truncation (`text-overflow: ellipsis`) on both field path and value columns — long lines no longer wrap or push content off-screen

### Changed
- Default panel max-width widened to 1440px for better readability on large screens
- Tooltip type labels now correctly show `[list]` for YAML arrays and `[map]` for YAML objects (previously both showed `[arr]`)
- `[bool]` type label restored in tooltip display

### Fixed
- Value column no longer hidden when content exceeds panel width

---

## [1.0.5] - 2026-05-03

### Added
- **Changed field highlight**: fields that differ from their original loaded value show an amber left border
- **Changed filter**: "Changed" button filters the list to only modified fields; auto-exits when no changed fields remain
- **Diff badge**: amber "N changes" badge in the values header; click to open a before/after diff table grouped by chart file
- **Field history popup**: clock icon on any changed field opens a per-field edit history with one-click restore to any previous value
- **Presets**: save the current field selection (with optional prefilled value) as a named preset; apply presets across all loaded charts in one click; magnifying-glass button shows which fields a preset contains
- **Revert selected / Undo all**: select changed fields and click "↩ Revert selected" to restore only those; with nothing selected "↩ Undo all" reverts every change across all loaded charts
- **Auto-backup (.bak)**: before the first write to any `values.yaml` the app creates a `values.bak` in the same directory; "Clean backups" button removes all `.bak` files created this session
- **Quoted string override**: wrapping a value in `'...'` or `"..."` forces string type regardless of the original field type (e.g. `'false'` saves as string, not boolean)
- **Boolean coercion**: typing `true` or `false` now always saves as YAML boolean, even when the original field was a string type
- **Repo link** added to About modal
- **Playwright E2E test suite**: full coverage for batch edit, changed filter, diff badge, revert, and presets flows; mock FSAPI helper for write-back testing in CI

### Fixed
- `true`/`false` values no longer saved as strings when original field type was string
- `null` input always returns actual YAML null regardless of original field type

---

## [1.0.4] - 2026-05-02

### Added
- Docker Hub badge in README

### Changed
- Switched Docker build to use `package-lock.json` + `npm ci` for reproducible installs
- Removed obsolete demo chart folder and legacy scripts directory
- Added `.gitignore`; removed committed `node_modules` and worktree artifacts from tracking

### Fixed
- Upgraded `js-yaml` from `4.1.0` to `4.1.1` to resolve CVE prototype-pollution vulnerability

---

## [1.0.3] - 2026-05-02

### Changed
- App renamed from **Helm Values Viewer** to **Helm Values Editor** across UI, Docker image, and repo
- Removed `APP_NAME` environment variable and the App name field from the About modal

---

## [1.0.2] - 2026-05-02

### Fixed
- CI: upgraded `github/codeql-action/upload-sarif` from v3 to v4 to fix deprecation warning in release workflow

---

## [1.0.1] - 2026-05-01

### Fixed
- Docker image hardened: non-root user, read-only filesystem, minimal nginx base image
- Trivy vulnerability scan added to release CI; results uploaded to GitHub Security tab (SARIF)

---

## [1.0.0] - 2026-05-01

First public release.

### Added
- Browser-based Helm values editor using the File System Access API (Chrome/Edge only)
- Load a Helm chart folder — scans `Chart.yaml` and `values.yaml` recursively across all subcharts and `.tgz` archives
- Load a single `values.yaml` file with full write-back support
- Chart dependency tree in the left panel; click any node to view its fields
- Full-text search across all keys and values at any nesting depth with match highlighting
- Select multiple fields via checkboxes; batch-apply a new value to all selected in one click
- **YAML editor mode**: toggle on any field to edit list/map values as raw YAML (e.g. `[80, 443]` or `key: value`)
- Mixed-type guard: mixing string/number fields with list/map fields in the same batch shows a "Mixed selection" error
- Type coercion: numbers save as YAML numbers, booleans as booleans, `null` as null
- Session persistence: loaded charts saved to IndexedDB; banner on reopen offers one-click restore
- Chart tree filter/search with fuzzy name matching
- "Clear all" removes all loaded charts and clears the session
- About modal with maintainer info, version, and GitHub link
- `lib.js` extracted as a pure utility module with 31 unit tests (Node.js built-in runner)
- `APP_VERSION` environment variable sets the version shown in the About dialog
- Release CI/CD: GitHub Actions builds and pushes Docker image on `v*` tags
- Fully airgapped at runtime — no external network calls
