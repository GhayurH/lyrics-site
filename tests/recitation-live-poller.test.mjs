import test from "node:test";
import assert from "node:assert/strict";
import { createRecitationLivePoller } from "../src/client/recitation-live.ts";

const revision = "a".repeat(64);
const state = { contentRevision: revision, live: { active: true, currentUid: "391002ab-16f4-4535-bf2a-8ca02cefc956" } };
const response = (value = state, headers = { ETag: '"one"' }) => new Response(JSON.stringify(value), { headers });
const settle = () => new Promise(resolve => setImmediate(resolve));
function setup(fetcher) {
  let now = 0, sequence = 0, visible = true;
  const timers = new Map();
  const calls = [], states = [], errors = [], unavailable = [];
  let changed = 0;
  const poller = createRecitationLivePoller({
    id: "0123456789abcdef01234567", contentRevision: revision, canPoll: () => visible,
    onState: value => { states.push(value); }, onError: value => errors.push(value),
    onUnavailable: status => unavailable.push(status), onContentChanged: () => { changed++; },
  }, {
    fetch: async (...args) => { calls.push(args); return fetcher(...args); },
    setTimeout: (callback, delay) => { const id = ++sequence; timers.set(id, { callback, at: now + delay }); return id; },
    clearTimeout: id => timers.delete(id), now: () => now, random: () => 0,
  });
  return { poller, calls, states, errors, unavailable, timers,
    setVisible(value) { visible = value; }, get changed() { return changed; },
    delay: () => Math.min(...[...timers.values()].map(timer => timer.at - now)),
    async advance(milliseconds) {
      now += milliseconds;
      for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.callback(); }
      await settle();
    },
  };
}

test("live polling is opt-in, sends conditional requests and reuses an unchanged state", async () => {
  const queue = [response(), new Response(null, { status: 304 })];
  const context = setup(() => queue.shift());
  assert.equal(context.calls.length, 0);
  await context.poller.setEnabled(true);
  assert.equal(context.calls[0][0], "/api/recitation-sets/0123456789abcdef01234567/live");
  assert.equal(context.calls[0][1].cache, "no-store");
  assert.equal(context.calls[0][1].headers, undefined);
  assert.equal(context.delay(), 10000);
  await context.advance(10000);
  assert.equal(context.calls[1][1].headers["If-None-Match"], '"one"');
  assert.deepEqual(context.states, [state.live, state.live]);
  assert.equal(context.errors.length, 0);
  await context.poller.setEnabled(false);
  assert.equal(context.timers.size, 0);
  await context.poller.resume();
  assert.equal(context.calls.length, 2);
});

test("live polling backs off failures, honors Retry-After and recovers its normal cadence", async () => {
  const queue = [new Response(null, { status: 429, headers: { "Retry-After": "25" } }),
    new Response(null, { status: 503 }), new Response(null, { status: 503 }), response()];
  const context = setup(() => queue.shift());
  await context.poller.setEnabled(true);
  assert.equal(context.delay(), 25000);
  await context.advance(25000);
  assert.equal(context.delay(), 20000);
  await context.advance(20000);
  assert.equal(context.delay(), 40000);
  await context.advance(40000);
  assert.equal(context.delay(), 10000);
  assert.equal(context.errors.length, 3);
  assert.equal(context.states.length, 1);
  context.poller.destroy();
});

test("hidden/offline pauses abort requests and ignore stale replies before reconnecting", async () => {
  let finish;
  const context = setup(() => new Promise(resolve => { finish = resolve; }));
  context.setVisible(false);
  await context.poller.setEnabled(true);
  assert.equal(context.calls.length, 0);
  context.setVisible(true);
  const pending = context.poller.resume();
  assert.equal(context.calls.length, 1);
  await context.poller.resume();
  assert.equal(context.calls.length, 1, "only one request can be in flight");
  context.setVisible(false);
  context.poller.pause();
  assert.equal(context.calls[0][1].signal.aborted, true);
  finish(response());
  await pending;
  assert.equal(context.states.length, 0);
  assert.equal(context.timers.size, 0);
  context.setVisible(true);
  const resumed = context.poller.resume();
  finish(response());
  await resumed;
  assert.equal(context.states.length, 1);
  context.poller.destroy();
});

test("changed content and expired programmes stop following without applying a new position", async () => {
  for (const [reply, expected] of [[response({ ...state, contentRevision: "b".repeat(64) }), "changed"],
    [new Response(null, { status: 410 }), "expired"]]) {
    const context = setup(() => reply);
    await context.poller.setEnabled(true);
    assert.equal(context.states.length, 0);
    assert.equal(context.timers.size, 0);
    if (expected === "changed") assert.equal(context.changed, 1);
    else assert.deepEqual(context.unavailable, [410]);
    await context.poller.resume();
    assert.equal(context.calls.length, 1);
  }
});

test("stalled live requests time out and offer a retry", async () => {
  const context = setup((_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
  }));
  const pending = context.poller.setEnabled(true);
  await context.advance(8000);
  await pending;
  assert.match(context.errors[0], /timed out/);
  assert.equal(context.delay(), 10000);
  context.poller.destroy();
});
