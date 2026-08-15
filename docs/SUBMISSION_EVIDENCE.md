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
| Matching public application | **Pending redeployment and verification** |
| Repository | <https://github.com/Manablaq/GNS--genlayer-name-service-> |

Do not resubmit while the application binding or any required regression row
is pending. The deployment calldata contains this exact source, and the
checked-in frontend configuration points to the accepted contract.

## Required Bradbury regression matrix

Record finalized explorer links and post-state reads for every row:

| Scenario | Required proof | Status |
| --- | --- | --- |
| Deployment identity | Accepted deployment; calldata contains the byte-identical release source and its SHA equals the repository SHA | Verified: [`0x4f85...fec67`](https://explorer-bradbury.genlayer.com/tx/0x4f85b4464ee957244d8066d1748176f27a49ea7a8f9a193936e01cf24ddfec67) |
| Initial registration | Active record after moderated registration | Pending |
| Source-backed suspension | `get_record.status == "suspended"`; `get_challenge.action == "suspend"`; source, claim, confidence, and challenged profile are stored | Pending |
| Generic/no-op bypass rejection | `update_profile` and unchanged `reinstate_profile` fail; both reads remain unchanged | Pending |
| Failed changed remediation | Source still supports suspension; transaction fails closed and both reads remain suspended | Pending |
| Successful changed remediation | Exact `keep` consensus; record becomes active and challenge becomes `keep` for the accepted snapshot | Pending |
| Suspended owner release | `release` fails and preserves record plus challenge | Pending |
| Expired suspension cleanup | `release_expired` removes the record but preserves the `suspend` tombstone | Pending |
| Re-registration guard | Unchanged and still-violating registrations fail; changed rebuttal succeeds only after source-backed exact `keep` consensus | Pending |
| Frontend identity | Production app displays and calls the matching contract address | Pending |

Use a real, stable, public HTTPS fixture with a DNS hostname. Placeholder text,
HTTP URLs, local addresses, IP literals, and unverifiable claims are invalid
evidence. The repository fixture is
[`test-evidence/gns-remediation-2026.txt`](test-evidence/gns-remediation-2026.txt);
publish and verify its raw GitHub URL before testing.

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
