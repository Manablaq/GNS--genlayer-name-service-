# GNS V2 architecture

## Scope

V2 is a resolver and profile registry only. It has no payable entrypoint, payment
ledger, balance view, withdrawal, native transfer, or external payment message.
The contract therefore never takes custody of user payment GEN.

## Storage and indexing

`NameRecord` is an `@allow_storage` dataclass containing typed `Address` values for
owner and resolved recipient plus bounded profile strings. `records` is a
`TreeMap[str, NameRecord]`. Reverse state uses `TreeMap[Address, str]` for the
primary name and `TreeMap[Address, u32]` for owned-name counts. A flat
`TreeMap[str, str]` uses `lowercase-address:index` composite string keys for owner
slots, while `TreeMap[str, u32]` stores each name's reverse position. This avoids
nested maps and tuple keys and never scans global registrations. `total_names` is
`u32`. Owner reads validate `offset`, require a 1-50 limit, and return maintained
slot order.

These choices follow the pinned `py-genlayer` dependency header and current
GenLayer storage documentation: fully specialized `TreeMap`, `Address`, sized
integers, and `@allow_storage` dataclasses are supported persistent types. Map
deletion uses documented mutable-mapping `del` semantics.

Official API references consulted on 2026-07-12:

- <https://docs.genlayer.com/developers/intelligent-contracts/storage>
- <https://docs.genlayer.com/developers/intelligent-contracts/types/address>
- <https://docs.genlayer.com/developers/intelligent-contracts/types/dataclasses>
- <https://docs.genlayer.com/developers/intelligent-contracts/equivalence-principle>
- <https://docs.genlayer.com/developers/intelligent-contracts/features/non-determinism>

## Names and profiles

One deterministic normalizer rejects whitespace changes and non-ASCII input,
accepts at most one case-insensitive terminal `.gen`, lowercases, and then requires
3-32 characters matching `^[a-z0-9]+(?:-[a-z0-9]+)*$`. Exact reserved literals are:
`gns`, `genlayer`, `official`, `administrator`, `admin`, `support`, `security`,
`verify`, `verification`, `wallet`, and `recovery`. There is no substring ban.

Profile bounds are avatar 256, bio 280, Twitter 64, GitHub 64, and website 256.
All reject ASCII control characters. Non-empty avatar and website values require
HTTP(S). Twitter and GitHub are bare ASCII usernames: letters, digits, underscore,
or hyphen, with alphanumeric first/last characters and no `@` or URL syntax.

## Moderation and semantic consensus

Only deterministic-format-valid names reach moderation. The serialized input is
exactly `{"canonical_name":"..."}`. A module-level evaluator receives that one
bounded payload through a serializable callable instance. The initial
`functools.partial` design was rejected because the official linter could not
prove nondeterministic reachability. A mutable module-global design was then
rejected because cloudpickle did not snapshot its payload. Direct Mode verifies
that the final bound method preserves exactly one payload without capturing
contract state, profile data, owner data, or local records. The prompt treats the name as
untrusted and covers impersonation, deceptive brands/public figures, phishing,
hate/abuse, misleading official identities, and confusing identity claims.

`gl.nondet.exec_prompt(..., response_format="json")` returns a structured mapping.
The result validator requires an exact three-field dictionary, a real boolean, an
allowed category, a non-empty reason of at most 280 characters, and consistent
approved/category values. Every evaluator, JSON, type, schema, or consensus error
fails closed.

V2 uses the documented `gl.vm.run_nondet_unsafe` custom validator mechanism.
Each validator independently reruns the same policy on the canonical candidate.
It requires exact agreement on `approved` and `category`; reason wording is not a
settlement field. This is semantic classification consensus, not format-only
validation.

## Validation and test evidence

Expected deterministic input, authorization, address, pagination, and owner-index
failures raise stable `gl.vm.UserError` messages; public contract validation uses
no assertions. Pure name, profile, and moderation helpers raise `ValueError`,
which is translated at deterministic contract boundaries.

Official `genlayer-test` 0.29.2 Direct Mode tests run against the exact pinned
`py-genlayer` hash. They cover deployment, structured moderation, authorization,
typed records, transfer, primary cleanup, pagination, 205 registrations, and real
TreeMap swap-and-pop deletion. `genvm-linter` 0.11.0 passes all three lint checks
and SDK semantic validation. Studio and Bradbury deployment/manual evidence remain
PENDING.

## Ownership policy

Registration takes the authenticated `gl.message.sender_address`, initializes the
resolved recipient to it, appends the owner slot, and selects the name as primary
only when no primary exists. Address updates parse `Address` and reject zero.
Transfers parse and validate a distinct recipient, swap-and-pop the old slot,
append the new slot, update reverse positions and owner, and reset resolution to
the new owner. A transferred old primary is cleared with no arbitrary replacement.
The new owner's primary is never overwritten or automatically selected.

## Later frontend payment sequence

Frontend integration is intentionally outside Phase 1. A later reviewed frontend
will resolve the canonical name, wait for accepted state, verify the resolved EOA,
and ask the connected wallet to send native GEN directly to that EOA. The V2
contract is never the payment destination or intermediary.
