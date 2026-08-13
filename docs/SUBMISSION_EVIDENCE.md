# GNS V3 Bradbury evidence

This is the canonical evidence map for the V3 remediation release. It separates
the verified V3 contract from the historical V2 deployment and does not claim
that the existing Vercel site has switched until the V3-configured branch is
merged and deployed.

## Verified V3 contract

| Item | Public evidence |
| --- | --- |
| Contract | <https://explorer-bradbury.genlayer.com/address/0xD7Dfa67bF29D020551f2380d68043e6701b49D3f> |
| Deployment | <https://explorer-bradbury.genlayer.com/tx/0x6c8e7476432b0245039a5661022b17710f15abb63290fde569ec6908ebe0d382> |
| Source identity | V3 deployment source SHA-256: `a1b65bbbec45e5bbebbba2354e73e66d3185f64060e511982cb80a853d289f4e`; exact match with commit `9e50e96` / `contracts/gns.py`. |
| Repository | <https://github.com/Manablaq/GNS--genlayer-name-service-/tree/review-v3-remediation> |

The deployment receipt is `ACCEPTED` / `AGREE` / `FINISHED_WITH_RETURN`.

## On-chain V3 smoke evidence

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

The checked-in frontend configuration targets V3. The public application remains
<https://dotgenapp.vercel.app> until this branch is merged and Vercel completes
its production build. After that deployment, verify the live application against
the V3 contract address before resubmitting the project.
