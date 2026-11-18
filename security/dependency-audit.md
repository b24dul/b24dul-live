# Frontend dependency audit — status 2026-11-18

Scope: `frontend/package-lock.json` (`npm audit`, Node 22). None of the affected packages are in the
published React bundle: the deployed JavaScript contains no Firebase, gRPC, undici or glob code. All of
them are build, lint or test tooling, or the Firebase SDKs used only by emulator tests.

## Before → after

|                       | Total | High | Moderate |
| --------------------- | ----- | ---- | -------- |
| CI run 44270411338    | 23    | 17   | 6        |
| After this change     | 11    | 11   | 0        |

The counts are npm "vulnerable package" entries. npm lists every dependent of a vulnerable package
as its own finding, so these counts are higher than the number of distinct advisories.

## Resolved with `overrides` in `frontend/package.json`

| Package          | Was     | Now     | Reached via                                                                 |
| ---------------- | ------- | ------- | --------------------------------------------------------------------------- |
| `undici`         | 5.28.4  | 6.29.1  | `firebase-legacy` (firebase@10.12.2) auth, auth-compat, firestore, functions, storage |
| `@fastify/busboy`| 2.1.1   | removed | only a dependency of undici 5                                               |
| `@grpc/grpc-js`  | 1.9.16  | 1.14.7  | `@firebase/firestore` (both SDK versions)                                   |

Firebase was not downgraded, and the exact legacy SDK 10.12.2 is still pinned for browser-continuity
regression tests. The overrides go beyond Firebase's declared ranges (`undici: 5.28.4`,
`grpc-js: ~1.9.0`). The emulator auth and RTDB suites in CI are the compatibility evidence; they do not
use Firestore.

## Unresolved — no upstream fix

`picomatch <=4.0.7` — ReDoS through single-branch repeated extglobs (high). 4.0.7 is the newest
published release, so no patched version exists. It accounts for all 11 remaining entries:
`picomatch`, `fdir`, `tinyglobby`, `vite`, `vitest`, and the `typescript-eslint` packages through
`@typescript-eslint/typescript-estree → tinyglobby`.

- Exposure: the glob patterns come from this repository's own config files (Vite, Vitest, ESLint) and
  run only on developer machines and CI. Nothing in the shipped site uses picomatch.
- Rejected suggested fixes: `vitest@3.1.4` and `vite@6.2.7` are major downgrades. They would undo
  #9 (which removed critical test-dependency findings) and do not address the underlying range.
- Action: keep the CI `dependency-audit` job at `--audit-level=high`, so it stays failing and visible.
  Update picomatch (or override it) as soon as a fixed release is published, then rerun the audit.
