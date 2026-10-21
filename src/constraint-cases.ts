export type SemanticPrimitiveType = "string" | "number" | "integer" | "boolean" | "object" | "array";
export type Constraint =
  | { kind: "required" }
  | { kind: "min" | "max" | "minLength" | "maxLength"; value: number }
  | { kind: "pattern"; value: string }
  | { kind: "enum"; values: readonly unknown[] }
  | { kind: "positive" }
  | { kind: "non_empty" };

export interface PropertyContract {
  type: SemanticPrimitiveType;
  required?: boolean;
  example: unknown;
  constraints?: readonly Constraint[];
  /** Child contracts for object-valued properties. */
  properties?: Record<string, PropertyContract>;
  /** Contract for every array element. */
  items?: PropertyContract;
}
export interface SemanticContract { name: string; properties: Record<string, PropertyContract> }
export interface ConstraintTestCase {
  id: string;
  contract: string;
  path: string;
  objective: string;
  input: Record<string, unknown>;
  expected: "accept" | "reject";
  rationale: string;
}

const clone = <T>(value: T): T => structuredClone(value);
const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

function matchesType(value: unknown, type: SemanticPrimitiveType): boolean {
  switch (type) {
    case "string": return typeof value === "string";
    case "number": return typeof value === "number" && Number.isFinite(value);
    case "integer": return typeof value === "number" && Number.isInteger(value);
    case "boolean": return typeof value === "boolean";
    case "object": return isObject(value);
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
  if (property.properties) {
    if (!isObject(value)) return false;
    for (const [key, child] of Object.entries(property.properties)) {
      if (!Object.hasOwn(value, key)) {
        if (child.required !== false || (child.constraints ?? []).some(c => c.kind === "required")) return false;
        continue;
      }
      if (!satisfies(value[key], child)) return false;
    }
  }
  if (property.items) {
    if (!Array.isArray(value)) return false;
    if (!value.every(item => satisfies(item, property.items!))) return false;
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

function exampleFor(property: PropertyContract): unknown {
  if (property.items && Array.isArray(property.example)) {
    return property.example.map(item => {
      if (!property.items) return clone(item);
      return exampleFor({ ...property.items, example: item });
    });
  }
  if (!property.properties) return clone(property.example);
  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(property.properties)) {
    if (child.required !== false) result[key] = exampleFor(child);
  }
  return result;
}
function baselineFor(contract: SemanticContract): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, property] of Object.entries(contract.properties)) {
    if (property.required !== false) result[key] = exampleFor(property);
  }
  return result;
}
function propertyAt(contract: SemanticContract, path: string): PropertyContract | undefined {
  let properties = contract.properties;
  let current: PropertyContract | undefined;
  for (const part of path.split(".")) {
    if (/^\d+$/.test(part)) {
      if (!current?.items) return undefined;
      current = current.items;
      properties = current.properties ?? {};
      continue;
    }
    current = properties[part];
    if (!current) return undefined;
    properties = current.properties ?? {};
  }
  return current;
}
function setAtPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let current: unknown = target;
  for (const part of parts.slice(0, -1)) {
    if (isObject(current) && Object.hasOwn(current, part)) current = current[part];
    else if (Array.isArray(current) && /^\d+$/.test(part)) current = current[Number(part)];
    else return;
  }
  if (isObject(current)) current[parts[parts.length - 1]] = clone(value);
  else if (Array.isArray(current) && /^\d+$/.test(parts[parts.length - 1])) current[Number(parts[parts.length - 1])] = clone(value);
}
function deleteAtPath(target: Record<string, unknown>, path: string): void {
  const parts = path.split(".");
  let current: unknown = target;
  for (const part of parts.slice(0, -1)) {
    if (isObject(current) && Object.hasOwn(current, part)) current = current[part];
    else if (Array.isArray(current) && /^\d+$/.test(part)) current = current[Number(part)];
    else return;
  }
  if (isObject(current)) delete current[parts[parts.length - 1]];
  else if (Array.isArray(current) && /^\d+$/.test(parts[parts.length - 1])) delete current[Number(parts[parts.length - 1])];
}
function valueAtPath(target: Record<string, unknown>, path: string): { exists: boolean; value: unknown } {
  const parts = path.split(".");
  let current: unknown = target;
  for (const part of parts) {
    if (isObject(current) && Object.hasOwn(current, part)) current = current[part];
    else if (Array.isArray(current) && /^\d+$/.test(part) && Number(part) < current.length) current = current[Number(part)];
    else return { exists: false, value: undefined };
  }
  return { exists: true, value: current };
}
function isRequired(property: PropertyContract): boolean {
  return property.required !== false || (property.constraints ?? []).some(c => c.kind === "required");
}

