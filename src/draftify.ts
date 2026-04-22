import {
  ContinuationEvent,
  Finalities,
  FinalizeOptions,
  Options,
  Patches,
  PatchesOptions,
  Result,
} from './interface';
import { createDraft, finalizeDraft } from './draft';
import { isDraftable } from './utils';
import { dataTypes } from './constant';
import { generatePatches } from './patch';
import { resumeDraftTree } from './utils/resume';

export function draftify<
  T extends object,
  O extends PatchesOptions = false,
  F extends boolean = false,
>(
  baseState: T,
  options: Options<O, F>
): [T, (returnedValue: [T] | [], continueMode?: boolean) => Result<T, O, F>] {
  const finalities: Finalities = {
    draft: [],
    revoke: [],
    handledSet: new WeakSet<any>(),
    draftsCache: new WeakSet<object>(),
    nodes: [],
    continuationCount: 0,
    accumulatedPatches: options.enablePatches ? [] : null,
    accumulatedInversePatches: options.enablePatches ? [] : null,
  };
  let patches: Patches | undefined;
  let inversePatches: Patches | undefined;
  if (options.enablePatches) {
    patches = [];
    inversePatches = [];
  }
  const isMutable =
    options.mark?.(baseState, dataTypes) === dataTypes.mutable ||
    !isDraftable(baseState, options);
  const draft = isMutable
    ? baseState
    : createDraft({
        original: baseState,
        parentDraft: null,
        finalities,
        options,
      });
  return [
    draft,
    (returnedValue: [T] | [] = [], continueMode?: boolean) => {
      if (continueMode && options.maxContinuations !== undefined) {
        if (finalities.continuationCount >= options.maxContinuations) {
          throw new Error('Continuation limit exceeded');
        }
      }
      const [finalizedState, finalizedPatches, finalizedInversePatches] =
        finalizeDraft(
          draft,
          returnedValue,
          patches,
          inversePatches,
          options.enableAutoFreeze,
          continueMode
        );
      const result = (
        options.enablePatches
          ? [finalizedState, finalizedPatches, finalizedInversePatches]
          : finalizedState
      ) as Result<T, O, F>;
      if (continueMode) {
        finalities.continuationCount += 1;
        if (options.enablePatches && finalizedPatches && finalizedInversePatches) {
          finalities.accumulatedPatches!.push(...finalizedPatches);
          finalities.accumulatedInversePatches!.push(...finalizedInversePatches);
        }
        resumeDraftTree(draft, finalizedState, finalities, generatePatches);
        if (options.enablePatches) {
          patches = [];
          inversePatches = [];
        }
        if (options.onContinue) {
          const event: ContinuationEvent = {
            state: finalizedState,
            continuationCount: finalities.continuationCount,
          };
          if (options.enablePatches) {
            event.patches = finalizedPatches;
            event.inversePatches = finalizedInversePatches;
          }
          options.onContinue(event);
        }
      }
      return result;
    },
  ];
}

export function makeFinalizeWithOptions<T, O extends PatchesOptions, F extends boolean>(
  internalFinalize: (returnedValue: [T] | [], continueMode?: boolean) => Result<T, O, F>
): (opts?: FinalizeOptions) => Result<T, O, F> {
  return (opts?: FinalizeOptions): Result<T, O, F> => {
    return internalFinalize([], opts?.continue === true);
  };
}

