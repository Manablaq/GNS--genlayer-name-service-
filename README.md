# GNS — GenLayer Name Service

Register `.gen` names on GenLayer. Send and receive GEN tokens using human-readable names instead of wallet addresses.

## Live App
https://dotgenapp.vercel.app

## Contract
- **Address:** `0x15Ca354C73D7f8Ffa02a1e644dCDf41958a7b8A2` (Bradbury Testnet)
- **File:** `contracts/gns.py`

## How It Works
GNS is an Intelligent Contract on GenLayer Bradbury Testnet that lets users register `.gen` names mapped to their wallet addresses.

- **Register** a `.gen` name — AI validators verify the name is appropriate (not offensive, not brand impersonation)
- **Send GEN** to `albert.gen` instead of `0x1f87...5024` — resolves directly to the owner's wallet
- **Once claimed, locked forever** — no one can take a registered name
- **Reverse lookup** — resolve a wallet address back to its `.gen` name

## Features
- `register(name, ...)` — AI-validated name registration using `gl.eq_principle.prompt_non_comparative`
- `resolve(name)` — name → wallet address
- `reverse_resolve(address)` — address → primary name
- `send_to_name(name)` — payable, credits GEN to name balance
- `withdraw(name)` — owner claims GEN balance
- `transfer(name, new_owner)` — transfer name ownership
- `get_names_by_owner(address)` — list all names for a wallet
- Real-time 5-second polling on all pages

## Stack
- GenLayer Bradbury Testnet (Python Intelligent Contract)
- Next.js 16 + TypeScript
- genlayer-js + wagmi + RainbowKit
- Vercel
