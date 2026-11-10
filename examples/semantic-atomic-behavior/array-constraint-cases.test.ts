import assert from "node:assert/strict";
import { evaluateConstraintCase, generateConstraintCases, verifyConstraintCases, type SemanticContract } from "../../src/constraint-cases.ts";

const person: SemanticContract = {
  name: "Person",
  properties: {
    name: { type: "string", example: "Maria Silva", constraints: [{ kind: "minLength", value: 2 }] },
    networks: {
      type: "array",
      example: [{ name: "github", user: "suissa" }],
      items: {
        type: "object",
        example: { name: "github", user: "suissa" },
        properties: {
          name: { type: "string", example: "github", constraints: [{ kind: "non_empty" }] },
          user: { type: "string", example: "suissa", constraints: [{ kind: "minLength", value: 1 }] }
        }
      }
    }
  }
};

const cases = generateConstraintCases(person);
assert.ok(cases.some(test => test.path === "networks" && test.objective === "type.mismatch"));
assert.ok(cases.some(test => test.path === "networks.0.name" && test.objective === "type.mismatch"));
assert.ok(cases.some(test => test.path === "networks.0.name" && test.objective === "presence.missing"));
assert.ok(cases.some(test => test.path === "networks.0.user" && test.objective === "boundary.minLength"));
assert.equal(verifyConstraintCases(person, cases).failed.length, 0);

const invalid = cases.find(test => test.id === "Person.networks.0.name.type.mismatch");
assert.ok(invalid);
assert.equal(evaluateConstraintCase(person, invalid!), false);

const missing = cases.find(test => test.id === "Person.networks.0.name.presence.missing");
assert.ok(missing);
assert.equal(evaluateConstraintCase(person, missing!), false);

console.log(JSON.stringify({ ok: true, cases: cases.length, verification: verifyConstraintCases(person, cases) }));
