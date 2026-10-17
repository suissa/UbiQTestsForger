import assert from "node:assert/strict";
import { PersonSemanticAtomicBehavior, validPerson, validateThenProcess } from "./person.ts";

const valid = PersonSemanticAtomicBehavior.validate(validPerson);
assert.equal(valid.ok, true);
if (valid.ok) {
  assert.equal(valid.value.name, "Maria Silva");
  assert.equal(valid.value.phone, "+55159999990000");
  assert.equal(valid.value.email, "maria@example.com");
  assert.equal(valid.value.address.state, "SP");
  assert.equal(valid.value.networks[0].name, "github");
  assert.equal(valid.healed, true);
}

const wrapped = PersonSemanticAtomicBehavior.validate({ value: validPerson });
assert.equal(wrapped.ok, true);

const wrongName = { ...validPerson, name: 123 };
const wrongNameResult = PersonSemanticAtomicBehavior.validate(wrongName);
assert.equal(wrongNameResult.ok, false);
if (!wrongNameResult.ok) assert.equal(wrongNameResult.diagnostics[0].code, "wrong_type");

const wrongCountry = { ...validPerson, address: { ...validPerson.address, country: "Argentina" as "Brasil" } };
const countryResult = PersonSemanticAtomicBehavior.validate(wrongCountry);
assert.equal(countryResult.ok, false);
if (!countryResult.ok) assert.equal(countryResult.diagnostics[0].code, "country_brazil");

const future = { ...validPerson, birth: "2999-01-01" };
const futureResult = PersonSemanticAtomicBehavior.validate(future);
assert.equal(futureResult.ok, false);
if (!futureResult.ok) assert.equal(futureResult.diagnostics[0].code, "birth_not_future");

const duplicateNetworks = { ...validPerson, networks: [{ name: "GitHub", user: "suissa" }, { name: " github ", user: "suissa" }] };
const duplicateResult = PersonSemanticAtomicBehavior.validate(duplicateNetworks);
assert.equal(duplicateResult.ok, false);
if (!duplicateResult.ok) assert.ok(duplicateResult.diagnostics.some(d => d.code === "network_unique"));

const invalidEmail = { ...validPerson, email: "not-an-email" };
const emailResult = PersonSemanticAtomicBehavior.validate(invalidEmail);
assert.equal(emailResult.ok, false);
if (!emailResult.ok) assert.equal(emailResult.diagnostics[0].code, "email_shape");

const processed = validateThenProcess(validPerson);
assert.equal(processed.ok, true);
if (processed.ok) assert.equal(processed.path, "[true]");

const rejected = validateThenProcess({ ...validPerson, email: "broken" });
assert.equal(rejected.ok, false);
if (!rejected.ok) assert.equal(rejected.path, "[false]");

console.log(JSON.stringify({ ok: true, behavior: PersonSemanticAtomicBehavior.name, cases: 8 }));
