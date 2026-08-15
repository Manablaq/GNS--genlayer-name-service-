# GNS V3 Bradbury evidence

This is the canonical evidence map for the V3 remediation release and the
August 15 source-backed reinstatement correction. Deployment/source identity is
verified below. The suspension/reinstatement behavior receipts remain an
explicit release gate and must be added before resubmission.

## Corrected V3 contract

| Item | Public evidence |
| --- | --- |
| Contract | <https://explorer-bradbury.genlayer.com/address/0x337105406bca6EcAf55bd90F6e65A9e041256A8a> |
| Deployment | <https://explorer-bradbury.genlayer.com/tx/0x79dbac605a59c3b75faec0818ebc1c9a83f2660f3783242fc926c469c099a28e> |
| Source identity | Deployment calldata contains `contracts/gns.py` byte-for-byte; SHA-256 `f23a89ff1c9146ceab5b55c46d8fd61de70a8494445a182b35a906072dd49b13`. |
| Repository | <https://github.com/Manablaq/GNS--genlayer-name-service-> |

The deployment receipt is `ACCEPTED` / `AGREE` / `FINISHED_WITH_RETURN`. Initial
moderation was also verified on the corrected deployment: transaction
[`0xd9a0...a8c2`](https://explorer-bradbury.genlayer.com/tx/0xd9a032a4b4d19b4cab27c85bd152cbb9452faa598a191d38716a1de0c78da8c2)
registered `gns-remediation-2026.gen` as an active record after a `safe` result.

## Corrected reinstatement regression

Status: **pending**. The public evidence fixture is
[`docs/test-evidence/gns-remediation-2026.txt`](test-evidence/gns-remediation-2026.txt).
Do not present the two failed placeholder-URL calls as contract defects or as
completed challenge evidence; they failed input validation before a source
could be fetched. The final evidence set must include:

1. a source-backed suspension using the public raw fixture URL;
2. a blocked generic or unchanged profile update;
3. a successful changed-profile reinstatement with consistent `get_record` and
   `get_challenge` reads; and
4. a failed reinstatement that leaves both states suspended.

## Historical V3 smoke evidence

The following receipts belong to the prior V3 deployment
[`0xD7Dfa67bF29D020551f2380d68043e6701b49D3f`](https://explorer-bradbury.genlayer.com/address/0xD7Dfa67bF29D020551f2380d68043e6701b49D3f).
They remain valid evidence for lifecycle, recovery, update moderation, and the
original source-backed challenge, but not for the corrected reinstatement
invariant.

| Scenario | Evidence | Result |
| --- | --- | --- |
| Initial moderation and registration | <https://explorer-bradbury.genlayer.com/tx/0xbcd7da40ed7a24a5805269c5b35bfd91263b743b50514291b5e844fdc558d8cf> | Accepted registration of `gns-v3-bradbury-2026.gen`; profile approved as `safe`; lease is active. |
| Post-registration profile moderation | <https://explorer-bradbury.genlayer.com/tx/0x4bfc837c2b2c452284352c10c9939a0be18e3558c0ba7272d9698889792c42b3> | Initial leader timeout was appealed. The final outcome accepted the profile update with category `safe`; the updated bio is persisted. |
| Recovery configuration | <https://explorer-bradbury.genlayer.com/tx/0xe7df7288f06e99c6eb680af6a206d41559a948bfa06288bba099e6ec016c41a4> | Accepted setup of a distinct recovery address; the record exposes `recovery_configured: true` and no pending transfer. |
| Source-backed challenge | <https://explorer-bradbury.genlayer.com/tx/0x215a8137eb77b360801200c28d2f955d237943c4b63d25e07f9f95f07f7ce20e> | **Finalized**, stored accepted. Validators independently reviewed the public source and bound `action=keep`, `category=insufficient_evidence`, and `confidence_bps=9500`; the record remains `active`. |

The challenge stored this public source URL:

<https://raw.githubusercontent.com/Manablaq/GNS--genlayer-name-service-/review-v3-remediation/README.md>

## Historical V2 deployment

`0x5e7B8F753E38dA96967117F712AcC3f69F4ECdd9` is the previous V2 resolver.
It does not implement V3 expiry, release, recovery, post-registration
moderation, or source-backed challenges. It remains historical evidence only and
must not be used to support the V3 remediation claims.

## Frontend release status

The checked-in frontend configuration targets the corrected V3 contract. The
public application remains <https://dotgenapp.vercel.app> until this branch is
committed, pushed, and Vercel completes its production build. Verify the live
application reports `0x337105406bca6EcAf55bd90F6e65A9e041256A8a`
before resubmitting the project.
