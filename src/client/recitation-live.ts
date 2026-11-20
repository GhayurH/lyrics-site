import type { LiveRecitationPosition } from "../lib/recitation-set";

interface LiveState { live: LiveRecitationPosition | null; contentRevision: string }
interface LiveOptions {
  id: string;
  contentRevision: string;
  canPoll: () => boolean;
  onState: (live: LiveRecitationPosition | null) => void | Promise<void>;
  onError: (message: string) => void;
  onUnavailable: (status: number) => void;
  onContentChanged: () => void;
}
interface Runtime {
  fetch: typeof fetch;
  setTimeout: (callback: () => void, milliseconds: number) => ReturnType<typeof setTimeout>;
  clearTimeout: (timer: ReturnType<typeof setTimeout>) => void;
  random: () => number;
  now: () => number;
}
const interval = 10_000;

function parseState(value: unknown): LiveState {
  const state = value as LiveState | null;
  if (!state || typeof state !== "object" || Array.isArray(state) ||
      typeof state.contentRevision !== "string" || !/^[a-f0-9]{64}$/.test(state.contentRevision) ||
      (state.live !== null && (!state.live || typeof state.live !== "object" ||
        typeof state.live.active !== "boolean" || typeof state.live.currentUid !== "string" ||
        !/^[a-f0-9-]{8,80}$/i.test(state.live.currentUid))))
    throw Error("Unable to read organizer's live position. Retrying…");
  return state;
}

/** Opt-in polling holds one state in memory. A bounded retry loop stops while
 * hidden/offline, aborts stale requests, and never silently follows edited text. */
export function createRecitationLivePoller(options: LiveOptions, dependencies: Partial<Runtime> = {}) {
  const runtime: Runtime = {
    fetch: (...args) => fetch(...args),
    setTimeout: (callback, milliseconds) => setTimeout(callback, milliseconds),
    clearTimeout: timer => clearTimeout(timer),
    random: Math.random, now: Date.now, ...dependencies,
  };
  let enabled = false;
  let destroyed = false;
  let generation = 0;
  let failures = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let inFlight: AbortController | undefined;
  let etag: string | null = null;
  let lastState: LiveState | null = null;

  function clearTimer() {
    if (timer !== undefined) runtime.clearTimeout(timer);
    timer = undefined;
  }
  function pause() {
    clearTimer();
    generation++;
    const request = inFlight;
    inFlight = undefined;
    request?.abort();
  }
  function retryAfter(response: Response): number {
    const value = response.headers.get("retry-after");
    if (!value) return 0;
    const milliseconds = /^\d+(?:\.\d+)?$/.test(value)
      ? Number(value) * 1000 : Date.parse(value) - runtime.now();
    return Number.isFinite(milliseconds) ? Math.max(0, Math.min(2_147_483_647, milliseconds)) : 0;
  }
  async function resume(): Promise<void> {
    if (destroyed || !enabled || inFlight || !options.canPoll()) return;
    clearTimer();
    const request = new AbortController();
    inFlight = request;
    const currentGeneration = generation;
    const current = () => !destroyed && enabled && generation === currentGeneration;
    let nextDelay = interval;
    let minimumDelay = 0;
    let timedOut = false;
    const timeout = runtime.setTimeout(() => { timedOut = true; request.abort(); }, 8000);
    try {
      const response = await runtime.fetch(`/api/recitation-sets/${options.id}/live`, {
        cache: "no-store", signal: request.signal,
        ...(etag ? { headers: { "If-None-Match": etag } } : {}),
      });
      if (!current()) return;
      minimumDelay = retryAfter(response);
      if (response.status === 404 || response.status === 410) {
        enabled = false;
        options.onUnavailable(response.status);
        return;
      }
      let state: LiveState;
      if (response.status === 304 && lastState) state = lastState;
      else {
        if (!response.ok) throw Error("Unable to retrieve organizer's live position. Retrying…");
        state = parseState(await response.json());
      }
      runtime.clearTimeout(timeout);
      if (!current()) return;
      if (state.contentRevision !== options.contentRevision) {
        enabled = false;
        options.onContentChanged();
        return;
      }
      lastState = state;
      if (response.status !== 304) etag = response.headers.get("etag");
      failures = 0;
      await options.onState(state.live);
    } catch (error) {
      if (!current()) return;
      failures++;
      nextDelay = Math.min(60_000, interval * 2 ** Math.min(failures - 1, 3));
      options.onError(timedOut ? "The live connection timed out. Retrying…"
        : error instanceof Error ? error.message : "The live connection was interrupted. Retrying…");
    } finally {
      runtime.clearTimeout(timeout);
      if (inFlight === request) inFlight = undefined;
      if (current() && options.canPoll()) {
        // Jitter avoids every participant hitting the API on the same beat.
        const delay = Math.max(minimumDelay, Math.round(nextDelay * (1 + runtime.random() * .2)));
        timer = runtime.setTimeout(() => { timer = undefined; void resume(); }, delay);
      }
    }
  }
  return {
    setEnabled(value: boolean): Promise<void> {
      enabled = value;
      pause();
      if (!value) failures = 0;
      return value ? resume() : Promise.resolve();
    },
    pause,
    resume,
    destroy() { enabled = false; destroyed = true; pause(); lastState = null; etag = null; },
  };
}
