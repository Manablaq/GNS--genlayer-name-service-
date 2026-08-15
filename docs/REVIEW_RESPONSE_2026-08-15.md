# August 15 review response: suspension integrity

## Reviewer finding

A suspended owner could submit unchanged profile fields to `update_profile`,
receive a source-free `safe` moderation result, and restore the record to
`active` without rebutting the evidence that caused the suspension.

## Root cause

The generic update path did not distinguish an active profile edit from a
suspension appeal. It neither required changed data nor reused the challenge's
source URL, claim, and challenged profile. The wider lifecycle audit also found
that deleting an expired suspended record could otherwise discard the record
while making the name eligible for ordinary registration.

## Corrected invariant

A stored `suspend` finding remains authoritative until a materially changed
profile passes a new independent review of the original source and claim.

The correction enforces that invariant across every relevant transition:

- `update_profile` rejects suspended records before nondeterministic work.
- `reinstate_profile` is the only in-place profile route back to `active`.
- The proposed profile is compared with the canonical challenged snapshot; a
  no-op proposal is rejected.
- The caller cannot replace the challenge source or claim.
- The leader and every validator independently fetch the stored source and
  apply the reinstatement policy to the changed profile.
- Validators require exact equality on `action`, `category`, and
  `confidence_bps`, the complete consequential result.
- Only `action == "keep"` permits activation.
- The record and challenge are written together after consensus. Failure,
  malformed output, source failure, or disagreement writes neither object.

## Release and re-registration audit

The fix does not stop at the reported method:

- Owner `release` rejects a suspended record.
- Public `release_expired` may clean up an expired record, but the contract
  preserves a suspension tombstone with the challenger, source URL, claim,
  decision, confidence, summary, and challenged profile snapshot.
- A later `register` checks that tombstone. Unchanged profile data is rejected.
- Changed re-registration independently fetches and reapplies the stored
  evidence policy. A continuing `suspend` result keeps the name unregistered;
  only exact `keep` consensus creates the new active record.
- Successful re-registration replaces the tombstone with a consistent `keep`
  decision bound to the accepted profile snapshot.

This closes update, release, expiry-cleanup, and re-registration variants of
the same bypass instead of special-casing one UI action.

## Source boundary

Challenge evidence now requires a credential-free HTTPS URL with a DNS
hostname. The contract rejects HTTP, localhost, private IP literals, all other
IPv4 and IPv6 literals, single-label names, malformed DNS labels, and invalid
ports. The frontend uses the same syntactic boundary and explains it before
submission; GenVM remains responsible for fetching the registered source.

## Regression coverage

The verified local suite covers:

1. source-backed suspension with a stored challenged-profile snapshot;
2. rejection of generic updates on suspended records;
3. rejection of unchanged reinstatement;
4. successful changed-profile reinstatement after independent source review;
5. failed remediation with unchanged record and challenge state;
6. blocked owner release of a suspended record;
7. expired cleanup with a preserved suspension tombstone;
8. rejected unchanged and still-violating re-registration; and
9. accepted changed re-registration only after exact `keep` consensus.

Static tests also verify bounded fetches, strict result parsing, exact
consequential-field comparisons, storage-after-consensus ordering, and the
absence of writes, transfers, emits, or contract calls inside nondeterministic
callbacks. Frontend regressions cover tombstone discovery, no-op remediation
blocking, release disabling, and matching source URL validation.

## Verification results

| Gate | Result |
| --- | --- |
| Frontend and transaction tests | 26 passed |
| Contract/parser/structure tests | 29 passed |
| Direct Mode contract tests | 18 passed |
| GenVM lint and semantic validation | Passed; 22 public methods recognized |
| Production frontend build | Passed |

## Deployment truth

The release source is [`contracts/gns.py`](../contracts/gns.py),
SHA-256 `fcd91e87b8bd9e6408a31539f72e5cb689444e3f32da29e27fd0ca0beafb6ed2`.
It is deployed at
[`0x676561784d0864EaFF87F281bA1Af9E2c2e9F090`](https://explorer-bradbury.genlayer.com/address/0x676561784d0864EaFF87F281bA1Af9E2c2e9F090)
by accepted transaction
[`0x4f85...fec67`](https://explorer-bradbury.genlayer.com/tx/0x4f85b4464ee957244d8066d1748176f27a49ea7a8f9a193936e01cf24ddfec67).
The deployment payload contains the byte-identical 49,106-byte source and
matches the repository SHA above. Contract `0x337105406bca6EcAf55bd90F6e65A9e041256A8a`
and deployment `0x79db...a28e` predate the tombstone and source-boundary
hardening and remain historical only.

Before resubmission, run the Bradbury regression matrix in
[`DEPLOYMENT_CHECKLIST.md`](DEPLOYMENT_CHECKLIST.md), redeploy and verify the
frontend, and record finalized lifecycle receipts in
[`SUBMISSION_EVIDENCE.md`](SUBMISSION_EVIDENCE.md).
