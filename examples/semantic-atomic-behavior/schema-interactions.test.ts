import assert from "node:assert/strict";
import {
  evaluateConstraintCase,
  generateConstraintCases,
  verifyConstraintCases,
  type ConstraintTestCase,
  type SemanticContract,
} from "../../src/constraint-cases.ts";

const contract: SemanticContract = {
  name: "SchemaInteractions",
  properties: {
    profile: {
      type: "object",
      required: true,
      example: { kind: "business", taxId: "BR-123" },
      properties: {
        kind: { type: "string", required: true, example: "business" },
        taxId: { type: "string", required: false, example: "BR-123" },
        consumerCode: { type: "string", required: false, example: "C-123" },
        password: { type: "string", required: false, example: "secret" },
        passwordConfirmation: { type: "string", required: false, example: "secret" },
        mode: { type: "string", required: false, example: "managed" },
        approvalCode: { type: "string", required: false, example: "approved" },
        status: { type: "string", required: false, example: "active" },
      },
      oneOf: [
        { type: "object", example: { kind: "business" }, properties: {
          kind: { type: "string", example: "business", constraints: [{ kind: "enum", values: ["business"] }] },
        } },
        { type: "object", example: { kind: "consumer" }, properties: {
          kind: { type: "string", example: "consumer", constraints: [{ kind: "enum", values: ["consumer"] }] },
        } },
      ],
      if: {
        type: "object", example: { kind: "business" }, properties: {
          kind: { type: "string", example: "business", constraints: [{ kind: "enum", values: ["business"] }] },
        },
      },
      then: { type: "object", example: { taxId: "BR-123" }, properties: {
        taxId: { type: "string", required: true, example: "BR-123" },
      } },
      else: { type: "object", example: { consumerCode: "C-123" }, properties: {
        consumerCode: { type: "string", required: true, example: "C-123" },
      } },
      allOf: [
        { type: "object", example: { kind: "business" }, properties: {
          kind: { type: "string", example: "business", constraints: [{ kind: "enum", values: ["business", "consumer"] }] },
        } },
      ],
      not: { type: "object", example: { status: "suspended" }, properties: {
        status: { type: "string", example: "suspended", constraints: [{ kind: "enum", values: ["suspended"] }] },
      } },
      dependentRequired: { password: ["passwordConfirmation"] },
      dependentSchemas: {
        mode: { type: "object", example: { approvalCode: "approved" }, properties: {
          approvalCode: { type: "string", required: true, example: "approved" },
        } },
      },
      patternProperties: { "^x-": { type: "string", example: "label" } },
      additionalProperties: false,
    },
    tags: {
      type: "array",
      required: true,
      example: ["red"],
      uniqueItems: true,
      items: { type: "string", example: "red", constraints: [{ kind: "enum", values: ["red", "blue"] }] },
      contains: { type: "string", example: "red", constraints: [{ kind: "enum", values: ["red"] }] },
      minContains: 1,
      maxContains: 1,
      anyOf: [
        { type: "array", example: ["red"], contains: { type: "string", example: "red", constraints: [{ kind: "enum", values: ["red"] }] } },
        { type: "array", example: ["blue"], contains: { type: "string", example: "blue", constraints: [{ kind: "enum", values: ["blue"] }] } },
      ],
    },
  },
};

const generated = generateConstraintCases(contract);
assert.deepEqual(verifyConstraintCases(contract, generated).failed, []);

const interactions: Array<{ id: string; path: string; value: unknown; expected: "accept" | "reject" }> = [
  { id: "oneOf+if.then+allOf.valid-business", path: "profile", value: { kind: "business", taxId: "BR-123" }, expected: "accept" },
  { id: "oneOf+if.else+allOf.valid-consumer", path: "profile", value: { kind: "consumer", consumerCode: "C-123" }, expected: "accept" },
  { id: "oneOf+if.then.missing-tax-id", path: "profile", value: { kind: "business" }, expected: "reject" },
  { id: "oneOf+if.else.missing-consumer-code", path: "profile", value: { kind: "consumer" }, expected: "reject" },
  { id: "oneOf+allOf.overlapping-branches", path: "profile", value: { kind: "business", taxId: "BR-123", consumerCode: "C-123" }, expected: "accept" },
  { id: "dependentRequired+dependentSchemas.valid", path: "profile", value: { kind: "business", taxId: "BR-123", password: "secret", passwordConfirmation: "secret", mode: "managed", approvalCode: "approved" }, expected: "accept" },
  { id: "dependentRequired.missing+dependentSchemas.valid", path: "profile", value: { kind: "business", taxId: "BR-123", password: "secret", mode: "managed", approvalCode: "approved" }, expected: "reject" },
  { id: "dependentSchemas.missing+dependentRequired.valid", path: "profile", value: { kind: "business", taxId: "BR-123", password: "secret", passwordConfirmation: "secret", mode: "managed" }, expected: "reject" },
  { id: "not+allOf.blocked-status", path: "profile", value: { kind: "business", taxId: "BR-123", status: "suspended" }, expected: "reject" },
  { id: "patternProperties+additionalProperties.allowed-pattern", path: "profile", value: { kind: "business", taxId: "BR-123", "x-label": "release" }, expected: "accept" },
  { id: "patternProperties+additionalProperties.invalid-pattern-value", path: "profile", value: { kind: "business", taxId: "BR-123", "x-label": 42 }, expected: "reject" },
  { id: "patternProperties+additionalProperties.unknown-key", path: "profile", value: { kind: "business", taxId: "BR-123", unexpected: "value" }, expected: "reject" },
  { id: "items+contains+uniqueItems+anyOf.valid", path: "tags", value: ["red"], expected: "accept" },
  { id: "items+contains+uniqueItems+anyOf.invalid-item", path: "tags", value: ["red", "green"], expected: "reject" },
  { id: "items+contains+uniqueItems.duplicate", path: "tags", value: ["red", "red"], expected: "reject" },
  { id: "items+contains+uniqueItems.no-required-match", path: "tags", value: ["blue"], expected: "reject" },
];

const cases: ConstraintTestCase[] = interactions.map(test => ({
  id: contract.name + "." + test.id,
  contract: contract.name,
  path: test.path,
  objective: "interaction." + test.id,
  input: { profile: null, tags: null, [test.path]: test.value },
  expected: test.expected,
  rationale: "Cross-invariant interaction must be evaluated as a single semantic contract.",
}));
for (let index = 0; index < interactions.length; index++) {
  const test = interactions[index]!;
  const actual = evaluateConstraintCase(contract, cases[index]!);
  assert.equal(actual ? "accept" : "reject", test.expected, test.id);
}

console.log(JSON.stringify({
  ok: true,
  generatedCases: generated.length,
  interactionCases: interactions.length,
  passed: interactions.length,
}));
