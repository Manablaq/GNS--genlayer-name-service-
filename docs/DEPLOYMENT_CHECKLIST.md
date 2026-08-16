# GNS release and deployment checklist

This checklist prevents source, deployment, frontend, and evidence drift. Do
not skip a gate and do not replace a failed gate with narrative evidence.

## 1. Freeze and verify source

```bash
npm run lint
npm test
python3 -m unittest tests/test_gns_v2.py -v
.venv/bin/pytest tests/test_gns_v2_direct.py -q
npm run build -- --webpack
npm audit --omit=dev
GENVM_VERSION=v0.3.0-rc4 \
  /Users/mralbert/.venvs/genvm-lint/bin/genvm-lint check contracts/gns.py
git diff --check
shasum -a 256 contracts/gns.py
git status --short
```

Expected source SHA for this candidate:
`fcd91e87b8bd9e6408a31539f72e5cb689444e3f32da29e27fd0ca0beafb6ed2`.

Commit and push before deployment. The commit must contain the same source that
will be pasted or supplied to GenLayer Studio.

## 2. Deploy a new instance

Completed for the current release:

- Contract: [`0x676561784d0864EaFF87F281bA1Af9E2c2e9F090`](https://explorer-bradbury.genlayer.com/address/0x676561784d0864EaFF87F281bA1Af9E2c2e9F090)
- Deployment: [`0x4f85...fec67`](https://explorer-bradbury.genlayer.com/tx/0x4f85b4464ee957244d8066d1748176f27a49ea7a8f9a193936e01cf24ddfec67)
- Result: `ACCEPTED` / `AGREE` / `FINISHED_WITH_RETURN`
- Source identity: byte-identical 49,106-byte payload; verified SHA-256
  `fcd91e87b8bd9e6408a31539f72e5cb689444e3f32da29e27fd0ca0beafb6ed2`

The steps below document the completed identity gate and remain the required
procedure for any later deployment:

1. Deploy `contracts/gns.py` to Bradbury as a new contract.
2. Wait for `ACCEPTED` / `AGREE` / `FINISHED_WITH_RETURN`.
3. Download or inspect the deployment calldata.
4. Verify the deployed source is byte-identical and has the expected SHA.
5. Record the contract and transaction links in `SUBMISSION_EVIDENCE.md`.

Do not upgrade or reuse `0x337...`; it predates this release candidate.

## 3. Run the on-chain regression

Use the fresh name `gns-remediation-v3-2026` and this immutable public HTTPS
fixture:
<https://raw.githubusercontent.com/Manablaq/GNS--genlayer-name-service-/7c1a5b1b7e17fbf475a42a2437e58e61589630f7/docs/test-evidence/gns-reinstatement-v3-2026.txt>.
Use the exact synthetic profiles defined in that fixture so the expected
`suspend`, failed-remediation, and `keep` outcomes are independently auditable.

The initial registration must use neutral profile A exactly as written. The
source fixture, not the registration fields, defines the controlled policy
consequence. Do not place words such as `unauthorized`, `impersonation`, or
`deceptive` in the profile itself because ordinary registration moderation is
a separate gate and may correctly reject those claims before the lifecycle
regression begins.

1. Register a profile and verify `active`.
2. Challenge it with source material that supports suspension.
3. Verify the challenge stores `action=suspend`, the exact source and claim,
   confidence, and the challenged profile snapshot.
4. Attempt generic `update_profile`; verify rejection and unchanged reads.
5. Attempt unchanged `reinstate_profile`; verify rejection and unchanged reads.
6. Attempt a changed profile that the evidence still contradicts; verify it
   remains suspended with no partial write.
7. Submit a changed profile that rebuts the finding; verify exact `keep`
   consensus and consistent active record/challenge reads.
8. Before successful reinstatement, verify owner `release` fails and preserves
   both the suspended record and challenge.

Wait for finalization before using any receipt in a submission.

The one-year production lease makes expiry impractical to exercise on a fresh
Bradbury deployment. Verify expiry cleanup, preserved tombstones, and guarded
re-registration in Direct Mode with controlled time. Report those results as
local contract tests, never as on-chain receipts.

## 4. Bind the frontend

1. Set `CONTRACT_ADDRESS` in `lib/config.ts` to the new accepted address.
2. Run lint, tests, the dependency audit, and the production webpack build
   again.
3. Commit and push the address update.
4. Deploy the public frontend.
5. Verify registration, challenge, remediation, release guard, reads, wallet
   writes, and transaction links against the new address.
6. Confirm the live app visibly reports that address.

## 5. Final evidence audit

- Repository source SHA equals deployment source SHA.
- Repository branch and commit are public.
- Every claimed transaction is finalized.
- Every transaction link targets the new contract.
- Frontend and explorer links are live without authentication.
- Test report distinguishes local verification from on-chain evidence.
- Historical deployments are labeled historical.
- No placeholder, private, local, or HTTP evidence source is cited.
- The submission describes limitations without claiming identity proof or a
  production security audit.
