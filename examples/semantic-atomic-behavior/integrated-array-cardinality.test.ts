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
      contains: { type: "string", required: true, example: "critical", constraints: [{ kind: "enum", values: ["critical"] }] },
      minContains: 1,
      maxContains: 1,
    },
    optionalTags: {
      type: "array",
      required: true,
      example: ["stable"],
      items: { type: "string", required: true, example: "stable" },
      contains: { type: "string", required: true, example: "critical", constraints: [{ kind: "enum", values: ["critical"] }] },
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


const objectContract: SemanticContract = {
  name: "ObjectRules",
  properties: {
    account: {
      type: "object",
      required: true,
      example: { username: "suissa" },
      properties: {
        username: { type: "string", required: true, example: "suissa" },
        password: { type: "string", required: false, example: "secret" },
        passwordConfirmation: { type: "string", required: false, example: "secret" },
        mode: { type: "string", required: false, example: "managed" },
        approvalCode: { type: "string", required: false, example: "approved" },
      },
      dependentRequired: { password: ["passwordConfirmation"] },
      dependentSchemas: {
        mode: {
          type: "object",
          example: { approvalCode: "approved" },
          properties: {
            approvalCode: { type: "string", required: true, example: "approved" },
          },
        },
      },
      additionalProperties: false,
    },
    metadata: {
      type: "object",
      required: true,
      example: { source: "api" },
      properties: { source: { type: "string", required: true, example: "api" } },
      additionalProperties: { type: "string", required: true, example: "extra" },
    },
    extensible: {
      type: "object",
      required: true,
      example: { source: "api" },
      properties: { source: { type: "string", required: true, example: "api" } },
      additionalProperties: true,
    },
  },
};
const objectCases = generateConstraintCases(objectContract);
assert.equal(objectCases.find(test => test.path === "account" && test.objective === "object.dependentRequired.missing.password")?.expected, "reject");
assert.equal(objectCases.find(test => test.path === "account" && test.objective === "object.dependentRequired.satisfied.password")?.expected, "accept");
assert.equal(objectCases.find(test => test.path === "account" && test.objective === "object.dependentSchemas.invalid.mode")?.expected, "reject");
assert.equal(objectCases.find(test => test.path === "account" && test.objective === "object.dependentSchemas.valid.mode")?.expected, "accept");
assert.equal(objectCases.find(test => test.path === "account" && test.objective === "object.additionalProperties.forbidden")?.expected, "reject");
assert.equal(objectCases.find(test => test.path === "metadata" && test.objective === "object.additionalProperties.valid")?.expected, "accept");
assert.equal(objectCases.find(test => test.path === "metadata" && test.objective === "object.additionalProperties.type-mismatch")?.expected, "reject");
assert.equal(objectCases.find(test => test.path === "extensible" && test.objective === "object.additionalProperties.allowed")?.expected, "accept");
assert.deepEqual(verifyConstraintCases(objectContract, objectCases).failed, []);
assert.throws(() => generateConstraintCases({
  name: "InvalidDependentSchema",
  properties: { account: {
    type: "object", example: {}, dependentSchemas: {
      enabled: { type: "string", example: "invalid" },
    },
  } },
}), TypeError);


const shapeContract: SemanticContract = {
  name: "ObjectShape",
  properties: {
    settings: {
      type: "object",
      required: true,
      example: { name: "default", "x-label": "critical" },
      properties: {
        name: { type: "string", required: true, example: "default" },
      },
      minProperties: 1,
      maxProperties: 3,
      propertyNames: {
        type: "string", example: "key",
        constraints: [{ kind: "pattern", value: "^[a-z-]+$" }],
      },
      patternProperties: {
        "^x-": { type: "string", example: "critical" },
      },
      additionalProperties: true,
    },
  },
};
const shapeCases = generateConstraintCases(shapeContract);
assert.equal(shapeCases.find(test => test.objective === "object.minProperties.boundary")?.expected, "accept");
assert.equal(shapeCases.find(test => test.objective === "object.maxProperties.above")?.expected, "reject");
assert.equal(shapeCases.find(test => test.objective === "object.propertyNames.valid")?.expected, "accept");
assert.equal(shapeCases.find(test => test.objective === "object.propertyNames.invalid")?.expected, "reject");
assert.equal(shapeCases.find(test => test.objective === "object.patternProperties.valid.^x-")?.expected, "accept");
assert.equal(shapeCases.find(test => test.objective === "object.patternProperties.invalid.^x-")?.expected, "reject");
assert.deepEqual(verifyConstraintCases(shapeContract, shapeCases).failed, []);
assert.throws(() => generateConstraintCases({
  name: "InvalidObjectBounds",
  properties: { data: { type: "object", example: {}, minProperties: 3, maxProperties: 2 } },
}), RangeError);
assert.throws(() => generateConstraintCases({
  name: "InvalidObjectPattern",
  properties: { data: { type: "object", example: {}, patternProperties: { "[": { type: "string", example: "x" } } } },
}), TypeError);
\nconsole.log(JSON.stringify({ ok: true, generated: cases.length, arrays: networks.length, objectCases: objectCases.length, shapeCases: shapeCases.length }));
