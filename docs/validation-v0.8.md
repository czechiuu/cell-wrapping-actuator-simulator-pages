# v0.8 validation record

## Scope

v0.8 adds four-arm meridional reach acceptance to equal-pressure design. It retains the v0.7 finite-arc kinematics, signed full coupling, integer packing, adjacent supports, and rigid-panel/base endpoint collision checks. This is a prescribed-pose conditional model; it does not establish natural equilibrium, continuous contact area, deformable-cell contact, path clearance, stability, or manufacturability.

## Automated verification

- Full Vitest regression suite: 326 tests in 39 files passed (2026-10-16 development workspace run; final release manifest records the final count).
- TypeScript and Vite production build passed. Existing large-bundle warning remains; it is not a failed build.
- Actual finite inner-face tangency is recomputed from transforms. Tests reject projected/gapped/penetrating/edge-only contacts, panel-tip and stored-angle substitution, reversed/collapsed chains, incomplete arms and invalid criteria.
- Finite contact DFS applies ordering and terminal reach while considering branches. Joint dimension search prioritizes reach-informed proposals, then verifies actual geometry; the proposal estimate never determines acceptance.
- The D600 µm example is independently rebuilt with signed Jacobian entries checked against fixed-material-point central differences, plus torque residual checks. Every panel is checked separately at 300 Pa; four arms reach 100.906222309°.
- The prior D2000 µm short-reach fixture fails the default 90° criterion. Historical mechanics regression cases use an explicit relaxed criterion and do not constitute default-v0.8 success.
- UI workflow tests cover criterion edits invalidating selection, stale results, exact-count application, reach-aware JSON/CSV exports and the distinct historical/new examples.

## Separate numerical examples

See [v0.8 model and observed bounded-search results](model-v0.8.md) for the complete D600 fixture and the D2000 / 300 Pa default-bound and expanded-bound outcomes. A result from a different cell diameter is never substituted for the user's requested case. “Not found” is bounded-search evidence, not a proof of global infeasibility.

## Publication and browser checks

This record covers source tests and production build only. Publication must preserve the previous Pages tree at `versions/v0.7/`, keep its assets unchanged, and retain the source commit `917c536fc8612db07127807db4f816e97f38bfbd`. The new root redirects existing `?v=0.7` and `?v=0.7.0` links to the frozen version while preserving other query parameters and the hash.

Live-page loading, archive loading, worker loading and actual browser/GPU rendering are release checks, not implied by the automated source tests above. Their results should be recorded separately by the publisher.
