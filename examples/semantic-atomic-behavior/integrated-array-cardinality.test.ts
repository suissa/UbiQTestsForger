import assert from "node:assert/strict";
import { generateConstraintCases, verifyConstraintCases, type SemanticContract } from "../../src/constraint-cases.ts";

const contract: SemanticContract = {
  name: "NetworkProfile",
  properties: {
    networks: {
      type: "array",
      required: true,
      example: [{ name: "github" }, { name: "gitlab" }],
      minItems: 1,
      maxItems: 3,
      items: {
        type: "object",
        required: true,
        example: { name: "github" },
        properties: {
          name: { type: "string", required: true, example: "github" },
        },
      },
    },
    labels: {
      type: "array",
      required: true,
      example: ["critical", "stable"],
      items: { type: "string", required: true, example: "stable" },
      uniqueItems: true,
      contains: { type: "string", required: true, example: "critical" },
      minContains: 1,
      maxContains: 2,
    },
    optionalTags: {
      type: "array",
      required: true,
      example: ["stable"],
      items: { type: "string", required: true, example: "stable" },
      contains: { type: "string", required: true, example: "critical" },
      minContains: 0,
      maxContains: 0,
    },
    tags: {
      type: "array",
      required: true,
      example: ["stable"],
      minItems: 0,
      maxItems: 2,
      items: { type: "string", required: true, example: "stable" },
    },
  },
};
const cases = generateConstraintCases(contract);
const networks = cases.filter(test => test.path === "networks" && test.objective.startsWith("array."));
assert.deepEqual(networks.map(test => [test.objective, (test.input.networks as unknown[]).length, test.expected]), [
  ["array.empty", 0, "reject"],
  ["array.minItems.below", 0, "reject"],
  ["array.minItems.boundary", 1, "accept"],
  ["array.maxItems.boundary", 3, "accept"],
  ["array.maxItems.above", 4, "reject"],
]);
assert.equal(cases.find(test => test.path === "tags" && test.objective === "array.empty")?.expected, "accept");
assert.equal(cases.find(test => test.path === "labels" && test.objective === "array.uniqueItems.duplicate")?.expected, "reject");
assert.equal(cases.find(test => test.path === "labels" && test.objective === "array.uniqueItems.distinct")?.expected, "accept");
assert.equal(cases.find(test => test.path === "labels" && test.objective === "array.contains.match")?.expected, "accept");
assert.equal(cases.find(test => test.path === "labels" && test.objective === "array.contains.no-match")?.expected, "reject");
assert.equal(cases.find(test => test.path === "labels" && test.objective === "array.contains.above-maximum")?.expected, "reject");
assert.equal(cases.find(test => test.path === "optionalTags" && test.objective === "array.contains.no-match")?.expected, "accept");
assert.deepEqual(verifyConstraintCases(contract, cases).failed, []);
for (const path of ["networks.0.name", "networks.1.name"]) {
  const mismatch = cases.find(test => test.path === path && test.objective === "type.mismatch");
  assert.ok(mismatch, "missing item-level case for " + path);
  assert.equal(mismatch.expected, "reject");
}
assert.equal(
  (cases.find(test => test.path === "networks.1.name" && test.objective === "type.mismatch")!.input.networks as Array<{ name: unknown }>)[1].name,
  123,
);
const noItemFixture = generateConstraintCases({
  name: "EmptyExample",
  properties: {
    values: {
      type: "array",
      example: [],
      minItems: 0,
      items: { type: "string", required: true, example: "declared" },
    },
  },
});
assert.equal(noItemFixture.some(test => test.path.startsWith("values.0")), false,
  "item cases must not be generated without a declared fixture element");
assert.throws(() => generateConstraintCases({
  name: "InvalidContains",
  properties: { values: {
    type: "array", example: [], contains: { type: "string", example: "x" }, maxContains: 0,
  } },
}), RangeError);
assert.throws(() => generateConstraintCases({
  name: "InvalidUnique",
  properties: { value: { type: "string", example: "x", uniqueItems: true } },
}), TypeError);
assert.deepEqual(verifyConstraintCases(contract, cases).failed, []);
assert.throws(() => generateConstraintCases({
  name: "Invalid",
  properties: { values: { type: "array", example: [], minItems: 3, maxItems: 2 } },
}), RangeError);
assert.throws(() => generateConstraintCases({
  name: "Invalid",
  properties: { value: { type: "string", example: "x", minItems: 1 } },
}), TypeError);

console.log(JSON.stringify({ ok: true, generated: cases.length, arrays: networks.length }));
