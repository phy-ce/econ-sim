import { flushSync } from 'react-dom';

type Transition = { ready: Promise<unknown>; finished: Promise<unknown>; skipTransition: () => void };
let active: { commit: () => void; cleanup: () => void; transition?: Transition } | undefined;

/** Explicit user actions only. Named surfaces exclude the map and the rest of the page. */
export function withViewTransition(update: () => void, selector: string) {
  if (active) {
    const previous = active;
    previous.transition?.skipTransition();
    previous.commit();
    previous.cleanup();
    update();
    return;
  }
  if (
    typeof document === 'undefined' ||
    !document.startViewTransition ||
    globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  ) {
    update();
    return;
  }
  const root = document.documentElement,
    saved = new Map<HTMLElement, { name: string; priority: string }>();
  let committed = false,
    cleaned = false;
  const nameSurfaces = () => {
    for (const node of document.querySelectorAll<HTMLElement>(selector)) {
      if (!node.getClientRects().length || saved.has(node)) continue;
      const index = saved.size;
      saved.set(node, {
        name: node.style.getPropertyValue('view-transition-name'),
        priority: node.style.getPropertyPriority('view-transition-name'),
      });
      node.style.setProperty('view-transition-name', `ui-surface-${index}`);
    }
  };
  const operation = {
    commit: () => {
      if (committed) return;
      committed = true;
      flushSync(update);
      nameSurfaces();
    },
    cleanup: () => {
      if (cleaned) return;
      cleaned = true;
      for (const [node, old] of saved) {
        if (old.name) node.style.setProperty('view-transition-name', old.name, old.priority);
        else node.style.removeProperty('view-transition-name');
      }
      root.classList.remove('ui-transition');
      if (active === operation) active = undefined;
    },
    transition: undefined as Transition | undefined,
  };
  active = operation;
  root.classList.add('ui-transition');
  nameSurfaces();
  try {
    operation.transition = document.startViewTransition(operation.commit);
    void operation.transition.ready.catch(() => {});
    void operation.transition.finished.then(operation.cleanup, operation.cleanup);
  } catch {
    try {
      operation.commit();
    } finally {
      operation.cleanup();
    }
  }
}
