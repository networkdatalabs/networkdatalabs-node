import { test } from "node:test";
import assert from "node:assert/strict";
import { NetworkDataLabs, NetworkDataLabsError } from "../dist/index.js";

function mockFetch(status, payload, calls) {
  return async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
  };
}

test("lookup sends bearer auth to /v0/ip/{ip}", async () => {
  const calls = [];
  const c = new NetworkDataLabs({ apiKey: "test_key", fetch: mockFetch(200, { ip: "8.8.8.8", location: { country_code: "US" } }, calls) });
  const r = await c.lookup("8.8.8.8");
  assert.equal(r.location.country_code, "US");
  assert.equal(calls[0].url, "https://api.networkdatalabs.com/v0/ip/8.8.8.8");
  assert.equal(calls[0].init.headers.Authorization, "Bearer test_key");
});

test("lookup() without ip hits /v0/ip and encodes IPv6", async () => {
  const calls = [];
  const c = new NetworkDataLabs({ apiKey: "k", fetch: mockFetch(200, {}, calls) });
  await c.lookup();
  await c.lookup("2001:4860:4860::8888");
  assert.equal(calls[0].url, "https://api.networkdatalabs.com/v0/ip");
  assert.equal(calls[1].url, "https://api.networkdatalabs.com/v0/ip/2001%3A4860%3A4860%3A%3A8888");
});

test("me hits /v0/me", async () => {
  const calls = [];
  const c = new NetworkDataLabs({ apiKey: "k", fetch: mockFetch(200, { ip: "4.2.2.2", plan: "free" }, calls) });
  assert.equal((await c.me()).plan, "free");
  assert.ok(calls[0].url.endsWith("/v0/me"));
});

test("bulk posts JSON and validates size", async () => {
  const calls = [];
  const c = new NetworkDataLabs({ apiKey: "k", fetch: mockFetch(200, { results: {}, errors: {} }, calls) });
  await c.bulk(["8.8.8.8", "1.1.1.1"]);
  assert.equal(calls[0].init.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].init.body), { ips: ["8.8.8.8", "1.1.1.1"] });
  assert.throws(() => c.bulk([]));
  assert.throws(() => c.bulk(Array(101).fill("8.8.8.8")));
});

test("errors carry status and code", async () => {
  const c = new NetworkDataLabs({ apiKey: "k", fetch: mockFetch(429, { error: { code: "QUOTA_EXCEEDED", message: "Monthly quota reached" } }, []) });
  await assert.rejects(c.lookup("8.8.8.8"), (e) => e instanceof NetworkDataLabsError && e.status === 429 && e.code === "QUOTA_EXCEEDED");
});

test("missing key throws", () => {
  const prev = process.env.NDL_API_KEY;
  delete process.env.NDL_API_KEY;
  assert.throws(() => new NetworkDataLabs());
  if (prev !== undefined) process.env.NDL_API_KEY = prev;
});
