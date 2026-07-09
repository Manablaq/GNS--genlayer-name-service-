# GNS - GenLayer Name Service

GNS is a GenLayer Bradbury testnet app for registering `.gen` names, resolving them to wallet addresses, and sending GEN to a name's contract balance.

## Links

- Live app: https://dotgenapp.vercel.app
- GitHub repo: https://github.com/Manablaq/GNS--genlayer-name-service-
- Contract: `0x15Ca354C73D7f8Ffa02a1e644dCDf41958a7b8A2`
- Explorer: https://explorer-bradbury.genlayer.com/address/0x15Ca354C73D7f8Ffa02a1e644dCDf41958a7b8A2

## Network

- Network: GenLayer Bradbury
- Chain ID: `4221`
- RPC URL: `https://rpc-bradbury.genlayer.com`
- Explorer URL: `https://explorer-bradbury.genlayer.com`
- Native token: GEN

## Contract

The contract source is [contracts/gns.py](contracts/gns.py). It is a Python GenLayer Intelligent Contract using `from genlayer import *`, `gl.Contract`, `TreeMap` storage, and `@gl.public.write` / `@gl.public.view` methods.

Write methods:
- `register(name, avatar, bio, twitter, github, website)`
- `update_profile(name, avatar, bio, twitter, github, website)`
- `set_address(name, new_address)`
- `set_primary(name)`
- `transfer(name, new_owner)`
- `send_to_name(name)` payable
- `withdraw(name)`

Read methods:
- `resolve(name)`
- `reverse_resolve(address)`
- `get_record(name)`
- `is_available(name)`
- `get_balance(name)`
- `get_names_by_owner(owner)`
- `get_stats()`

There are no separate owner/admin methods.

## Frontend and API Behavior

- Frontend config points to `0x15Ca354C73D7f8Ffa02a1e644dCDf41958a7b8A2` on Bradbury chain ID `4221`.
- Reads go through `POST /api/contract`, which calls `genlayer-js` `readContract` against the deployed contract.
- The API allowlists read methods only and validates name/address arguments. It does not execute arbitrary method names from request bodies.
- Wallet writes happen client-side through the connected browser wallet using `genlayer-js`.
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
- Send GEN to a name and confirm it is credited to the name balance before withdrawal.

## Deployment Proof

- Live deployment: https://dotgenapp.vercel.app
- Deployed contract explorer page: https://explorer-bradbury.genlayer.com/address/0x15Ca354C73D7f8Ffa02a1e644dCDf41958a7b8A2
- Repository: https://github.com/Manablaq/GNS--genlayer-name-service-

## Limitations

- `.gen` names are app-specific records in this contract. They are not ENS names.
- Ownership proof is limited to the owner/address fields stored by the contract.
- `get_names_by_owner` scans up to 200 stored names.
- GEN sent through `send_to_name` is credited to the name balance and must be withdrawn by the name owner.
- Accepted transactions may still be pending finalization on Bradbury.
