import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

// #2463 — NVIDIA NIM validation must not crash with `e.startsWith is not a function`
// when providerSpecificData has malformed shapes. PAP validates NVIDIA credentials
// against the authenticated /models endpoint so model capability cannot poison key health.
//
// The validator probes via `directHttpsRequest` → `safeOutboundFetch`
// with `bypassProxyPatch: true`, which uses the ORIGINAL (un-patched) native fetch
// captured at module load. Patching `globalThis.fetch` in the test no longer
// intercepts it, so we point `baseUrl` at a real local HTTP server instead (the
// outbound guard is "none" for validation, so 127.0.0.1 is reachable). This
// exercises the true code path end-to-end without a real upstream call.
//
// IMPORTANT: import the validator at FILE LOAD (top-level), not lazily inside a
// test. `proxyFetch` captures the un-patched `globalThis.fetch` on its first
// import; if the first import happened inside a test that had already patched
// `globalThis.fetch`, `getOriginalFetch()` would forever return that test's mock
// and poison every later bypass call. Loading here pins the real native fetch.
const { validateProviderApiKey } = await import("../../src/lib/providers/validation.ts");

async function withMockServer(
  handler: (req: http.IncomingMessage, res: http.ServerResponse) => void,
  fn: (baseUrl: string) => Promise<void>
): Promise<void> {
  const server = http.createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const baseUrl = `http://127.0.0.1:${port}/v1`;
  try {
    await fn(baseUrl);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test("normalizeBaseUrl tolerates non-string baseUrl without throwing", async () => {
  // Call validation entrypoint with a non-string baseUrl in PSD; the function
  // should return a normal Validation result (not throw a TypeError such as
  // `e.startsWith is not a function` after minification — see #2463). A malformed
  // baseUrl normalizes to "" and yields an invalid relative probe URL, which the
  // outbound layer rejects gracefully — so no real upstream call is made.
  const result = await validateProviderApiKey({
    provider: "nvidia",
    apiKey: "nv-test-key",
    providerSpecificData: { baseUrl: { not: "a string" } as any },
  });
  assert.equal(typeof result, "object");
  assert.equal(typeof result.valid, "boolean");
  if (!result.valid && typeof result.error === "string") {
    assert.ok(
      !result.error.includes("startsWith"),
      `error must not mention startsWith TypeError, got: ${result.error}`
    );
    assert.ok(
      !result.error.includes("is not a function"),
      `error must not mention TypeError, got: ${result.error}`
    );
  }
});

test("nvidia specialty validator returns Invalid API key on authenticated models 401", async () => {
  await withMockServer(
    (req, res) => {
      assert.equal(req.method, "GET");
      assert.ok(String(req.url).endsWith("/models"));
      res.writeHead(401, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "unauthorized" }));
    },
    async (baseUrl) => {
      const result = await validateProviderApiKey({
        provider: "nvidia",
        apiKey: "nv-badkey",
        providerSpecificData: { baseUrl },
      });
      assert.equal(result.valid, false);
      assert.equal(result.error, "Invalid API key");
      assert.equal(result.statusCode, 401);
      assert.equal(result.method, "models_auth_probe");
    }
  );
});

test("nvidia specialty validator accepts authenticated models 200 without chat probe", async () => {
  const calls: string[] = [];
  await withMockServer(
    (req, res) => {
      calls.push(`${req.method} ${req.url}`);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ data: [{ id: "nvidia/example" }] }));
    },
    async (baseUrl) => {
      const result = await validateProviderApiKey({
        provider: "nvidia",
        apiKey: "nv-key",
        providerSpecificData: { baseUrl },
      });
      assert.equal(result.valid, true);
      assert.equal(result.method, "models_auth_probe");
      assert.deepEqual(calls, ["GET /v1/models"]);
    }
  );
});

test("nvidia specialty validator keeps non-auth models failures inconclusive", async () => {
  await withMockServer(
    (_req, res) => {
      res.writeHead(503, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "temporarily unavailable" }));
    },
    async (baseUrl) => {
      const result = await validateProviderApiKey({
        provider: "nvidia",
        apiKey: "nv-key",
        providerSpecificData: { baseUrl },
      });
      assert.equal(result.valid, true);
      assert.equal(result.statusCode, 503);
      assert.equal(result.method, "models_auth_probe_inconclusive");
      assert.match(String(result.warning), /inconclusive/i);
    }
  );
});
