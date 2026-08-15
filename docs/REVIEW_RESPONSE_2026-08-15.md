# GNS suspension reinstatement follow-up

This document addresses the August 15, 2026 reviewer finding that a suspended
name could be reactivated by calling `update_profile` with unchanged fields. It
describes the corrected source in [`contracts/gns.py`](../contracts/gns.py).
The prior V3 Bradbury deployment does not contain this correction. The corrected
source is deployed at
[`0x337105406bca6EcAf55bd90F6e65A9e041256A8a`](https://explorer-bradbury.genlayer.com/address/0x337105406bca6EcAf55bd90F6e65A9e041256A8a),
and its accepted
[`0x79db...a28e`](https://explorer-bradbury.genlayer.com/tx/0x79dbac605a59c3b75faec0818ebc1c9a83f2660f3783242fc926c469c099a28e)
deployment contains `contracts/gns.py` byte-for-byte (SHA-256
`f23a89ff1c9146ceab5b55c46d8fd61de70a8494445a182b35a906072dd49b13`).

## Root cause

The prior `update_profile` implementation performed source-free profile
moderation and changed an unexpired suspended record back to `active` after a
generic `safe` result. It did not require changed data, refetch the source stored
by `challenge_profile`, or evaluate whether that evidence still supported the
stored claim. Consequently, an owner could bypass a valid suspension without
remediation or counter-evidence.

## Corrected invariant

- `update_profile` rejects every suspended record before nondeterministic work.
- Ordinary profile updates require an active lease; expired records must renew first.
- `reinstate_profile` is the only profile-write path that can restore `active`.
- The proposed profile must differ from the suspended profile.
- The stored challenge must exist and its latest action must be `suspend`.
- The original `source_url` and `claim` are reused; the caller cannot replace
  the evidence governing reinstatement.
- The leader and each validator independently fetch that source and reapply the
  policy to the changed profile.
- Validators require exact agreement on `action`, `category`, and
  `confidence_bps`.
- Only an exact `keep` result can reactivate the name.
- The profile and challenge are written together after consensus. A rejected,
  malformed, unavailable, or disagreeing result writes neither state object.

The updated challenge record preserves the original challenger, source URL, and
claim while recording the latest decision, category, confidence, summary, and
timestamp. This keeps the lifecycle record and its evidence history consistent:
`suspended` pairs with a `suspend` finding, and successful reinstatement pairs
`active` with the new `keep` finding.

## Regression coverage

`tests/test_gns_v2_direct.py` now covers three consequential paths:

1. A suspended record rejects generic `update_profile` and unchanged
   `reinstate_profile` calls while preserving both stored states.
2. A changed profile is reinstated only after validators independently refetch
   the original source and exactly agree that it no longer supports suspension.
3. A changed profile that does not rebut the source-backed finding remains
   suspended, with the previous challenge and record unchanged.

Static tests also assert the public ABI, bounded source fetch, nested validator
shape, exact consequential-field comparison, and storage-after-consensus order.
Frontend transaction verification requires both `record.status == "active"` and
`challenge.action == "keep"` before a reinstatement is shown as complete.

## Remaining release evidence

The corrected deployment and source identity are verified. Before resubmission,
record the remaining behavior receipts:

1. a source-backed suspension;
2. a rejected generic or unchanged profile update;
3. a successful changed-profile reinstatement with consistent record/challenge
   reads; and
4. a failed reinstatement that leaves both states suspended.

Only after those receipts are final should the frontend address and submission
links be updated.
