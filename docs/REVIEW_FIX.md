# Professional reviewer fix evidence map

Deployment and manual evidence remain **PENDING** for every finding.

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
