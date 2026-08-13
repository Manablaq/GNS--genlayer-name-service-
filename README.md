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
| Previously deployed V2 contract | [`0x5e7B8F753E38dA96967117F712AcC3f69F4ECdd9`](https://explorer-bradbury.genlayer.com/address/0x5e7B8F753E38dA96967117F712AcC3f69F4ECdd9) |
| V3 deployment | Pending. Do not represent the V2 address as V3 evidence. |

The deployed V2 address remains documented as historical project evidence, but
it does not implement this remediation. Deployment and frontend configuration
instructions are below; replace the configured address only after the V3
deployment transaction is accepted.

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

## Deployment sequence

1. In GenLayer Studio, load `contracts/gns.py` and deploy a **new** instance on Bradbury. Do not upgrade the prior V2 instance.
2. Wait for an accepted deployment receipt and record the new address and transaction hash.
3. Run the contract smoke sequence in Studio: register a safe name, update its profile, configure recovery, submit one source-backed challenge, and read `get_record` and `get_challenge`.
4. Replace `CONTRACT_ADDRESS` in `lib/config.ts` with the new V3 address, update the public evidence documents with the new accepted receipt, then deploy the frontend.
5. Re-run the frontend transaction smoke checks against that V3 address. The old deployment must remain labelled V2/history.

## Limits

`.gen` names are records in GNS, not ENS names or legal identity documents.
Moderation and source-backed challenges are policy decisions reached through
GenLayer consensus; they are not a claim that GNS verifies off-chain identity.
Bradbury is testnet infrastructure and this project has not been presented as a
production security audit.