/** Generates deterministic cases for flat contracts, nested objects, and the first declared array item. */
export function generateConstraintCases(contract: SemanticContract): ConstraintTestCase[] {
  const baseline = baselineFor(contract);
  const cases: ConstraintTestCase[] = [];
  const add = (path: string, objective: string, value: unknown, expected: "accept" | "reject", rationale: string, omit = false) => {
    const input = clone(baseline);
    if (omit) deleteAtPath(input, path); else setAtPath(input, path, value);
    cases.push({ id: contract.name + "." + path + "." + objective, contract: contract.name, path, objective, input, expected, rationale });
  };
  cases.push({ id: contract.name + ".baseline.valid", contract: contract.name, path: "$", objective: "baseline.valid", input: clone(baseline), expected: "accept", rationale: "Declared example values form the baseline fixture." });

  const visit = (properties: Record<string, PropertyContract>, prefix = ""): void => {
    for (const [key, property] of Object.entries(properties)) {
      const path = prefix ? prefix + "." + key : key;
      add(path, "type.mismatch", mismatch(property.type), "reject", "The value must have semantic type " + property.type + ".");
      if (isRequired(property)) add(path, "presence.missing", undefined, "reject", "Required property must be present.", true);
      for (const [i, constraint] of (property.constraints ?? []).entries()) {
        if (constraint.kind === "required") {
          add(path, "constraint." + i + ".missing", undefined, "reject", "Required constraint rejects omission.", true);
          continue;
        }
        add(path, "constraint." + constraint.kind + ".violated", invalidValue(property.type, constraint), "reject", "Deliberately violates " + constraint.kind + ".");
        if (constraint.kind === "min") add(path, "boundary.min", constraint.value, "accept", "Exact minimum is included.");
        if (constraint.kind === "max") add(path, "boundary.max", constraint.value, "accept", "Exact maximum is included.");
        if (constraint.kind === "minLength") add(path, "boundary.minLength", "x".repeat(constraint.value), "accept", "Exact minimum length is included.");
        if (constraint.kind === "maxLength") add(path, "boundary.maxLength", "x".repeat(constraint.value), "accept", "Exact maximum length is included.");
      }
      if (property.properties) visit(property.properties, path);
      if (property.items) visit({ "0": property.items }, path);
    }
  };
  visit(contract.properties);
  return cases;
}

/** Independent oracle for declared constraints, nested object properties, and array item schemas. */
export function evaluateConstraintCase(contract: SemanticContract, test: ConstraintTestCase): boolean {
  if (test.path === "$") {
    return Object.entries(contract.properties).every(([path, property]) => {
      const found = valueAtPath(test.input, path);
      if (!found.exists) return !isRequired(property);
      return satisfies(found.value, property);
    });
  }
  const property = propertyAt(contract, test.path);
  if (!property) return false;
  const found = valueAtPath(test.input, test.path);
  if (!found.exists) return !isRequired(property);
  return satisfies(found.value, property);
}
export function verifyConstraintCases(contract: SemanticContract, cases = generateConstraintCases(contract)): { total: number; passed: number; failed: string[] } {
  const failed = cases.filter(test => (evaluateConstraintCase(contract, test) ? "accept" : "reject") !== test.expected).map(test => test.id);
  return { total: cases.length, passed: cases.length - failed.length, failed };
}
