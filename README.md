# GNS: GenLayer Name Service

GNS is a full GenLayer application for non-custodial `.gen` names: a user
registers a human-readable name, maintains a public profile and resolved wallet
address, and can receive a direct wallet payment without routing funds through
the registry. The contract does not hold, forward, or settle user payments.

This branch contains the **V3 remediation release** requested during project
review. It adds an evidence-backed public challenge path, leases, release,
delayed recovery, and moderation on every profile update. It must be deployed
as a new Bradbury contract before the frontend is pointed at it.

## Status and public links

| Item | Link or status |
| --- | --- |
| Repository | <https://github.com/Manablaq/GNS--genlayer-name-service-> |
| Current public application | <https://dotgenapp.vercel.app> |
| Verified V3 contract | [`0xD7Dfa67bF29D020551f2380d68043e6701b49D3f`](https://explorer-bradbury.genlayer.com/address/0xD7Dfa67bF29D020551f2380d68043e6701b49D3f) |
| V3 deployment receipt | [`0x6c8e...d382`](https://explorer-bradbury.genlayer.com/tx/0x6c8e7476432b0245039a5661022b17710f15abb63290fde569ec6908ebe0d382), accepted with return |
| V3 finalized source-backed challenge | [`0x215a...e20e`](https://explorer-bradbury.genlayer.com/tx/0x215a8137eb77b360801200c28d2f955d237943c4b63d25e07f9f95f07f7ce20e), stored accepted |
| Previously deployed V2 contract | [`0x5e7B8F753E38dA96967117F712AcC3f69F4ECdd9`](https://explorer-bradbury.genlayer.com/address/0x5e7B8F753E38dA96967117F712AcC3f69F4ECdd9), historical only |

The V3 contract was deployed as a new instance and its submitted bytes match
the repository source at commit `9e50e96`. The checked-in frontend now targets
V3, but the public Vercel application remains a V2 deployment until this branch
is merged and Vercel completes its production build.

## Review remediation

The V3 change set answers every requested item. Detailed rationale and test
mapping are in [the review response](docs/REVIEW_RESPONSE_2026-08-12.md).

| Review request | V3 implementation |
| --- | --- |
| Source-backed entitlement or challenge | `challenge_profile` accepts a public HTTP(S) source and a specific claim. The leader and every validator fetch the source independently and reapply the stored policy. |
| Decision binding | Validators require exact agreement on `action`, `category`, and `confidence_bps` before the resulting challenge can change status. |
| Expiry and release | Every registration has `expires_at`, `renew`, owner `release`, and public `release_expired`. Expired or suspended names no longer resolve. |
| Recovery | Owners configure a recovery address; that address can initiate a transfer to a nominated account. Execution is delayed seven days and owners can cancel. |
| Post-registration moderation | `update_profile` reruns the same strict structured moderation policy before writing profile data. A safe remediation reactivates a suspended, unexpired name. |
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
profile moderation after registration, source-backed suspension, expiry,
renewal, expired release, recovery delay and execution, indexing, transfer, and
pagination. It uses the exact dependency hash declared on line 1 of the
contract.

`genvm-lint` can be run with:

```bash
/Users/mralbert/.venvs/genvm-lint/bin/genvm-lint check contracts/gns.py
```

## Verified Bradbury smoke evidence

| Capability | Transaction or read | Verified outcome |
| --- | --- | --- |
| Deployment/source identity | [`0x6c8e...d382`](https://explorer-bradbury.genlayer.com/tx/0x6c8e7476432b0245039a5661022b17710f15abb63290fde569ec6908ebe0d382) | `ACCEPTED`, `FINISHED_WITH_RETURN`; deployment source SHA-256 is `a1b65bbbec45e5bbebbba2354e73e66d3185f64060e511982cb80a853d289f4e`, matching this repository. |
| Registration moderation | [`0xbcd7...d8cf`](https://explorer-bradbury.genlayer.com/tx/0xbcd7da40ed7a24a5805269c5b35bfd91263b743b50514291b5e844fdc558d8cf) | `gns-v3-bradbury-2026.gen` registered as `active`; consensus approved the initial profile as `safe`. |
| Post-registration moderation | [`0x4bfc...42b3`](https://explorer-bradbury.genlayer.com/tx/0x4bfc837c2b2c452284352c10c9939a0be18e3558c0ba7272d9698889792c42b3) | An initial leader timeout was appealed and the profile update was accepted; the updated bio is stored. |
| Recovery configuration | [`0xe7df...41a4`](https://explorer-bradbury.genlayer.com/tx/0xe7df7288f06e99c6eb680af6a206d41559a948bfa06288bba099e6ec016c41a4) | Recovery address is stored and no recovery transfer is pending. |
| Source-backed challenge | [`0x215a...e20e`](https://explorer-bradbury.genlayer.com/tx/0x215a8137eb77b360801200c28d2f955d237943c4b63d25e07f9f95f07f7ce20e) | **Finalized** with stored accepted outcome: `keep`, `insufficient_evidence`, confidence `9500`; the on-chain record remains `active`. |

## Release sequence

1. Review and merge this branch after the checks below pass.
2. Let Vercel build the merged source, which targets the verified V3 address in `lib/config.ts`.
3. Verify the deployed frontend reads this V3 contract and performs one UI transaction/read smoke test.
4. Keep the prior V2 address labelled as historical evidence only.

## Limits

`.gen` names are records in GNS, not ENS names or legal identity documents.
Moderation and source-backed challenges are policy decisions reached through
GenLayer consensus; they are not a claim that GNS verifies off-chain identity.
Bradbury is testnet infrastructure and this project has not been presented as a
production security audit.
