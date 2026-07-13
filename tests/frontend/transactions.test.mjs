import test from "node:test";
import assert from "node:assert/strict";
import {
  CONFIRMED_RETENTION_MS,
  classifyReceipt,
  createTransaction,
  isPendingState,
  isRetryableState,
  isTerminalState,
  mergeTransactionCollections,
  parseTransactions,
  serializeTransactions,
  shouldApplyTransactionCheck,
  shouldCleanupRegistrationDraft,
  shouldRetainRegistrationDraft,
  txKey,
  withTransactionLock,
} from "../../lib/transactions.ts";

const hash = `0x${"a".repeat(64)}`;
const wallet = `0x${"1".repeat(40)}`;
const base = () =>
  createTransaction({
    chainId: 4221,
    wallet,
    hash,
    action: "register",
    label: "Register alice.gen",
    expected: { action: "register", name: "alice", values: {} },
    optimisticData: { bio: "submitted bio" },
  });

test("receipt mappings are structured and exhaustive", () => {
  const cases = [
    [
      "accepted success",
      {
        statusName: "ACCEPTED",
        resultName: "AGREE",
        txExecutionResultName: "FINISHED_WITH_RETURN",
      },
      "confirmation",
    ],
    [
      "finalized success",
      {
        statusName: "FINALIZED",
        resultName: "AGREE",
        txExecutionResultName: "FINISHED_WITH_RETURN",
      },
      "confirmation",
    ],
    [
      "execution error wins",
      {
        statusName: "ACCEPTED",
        resultName: "AGREE",
        txExecutionResultName: "FINISHED_WITH_ERROR",
      },
      "execution_failed",
    ],
    ["undetermined status", { statusName: "UNDETERMINED" }, "undetermined"],
    [
      "no majority result",
      { statusName: "ACCEPTED", resultName: "NO_MAJORITY" },
      "undetermined",
    ],
    ["canceled", { statusName: "CANCELED" }, "canceled"],
    [
      "not voted accepted",
      {
        statusName: "ACCEPTED",
        resultName: "AGREE",
        txExecutionResultName: "NOT_VOTED",
      },
      "processing",
    ],
    ["missing execution accepted", { statusName: "ACCEPTED" }, "processing"],
    [
      "unresolved accepted",
      {
        statusName: "ACCEPTED",
        resultName: "DISAGREE",
        txExecutionResultName: "UNDETERMINED",
      },
      "unknown_retryable",
    ],
    ["pending", { statusName: "PENDING" }, "processing"],
    ["ready to finalize", { statusName: "READY_TO_FINALIZE" }, "processing"],
    [
      "validator timeout",
      { statusName: "VALIDATORS_TIMEOUT" },
      "unknown_retryable",
    ],
    ["missing receipt", null, "unknown_retryable"],
  ];
  for (const [label, receipt, expected] of cases)
    assert.equal(classifyReceipt(receipt), expected, label);
});

test("terminal, pending, and manual-retry rules share one definition", () => {
  for (const state of [
    "execution_failed",
    "canceled",
    "undetermined",
    "confirmed",
  ]) {
    assert.equal(isTerminalState(state), true);
    assert.equal(isPendingState(state), false);
  }
  assert.equal(isRetryableState("undetermined"), true);
  assert.equal(isRetryableState("execution_failed"), false);
});

test("persisted transactions validate records and survive serialization", () => {
  const tx = base();
  assert.deepEqual(parseTransactions(serializeTransactions([tx])), [tx]);
  assert.deepEqual(parseTransactions("{bad"), []);
  assert.deepEqual(
    parseTransactions(JSON.stringify({ version: 2, items: [tx] })),
    [],
  );
  assert.deepEqual(
    parseTransactions(
      JSON.stringify({ version: 1, items: [{ ...tx, wallet: "bad" }] }),
    ),
    [],
  );
});

test("namespace isolates chain, contract, wallet, and hash", () => {
  const tx = base();
  assert.notEqual(txKey(tx), txKey({ ...tx, chainId: 1 }));
  assert.notEqual(txKey(tx), txKey({ ...tx, wallet: `0x${"2".repeat(40)}` }));
});

