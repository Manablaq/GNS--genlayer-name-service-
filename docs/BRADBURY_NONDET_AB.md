# Bradbury nondeterministic callable-shape A/B

## Triggering GNS evidence

The first, now superseded and unverified GNS V2 deployment was
`0xE97158b59B7D80F2c911b90906690B3B57722eb8`. Two valid-format registration
attempts reached the exact final status `LEADER_TIMEOUT`:

- `0x4f04162417040f4ffccf1f27dedff34469365b8c3c5075862c076b42c93579c3`
- `0xe22ff1237ddec16c24e341e614fc265e93be1c56e1555f7902762ca144788a27`

These receipts do not registration-verify that historical GNS V2 address.

## Controlled A/B

The probes used the same moderation prompt, input, JSON result schema,
validation, and decision comparison. Their intended runtime difference was the
callable shape: nested functions versus module-level callable classes passed as
bound `__call__` methods.

### Nested-functions probe

- Contract: `0xB07F340D3f310cCB3D4DE5390900254E76c19463`
- Transaction: `0x42057aa741f7382e1d9cfd98ac71d06004e2fb0fb20663fd901f7374cb52ee4f`
- Exact final status: `ACCEPTED`
- Result: `AGREE`
- Execution: `FINISHED_WITH_RETURN`
- Output: `approved=true, category=safe`

### Callable-class probe

- Contract: `0x2C373B9Ff96fFA5BBEB4D178C247c18CB914f773`
- Transaction: `0x433d396359d45fb37655ec3c19ba26394f0a9d4635b5e5bfa763d60aa59bc0b1`
- Exact final status: `UNDETERMINED`
- Result: `NO_MAJORITY`
- Execution: `FINISHED_WITH_RETURN`
- Leader output: `approved=true, category=safe`

The nested-functions probe succeeded while the callable-class probe reached
`NO_MAJORITY`. This receipt isolates callable shape as the intended runtime
difference. It does not prove the exact internal runtime mechanism that caused
the difference.

## Source consequence and verification state

GNS V2 now uses nested `leader_fn` and `validator_fn` functions inside
`register`, passed directly to `gl.vm.run_nondet_unsafe`. The corrected source was
subsequently deployed at `0x5e7B8F753E38dA96967117F712AcC3f69F4ECdd9` and
successfully registered and indexed `sundayalbert.gen`. Its deployment and
registration both finished `ACCEPTED` / `AGREE` / `FINISHED_WITH_RETURN`.

The evidence isolates callable shape as the meaningful tested difference: the
nested probe succeeded, while the callable-class probe reached `UNDETERMINED` /
`NO_MAJORITY`. It does not prove the exact internal GenVM mechanism.
