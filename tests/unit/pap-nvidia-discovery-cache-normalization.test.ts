import test from "node:test";
import assert from "node:assert/strict";

const { normalizeCachedProviderConnectionForRuntime } = await import(
  "../../src/lib/db/readCache.ts"
);

test("PAP normalizes NVIDIA cached apiKey for model discovery", () => {
  const row = normalizeCachedProviderConnectionForRuntime({
    id: "nvidia-1",
    provider: "nvidia",
    apiKey: "  Bearer   nvapi-example  ",
  });

  assert.equal(row?.apiKey, "nvapi-example");
});

test("PAP leaves non-NVIDIA cached credentials unchanged", () => {
  const input = {
    id: "other-1",
    provider: "openai",
    apiKey: "  Bearer custom-token  ",
  };
  const row = normalizeCachedProviderConnectionForRuntime(input);

  assert.equal(row, input);
  assert.equal(row?.apiKey, input.apiKey);
});

test("PAP NVIDIA discovery normalization is null-safe", () => {
  assert.equal(normalizeCachedProviderConnectionForRuntime(null), null);
});
