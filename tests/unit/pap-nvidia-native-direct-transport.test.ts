import { test } from "node:test";
import assert from "node:assert/strict";
import { proxyFetch } from "../../open-sse/utils/proxyFetch.ts";
import { shouldUseNativeDirectFetch } from "../../open-sse/utils/nativeDirectHosts.ts";

test("PAP NVIDIA direct egress uses native fetch without touching custom undici dispatcher", async () => {
  let nativeCalls = 0;
  let undiciCalls = 0;
  let nativeInit: RequestInit | undefined;
  const staleDispatcher = { name: "must-be-stripped" };
  const res = await proxyFetch(
    "https://integrate.api.nvidia.com/v1/chat/completions",
    {
      method: "POST",
      body: JSON.stringify({ model: "moonshotai/kimi-k3" }),
      dispatcher: staleDispatcher,
    } as RequestInit & { dispatcher: unknown },
    {
      nativeFetch: async (_input, init) => {
        nativeCalls++;
        nativeInit = init;
        return new Response("native-ok", { status: 200 });
      },
      undiciFetch: async () => {
        undiciCalls++;
        throw new Error("custom undici dispatcher must not run for direct NVIDIA egress");
      },
    }
  );
  assert.equal(nativeCalls, 1);
  assert.equal(undiciCalls, 0);
  assert.equal("dispatcher" in ((nativeInit || {}) as Record<string, unknown>), false);
  assert.equal(await res.text(), "native-ok");
});

test("native-direct host policy is exact and does not match lookalikes", () => {
  assert.equal(shouldUseNativeDirectFetch("https://integrate.api.nvidia.com/v1/models"), true);
  assert.equal(shouldUseNativeDirectFetch("https://INTEGRATE.API.NVIDIA.COM/v1/models"), true);
  assert.equal(shouldUseNativeDirectFetch("https://integrate.api.nvidia.com.evil.test/v1/models"), false);
  assert.equal(shouldUseNativeDirectFetch("https://example.invalid/v1/models"), false);
});
