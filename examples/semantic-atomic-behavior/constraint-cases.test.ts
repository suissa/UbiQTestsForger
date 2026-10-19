import assert from "node:assert/strict";
import { evaluateConstraintCase, generateConstraintCases, verifyConstraintCases, type SemanticContract } from "../../src/constraint-cases.ts";

const person: SemanticContract = {
  name: "Person",
  properties: {
    name: { type: "string", example: "Maria Silva", constraints: [{ kind: "minLength", value: 2 }, { kind: "non_empty" }] },
    age: { type: "integer", example: 30, constraints: [{ kind: "min", value: 18 }, { kind: "max", value: 120 }] },
    email: { type: "string", example: "maria@example.com", constraints: [{ kind: "pattern", value: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" }] },
    address: {
      type: "object",
      example: { street: "Rua das Flores", number: 10, country: "Brasil" },
      properties: {
        street: { type: "string", example: "Rua das Flores", constraints: [{ kind: "non_empty" }] },
        number: { type: "integer", example: 10, constraints: [{ kind: "positive" }, { kind: "min", value: 1 }] },
        country: { type: "string", example: "Brasil", constraints: [{ kind: "enum", values: ["Brasil"] }] }
      }
    },
    networks: {
      type: "array",
      example: [{ name: "github", user: "suissa" }],
      items: {
        type: "object",
        properties: {
          name: { type: "string", example: "github", constraints: [{ kind: "non_empty" }] },
          user: { type: "string", example: "suissa", constraints: [{ kind: "minLength", value: 1 }] }
        }
      }
    },
    nickname: { type: "string", required: false, example: "maria", constraints: [{ kind: "maxLength", value: 20 }] }
  }
};

const cases = generateConstraintCases(person);
assert.ok(cases.some(test => test.objective === "boundary.min" && test.path === "age"));
assert.ok(cases.some(test => test.objective === "boundary.max" && test.path === "age"));
assert.ok(cases.some(test => test.objective === "type.mismatch" && test.path === "email"));
assert.ok(cases.some(test => test.objective === "constraint.enum.violated" && test.path === "address.country"));
assert.ok(cases.some(test => test.objective === "presence.missing" && test.path === "name"));
assert.ok(cases.some(test => test.objective === "constraint.positive.violated" && test.path === "address.number"));
assert.ok(cases.some(test => test.objective === "constraint.non_empty.violated" && test.path === "networks.0.name"));
assert.ok(cases.some(test => test.objective === "presence.missing" && test.path === "networks.0.user"));
assert.ok(!cases.some(test => test.objective === "presence.missing" && test.path === "nickname"));
assert.equal(verifyConstraintCases(person, cases).failed.length, 0);
const invalid = cases.find(test => test.id === "Person.address.number.constraint.min.violated");
assert.ok(invalid);
assert.equal(evaluateConstraintCase(person, invalid!), false);
console.log(JSON.stringify({ ok: true, cases: cases.length, verification: verifyConstraintCases(person, cases) }));
