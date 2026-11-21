# Frontend dependency audit — status 2026-11-18

Scope: `frontend/package-lock.json` (`npm audit`, Node 22). None of the affected packages are in the
published React bundle: the deployed JavaScript contains no Firebase, gRPC, undici or glob code. All of
them are build, lint or test tooling, or the Firebase SDKs used only by emulator tests.

## Before → after

|                    | Total | High | Moderate |
| ------------------ | ----- | ---- | -------- |
| CI run 44270411338 | 23    | 17   | 6        |
| After this change  | 11    | 11   | 0        |

The counts are npm "vulnerable package" entries. npm lists every dependent of a vulnerable package
as its own finding, so these counts are higher than the number of distinct advisories.

## Resolved with `overrides` in `frontend/package.json`

| Package           | Was    | Now     | Reached via                                                                           |
| ----------------- | ------ | ------- | ------------------------------------------------------------------------------------- |
| `undici`          | 5.28.4 | 6.29.1  | `firebase-legacy` (firebase@10.12.2) auth, auth-compat, firestore, functions, storage |
| `@fastify/busboy` | 2.1.1  | removed | only a dependency of undici 5                                                         |
| `@grpc/grpc-js`   | 1.9.16 | 1.14.7  | `@firebase/firestore` (both SDK versions)                                             |

Firebase was not downgraded, and the exact legacy SDK 10.12.2 is still pinned for browser-continuity
regression tests. The overrides go beyond Firebase's declared ranges (`undici: 5.28.4`,
`grpc-js: ~1.9.0`). The emulator auth and RTDB suites in CI are the compatibility evidence; they do not
use Firestore.

## Unresolved — no upstream fix

[GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) (CVE-2026-112366, CVSS 7.5,
CWE-1333): `picomatch <=4.0.7` — ReDoS through single-branch repeated extglobs (high). 4.0.7 is the
newest published release, and the GitHub Advisory Database lists no patched version
(`first_patched_version: null`, checked 2026-11-18). It accounts for all 11 remaining entries:
`picomatch`, `fdir`, `tinyglobby`, `vite`, `vitest`, and the `typescript-eslint` packages through
`@typescript-eslint/typescript-estree → tinyglobby`.

- Exposure: the glob patterns come from this repository's own config files (Vite, Vitest, ESLint) and
  run only on developer machines and CI. Nothing in the shipped site uses picomatch.
- Rejected suggested fixes: `vitest@3.1.4` and `vite@6.2.7` are major downgrades. They would undo
  #9 (which removed critical test-dependency findings) and do not address the underlying range.
- Production check: `npm ls --omit=dev` contains no picomatch, `npm audit --omit=dev` reports 0, and
  the source maps of the built bundle contain only app code, React, React Router, Motion and Lucide.
- Action: picomatch is listed on every CI run (see below). When a fixed release is published, the
  audit job fails until it is applied (by update or `overrides`).

## CI audit policy (`dependency-audit` job)

1. The full `npm audit --json` report for all dependencies is always uploaded as an artifact.
2. `scripts/audit-summary.mjs` lists every advisory in the job summary (package, GHSA, affected range,
   patched version from the GitHub Advisory Database, production or dev) and adds a PR warning for
   each dev finding.
3. The job **fails** when a high or critical **dev** finding has a published patched version, so
   fixable tooling vulnerabilities cannot pile up unnoticed.
4. The job **fails** on any high or critical **production** finding
   (`npm audit --omit=dev --audit-level=high`).

Dev findings with no published fix (currently only GHSA-fc5q-39xc-vjpf) are reported but do not fail
the job. Nothing is suppressed or ignored.
