# GNS: GenLayer Name Service

GNS is a full GenLayer application for non-custodial `.gen` names: a user
registers a human-readable name, maintains a public profile and resolved wallet
address, and can receive a direct wallet payment without routing funds through
the registry. The contract does not hold, forward, or settle user payments.

This branch contains the **V3 remediation release** and the August 15 reviewer
follow-up. It adds an evidence-backed public challenge path, leases, release,
delayed recovery, moderation on every profile update, and source-backed
reinstatement that cannot bypass a stored suspension. The corrected source is
deployed on Bradbury; the end-to-end suspension and reinstatement smoke test is
the remaining release gate before resubmission.

## Status and public links

| Item | Link or status |
| --- | --- |
| Repository | <https://github.com/Manablaq/GNS--genlayer-name-service-> |
| Current public application | <https://dotgenapp.vercel.app> |
| Corrected V3 contract | [`0x337105406bca6EcAf55bd90F6e65A9e041256A8a`](https://explorer-bradbury.genlayer.com/address/0x337105406bca6EcAf55bd90F6e65A9e041256A8a) |
| Corrected deployment receipt | [`0x79db...a28e`](https://explorer-bradbury.genlayer.com/tx/0x79dbac605a59c3b75faec0818ebc1c9a83f2660f3783242fc926c469c099a28e), accepted with return |
| Prior V3 contract | [`0xD7Dfa67bF29D020551f2380d68043e6701b49D3f`](https://explorer-bradbury.genlayer.com/address/0xD7Dfa67bF29D020551f2380d68043e6701b49D3f), historical for this follow-up |
| Prior V3 finalized source-backed challenge | [`0x215a...e20e`](https://explorer-bradbury.genlayer.com/tx/0x215a8137eb77b360801200c28d2f955d237943c4b63d25e07f9f95f07f7ce20e), historical behavior evidence |
| Previously deployed V2 contract | [`0x5e7B8F753E38dA96967117F712AcC3f69F4ECdd9`](https://explorer-bradbury.genlayer.com/address/0x5e7B8F753E38dA96967117F712AcC3f69F4ECdd9), historical only |

The corrected deployment calldata contains `contracts/gns.py` byte-for-byte.
The source SHA-256 is
`f23a89ff1c9146ceab5b55c46d8fd61de70a8494445a182b35a906072dd49b13`.
The frontend configuration now targets this corrected contract. The prior V3
deployment remains useful historical evidence, but it does not contain the
source-backed reinstatement fix described below.

## Review remediation

The change set addresses the original request and its reinstatement follow-up.
Detailed rationale and test mapping are in the
[August 12 response](docs/REVIEW_RESPONSE_2026-08-12.md) and
[August 15 follow-up](docs/REVIEW_RESPONSE_2026-08-15.md).

| Review request | V3 implementation |
| --- | --- |
| Source-backed entitlement or challenge | `challenge_profile` accepts a public HTTP(S) source and a specific claim. The leader and every validator fetch the source independently and reapply the stored policy. |
| Decision binding | Validators require exact agreement on `action`, `category`, and `confidence_bps` before the resulting challenge can change status. |
| Expiry and release | Every registration has `expires_at`, `renew`, owner `release`, and public `release_expired`. Expired or suspended names no longer resolve. |
| Recovery | Owners configure a recovery address; that address can initiate a transfer to a nominated account. Execution is delayed seven days and owners can cancel. |
| Post-registration moderation | `update_profile` reruns strict structured moderation for active records, rejects suspended records, and requires expired records to renew first. `reinstate_profile` requires changed profile data, independently refetches the stored challenge source, reapplies the prior finding to the proposed profile, and requires exact agreement on `action`, `category`, and `confidence_bps`. |
| Direct Mode test repair | Direct Mode uses the supported `direct_vm.run_validator()` interface and no longer reads private mock internals. |

## Contract design

The implementation is [contracts/gns.py](contracts/gns.py). `NameRecord` holds
the owner, resolver destination, bounded profile fields, expiry, recovery state,
and a lifecycle status. Owner-name indexing uses maintained `TreeMap` slots and
swap-and-pop removal, so owner pagination never scans global records.

### Lifecycle

1. `register` gives the sender a one-year lease after name and initial profile moderation.
2. `renew` extends from the later of the current expiry or the current transaction time.
3. `release` lets the owner delete a record immediately. After expiry, anyone can call `release_expired`.
4. `set_recovery` records a distinct recovery address. `initiate_recovery` starts a seven-day delay; `cancel_recovery` stops it; `execute_recovery` transfers ownership after the delay and clears recovery state.
5. `resolve` and `reverse_resolve` return a usable recipient only while the record is active. `get_record` still exposes lifecycle state so owners can renew or remediate it.

### Moderation and public challenges

Initial registrations and profile updates serialize bounded public fields and
run nested leader/validator functions. The validator independently performs the
same policy evaluation, then compares the outcome fields that control storage.

`challenge_profile` adds a source-backed moderation route. It validates a
credential-free public HTTP(S) URL and a bounded claim, fetches the source in
each independent evaluation, truncates evidence to a fixed size, and asks the
policy to produce only a strict result schema. Only a matching `suspend` result
records the challenge and pauses resolution. The stored challenge exposes the
source, claim, decision, category, confidence, summary, and timestamp.

A suspension cannot be cleared through `update_profile`. The owner must call
`reinstate_profile` with at least one changed profile field. The leader and each
validator independently refetch the original challenge source and evaluate the
stored claim against the proposed profile. Reinstatement succeeds only on an
exact `keep` consensus. The profile and challenge are then updated together;
every rejection or disagreement leaves both stored states unchanged.

No writes, emits, or contract calls occur inside a non-deterministic callback.
This follows GenLayer's guidance that leaders and validators independently fetch
web data and that consensus should compare stable, consequential derived fields.

## Application routes

| Route | Purpose |
| --- | --- |
| `/` | Availability search and registration |
| `/name/[name]` | Public profile, lifecycle state, evidence challenge, owner controls, and recovery controls |
| `/my-names` | Paginated owner dashboard with lifecycle status |
| `/send` | Resolve, review, reread, and send GEN directly from the connected wallet |
| `/api/contract` | Allowlisted server-side read bridge |

The frontend confirms a submitted contract write only after the Bradbury receipt
is successful and a method-specific read proves the expected result. For
example, a challenge must produce the submitted source and claim in
`get_challenge`; a release must make the name available; and a renewal must
advance `expires_at`.

## Local development and verification

Requirements: Node.js 20+, Python 3.12+, and a wallet configured for Bradbury
when manually deploying.

```bash
npm install
python3.12 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt

npm run lint
npm test
python3 -m unittest tests/test_gns_v2.py -v
.venv/bin/pytest tests/test_gns_v2_direct.py -v
npm run build
```

The Direct Mode suite covers independent validator agreement and disagreement,
profile moderation after registration, source-backed suspension, rejected
unchanged updates, successful changed-profile reinstatement, failed
reinstatement with atomic state preservation, expiry, renewal, expired release,
recovery delay and execution, indexing, transfer, and pagination. It uses the
exact dependency hash declared on line 1 of the contract.

`genvm-lint` can be run with:

```bash
/Users/mralbert/.venvs/genvm-lint/bin/genvm-lint check contracts/gns.py
```

## Bradbury evidence

| Capability | Transaction or read | Verified outcome |
| --- | --- | --- |
| Corrected deployment/source identity | [`0x79db...a28e`](https://explorer-bradbury.genlayer.com/tx/0x79dbac605a59c3b75faec0818ebc1c9a83f2660f3783242fc926c469c099a28e) | `ACCEPTED`, `AGREE`, `FINISHED_WITH_RETURN`; deployed source is byte-identical to `contracts/gns.py` with SHA-256 `f23a89ff1c9146ceab5b55c46d8fd61de70a8494445a182b35a906072dd49b13`. |
| Corrected registration moderation | [`0xd9a0...a8c2`](https://explorer-bradbury.genlayer.com/tx/0xd9a032a4b4d19b4cab27c85bd152cbb9452faa598a191d38716a1de0c78da8c2) | `gns-remediation-2026.gen` registered as `active`; consensus approved the initial profile as `safe`. |
| Prior V3 lifecycle smoke tests | [canonical evidence map](docs/SUBMISSION_EVIDENCE.md#historical-v3-smoke-evidence) | Registration, profile moderation, recovery, and source-backed challenge were verified on the historical V3 deployment. |
| Corrected reinstatement regression | Pending | Requires a public HTTPS evidence fixture, a source-backed suspension, a blocked generic/no-op update, successful changed-profile reinstatement, and a failed reinstatement that preserves both states. |

## Follow-up release status

- [x] Deploy `contracts/gns.py` as a new Bradbury instance and verify exact source identity.
- [x] Update `lib/config.ts` to the corrected contract address.
- [x] Rerun static, Direct Mode, frontend, production-build, and GenVM safety-lint checks after merging remote changes.
- [ ] Rerun GenVM SDK semantic validation when the linter artifact includes pinned dependency `1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`; linter `0.11.0` currently reports that archive member as unavailable.
- [ ] Exercise suspension, blocked generic/no-op updates, changed-profile reinstatement, and failed-reinstatement state preservation on Bradbury.
- [ ] Deploy the matching frontend and replace historical submission links with the corrected regression receipts.

## Limits

`.gen` names are records in GNS, not ENS names or legal identity documents.
Moderation and source-backed challenges are policy decisions reached through
GenLayer consensus; they are not a claim that GNS verifies off-chain identity.
Bradbury is testnet infrastructure and this project has not been presented as a
production security audit.
