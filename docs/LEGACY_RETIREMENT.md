# Legacy GNS retirement

The retired contract is `0x15Ca354C73D7f8Ffa02a1e644dCDf41958a7b8A2`.
Its exact archived source SHA-256 is
`93014009a7348c62394e3f38b02030ac4f1e535b32f02add145dcb7333a8bc9f`.

At audit time, confirmed state showed 10,000,000,000,000,000 wei, exactly 0.01
testnet GEN, at the ghost-contract native balance. Its custodial withdrawal is
defective. No recovery was attempted, and GNS V2 neither migrates nor recovers
those funds. No recovery claim is made.

Old registrations require explicit user re-registration or a separately reviewed,
signed migration design. Never send funds to the legacy contract.
