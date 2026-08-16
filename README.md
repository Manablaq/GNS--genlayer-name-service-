# GNS: GenLayer Name Service

GNS is a complete GenLayer application for non-custodial `.gen` names. A user
can register a human-readable name, publish a bounded profile, resolve it to a
wallet, configure delayed recovery, and send GEN directly wallet-to-wallet.
The registry never holds or forwards payment funds.

This repository contains the V3 remediation release for the August 15, 2026
review. The release closes both the reported no-op profile-update bypass and
the related release/re-registration bypass. It has passed the local contract,
Direct Mode, frontend, build, and GenVM verification gates documented below.
Its byte-identical source is deployed on Bradbury; the full on-chain lifecycle
regression remains required before resubmission.

## Release status

| Item | Status |
| --- | --- |
| Repository | <https://github.com/Manablaq/GNS--genlayer-name-service-> |
| Public application | <https://dotgenapp.vercel.app> |
| Release source | [`contracts/gns.py`](contracts/gns.py) |
| Release source SHA-256 | `fcd91e87b8bd9e6408a31539f72e5cb689444e3f32da29e27fd0ca0beafb6ed2` |
| Matching Bradbury contract | [`0x676561784d0864EaFF87F281bA1Af9E2c2e9F090`](https://explorer-bradbury.genlayer.com/address/0x676561784d0864EaFF87F281bA1Af9E2c2e9F090) |
| Matching deployment | [`0x4f85...fec67`](https://explorer-bradbury.genlayer.com/tx/0x4f85b4464ee957244d8066d1748176f27a49ea7a8f9a193936e01cf24ddfec67), `ACCEPTED` / `AGREE` / `FINISHED_WITH_RETURN` |
| On-chain regression matrix | **Pending** |
| Production frontend binding | **Pending redeployment** |
| Prior follow-up contract | [`0x337105406bca6EcAf55bd90F6e65A9e041256A8a`](https://explorer-bradbury.genlayer.com/address/0x337105406bca6EcAf55bd90F6e65A9e041256A8a), historical only |
| Prior follow-up deployment | [`0x79db...a28e`](https://explorer-bradbury.genlayer.com/tx/0x79dbac605a59c3b75faec0818ebc1c9a83f2660f3783242fc926c469c099a28e), historical only |
| Original V3 contract | [`0xD7Dfa67bF29D020551f2380d68043e6701b49D3f`](https://explorer-bradbury.genlayer.com/address/0xD7Dfa67bF29D020551f2380d68043e6701b49D3f), historical only |

The checked-in frontend targets the matching `0x6765...F090` deployment. The
public application must be redeployed and verified before it is cited as
matching evidence.

## What the review changed

The reviewer identified that a suspended owner could call `update_profile`
with unchanged fields, obtain a source-free `safe` result, and reactivate the
name without rebutting the stored evidence. The completed audit also found a
second route: deleting an expired suspended record could otherwise make the
name available for ordinary source-free registration.

The release enforces one lifecycle invariant:

> A `suspend` finding remains attached to the name until changed profile data
> passes an independent review of the original source and claim.

| Path | Enforced behavior |
| --- | --- |
| `update_profile` | Rejects suspended records before nondeterministic work. |
| `reinstate_profile` | Requires changed profile data, refetches the stored source, reapplies the stored claim, and requires exact validator agreement on `action`, `category`, and `confidence_bps`. |
| Owner `release` | Rejects suspended records, so evidence cannot be erased. |
| `release_expired` | May remove an expired record, but preserves a suspension tombstone containing the source, claim, and challenged profile snapshot. |
| `register` after a suspension tombstone | Rejects unchanged data and performs the same source-backed independent review before recreating an active record. |
| Failed or disagreeing review | Writes neither the proposed record nor a replacement challenge. |

The record and challenge move together only after consensus. Successful
reinstatement stores an active record and a matching `keep` decision;
unsuccessful remediation preserves the previous `suspend` state.

## Source-backed consensus

`challenge_profile` accepts a specific claim and a credential-free public
HTTPS source using a DNS hostname. Plain HTTP, localhost, IP literals,
single-label hosts, credentials, malformed ports, and malformed DNS labels are
rejected before nondeterministic execution.

The leader and every validator independently:

1. fetch the registered source;
2. apply the same registered policy to the same profile snapshot;
3. parse a bounded result with an allowed action, category, confidence level,
   and summary; and
4. compare every field that can change lifecycle state.

Validators require exact equality on `action`, `category`, and
`confidence_bps`. No storage write, transfer, emit, or contract call occurs
inside a nondeterministic callback. Storage changes happen only after the
consensus result has passed strict validation.

## Lifecycle

1. `register` creates a one-year lease after name and profile moderation.
2. `renew` extends from the later of the current expiry or current time and
   never clears suspension.
3. `release` removes an ordinary owner record; `release_expired` performs public
   expiry cleanup while preserving suspension evidence.
4. `set_recovery`, `initiate_recovery`, `cancel_recovery`, and
   `execute_recovery` implement a seven-day, cancelable recovery delay.
5. `resolve` and `reverse_resolve` return a recipient only for active,
   unexpired records.

Owner-name indexing uses maintained `TreeMap` slots and swap-and-pop removal,
so paginated ownership reads never scan all registrations.

## Application routes

| Route | Purpose |
| --- | --- |
| `/` | Availability search, suspension-tombstone detection, and registration or remediation |
| `/name/[name]` | Profile, lifecycle, challenge history, release guards, recovery, and owner controls |
| `/my-names` | Bounded owner-name pagination |
| `/send` | Resolve, reread, and send GEN directly from the connected wallet |
| `/api/contract` | Allowlisted server-side read bridge |

The transaction manager marks a write complete only after a successful
Bradbury receipt and a method-specific state read. Reinstatement confirmation,
for example, requires both `record.status == "active"` and
`challenge.action == "keep"`.

## Local verification

Requirements: Node.js 20+, Python 3.12+, Docker for GenLayer Direct Mode, and a
wallet configured for Bradbury for manual deployment.

```bash
npm install
python3.12 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt

npm run lint
npm test
python3 -m unittest tests/test_gns_v2.py -v
.venv/bin/pytest tests/test_gns_v2_direct.py -q
npm run build -- --webpack
npm audit --omit=dev
GENVM_VERSION=v0.3.0-rc4 \
  /Users/mralbert/.venvs/genvm-lint/bin/genvm-lint check contracts/gns.py
git diff --check
```

Current automated coverage:

- 26 frontend and transaction-state tests;
- 29 parser, structure, URL-boundary, and lifecycle model tests;
- 18 Direct Mode contract tests; and
- GenVM lint plus semantic validation of all 22 public methods; and
- a production webpack build and dependency audit with zero known
  vulnerabilities.

The Direct Mode suite includes source-backed suspension, generic/no-op update
rejection, changed-profile reinstatement, failed remediation with atomic state
preservation, blocked owner release, expiry cleanup with a preserved tombstone,
and both rejected and accepted source-backed re-registration.

The Bradbury regression uses a commit-pinned synthetic evidence fixture with
explicit violating and remediated profiles. It does not make a real-world
identity allegation, and its content cannot drift when the repository branch
changes.

## Deployment and evidence

Follow [`docs/DEPLOYMENT_CHECKLIST.md`](docs/DEPLOYMENT_CHECKLIST.md) exactly.
The canonical reviewer response is
[`docs/REVIEW_RESPONSE_2026-08-15.md`](docs/REVIEW_RESPONSE_2026-08-15.md), and
public receipts belong in
[`docs/SUBMISSION_EVIDENCE.md`](docs/SUBMISSION_EVIDENCE.md).

The source, source hash, Bradbury deployment calldata, frontend contract
address, and submission link must all identify the same build. A local test or
historical receipt is never presented as evidence for a newer source revision.

## Limits

`.gen` entries are application records, not ENS names, credentials, or legal
identity documents. Moderation outcomes are policy decisions reached through
GenLayer consensus, not proof of a person's identity. Bradbury is testnet
infrastructure, and this repository is not represented as a production
security audit.
