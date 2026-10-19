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
  example?: unknown;
  constraints?: readonly Constraint[];
  properties?: Record<string, PropertyContract>;
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
type Leaf = { path: string; property: PropertyContract; required: boolean };
const clone = <T>(value: T): T => structuredClone(value);
const hasOwn = (value: object, key: string): boolean => Object.hasOwn(value, key);

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
  if (property.type === "object" && property.properties) {
    const objectValue = value as Record<string, unknown>;
    for (const [key, child] of Object.entries(property.properties)) {
      const present = hasOwn(objectValue, key);
      const required = child.required !== false || (child.constraints ?? []).some(c => c.kind === "required");
      if (required && !present) return false;
      if (present && !satisfies(objectValue[key], child)) return false;
    }
  }
  if (property.type === "array" && property.items && !(value as unknown[]).every(item => satisfies(item, property.items!))) return false;
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
function mismatch(type: SemanticPrimitiveType): unknown {
  switch (type) {
    case "string": return 123;
    case "number": case "integer": return "not-a-number";
    case "boolean": return "true";
    case "object": return [];
    case "array": return {};
  }
}
function invalidValue(property: PropertyContract, c: Constraint): unknown {
  switch (c.kind) {
    case "min": return c.value - 1;
    case "max": return c.value + 1;
    case "minLength": return "x".repeat(Math.max(0, c.value - 1));
    case "maxLength": return "x".repeat(c.value + 1);
    case "pattern": {
      const candidates = ["", " ", "__invalid__", "not-an-email", "!", "0", "x".repeat(257)];
      return candidates.find(candidate => !new RegExp(c.value).test(candidate)) ?? "";
    }
    case "enum": {
      let candidate: unknown = "__not_in_enum__";
      while (c.values.some(value => Object.is(value, candidate))) candidate = String(candidate) + "_";
      return candidate;
    }
    case "positive": return 0;
    case "non_empty": return "   ";
    case "required": return undefined;
  }
}
function leaves(properties: Record<string, PropertyContract>, prefix = "", inheritedRequired = true): Leaf[] {
  const result: Leaf[] = [];
  for (const [key, property] of Object.entries(properties)) {
    const path = prefix ? prefix + "." + key : key;
    const required = inheritedRequired && property.required !== false;
    if (property.type === "object" && property.properties) result.push(...leaves(property.properties, path, required));
    else if (property.type === "array" && property.items?.type === "object" && property.items.properties) {
      result.push(...leaves(property.items.properties, path + ".0", required));
    } else result.push({ path, property, required });
  }
  return result;
}
function getAtPath(input: Record<string, unknown>, path: string): unknown {
  let current: unknown = input;
  for (const segment of path.split(".")) {
    if (Array.isArray(current) && /^\d+$/.test(segment)) current = current[Number(segment)];
    else if (current !== null && typeof current === "object" && hasOwn(current, segment)) current = (current as Record<string, unknown>)[segment];
    else return undefined;
  }
  return current;
}
function setAtPath(input: Record<string, unknown>, path: string, value: unknown, omit: boolean): void {
  const segments = path.split(".");
  let current: any = input;
  for (const segment of segments.slice(0, -1)) {
    if (current === null || typeof current !== "object" || !hasOwn(current, segment)) return;
    current = current[segment];
  }
  const last = segments[segments.length - 1];
  if (omit) {
    if (Array.isArray(current) && /^\d+$/.test(last)) current.splice(Number(last), 1);
    else if (current && typeof current === "object") delete current[last];
  } else if (current && typeof current === "object") current[last] = clone(value);
}
function buildBaseline(properties: Record<string, PropertyContract>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, p] of Object.entries(properties)) {
    if (p.required === false && p.example === undefined) continue;
    if (p.example !== undefined) result[key] = clone(p.example);
    else if (p.type === "object" && p.properties) result[key] = buildBaseline(p.properties);
    else if (p.type === "array") result[key] = [];
  }
  return result;
}
/** Generates deterministic cases from a nested semantic contract and explicit fixtures. */
export function generateConstraintCases(contract: SemanticContract): ConstraintTestCase[] {
  const baseline = buildBaseline(contract.properties);
  const cases: ConstraintTestCase[] = [];
  const add = (path: string, objective: string, value: unknown, expected: "accept" | "reject", rationale: string, omit = false) => {
    const input = clone(baseline);
    setAtPath(input, path, value, omit);
    cases.push({ id: contract.name + "." + path + "." + objective, contract: contract.name, path, objective, input, expected, rationale });
  };
  cases.push({ id: contract.name + ".baseline.valid", contract: contract.name, path: "$", objective: "baseline.valid", input: clone(baseline), expected: "accept", rationale: "Declared example values form the baseline fixture." });
  for (const { path, property, required } of leaves(contract.properties)) {
    add(path, "type.mismatch", mismatch(property.type), "reject", "The value must have semantic type " + property.type + ".");
    if (required && !(property.constraints ?? []).some(c => c.kind === "required"))
      add(path, "presence.missing", undefined, "reject", "Required property must be present.", true);
    for (const c of property.constraints ?? []) {
      if (c.kind === "required") {
        add(path, "constraint.required.missing", undefined, "reject", "Required constraint rejects omission.", true);
        continue;
      }
      add(path, "constraint." + c.kind + ".violated", invalidValue(property, c), "reject", "Deliberately violates " + c.kind + ".");
      if (c.kind === "min") add(path, "boundary.min", c.value, "accept", "Exact minimum is included.");
      if (c.kind === "max") add(path, "boundary.max", c.value, "accept", "Exact maximum is included.");
      if (c.kind === "minLength") add(path, "boundary.minLength", "x".repeat(c.value), "accept", "Exact minimum length is included.");
      if (c.kind === "maxLength") add(path, "boundary.maxLength", "x".repeat(c.value), "accept", "Exact maximum length is included.");
    }
  }
  return cases;
}
/** Independent oracle for supported nested object and array-item contracts. */
export function evaluateConstraintCase(contract: SemanticContract, test: ConstraintTestCase): boolean {
  if (test.path === "$") return Object.entries(contract.properties).every(([path, p]) => {
    const present = hasOwn(test.input, path);
    const required = p.required !== false || (p.constraints ?? []).some(c => c.kind === "required");
    return required ? present && satisfies(test.input[path], p) : !present || satisfies(test.input[path], p);
  });
  const target = getPropertyAtPath(contract.properties, test.path);
  if (!target) return false;
  const present = pathExists(test.input, test.path);
  const required = target.required !== false || (target.constraints ?? []).some(c => c.kind === "required");
  if (!present) return !required;
  return satisfies(getAtPath(test.input, test.path), target);
}
function getPropertyAtPath(properties: Record<string, PropertyContract>, path: string): PropertyContract | undefined {
  const parts = path.split(".");
  let current: PropertyContract | undefined;
  let map = properties;
  for (let i = 0; i < parts.length; i++) {
    const segment = parts[i];
    if (current?.type === "array" && /^\d+$/.test(segment)) current = current.items;
    else current = map[segment];
    if (!current) return undefined;
    if (i < parts.length - 1) {
      if (current.type === "object" && current.properties) map = current.properties;
      else if (current.type === "array" && current.items?.type === "object" && current.items.properties) map = current.items.properties;
      else if (current.type === "array" && /^\d+$/.test(parts[i + 1])) continue;
      else return undefined;
    }
  }
  return current;
}
function pathExists(input: Record<string, unknown>, path: string): boolean {
  const parts = path.split(".");
  let current: unknown = input;
  for (let i = 0; i < parts.length; i++) {
    const segment = parts[i];
    if (Array.isArray(current) && /^\d+$/.test(segment)) {
      const index = Number(segment);
      if (index >= current.length) return false;
      current = current[index];
    } else if (current !== null && typeof current === "object" && hasOwn(current, segment)) current = (current as Record<string, unknown>)[segment];
    else return false;
  }
  return true;
}
export function verifyConstraintCases(contract: SemanticContract, cases = generateConstraintCases(contract)): { total: number; passed: number; failed: string[] } {
  const failed = cases.filter(test => (evaluateConstraintCase(contract, test) ? "accept" : "reject") !== test.expected).map(test => test.id);
  return { total: cases.length, passed: cases.length - failed.length, failed };
}
