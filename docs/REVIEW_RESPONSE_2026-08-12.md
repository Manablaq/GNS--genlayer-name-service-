# GNS V3 review response

This document maps the August 12, 2026 reviewer request to the corrected source
in [`contracts/gns.py`](../contracts/gns.py). The correction was deployed as V3
at [`0xD7Dfa67bF29D020551f2380d68043e6701b49D3f`](https://explorer-bradbury.genlayer.com/address/0xD7Dfa67bF29D020551f2380d68043e6701b49D3f).
The existing V2 Bradbury address is historical only and must not be submitted as
evidence for these features.

## Requested: source-backed entitlement or challenge

`challenge_profile(name, source_url, claim)` provides a public challenge path.
That historical V3 source accepted credential-free public HTTP(S) URLs. The
current release candidate tightens challenge evidence to public HTTPS URLs with
DNS hostnames; see `REVIEW_RESPONSE_2026-08-15.md`.
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

## Bradbury evidence

The deployment receipt [`0x6c8e...d382`](https://explorer-bradbury.genlayer.com/tx/0x6c8e7476432b0245039a5661022b17710f15abb63290fde569ec6908ebe0d382)
was accepted with return. Its source bytes match this repository's V3 contract
exactly (SHA-256 `a1b65bbbec45e5bbebbba2354e73e66d3185f64060e511982cb80a853d289f4e`).

The finalized challenge receipt [`0x215a...e20e`](https://explorer-bradbury.genlayer.com/tx/0x215a8137eb77b360801200c28d2f955d237943c4b63d25e07f9f95f07f7ce20e)
records an accepted consensus outcome of `keep`, `insufficient_evidence`, and
`confidence_bps=9500`, using the public repository README as the stored source.
The record remained `active`. Registration, a post-registration moderated
update, and recovery configuration were also exercised; their receipts are in
[SUBMISSION_EVIDENCE.md](SUBMISSION_EVIDENCE.md).

The remaining release step is a Vercel deployment from this source so the public
application reads the same V3 address. Do not use a repository commit as a
substitute for matching deployed-contract evidence.
