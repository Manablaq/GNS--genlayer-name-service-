# Professional reviewer fix evidence map

Deployment and manual evidence remain **PENDING** for every finding.

## Bradbury schema compatibility

The previous failing `contracts/gns.py` source had SHA-256
`9398e1f2b861df835cbb25869850f43a4061598de21045850ed31d92a7bec4f1`.
Removing only the incompatible second leading comment produced corrected SHA-256
`d5d622d5f238c0a4ffde28797d51acf72732b0c7047bdfc9f743518b1fd37eb3`.
Bradbury schema generation succeeds for the corrected source and exposes exactly
11 public methods: 6 views and 5 writes. All 5 writes are non-payable. There is no
`send_to_name`, `withdraw`, `get_balance`, balance ledger, or
`total_transferred` API.

Deployment and manual Bradbury evidence remain **PENDING**. The latest Direct Mode
rerun was blocked before contract execution because the pinned genvm
`v0.3.0-rc7` artifact URL returned HTTP 404. This infrastructure/artifact failure
is not a test failure or contract failure.

| Finding | Rejected behavior and legacy evidence | V2 correction | Automated evidence | Deployment/manual |
|---|---|---|---|---|
| Custodial payment design | `contracts/legacy/gns_rejected.py:51`, `:236`, `:255`, `:270`: balance ledger, payable send, withdrawal, and defective `gl.transfer` | Resolver-only; no payment or balance API | `StructureTests.test_no_custody_surface` | PENDING |
| Unsafe name validation/moderation | `contracts/legacy/gns_rejected.py:23-43`, `:70-121`: silent trim, Unicode `isalnum`, nested evaluator with owner/profile, approval default | Strict ASCII canonicalizer, exact reserved policy, bounded name-only callable, `response_format=json`, strict fail-closed dictionary validator, stable `UserError` boundaries | Unit parser tests and Direct Mode rejection/atomicity tests | PENDING |
| Format-only validator settlement | `contracts/legacy/gns_rejected.py:110-114`: explicitly format-only/no-semantic criteria | Custom validators independently moderate and exact-match approval/category | `test_semantic_consensus_language_and_comparison` | PENDING |
| Unbounded/incomplete ownership lookup | `contracts/legacy/gns_rejected.py:340-371`: scans global keys and stops at 200 | Maintained owner slots/reverse positions with 50-item pagination | `test_direct_bounded_owner_index`, `OwnerIndexModelTests` | PENDING |
| Unsafe ownership/address lifecycle | `contracts/legacy/gns_rejected.py:177-233`: string-shape checks and unsafe transfer/primary policy | Typed nonzero `Address`; swap-and-pop transfer; resolution reset; old primary cleared; new primary untouched | `test_typed_storage`, `test_transfer_policy_source_model`, `test_swap_pop_transfer_and_primary` | PENDING |

The offline suite proves deterministic helpers, strict parsing, source structure,
and an in-memory index model. Official Direct Mode additionally proves deployment,
structured LLM mocks, callable serialization, typed storage, address behavior,
authorization, 205-name pagination, TreeMap deletion, and swap-and-pop transfer.
`genvm-lint check contracts/gns.py` passes all three checks plus SDK validation.
Studio execution and every Bradbury deployment/manual item remain PENDING.
