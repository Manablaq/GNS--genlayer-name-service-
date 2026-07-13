# Professional reviewer fix evidence map

Deployment, source identity, registration, and the listed read paths are verified
for the final corrected GNS V2 deployment. Unexecuted lifecycle scenarios remain
unverified.

## Deployment history

- Rejected legacy contract: `0x15Ca354C73D7f8Ffa02a1e644dCDf41958a7b8A2`.
  This retired custodial design is historical evidence only.
- First GNS V2 deployment: `0xE97158b59B7D80F2c911b90906690B3B57722eb8`.
  Two registrations ended in `LEADER_TIMEOUT`; this deployment is superseded and
  was never registration-verified.
- Final corrected GNS V2 deployment:
  `0x5e7B8F753E38dA96967117F712AcC3f69F4ECdd9`. This is the active deployment and
  is deployment-, source-, registration-, and read-verified.

## Bradbury nondeterministic callable A/B

The controlled same-prompt, same-input, same-schema, same-validation A/B produced
`ACCEPTED` / `AGREE` for nested functions and `UNDETERMINED` / `NO_MAJORITY` for
module-level callable classes with bound `__call__` methods. The corrected GNS
source uses nested `leader_fn` and `validator_fn` directly inside `register` and
subsequently registered and indexed `sundayalbert.gen` successfully.

This evidence isolates callable shape as the meaningful tested difference. It
does not prove the exact internal GenVM mechanism. Full probe addresses, hashes,
and results are retained in `BRADBURY_NONDET_AB.md`.

## Schema and source identity

The deployed source SHA-256 is
`70c3906b73bae54e6669f79b4d332e72b63fe167902c21f1ae5850c85fec4d9f`, matching
`contracts/gns.py`. Bradbury exposes exactly 11 public methods: 6 views and 5
non-payable writes. There is no `send_to_name`, `withdraw`, `get_balance`, balance
ledger, or `total_transferred` API.

## Final Bradbury verification

| Check | Evidence | Status |
|---|---|---|
| Deployment receipt | `0xa38b409b62dcb45d40c7abdb1c728c5cfd5f8d5346b6366835ab53dc68bc7565`: `ACCEPTED` / `AGREE` / `FINISHED_WITH_RETURN` | VERIFIED |
| Deployed source hash | SHA-256 matches `contracts/gns.py` | VERIFIED |
| Registration consensus and execution | `0xcb816e67df3ddbf310b804691f42cd3b8c4e4da455f8777a8f1a78c37035ba76`: `ACCEPTED` / `AGREE` / `FINISHED_WITH_RETURN`; approved `true`, category `safe` | VERIFIED |
| Availability | `is_available("sundayalbert") == false` | VERIFIED |
| Forward resolution | Found with `0x5bB49021001200fE8156a81c7fcF097e535e7181` | VERIFIED |
| Complete record | Owner, resolved address, and profile fields matched | VERIFIED |
| Reverse resolution | `sundayalbert.gen` | VERIFIED |
| Owner pagination/index | `total=1`, `names=["sundayalbert.gen"]` | VERIFIED |
| Total-name statistics | `total_names=1` | VERIFIED |
| Profile update, set-address, primary change, transfer | Not separately executed | UNVERIFIED |

## Finding map

| Finding | V2 correction | Automated evidence | Deployment/manual scope |
|---|---|---|---|
| Custodial payment design | Resolver-only; no payment or balance API | `StructureTests.test_no_custody_surface` | Deployed schema VERIFIED |
| Unsafe name validation/moderation | Strict ASCII canonicalizer, bounded canonical-only payload, nested nondeterministic functions, strict fail-closed result validation | Parser, AST/source, and Direct Mode tests | `sundayalbert.gen` moderation VERIFIED; other names not manually exercised |
| Format-only validator settlement | Validators independently moderate and exact-match approval/category | `test_semantic_consensus_language_and_comparison` | Successful registration consensus VERIFIED |
| Unbounded ownership lookup | Maintained owner slots/reverse positions with 50-item pagination | `test_direct_bounded_owner_index`, `OwnerIndexModelTests` | Registered owner's first page VERIFIED |
| Unsafe ownership/address lifecycle | Typed nonzero `Address`, swap-and-pop transfer, resolution reset, primary cleanup | Typed-storage and transfer model tests | Registration owner/address VERIFIED; updates and transfer UNVERIFIED |

The archived legacy source and the first V2 deployment remain available as
historical reviewer evidence. They are not active frontend targets.
