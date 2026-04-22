# Resumable Finalization via the Two-Shot API

## Motivation

Mutative's two-shot `finalize` is terminal -- it permanently revokes the draft proxy. Users cannot obtain structurally-shared intermediate snapshots, collect incremental inter-checkpoint patches, or continue mutating afterward. This blocks granular undo/redo, periodic collaborative sync, incremental persistence, and frame-batched replication.

## Feature

The two-shot `finalize` accepts optional `FinalizeOptions` with a `continue` boolean for non-terminal finalization.

## Expectations

Continued finalization preserves draft operability, structural sharing, and incremental patching relative to the preceding checkpoint across all draft types including nested combinations.

`enableAutoFreeze` freezes finalized output while the draft remains mutable, and no-change continuations return the baseline reference with empty patches.

Post-continuation terminal finalization yields only the since-last-checkpoint delta.

`isContinuedDraft(value)` returns whether a draft has been continued at least once; `getContinuationCount(value)` returns the total number of continuations performed on that draft. Both return their respective zero-values for non-drafts and never-continued drafts, and the count increments with each successive continuation.

## Continuation Lifecycle Hooks

`Options` and `ExternalOptions` accept an optional `onContinue` callback: `(event: ContinuationEvent) => void`. `ContinuationEvent` is `{ state: any, continuationCount: number, patches?: Patch[], inversePatches?: Patch[] }`. The hook fires after each successful `finalize({ continue: true })`, after the draft tree has been resumed. If the callback throws, the error propagates but the continuation itself is already committed. The hook must not fire on terminal finalization.

## Accumulated Patch History

When `enablePatches` is true, all continuation patches are accumulated internally. `getAccumulatedPatches(draft)` returns `{ patches: Patch[], inversePatches: Patch[] }` containing the concatenated patches from every continuation so far. Applying accumulated `patches` via `apply(originalBaseState, accumulated.patches)` must produce the latest continuation state. Applying accumulated `inversePatches` in reverse order to the latest state must restore the original base state. Returns `null` when `enablePatches` is not enabled. Returns `null` for non-draft values. Terminal finalization does not add to accumulated patches. The accumulator resets are not needed -- it grows monotonically.

## Continuation Limit

`Options` and `ExternalOptions` accept an optional `maxContinuations` number. When the continuation count would exceed this limit, `finalize({ continue: true })` must throw an error with the message `'Continuation limit exceeded'` before performing finalization. The draft must remain in its current usable state after the throw. `maxContinuations: 0` means no continuations are allowed. When `maxContinuations` is not set, there is no limit.

