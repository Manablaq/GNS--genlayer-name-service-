# GNS - GenLayer Name Service

GNS V2 is a non-custodial GenLayer Bradbury testnet registry for `.gen` names, profiles, forward resolution, reverse resolution, and direct wallet payments to resolved addresses.

## Links

- Live app: https://dotgenapp.vercel.app
- GitHub repo: https://github.com/Manablaq/GNS--genlayer-name-service-
- Active GNS V2 contract: `0x5e7B8F753E38dA96967117F712AcC3f69F4ECdd9`
- Explorer: https://explorer-bradbury.genlayer.com/address/0x5e7B8F753E38dA96967117F712AcC3f69F4ECdd9

## Network

- Network: GenLayer Bradbury
- Chain ID: `4221`
- RPC URL: `https://rpc-bradbury.genlayer.com`
- Explorer URL: `https://explorer-bradbury.genlayer.com`
- Native token: GEN

## Contract

The contract source is [contracts/gns.py](contracts/gns.py). It is a Python GenLayer Intelligent Contract using `from genlayer import *`, `gl.Contract`, `TreeMap` storage, and `@gl.public.write` / `@gl.public.view` methods.

The deployed schema has exactly 11 public methods: five non-payable writes and six views.

Write methods:
- `register(name, avatar, bio, twitter, github, website)`
- `update_profile(name, avatar, bio, twitter, github, website)`
- `set_address(name, new_address)`
- `set_primary(name)`
- `transfer(name, new_owner)`

Read methods:
- `resolve(name)`
- `reverse_resolve(address)`
- `get_record(name)`
- `is_available(name)`
- `get_names_by_owner(owner, offset, limit)`
- `get_stats()`

There are no separate owner/admin methods.

## Frontend and API Behavior

- Frontend config points to `0x5e7B8F753E38dA96967117F712AcC3f69F4ECdd9` on Bradbury chain ID `4221`.
- Reads go through `POST /api/contract`, which calls `genlayer-js` `readContract` against the deployed contract.
- The API allowlists read methods only and validates name/address arguments. It does not execute arbitrary method names from request bodies.
- Contract writes happen client-side through the injected browser wallet using `genlayer-js`.
- GEN payments resolve the name first and then use the injected wallet to send directly to the resolved address; the contract is not a payment destination.
- No WalletConnect project or connector is configured.
- The server API does not use a private key or server-side wallet for reads.

## Transaction Lifecycle

The app waits for `TransactionStatus.ACCEPTED` after writes. Accepted transactions are readable from the contract, but Bradbury finalization can still be pending. The UI and docs should not claim a transaction is finalized unless the finalized state is explicitly checked.

The Bradbury explorer may show accepted or undetermined while the finalization window is still open.

## AI Validation

Registration uses `gl.eq_principle.prompt_non_comparative` to ask validators for a JSON approval decision about the requested name. The app describes this as AI validator policy checking for registration, not ENS compatibility or external identity proof.

## Local Setup

```bash
npm install
npm run lint
npm run build
```

Run locally:

```bash
npm run dev
```

## Testing

Required verification commands:

```bash
npm run lint
npm run build
npm audit
git diff --check
```

Manual checks:
- Connect a wallet on GenLayer Bradbury.
- Search a name and confirm availability comes from the API route.
- Register a name and confirm the UI reports accepted, not finalized.
- Resolve a registered name and confirm profile data comes from contract reads.
- Send GEN to a name and confirm the wallet transaction targets the resolved address directly.

## Deployment Proof

- Live deployment: https://dotgenapp.vercel.app
- Deployed contract explorer page: https://explorer-bradbury.genlayer.com/address/0x5e7B8F753E38dA96967117F712AcC3f69F4ECdd9
- Deployment transaction: `0xa38b409b62dcb45d40c7abdb1c728c5cfd5f8d5346b6366835ab53dc68bc7565`
- Registration transaction: `0xcb816e67df3ddbf310b804691f42cd3b8c4e4da455f8777a8f1a78c37035ba76`
- Deployed source SHA-256: `70c3906b73bae54e6669f79b4d332e72b63fe167902c21f1ae5850c85fec4d9f`
- Verified registration: `sundayalbert.gen`, owned by and resolving to `0x5bB49021001200fE8156a81c7fcF097e535e7181`
- Repository: https://github.com/Manablaq/GNS--genlayer-name-service-

## Limitations

- `.gen` names are app-specific records in this contract. They are not ENS names.
- Ownership proof is limited to the owner/address fields stored by the contract.
- `get_names_by_owner` is paginated with a maximum page size of 50.
- Historical addresses are documented in `docs/LEGACY_RETIREMENT.md` and `docs/BRADBURY_NONDET_AB.md`; neither is active.
- Accepted transactions may still be pending finalization on Bradbury.
