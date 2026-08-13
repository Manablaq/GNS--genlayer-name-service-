# Historical GNS V2 submission evidence

> This evidence applies only to the previously deployed V2 contract. The V3
> remediation has not yet been deployed at the time of this document update;
> do not use this address or receipt as evidence for V3 features. See
> [REVIEW_RESPONSE_2026-08-12.md](REVIEW_RESPONSE_2026-08-12.md).

This document is the canonical evidence map for the active GNS project on
GenLayer Bradbury Testnet. It intentionally separates active, reproducible
evidence from retired historical deployments.

## Active release

| Item | Public evidence |
| --- | --- |
| Live application | <https://dotgenapp.vercel.app> |
| Repository | <https://github.com/Manablaq/GNS--genlayer-name-service-> |
| Active resolver contract | <https://explorer-bradbury.genlayer.com/address/0x5e7B8F753E38dA96967117F712AcC3f69F4ECdd9> |
| Deployment transaction | <https://explorer-bradbury.genlayer.com/tx/0xa38b409b62dcb45d40c7abdb1c728c5cfd5f8d5346b6366835ab53dc68bc7565> |
| Successful registration | <https://explorer-bradbury.genlayer.com/tx/0xcb816e67df3ddbf310b804691f42cd3b8c4e4da455f8777a8f1a78c37035ba76> |

The active contract is `0x5e7B8F753E38dA96967117F712AcC3f69F4ECdd9`. The
successful registration transaction registered `sundayalbert.gen` through
GenLayer validator consensus. Contract reads then confirmed availability,
forward resolution, complete record fields, reverse resolution, owner-index
pagination, and total-name statistics.

## What GNS does

GNS is a non-custodial `.gen` resolver and public-profile registry. Users can
register names, resolve names to wallet addresses, publish public profile data,
choose a primary reverse name, and manage ownership. Registration moderation is
performed with GenLayer validator consensus; the contract stores only the
validated result. The direct-send experience resolves a name immediately before
the connected wallet sends GEN directly to the resolved wallet address. The
contract never receives, holds, or forwards payment funds.

## Accurate limits

- A `.gen` record is not a legal name, ENS name, or proof of a person,
  organization, identity, or ownership outside this contract.
- This is a Bradbury testnet deployment; it is not presented as a mainnet
  production system or a security audit.
- The contract's active registration and read flow is demonstrated on-chain.
  Profile updates, address updates, primary-name changes, and transfer have
  automated coverage but are not represented as separately executed Bradbury
  fixtures.

## Retired address

`0x15Ca354C73D7f8Ffa02a1e644dCDf41958a7b8A2` is a retired, defective legacy
contract. It is not connected to the live application and must not be used as
contract evidence for this project. Its retirement rationale is documented in
[LEGACY_RETIREMENT.md](LEGACY_RETIREMENT.md).
