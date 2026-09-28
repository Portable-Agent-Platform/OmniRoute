import test from "node:test";
import assert from "node:assert/strict";

import { parseModel } from "../../open-sse/services/model.ts";

const NEMOTRON_SUPER = "nvidia/nemotron-3-super-120b-a12b";

test("PAP preserves NVIDIA-owned vendor-qualified model ids exactly", () => {
  const parsed = parseModel(NEMOTRON_SUPER);

  assert.equal(parsed.provider, null);
  assert.equal(parsed.model, NEMOTRON_SUPER);
  assert.equal(parsed.isAlias, true);
});

test("PAP explicit NVIDIA routing strips only the OmniRoute provider prefix", () => {
  const parsed = parseModel(`nvidia/${NEMOTRON_SUPER}`);

  assert.equal(parsed.provider, "nvidia");
  assert.equal(parsed.model, NEMOTRON_SUPER);
  assert.equal(parsed.isAlias, false);
});

test("PAP NVIDIA routing never collapses the upstream vendor namespace", () => {
  const lightning = "nvidia/nemotron-3.5-lightning-30b-a3b";
  const parsed = parseModel(`nvidia/${lightning}`);

  assert.equal(parsed.provider, "nvidia");
  assert.equal(parsed.model, lightning);
  assert.notEqual(parsed.model, "nemotron-3.5-lightning-30b-a3b");
});
