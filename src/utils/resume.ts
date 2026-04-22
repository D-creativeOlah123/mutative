import { DraftType, Finalities, Patches, ProxyDraft } from '../interface';
import { get, getProxyDraft, getValue, set } from './draft';
import { finalizePatches, finalizeSetValue, GeneratePatches } from './finalize';

function buildKeyPath(node: ProxyDraft): (string | number | symbol)[] | null {
  const path: (string | number | symbol)[] = [];
  let cursor: ProxyDraft = node;
  while (cursor.parent != null) {
    if (cursor.key === undefined && !Object.prototype.hasOwnProperty.call(cursor, 'key')) {
      return null;
    }
    path.unshift(cursor.key!);
    cursor = cursor.parent;
  }
  return path;
}

function resolveByKeyPath(root: any, keyPath: (string | number | symbol)[]): any {
  let current: any = root;
  for (const key of keyPath) {
    if (current == null) return undefined;
    if (current instanceof Map) {
      current = current.get(key);
    } else if (current instanceof Set) {
      const idx = typeof key === 'number' ? key : Number(key);
      current = Array.from(current)[idx];
    } else {
      current = current[key];
    }
    if (current === undefined) return undefined;
  }
  return current;
}

function resetNode(node: ProxyDraft, newOriginal: any): void {
  node.original = newOriginal;
  node.copy = null;
  node.operated = false;
  node.assignedMap = undefined;
  node.finalized = false;
  node.callbacks = undefined;
  if (node.type === DraftType.Set) {
    node.setMap = new Map((newOriginal as Set<any>).entries());
  }
}

function rebuildCallbacks(
  rootNode: ProxyDraft,
  childNodes: ProxyDraft[],
  gpFn: GeneratePatches
): void {
  // Root callback
  rootNode.finalities.draft.push((patches?: Patches, inversePatches?: Patches) => {
    finalizeSetValue(rootNode);
    finalizePatches(rootNode, gpFn, patches, inversePatches);
  });
  // Child callbacks
  for (const node of childNodes) {
    if (node.parent == null || node.key === undefined || node.proxy == null) continue;
    const parent = node.parent;
    const key = node.key;
    const proxy = node.proxy;
    parent.finalities.draft.push((patches?: Patches, inversePatches?: Patches) => {
      const oldProxyDraft = getProxyDraft(proxy);
      const parentCopy = parent.type === DraftType.Set ? parent.setMap : parent.copy;
      if (parentCopy) {
        const draft = get(parentCopy, key);
        const proxyDraft = getProxyDraft(draft);
        if (proxyDraft) {
          let updatedValue = proxyDraft.original;
          if (proxyDraft.operated) {
            updatedValue = getValue(draft);
          }
          finalizeSetValue(proxyDraft);
          finalizePatches(proxyDraft, gpFn, patches, inversePatches);
          set(parentCopy, key, updatedValue);
        }
      }
      oldProxyDraft?.callbacks?.forEach((cb) => cb(patches, inversePatches));
    });
  }
}

export function resumeDraftTree<T>(
  draft: T,
  finalizedState: T,
  finalities: Finalities,
  gpFn: GeneratePatches
): void {
  const rootProxyDraft = getProxyDraft(draft);
  if (!rootProxyDraft) return;

  const allNodes = finalities.nodes.slice();

  // Clear transient state
  finalities.draft.length = 0;
  finalities.handledSet = new WeakSet<any>();
  finalities.draftsCache = new WeakSet<object>();
  if (rootProxyDraft.options.updatedValues) {
    rootProxyDraft.options.updatedValues = undefined;
  }

  // Reset root
  resetNode(rootProxyDraft, finalizedState);

  // Reset children and rebuild node tracking
  const resetChildren: ProxyDraft[] = [];
  finalities.nodes.length = 0;
  finalities.nodes.push(rootProxyDraft);

  for (const node of allNodes) {
    if (node === rootProxyDraft) continue;
    const keyPath = buildKeyPath(node);
    if (keyPath === null) continue;
    const newOriginal = keyPath.length === 0
      ? finalizedState
      : resolveByKeyPath(finalizedState, keyPath);
    if (newOriginal === undefined) continue;
    resetNode(node, newOriginal);
    resetChildren.push(node);
    finalities.nodes.push(node);
  }

  rebuildCallbacks(rootProxyDraft, resetChildren, gpFn);
}
