# v0.8.1 validation record

## Scope and baseline

The development copy was isolated from v0.8 after verifying all 145 source-file SHA-256 hashes against the frozen v0.8 manifest. Source baseline: `7bb5108fc77cd65e4fdd18cbfd094cf580591433`; Pages baseline: `1fc9be89a03b5efb12912813a72b93c280aca2d5`. Neither prior local release nor the frozen v0.7 assets were edited.

This release adds hard four-arm C4 rotational symmetry and renders actual metal strips instead of a solid available-width cap. It retains finite-arc kinematics, signed full coupling, individual pressure tolerance, real finite-contact meridional reach, integer packing, both adjacent supports, and rigid-panel/base endpoint collision checks. It remains a prescribed-pose conditional model.

## Automated checks

Full Vitest regression: **381 tests in 42 files passed**. TypeScript and Vite production build passed; the existing large-bundle warning remains non-fatal. The final release manifest records source and asset hashes. Focused checks cover:

- Exactly one representative-chain geometry and integer search, copied at 90° increments, with independent full-device revalidation.
- Square base and matching root positions, per-index dimensions/angles/materials/drives/counts/targets. Sequential sites within one chain may differ.
- Rejection of asymmetric panel, hinge, target, strip width, layer thickness, drive and count overrides; duplicate or unknown IDs are not silently dropped.
- Rejection of the old right-arm 9/4/1 variant even when widths have been adjusted to produce exact target pressure.
- Default 90° reach and ±5% per-panel pressure, signed Jacobian finite-difference checks, torque residuals, fixed packing limits, neighboring supports and endpoint collisions.
- Edits propagate to all corresponding sites, both base dimensions/bounds remain linked, and stale/tampered/imported asymmetric candidates cannot be applied as current valid designs.
- JSON/CSV expose symmetry diagnostics; forward imported asymmetry remains inspectable but does not claim valid pressure.
- Actual N separate strips, actual strip widths, empty gaps, centered edge padding, one-strip rendering, four rotated axes and wireframe fallback for unresolved/invalid/ambiguous/over-cap layouts.

## Numerical observation

A separate bundled-node run rebuilt the D600 µm / 300 Pa example from current source. Search returned one complete candidate after 12 searched contact branches and 560 integer trials. All four arms had exactly:

- Counts: 7 / 4 / 1.
- Panel widths: 216.8851584710011 / 155.73511832566586 / 305.028403188404 µm.
- Hinge angles: 0.6615465698941114 / 0.6270764092679499 / 0.4725228358816005 rad.
- Packed widths including gaps and both margins: 151 / 88 / 25 µm.
- Base: 240 × 240 µm; terminal contact polar angle: 100.906222309°.

All 12 panel pressures were approximately 300 Pa; maximum relative error was 6.631732200427602e−15. Symmetry, ordered reach, contact, integer packing/support and endpoint collision checks passed. This is a conditional numerical verification, not experimental validation, and does not resolve the separate D2000 µm task.

## Browser and publication limitations

Production TypeScript/Vite build is checked independently from GPU rendering. Local Chromium visual smoke testing was attempted but the execution sandbox blocked browser launch before the app loaded (`socket() failed: Operation not permitted`). An escalation attempt also failed during sandbox environment initialization. No local screenshot was produced, so actual browser/GPU appearance is not certified by the source tests.

The publisher must separately verify deployment, worker loading, live version, and rendered strips in a supported browser. The frozen v0.7 subtree is reused by exact Git tree, not rebuilt: `1f24442f3897e0144c53aba74c8c773ca8b95a4b`. Root redirects for `?v=0.7` and `?v=0.7.0` preserve all other query/fragment data. Source tests/build do not by themselves establish deployment success.
