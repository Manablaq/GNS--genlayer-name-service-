# GNS V3 submission evidence

This file is the canonical evidence ledger. It separates locally verified
release behavior from historical Bradbury receipts so reviewers can
identify exactly which source each claim supports.

## Current release

| Item | Value |
| --- | --- |
| Source | [`contracts/gns.py`](../contracts/gns.py) |
| SHA-256 | `fcd91e87b8bd9e6408a31539f72e5cb689444e3f32da29e27fd0ca0beafb6ed2` |
| Matching Bradbury contract | [`0x676561784d0864EaFF87F281bA1Af9E2c2e9F090`](https://explorer-bradbury.genlayer.com/address/0x676561784d0864EaFF87F281bA1Af9E2c2e9F090) |
| Matching deployment receipt | [`0x4f85...fec67`](https://explorer-bradbury.genlayer.com/tx/0x4f85b4464ee957244d8066d1748176f27a49ea7a8f9a193936e01cf24ddfec67) |
| Deployment result | `ACCEPTED` / `AGREE` / `FINISHED_WITH_RETURN` |
| Deployed source identity | Byte-identical, 49,106 bytes; SHA-256 matches this release |
| Frontend source binding | `lib/config.ts` targets `0x676561784d0864EaFF87F281bA1Af9E2c2e9F090`; production verification remains a separate gate |
| Repository | <https://github.com/Manablaq/GNS--genlayer-name-service-> |

Do not resubmit while the application binding or any required regression row
is pending. The deployment calldata contains this exact source, and the
checked-in frontend configuration points to the accepted contract.

## Required Bradbury reviewer regression

The receipts below have reached `ACCEPTED` consensus but must finish their
Bradbury finalization windows before they are cited in a submission. State
reads were taken after each relevant execution and show the persisted result.

| Scenario | Required proof | Status |
| --- | --- | --- |
| Deployment identity | Accepted deployment; calldata contains the byte-identical release source and its SHA equals the repository SHA | Verified: [`0x4f85...fec67`](https://explorer-bradbury.genlayer.com/tx/0x4f85b4464ee957244d8066d1748176f27a49ea7a8f9a193936e01cf24ddfec67) |
| Initial registration | Active Profile A state read for `gns-remediation-v3-2026.gen` | Observed on current contract; registration receipt must be linked before submission |
| Source-backed suspension | `get_record.status == "suspended"`; `get_challenge.action == "suspend"`; source, claim, confidence, and Profile A snapshot are stored | [`0xf414...5fe7`](https://explorer-bradbury.genlayer.com/tx/0xf41413cb4c3c862df3d717a439c1a85cc1651d915e7bbf6976de39a80b145fe7), accepted; post-state verified; finalization pending |
| Reported no-op update bypass | Suspended owner calls `update_profile` with unchanged Profile A; execution fails and both reads remain unchanged | [`0xe1e8...bec4`](https://explorer-bradbury.genlayer.com/tx/0xe1e8fd9b4ee191a64a0900ece23b6709eeb6a6a764661aa9b664d9fd5d74bec4), `FINISHED_WITH_ERROR`; post-state verified; finalization pending |
| Failed changed remediation | `reinstate_profile` proposes Profile B; source independently returns `suspend`; execution fails closed and Profile A suspension remains intact | [`0x9315...0a3a`](https://explorer-bradbury.genlayer.com/tx/0x9315f49d7cbc04e7b11672d73f14be1a684a010c1d6d89849f3bf76d44420a3a), `FINISHED_WITH_ERROR`; post-state verified; finalization pending |
| Successful changed remediation | `reinstate_profile` proposes Profile C; source independently returns `keep`; record becomes active and challenge is replaced by `keep` bound to Profile C | [`0x4fe2...77cd`](https://explorer-bradbury.genlayer.com/tx/0x4fe2ef6410992358ea20bf7eac138095ffdbcdb56db2bf9aab8219f51cd477cd), `FINISHED_WITH_RETURN`; post-state verified; finalization pending |
| Unchanged `reinstate_profile` guard | Rejection before a source fetch | Local Direct Mode coverage complete; optional additional Bradbury receipt |
| Suspended owner release | `release` fails and preserves record plus challenge | Local Direct Mode coverage complete; optional additional Bradbury receipt |
| Frontend identity | Production app displays and calls the matching contract address | Pending |

## Additional lifecycle verification

The one-year lease prevents practical expiry testing on a newly deployed
Bradbury instance. Expiry cleanup and guarded re-registration are therefore
verified in the 18-test Direct Mode suite, where time can be controlled without
changing production constants. They must be described as local deterministic
contract tests, not as Bradbury receipts.

| Scenario | Verified behavior | Evidence |
| --- | --- | --- |
| Expired suspension cleanup | `release_expired` removes the record but preserves the `suspend` tombstone | `tests/test_gns_v2_direct.py` passed |
| Re-registration guard | Unchanged and still-violating registrations fail; changed rebuttal succeeds only after source-backed exact `keep` consensus | `tests/test_gns_v2_direct.py` passed |

Use a real, stable, public HTTPS fixture with a DNS hostname. Placeholder text,
HTTP URLs, local addresses, IP literals, and unverifiable claims are invalid
evidence. Use the versioned synthetic fixture
[`test-evidence/gns-reinstatement-v3-2026.txt`](test-evidence/gns-reinstatement-v3-2026.txt)
through its immutable commit URL:
<https://raw.githubusercontent.com/Manablaq/GNS--genlayer-name-service-/7c1a5b1b7e17fbf475a42a2437e58e61589630f7/docs/test-evidence/gns-reinstatement-v3-2026.txt>.
It explicitly defines a neutral initial profile, a changed profile that remains
subject to the synthetic test policy, and a remediated profile. This separates
ordinary registration moderation from the later source-backed lifecycle test
without making a real-world identity allegation.

## Superseded test-input attempt

Transaction
[`0x07e9...7f15`](https://explorer-bradbury.genlayer.com/tx/0x07e9ca80c973540b7bef963a00a283761ddb3abe35c98b53a1392af96b5b7f15)
used `gns-remediation-v2-2026` with profile text that described an unauthorized
identity claim. Registration moderation classified the profile as
`impersonation`; the transaction ended `UNDETERMINED` / `DISAGREE` with
`FINISHED_WITH_ERROR`. It does not establish a registered record or any part of
the reinstatement regression and must not be submitted as successful evidence.
The neutral, commit-pinned v3 fixture above supersedes that input design.

## Accepted V3 lifecycle receipts

The following sequence is the direct on-chain regression for the August 15
review finding. It uses the immutable v3 fixture and the same name throughout:
`gns-remediation-v3-2026.gen`.

1. The stored Profile A was challenged from the immutable source. Receipt
   `0xf414...5fe7` returned `action=suspend`, `category=impersonation`, and
   `confidence_bps=9500`. The subsequent reads showed a suspended record and
   a challenge bound to the source URL, claim, and exact Profile A snapshot.
2. Receipt `0xe1e8...bec4` called `update_profile` with Profile A unchanged.
   It reached accepted consensus but ended `FINISHED_WITH_ERROR`; subsequent
   reads still showed the original suspended record and challenge. This is the
   reviewer-reported bypass, now rejected before a source-free moderation path
   can reactivate the name.
3. Receipt `0x9315...0a3a` called `reinstate_profile` with changed Profile B.
   The source-backed review returned `suspend / impersonation / 9500` and the
   transaction ended `FINISHED_WITH_ERROR`. The original record and challenge
   remained untouched, proving failed remediation is atomic.
4. Receipt `0x4fe2...77cd` called `reinstate_profile` with remediated Profile
   C. It returned `keep / insufficient_evidence / 9500` with
   `FINISHED_WITH_RETURN`. The record became `active` with Profile C and the
   stored challenge became `keep`, using the same immutable source and the
   new challenged-profile snapshot.

Do not describe these rows as finalized until the explorer marks every cited
receipt finalized. The source-backed state reads, not the outer transaction
label alone, establish each lifecycle assertion.

## Historical follow-up deployment

Contract
[`0x337105406bca6EcAf55bd90F6e65A9e041256A8a`](https://explorer-bradbury.genlayer.com/address/0x337105406bca6EcAf55bd90F6e65A9e041256A8a)
was deployed by
[`0x79db...a28e`](https://explorer-bradbury.genlayer.com/tx/0x79dbac605a59c3b75faec0818ebc1c9a83f2660f3783242fc926c469c099a28e).
That receipt is `ACCEPTED` / `AGREE` / `FINISHED_WITH_RETURN`, and its deployed
source SHA is `f23a89ff1c9146ceab5b55c46d8fd61de70a8494445a182b35a906072dd49b13`.

Transaction
[`0xd9a0...a8c2`](https://explorer-bradbury.genlayer.com/tx/0xd9a032a4b4d19b4cab27c85bd152cbb9452faa598a191d38716a1de0c78da8c2)
registered `gns-remediation-2026.gen` as active after a `safe` result. These are
historical deployment and moderation receipts; they do not prove the current
tombstone or URL-boundary behavior.

Two later calls used placeholder source strings and correctly finished with an
execution error during input validation. They are not evidence of a contract
defect, but they also do not satisfy the source-backed test matrix.

## Historical original V3 evidence

The following receipts belong to
[`0xD7Dfa67bF29D020551f2380d68043e6701b49D3f`](https://explorer-bradbury.genlayer.com/address/0xD7Dfa67bF29D020551f2380d68043e6701b49D3f)
and support only the original V3 behavior:

| Scenario | Evidence | Result |
| --- | --- | --- |
| Registration | <https://explorer-bradbury.genlayer.com/tx/0xbcd7da40ed7a24a5805269c5b35bfd91263b743b50514291b5e844fdc558d8cf> | Active one-year registration after `safe` moderation |
| Profile update | <https://explorer-bradbury.genlayer.com/tx/0x4bfc837c2b2c452284352c10c9939a0be18e3558c0ba7272d9698889792c42b3> | Appealed leader timeout, then accepted profile update |
| Recovery setup | <https://explorer-bradbury.genlayer.com/tx/0xe7df7288f06e99c6eb680af6a206d41559a948bfa06288bba099e6ec016c41a4> | Distinct recovery address configured |
| Source-backed challenge | <https://explorer-bradbury.genlayer.com/tx/0x215a8137eb77b360801200c28d2f955d237943c4b63d25e07f9f95f07f7ce20e> | Finalized `keep`, `insufficient_evidence`, confidence `9500`; record remained active |

## Historical V2

`0x5e7B8F753E38dA96967117F712AcC3f69F4ECdd9` is a superseded V2 resolver. It
does not implement the complete V3 lifecycle or current suspension invariant
and must not be used as evidence for this release.
