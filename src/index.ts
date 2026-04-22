export { makeCreator } from './makeCreator';
export { create } from './create';
export { apply } from './apply';
export { original } from './original';
export { current } from './current';
export { unsafe } from './unsafe';
export { rawReturn } from './rawReturn';
export { isDraft } from './utils/draft';
export { isDraftable } from './utils/draft';
export { isContinuedDraft } from './utils/draft';
export { getContinuationCount } from './utils/draft';
export { getAccumulatedPatches } from './utils/draft';
export { markSimpleObject } from './utils/marker';

export { castDraft, castImmutable, castMutable } from './utils/cast';
export type {
  Immutable,
  Draft,
  Patches,
  Patch,
  ExternalOptions as Options,
  PatchesOptions,
  DraftedObject,
  FinalizeOptions,
  ContinuationEvent,
} from './interface';
