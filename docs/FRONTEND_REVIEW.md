# Frontend Review

## Before and after architecture

Before this redesign, each of four Client Component routes rendered its own floating navigation and inline-styled screen. The homepage ran a perpetual full-window canvas, read polling restarted with unstable closures, registration blocked inside a modal until `ACCEPTED`, and the other four active writes had no interface. Reads, errors, and missing records were frequently conflated.

The redesigned application uses a persistent adaptive shell and one transaction provider above route content. Domain validation, receipt classification, persistence, expected-state checks, URL safety, pagination, and direct-send change detection are pure modules. UI states are reusable components instead of route-local style objects. The read API remains a strict six-method allowlist.

## Design system

The visual language is “identity infrastructure”: graphite foundations, layered neutral surfaces, thin borders, restrained violet identity accents, occasional magenta/amber context, and green/red reserved for truthful success/error state. Tokens cover surface, text, border, status, spacing, radii, shadows, content width, and motion duration. Geist and Geist Mono load through `next/font` with swap behavior and CSS variables.

The shell provides persistent brand, active-route navigation, Bradbury badge, wallet state, pending count, mobile safe-area navigation, and a proof-oriented footer. The landing hierarchy moves from identity search to lifecycle explanation, verified live metrics, resolver/payment architecture, and final action.

## Animation policy

- No animation library was added; the audited scope did not justify shipping one globally.
- IntersectionObserver reveals each section once using 14px translate and opacity.
- Count-up begins only when visible.
- Scroll progress is transform-only and coalesced with `requestAnimationFrame`.
- No continuous canvas, mouse tracking, autoplay, scroll hijacking, or experimental view transitions.
- Page visibility pauses transaction polling and no decorative loop remains active.
- Reduced motion makes reveals static, removes effective animation duration, disables smooth scroll, and hides progress.

## Accessibility checklist

- [x] Skip-to-content link and semantic header/main/nav/footer landmarks
- [x] Logical route headings and descriptive action text
- [x] Persistent visible keyboard focus
- [x] Approximately 44px minimum interactive targets
- [x] Dialog role, modal semantics, Escape close, focus loop, and focus return
- [x] Text labels accompany every status color
- [x] Live regions for copy and resolver feedback
- [x] Input labels, limits, examples, and inline validation
- [x] Long addresses and untrusted profile text constrained safely
- [x] Decorative grid/orbit hidden from assistive technology
- [x] Reduced-motion media policy
- [x] External links validated and protected with `noopener noreferrer`

## Transaction UX

The localStorage schema is versioned and validates each record before use. Namespace identity is chain + contract + wallet + hash. The manager deduplicates in that namespace, listens for storage events, retains off-wallet/off-network records, polls only active context, and lives above pages. Users can navigate after wallet submission, inspect the hash/explorer, retry a receipt check without resubmitting, and dismiss terminal records.

Receipt interpretation uses GenLayer enum values and execution fields. `FINISHED_WITH_ERROR` wins even if status is `ACCEPTED`; timeout/undetermined states never become success. Successful execution enters confirmation until the expected action-specific contract state is read.

## Responsive QA

CSS breakpoints are 900px and 640px, with fluid typography and content widths between them. Desktop uses a sticky header; mobile uses a compact header plus bottom safe-area navigation. Dialogs and the transaction tray are viewport-bounded and independently scrollable. Grids move from three columns to two and one, address strings truncate or wrap, and content includes bottom-navigation clearance.

Target inspection sizes: 360×800, 390×844, 768×1024, 1024×768, 1280×800, and 1440×900.

## Performance decisions

- Removed the permanent full-screen canvas and looping holographic borders.
- Avoided Motion/WebGL/view-transition dependencies.
- Replaced remote CSS `@import` fonts with optimized `next/font`.
- Uses transform/opacity for decorative motion and one RAF-coalesced scroll listener.
- Pauses background receipt checks while the document is hidden.
- Uses skeletons instead of layout-collapsing full-page spinners.
- Keeps external avatar dimensions fixed; invalid URLs render generated initials.
- Removed duplicated route navigation and the unused polling hook from active flows.

Wallet libraries remain global because wallet status and pending activity are shell-wide. `genlayer-js` wallet/receipt clients are dynamically imported only when needed.

## Security and data integrity

No user values use raw HTML. Profile links are parsed and restricted to HTTP(S); credential-bearing URLs and unsafe schemes are rejected. The API refuses arbitrary contract method calls and returns a generic upstream failure rather than raw internal errors. Client writes are a five-method union and always target the fixed active contract. Optimistic submissions are never presented as finalized. Direct send targets the freshly resolved address and never the GNS contract.

## Transaction retention and synchronization

Transactions are keyed by chain, contract, wallet, and hash. Records outside the active wallet/network remain stored but paused. Cross-tab updates are validated and merged by newest `updatedAt`; they never blindly replace the local collection. Confirmed entries expire automatically after 24 hours. Execution failures, cancellations, and unresolved `NO_MAJORITY` results remain until dismissal.

## Browser QA matrix

Playwright Core 1.55.0 was installed outside the repository under `/private/tmp` and used with the existing cached Chromium build. The four active routes were rendered at 360×800, 390×844, 768×1024, 1024×768, 1280×800, and 1440×900: 24 route/viewport combinations in total. The automated read-only pass found no horizontal overflow or hydration markers. Its only console message was a development HMR WebSocket rejection caused by the localhost/127.0.0.1 development-origin mismatch; it was not an application or production-network failure.

Screenshots, the Playwright harness, and structured results remain under the ignored `.qa` directory. No real Bradbury write or direct payment was sent.

Completed mocked/read-only coverage includes:

1. `/` at 1440×900: idle, available, registered, reserved, and mocked RPC error.
2. `/` at 390×844: search open and registration steps 1–3.
3. `/name/sundayalbert` at 1280×800 and 390×844: public view and mocked owner controls.
4. `/my-names` at 1024×768 and 360×800: populated, skeleton, empty, error, and page 2.
5. `/send?name=sundayalbert` at 768×1024 and 390×844: resolved, review, changed-address warning, wallet rejection, and submitted.
6. Transaction tray at desktop/mobile: processing, delayed confirmation, confirmed, execution failure, and off-network pause.
7. Wrong-network and no-wallet shell states.
8. Reduced-motion equivalents of landing and dialog screens.

The transaction state harness additionally covers all managed states, terminal-only Activity access, dismissal, local-only toast transitions, hydration/storage non-replay, wrong-network and disconnected layouts, dialog/tray focus behavior, mobile tray scrolling, long details/hashes, and reduced motion at mobile and desktop sizes.

Remaining real-wallet QA is deliberately limited to injected-wallet connection and rejection UX, a genuine wrong-chain wallet session, and observing a real Bradbury receipt/state transition. These checks must not be performed as part of a no-transaction release pass.

## Known limitations

- No real Bradbury write or direct payment was sent during this work, by design.
- Receipt status naming depends on `genlayer-js` 1.1.8 and should be revalidated when that SDK changes.
- The explorer may not expose conventional EVM confirmation detail for every injected-wallet direct transfer.
- Remote profile avatars use a fixed native image element after strict URL validation because arbitrary user-selected hosts cannot safely be enumerated in `next/image` configuration; dimensions prevent layout shift.
- Terminal transitions produce restrained six-second, non-modal `aria-live` toasts. Hydration and storage synchronization do not replay notifications; the tray retains full details.