test("cross-tab merge retains unique entries and newest duplicate", () => {
  const tx = base();
  const other = { ...base(), hash: `0x${"b".repeat(64)}` };
  const stale = { ...tx, state: "processing", updatedAt: tx.updatedAt - 1 };
  const merged = mergeTransactionCollections(
    [{ ...tx, state: "confirmed" }, other],
    [stale],
  );
  assert.equal(merged.length, 2);
  assert.equal(
    merged.find((item) => txKey(item) === txKey(tx)).state,
    "confirmed",
  );
  const newer = { ...tx, state: "undetermined", updatedAt: tx.updatedAt + 1 };
  assert.equal(
    mergeTransactionCollections([tx], [newer])[0].state,
    "undetermined",
  );
});

test("in-flight lock suppresses duplicate checks and always releases", async () => {
  const inFlight = new Set();
  let resolve;
  let calls = 0;
  const operation = () =>
    new Promise((done) => {
      calls += 1;
      resolve = done;
    });
  const first = withTransactionLock(inFlight, "full-key", operation);
  assert.equal(
    await withTransactionLock(inFlight, "full-key", operation),
    undefined,
  );
  assert.equal(calls, 1);
  resolve("ok");
  assert.equal(await first, "ok");
  await withTransactionLock(inFlight, "full-key", async () => {
    calls += 1;
  });
  assert.equal(calls, 2);
});

test("stale processing cannot overwrite a newer confirmed transaction", () => {
  const snapshot = { ...base(), state: "processing" };
  const latest = {
    ...snapshot,
    state: "confirmed",
    updatedAt: snapshot.updatedAt + 1,
  };
  assert.equal(shouldApplyTransactionCheck(snapshot, latest), false);
});

test("stale unknown cannot overwrite a newer undetermined transaction", () => {
  const snapshot = { ...base(), state: "unknown_retryable" };
  const latest = {
    ...snapshot,
    state: "undetermined",
    updatedAt: snapshot.updatedAt + 1,
  };
  assert.equal(shouldApplyTransactionCheck(snapshot, latest), false);
});

test("current manual undetermined recheck may apply a newer receipt result", () => {
  const current = { ...base(), state: "undetermined" };
  assert.equal(shouldApplyTransactionCheck(current, { ...current }), true);
});

test("in-flight lock releases when the operation throws", async () => {
  const inFlight = new Set();
  await assert.rejects(
    withTransactionLock(inFlight, "full-key", async () => {
      throw new Error("expected");
    }),
  );
  assert.equal(inFlight.has("full-key"), false);
});

test("registration draft remains through every non-confirmed state", () => {
  for (const state of [
    "submitted",
    "processing",
    "confirmation",
    "confirmation_delayed",
    "execution_failed",
    "canceled",
    "undetermined",
    "unknown_retryable",
  ])
    assert.equal(shouldRetainRegistrationDraft(state), true, state);
  assert.equal(shouldRetainRegistrationDraft("confirmed"), false);
  assert.deepEqual(base().optimisticData, { bio: "submitted bio" });
});

test("registration draft cleanup requires confirmed transition and successful persistence", () => {
  const processing = { ...base(), state: "processing" };
  const confirmed = {
    ...processing,
    state: "confirmed",
    updatedAt: processing.updatedAt + 1,
  };
  assert.equal(
    shouldCleanupRegistrationDraft(processing, confirmed, true),
    true,
  );
  assert.equal(
    shouldCleanupRegistrationDraft(processing, confirmed, false),
    false,
  );
  assert.equal(
    shouldCleanupRegistrationDraft(
      processing,
      { ...confirmed, state: "undetermined" },
      true,
    ),
    false,
  );
});

test("confirmed entries expire after 24 hours but terminal failures persist", () => {
  const now = Date.now();
  const old = now - CONFIRMED_RETENTION_MS - 1;
  const confirmed = { ...base(), state: "confirmed", updatedAt: old };
  const undetermined = {
    ...base(),
    hash: `0x${"c".repeat(64)}`,
    state: "undetermined",
    updatedAt: old,
  };
  assert.deepEqual(
    mergeTransactionCollections([], [confirmed, undetermined], now),
    [undetermined],
  );
});
