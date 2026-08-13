# GNS V3 review response

This document maps the August 12, 2026 reviewer request to the corrected source
in [`contracts/gns.py`](../contracts/gns.py). The correction is a new V3
deployment candidate. The existing V2 Bradbury address is historical only and
must not be submitted as evidence for these features.

## Requested: source-backed entitlement or challenge

`challenge_profile(name, source_url, claim)` provides a public challenge path.
It requires a credential-free public HTTP(S) URL and a specific, bounded claim.
The nested `review_once` function fetches the source inside the nondeterministic
section, rejects non-success or non-text responses, truncates the evidence, and
evaluates the registered profile policy. The leader result and validator result
are parsed with `validate_challenge_result`.

The validator calls `review_once` itself. It compares `action`, `category`, and
`confidence_bps`, the three fields that decide whether the record is suspended.
It never treats schema validity alone as agreement. Storage is written only after
`gl.vm.run_nondet_unsafe` returns a strict valid result.

## Requested: expiry, release, and recovery

- `expires_at` is set during registration and checked by `resolve`,
  `reverse_resolve`, and all active-only writes.
- `renew` extends the lease by one year without shortening an existing lease.
- `release` removes a record at the owner's request. `release_expired` enables
  public cleanup only after expiry.
- `set_recovery`, `clear_recovery`, `initiate_recovery`, `cancel_recovery`, and
  `execute_recovery` create a reversible, delayed recovery path. The recovery
  address cannot equal the current owner. Execution occurs only after
  `RECOVERY_DELAY_SECONDS` and resets resolver and recovery state.

## Requested: post-registration profile moderation

`update_profile` validates all profile fields and re-runs the same strict policy
used for registration. A rejected result exits without writing a profile. A safe
update on a suspended but unexpired record restores `active` status, giving the
owner an on-chain remediation path.

## Requested: active Direct Mode nested-validator tests

`tests/test_gns_v2_direct.py` no longer accesses `_captured_validators` or
asserts on bound callable internals. It uses `direct_vm.run_validator()`, the
public Direct Mode interface, to test both agreement and conflicting validator
outcomes. `direct_vm.check_pickling = True` is retained as a public test option.

Run the verified local test sequence:

```bash
python3 -m unittest tests/test_gns_v2.py -v
.venv/bin/pytest tests/test_gns_v2_direct.py -v
npm run lint
npm test
npm run build
```

## Evidence after redeployment

Before resubmission, replace this release's pending deployment status with the
new V3 Bradbury address, accepted deployment transaction, V3 smoke transactions,
and the frontend deployment that points to the same new address. Do not use a
source/repository commit as a substitute for matching deployed-contract evidence.
