import assert from "node:assert/strict";
import {
  evaluateArrayCardinalityCase,
  generateArrayCardinalityCases,
  verifyArrayCardinalityCases,
  type ArrayCardinalityContract,
} from "../../src/array-cardinality.ts";

const contract: ArrayCardinalityContract<{ name: string }> = {
  name: "Person.networks",
  example: [{ name: "github" }],
  minItems: 1,
  maxItems: 3,
};
const cases = generateArrayCardinalityCases(contract);
assert.deepEqual(
  cases.map(test => [test.objective, test.input.length, test.expected]),
  [
    ["empty", 0, "reject"],
    ["minItems.below", 0, "reject"],
    ["minItems.boundary", 1, "accept"],
    ["maxItems.boundary", 3, "accept"],
    ["maxItems.above", 4, "reject"],
  ],
);
assert.deepEqual(verifyArrayCardinalityCases(contract, cases).failed, []);
assert.equal(evaluateArrayCardinalityCase(contract, cases.find(test => test.objective === "maxItems.above")!), false);

const zeroAllowed = generateArrayCardinalityCases({
  name: "Optional.tags",
  example: ["tag"],
  minItems: 0,
  maxItems: 2,
});
assert.equal(zeroAllowed.find(test => test.objective === "empty")?.expected, "accept");
assert.equal(zeroAllowed.find(test => test.objective === "maxItems.boundary")?.input.length, 2);

assert.throws(() => generateArrayCardinalityCases({ name: "invalid", example: [], minItems: 3, maxItems: 2 }), RangeError);
assert.throws(() => generateArrayCardinalityCases({ name: "invalid", example: [], minItems: -1 }), RangeError);

console.log(JSON.stringify({ ok: true, cases: cases.length, verification: verifyArrayCardinalityCases(contract, cases) }));
