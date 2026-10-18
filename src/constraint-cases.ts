export type SemanticPrimitiveType = "string" | "number" | "integer" | "boolean" | "object" | "array";
export type Constraint =
  | { kind: "required" } | { kind: "min" | "max" | "minLength" | "maxLength"; value: number }
  | { kind: "pattern"; value: string } | { kind: "enum"; values: readonly unknown[] }
  | { kind: "positive" } | { kind: "non_empty" };
export interface PropertyContract { type: SemanticPrimitiveType; required?: boolean; example: unknown; constraints?: readonly Constraint[] }
export interface SemanticContract { name: string; properties: Record<string, PropertyContract> }
export interface ConstraintTestCase {
  id: string; contract: string; path: string; objective: string; input: Record<string, unknown>;
  expected: "accept" | "reject"; rationale: string;
}
const clone = <T>(value: T): T => structuredClone(value);
function matchesType(value: unknown, type: SemanticPrimitiveType): boolean {
  switch (type) {
    case "string": return typeof value === "string";
    case "number": return typeof value === "number" && Number.isFinite(value);
    case "integer": return typeof value === "number" && Number.isInteger(value);
    case "boolean": return typeof value === "boolean";
    case "object": return value !== null && typeof value === "object" && !Array.isArray(value);
    case "array": return Array.isArray(value);
  }
}
function satisfies(value: unknown, property: PropertyContract): boolean {
  if (!matchesType(value, property.type)) return false;
  for (const c of property.constraints ?? []) switch (c.kind) {
    case "required": break;
    case "min": if (typeof value !== "number" || value < c.value) return false; break;
    case "max": if (typeof value !== "number" || value > c.value) return false; break;
    case "minLength": if (typeof value !== "string" || value.length < c.value) return false; break;
    case "maxLength": if (typeof value !== "string" || value.length > c.value) return false; break;
    case "pattern": if (typeof value !== "string" || !new RegExp(c.value).test(value)) return false; break;
    case "enum": if (!c.values.some(candidate => Object.is(candidate, value))) return false; break;
    case "positive": if (typeof value !== "number" || value <= 0) return false; break;
    case "non_empty": if (typeof value !== "string" || value.trim().length === 0) return false; break;
  }
  return true;
}
function invalidValue(type: SemanticPrimitiveType, c: Constraint): unknown {
  switch (c.kind) {
    case "min": return c.value - 1;
    case "max": return c.value + 1;
    case "minLength": return "x".repeat(Math.max(0, c.value - 1));
    case "maxLength": return "x".repeat(c.value + 1);
    case "pattern": return "";
    case "enum": return "__not_in_enum__";
    case "positive": return 0;
    case "non_empty": return "   ";
    case "required": return undefined;
  }
}
function mismatch(type: SemanticPrimitiveType): unknown {
  switch (type) {
    case "string": return 123;
    case "number": case "integer": return "not-a-number";
    case "boolean": return "true";
    case "object": return [];
    case "array": return {};
  }
}
/** Generates deterministic cases from declared constraints and explicit examples. */
export function generateConstraintCases(contract: SemanticContract): ConstraintTestCase[] {
  const baseline: Record<string, unknown> = {};
  for (const [path, p] of Object.entries(contract.properties)) if (p.required !== false) baseline[path] = clone(p.example);
  const cases: ConstraintTestCase[] = [];
  const add = (path: string, objective: string, value: unknown, expected: "accept" | "reject", rationale: string, omit = false) => {
    const input = clone(baseline);
    if (omit) delete input[path]; else input[path] = clone(value);
    cases.push({ id: contract.name + "." + path + "." + objective, contract: contract.name, path, objective, input, expected, rationale });
  };
  cases.push({ id: contract.name + ".baseline.valid", contract: contract.name, path: "$", objective: "baseline.valid", input: clone(baseline), expected: "accept", rationale: "Declared example values form the baseline fixture." });
  for (const [path, p] of Object.entries(contract.properties)) {
    add(path, "type.mismatch", mismatch(p.type), "reject", "The value must have semantic type " + p.type + ".");
    if (p.required !== false && !(p.constraints ?? []).some(c => c.kind === "required"))
      add(path, "presence.missing", undefined, "reject", "Required property must be present.", true);
    for (const [i, c] of (p.constraints ?? []).entries()) {
      if (c.kind === "required") { add(path, "constraint." + i + ".missing", undefined, "reject", "Required constraint rejects omission.", true); continue; }
      add(path, "constraint." + c.kind + ".violated", invalidValue(p.type, c), "reject", "Deliberately violates " + c.kind + ".");
      if (c.kind === "min") add(path, "boundary.min", c.value, "accept", "Exact minimum is included.");
      if (c.kind === "max") add(path, "boundary.max", c.value, "accept", "Exact maximum is included.");
      if (c.kind === "minLength") add(path, "boundary.minLength", "x".repeat(c.value), "accept", "Exact minimum length is included.");
      if (c.kind === "maxLength") add(path, "boundary.maxLength", "x".repeat(c.value), "accept", "Exact maximum length is included.");
    }
  }
  return cases;
}
/** Independent oracle for supported flat-property contracts. */
export function evaluateConstraintCase(contract: SemanticContract, test: ConstraintTestCase): boolean {
  if (test.path === "$") return Object.entries(contract.properties).every(([path, p]) =>
    p.required === false && !Object.hasOwn(test.input, path) ? true : Object.hasOwn(test.input, path) && satisfies(test.input[path], p));
  const p = contract.properties[test.path];
  if (!p) return false;
  if (!Object.hasOwn(test.input, test.path)) return p.required !== false && !(p.constraints ?? []).some(c => c.kind === "required") ? false : true;
  return satisfies(test.input[test.path], p);
}
export function verifyConstraintCases(contract: SemanticContract, cases = generateConstraintCases(contract)): { total: number; passed: number; failed: string[] } {
  const failed = cases.filter(test => (evaluateConstraintCase(contract, test) ? "accept" : "reject") !== test.expected).map(test => test.id);
  return { total: cases.length, passed: cases.length - failed.length, failed };
}
