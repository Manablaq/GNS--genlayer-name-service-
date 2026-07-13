# GNS — GenLayer Name Service

GNS is a non-custodial identity resolver for `.gen` names on GenLayer Bradbury Testnet. The application combines human-readable names, public resolver profiles, AI-assisted registration policy, reverse resolution, owner management, and direct wallet payments in a responsive identity-infrastructure interface.

## Verified deployment

- Network: GenLayer Bradbury Testnet
- Chain ID: `4221`
- Active contract: `0x5e7B8F753E38dA96967117F712AcC3f69F4ECdd9`
- [Contract explorer](https://explorer-bradbury.genlayer.com/address/0x5e7B8F753E38dA96967117F712AcC3f69F4ECdd9)
- [Repository](https://github.com/Manablaq/GNS--genlayer-name-service-)

The deployed interface has 11 public methods: five non-payable writes (`register`, `update_profile`, `set_address`, `set_primary`, `transfer`) and six views (`resolve`, `reverse_resolve`, `get_record`, `is_available`, `get_names_by_owner`, `get_stats`). There are no admin or custodial payment methods.

## Route map

| Route | Purpose |
| --- | --- |
| `/` | Product overview, live availability/resolver search, recent searches, network proof, and registration |
| `/name/[name]` | Public identity profile, resolver proof, direct-send entry, and wallet-owner controls |
| `/my-names` | Paginated owner dashboard (12 per page; contract maximum respected at 50) |
| `/send` | Resolve, review, revalidate, and submit a direct injected-wallet payment |
| `/api/contract` | Allowlisted, validated server-side contract reads only |

## Frontend architecture

The root layout retains a server-rendered document and uses `next/font` for layout-stable font loading. A deliberately small client provider boundary owns injected-wallet state, the persistent application shell, and the global transaction manager. Contract reads remain allowlisted through the route handler; contract writes happen client-side through the injected provider and `genlayer-js`.

Reusable UI includes status badges, notices, skeletons, empty/error states, copy and address controls, section headers, a focus-managed confirmation dialog, transaction tray, network badge, and restrained viewport reveal/count-up primitives.

## Non-blocking transaction lifecycle

After an injected wallet returns a GenLayer transaction hash, the submitting dialog closes and a namespaced serializable record is stored in `localStorage`. The global provider, mounted above routes, quietly polls structured receipt fields while navigation remains available. Records are keyed by chain, active contract, connected wallet, and hash; other wallet/network records are retained but paused. Storage events synchronize tabs and duplicate hashes are removed only inside the full namespace.

States are: submitted, processing, confirmation, confirmation delayed, confirmed, execution failed, canceled, undetermined, and unknown/retryable. `ACCEPTED` is not success on its own. A transaction becomes confirmed only after successful receipt execution (`AGREE` plus `FINISHED_WITH_RETURN`) and an action-specific contract read:

- registration: unavailable and owner equals sender;
- profile update: normalized stored fields match;
- address update: resolved address matches;
- primary update: reverse resolution matches;
- transfer: owner matches the recipient.

Retry checks never resubmit a transaction.

## Direct non-custodial payments

The send route resolves the `.gen` record, displays the full recipient address, validates the GEN amount, requires review, and reads the resolver again before invoking the wallet. GNS never receives or holds these funds. A returned wallet hash is described as submitted, not as GenLayer contract acceptance.

## Motion and accessibility policy

Motion uses CSS and IntersectionObserver rather than a global animation dependency. Reveals use small opacity/translate changes once, number count-up starts on visibility, and scroll progress writes a transform inside `requestAnimationFrame`. There is no scroll hijacking, mouse-following effect, WebGL, or permanent particle loop. Under `prefers-reduced-motion: reduce`, reveals are static, smooth scrolling is disabled, animation/transition duration is effectively removed, and scroll progress is hidden.

The shell includes a skip link and semantic landmarks. Controls use visible focus, minimum touch sizing, durable labels, live feedback, non-color status text, safe wrapping, and modal Escape/focus return/trapping behavior. External profile URLs are validated and opened with `noopener noreferrer`.

## Supported responsive targets

The layout is designed and CSS-hardened for `360×800`, `390×844`, `768×1024`, `1024×768`, `1280×800`, and `1440×900`. Below 640px the desktop navigation becomes a safe-area-aware bottom bar; dialogs become scrollable bottom sheets and the transaction tray fits between the header and bottom navigation.

## Local validation

```bash
npm install
python3 -m unittest discover -s tests -v
/Users/mralbert/.venvs/genvm-lint/bin/genvm-lint check contracts/gns.py
npm run lint
npm run build
npm test --if-present
npx tsc --noEmit
npm audit
git diff --check
```

## Manual QA

Do not submit a real transaction during review. Run the app and inspect all routes at the six target viewports. Test keyboard-only navigation, Escape/focus return in dialogs, reduced motion, no-wallet and wrong-network states, mocked RPC failures, long profile values, address wrapping, storage synchronization, and mocked pending/failed receipts. Confirm there is one transaction poller mounted above routes and no hydration or console warnings.

## Limits and claims

`.gen` names are records in this contract, not ENS names. AI-assisted validator consensus performs registration policy moderation; it is not proof of a person, organization, or external identity. Bradbury receipt and explorer state may remain delayed or undetermined. Historical contract addresses are documentation only and are not active.
