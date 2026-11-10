import assert from "node:assert/strict";
import { generateConstraintCases, verifyConstraintCases, type SemanticContract } from "../../src/constraint-cases.ts";

const contract: SemanticContract = {
  name: "NetworkProfile",
  properties: {
    networks: {
      type: "array",
      required: true,
      example: [{ name: "github" }],
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
