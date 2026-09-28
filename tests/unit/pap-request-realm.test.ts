import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

import {
  getDeadlineController,
  releaseDeadlineController,
  withDeadlineSignal,
} from "../../open-sse/utils/earlyStreamKeepalive.ts";

const require = createRequire(import.meta.url);
const edgeRuntime = require("next/dist/compiled/@edge-runtime/ponyfill/index.js") as {
  Request: typeof Request;
};

test("withDeadlineSignal accepts a request from Next's fetch realm", async () => {
  const ForeignRequest = edgeRuntime.Request;
  assert.notEqual(ForeignRequest, Request);

  const input = new ForeignRequest("http://example.test/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", "x-pap-test": "realm" },
    body: JSON.stringify({ model: 123, messages: [] }),
  });

  const { wrappedReq, deadlineController } = withDeadlineSignal(input as unknown as Request);
  try {
    assert.equal(wrappedReq.url, input.url);
    assert.equal(wrappedReq.method, "POST");
    assert.equal(wrappedReq.headers.get("x-pap-test"), "realm");
    assert.deepEqual(await wrappedReq.json(), { model: 123, messages: [] });
    assert.equal(getDeadlineController(wrappedReq), deadlineController);
  } finally {
    releaseDeadlineController(deadlineController);
  }
});
