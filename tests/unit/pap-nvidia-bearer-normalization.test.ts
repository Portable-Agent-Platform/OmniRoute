import test from "node:test";
import assert from "node:assert/strict";

import { normalizeBearerCredentialForRuntime } from "../../src/shared/utils/bearerCredential.ts";
import { buildBearerHeaders } from "../../src/lib/providers/validation/headers.ts";
import {
  createLazyConnectionView,
  createLazyRowProxy,
} from "../../src/lib/db/providers/lazyConnectionView.ts";

test("PAP bearer normalizer preserves a raw NVIDIA token", () => {
  assert.equal(normalizeBearerCredentialForRuntime("nvapi-example"), "nvapi-example");
});

test("PAP bearer normalizer removes whitespace and an accidental Bearer prefix", () => {
  assert.equal(
    normalizeBearerCredentialForRuntime("  Bearer   nvapi-example  "),
    "nvapi-example"
  );
  assert.equal(normalizeBearerCredentialForRuntime("bearer nvapi-example"), "nvapi-example");
});

test("PAP validation headers never emit double Bearer", () => {
  const headers = buildBearerHeaders(" Bearer nvapi-example ");
  assert.equal(headers.Authorization, "Bearer nvapi-example");
});

test("PAP NVIDIA lazy connection view canonicalizes apiKey only at runtime", () => {
  const view = createLazyConnectionView({
    id: "nvidia-1",
    provider: "nvidia",
    isActive: true,
    apiKey: " Bearer nvapi-example ",
  });
  assert.equal(view.apiKey, "nvapi-example");
});

test("PAP NVIDIA lazy row proxy canonicalizes apiKey", () => {
  const view = createLazyRowProxy({
    id: "nvidia-2",
    provider: "nvidia",
    apiKey: " Bearer nvapi-example ",
  });
  assert.equal(view.apiKey, "nvapi-example");
});

test("PAP lazy credential normalization does not alter non-NVIDIA apiKeys", () => {
  const view = createLazyRowProxy({
    id: "openai-1",
    provider: "openai",
    apiKey: " Bearer custom-token ",
  });
  assert.equal(view.apiKey, " Bearer custom-token ");
});
