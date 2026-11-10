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
  /** Inclusive minimum number of array elements. */
  minItems?: number;
  /** Inclusive maximum number of array elements. */
  maxItems?: number;
  /** Require all array elements to be deeply distinct. */
  uniqueItems?: boolean;
  /** Subcontract matched by a configurable number of array elements. */
  contains?: PropertyContract;
  /** Inclusive minimum number of elements matching contains (defaults to 1). */
  minContains?: number;
  /** Inclusive maximum number of elements matching contains. */
  maxContains?: number;
  /** When a trigger property exists, all listed sibling properties are required. */
  dependentRequired?: Record<string, string[]>;
  /** When a trigger property exists, the complete object must satisfy this object contract. */
  dependentSchemas?: Record<string, PropertyContract>;
  /** Policy for undeclared object keys; omitted means allowed. */
  additionalProperties?: boolean | PropertyContract;
  /** Inclusive bounds for the number of keys in an object. */
  minProperties?: number;
  maxProperties?: number;
  /** Contract applied to every property name. */
  propertyNames?: PropertyContract;
  /** Contracts applied to keys matching each regular expression. */
  patternProperties?: Record<string, PropertyContract>;
}
export interface SemanticContract { name: string; properties: Record<string, PropertyContract> }
export interface ConstraintTestCase { id: string; contract: string; path: string; objective: string; input: Record<string, unknown>; expected: "accept" | "reject"; rationale: string }

const clone = <T>(value: T): T => structuredClone(value);
const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);

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
function isRequired(property: PropertyContract): boolean { return property.required !== false || (property.constraints ?? []).some(c => c.kind === "required"); }

function validCountBounds(min: number | undefined, max: number | undefined): boolean {
  return (min === undefined || (Number.isInteger(min) && min >= 0))
    && (max === undefined || (Number.isInteger(max) && max >= 0))
    && (min === undefined || max === undefined || min <= max);
}
function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length
      && a.every((value, index) => deepEqual(value, b[index]));
  }
  if (isObject(a) || isObject(b)) {
    if (!isObject(a) || !isObject(b)) return false;
    const ak = Object.keys(a).sort(), bk = Object.keys(b).sort();
    return ak.length === bk.length && ak.every((key, index) => key === bk[index] && deepEqual(a[key], b[key]));
  }
  return false;
}
function validArrayBounds(property: PropertyContract): boolean {
  const { minItems, maxItems } = property;
  return validCountBounds(minItems, maxItems)
    && validCountBounds(property.minContains, property.maxContains)
    && (property.maxContains === undefined || (property.minContains ?? 1) <= property.maxContains)
    && ((property.minContains === undefined && property.maxContains === undefined)
      || property.contains !== undefined)
    && (property.uniqueItems === undefined || typeof property.uniqueItems === "boolean");
}
function assertValidContract(properties: Record<string, PropertyContract>, prefix = ""): void {
  for (const [key, property] of Object.entries(properties)) {
    const path = prefix ? prefix + "." + key : key;
    if (!validArrayBounds(property)) throw new RangeError("Invalid array cardinality bounds at " + path);
    if (!validCountBounds(property.minProperties, property.maxProperties))
      throw new RangeError("Invalid object property-count bounds at " + path);
    if ((property.minProperties !== undefined || property.maxProperties !== undefined
      || property.propertyNames !== undefined || property.patternProperties !== undefined)
      && property.type !== "object") throw new TypeError("Object invariants require object type at " + path);
    if (property.propertyNames) assertValidContract({ propertyName: property.propertyNames }, path + ".propertyNames");
    if (property.patternProperties) {
      for (const [pattern, schema] of Object.entries(property.patternProperties)) {
        try { new RegExp(pattern); } catch { throw new TypeError("Invalid patternProperties expression at " + path + "." + pattern); }
        assertValidContract({ patternValue: schema }, path + ".patternProperties");
      }
    }
    if ((property.minItems !== undefined || property.maxItems !== undefined || property.uniqueItems !== undefined
      || property.contains !== undefined || property.minContains !== undefined || property.maxContains !== undefined)
      && property.type !== "array")
      throw new TypeError("Array invariants require array type at " + path);
    if (property.contains) assertValidContract({ contains: property.contains }, path + ".contains");
    if (property.properties) assertValidContract(property.properties, path);
    if (property.dependentRequired) {
      for (const [trigger, dependencies] of Object.entries(property.dependentRequired)) {
        if (!Array.isArray(dependencies) || dependencies.some(name => typeof name !== "string" || !name)
          || new Set(dependencies).size !== dependencies.length)
          throw new TypeError("dependentRequired entries must be unique non-empty property names at " + path + "." + trigger);
      }
    }
    if (property.dependentSchemas) {
      for (const [trigger, schema] of Object.entries(property.dependentSchemas)) {
        if (schema.type !== "object") throw new TypeError("dependentSchemas values must be object contracts at " + path + "." + trigger);
        assertValidContract({ [trigger]: schema }, path + ".dependentSchemas");
      }
    }
    if (property.additionalProperties !== undefined && typeof property.additionalProperties !== "boolean") {
      assertValidContract({ additional: property.additionalProperties }, path + ".additionalProperties");
    }
    if (property.items) assertValidContract({ item: property.items }, path + ".0");
  }
}

function satisfies(value: unknown, property: PropertyContract): boolean {
  if (!matchesType(value, property.type)) return false;
  if (property.type === "array" && !validArrayBounds(property)) return false;
  if (Array.isArray(value)) {
    if ((property.minItems !== undefined && value.length < property.minItems)
      || (property.maxItems !== undefined && value.length > property.maxItems)) return false;
    if (property.uniqueItems && value.some((item, index) => value.slice(0, index).some(previous => deepEqual(previous, item)))) return false;
    if (property.contains) {
      const matches = value.filter(item => satisfies(item, property.contains!)).length;
      const minimum = property.minContains ?? 1;
      if (matches < minimum || (property.maxContains !== undefined && matches > property.maxContains)) return false;
    }
  }
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
      if (!Object.hasOwn(value, key)) { if (isRequired(child)) return false; continue; }
      if (!satisfies(value[key], child)) return false;
    }
    const keys = Object.keys(value);
    if ((property.minProperties !== undefined && keys.length < property.minProperties)
      || (property.maxProperties !== undefined && keys.length > property.maxProperties)) return false;
    const known = new Set(Object.keys(property.properties));
    for (const key of keys) {
      if (property.propertyNames && !satisfies(key, property.propertyNames)) return false;
      let matchedPattern = false;
      for (const [pattern, schema] of Object.entries(property.patternProperties ?? {})) {
        if (new RegExp(pattern).test(key)) {
          matchedPattern = true;
          if (!satisfies(value[key], schema)) return false;
        }
      }
      if (known.has(key) || matchedPattern) continue;
      if (property.additionalProperties === false) return false;
      if (property.additionalProperties && typeof property.additionalProperties === "object"
        && !satisfies(value[key], property.additionalProperties)) return false;
    }
    for (const [trigger, dependencies] of Object.entries(property.dependentRequired ?? [])) {
      if (Object.hasOwn(value, trigger) && dependencies.some(name => !Object.hasOwn(value, name))) return false;
    }
    for (const [trigger, schema] of Object.entries(property.dependentSchemas ?? [])) {
      if (Object.hasOwn(value, trigger) && !satisfies(value, schema)) return false;
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
    case "min": return c.value - 1; case "max": return c.value + 1;
    case "minLength": return "x".repeat(Math.max(0, c.value - 1)); case "maxLength": return "x".repeat(c.value + 1);
    case "pattern": return ""; case "enum": return "__not_in_enum__"; case "positive": return 0; case "non_empty": return "   "; case "required": return undefined;
  }
}
function mismatch(type: SemanticPrimitiveType): unknown {
  switch (type) { case "string": return 123; case "number": case "integer": return "not-a-number"; case "boolean": return "true"; case "object": return []; case "array": return {}; }
}
function exampleFor(property: PropertyContract): unknown {
  if (property.items && Array.isArray(property.example)) return property.example.map(item => exampleFor({ ...property.items!, example: item }));
  if (!property.properties) return clone(property.example);
  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(property.properties)) if (isRequired(child)) result[key] = exampleFor(child);
  return result;
}
function baselineFor(contract: SemanticContract): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, property] of Object.entries(contract.properties)) if (isRequired(property)) result[key] = exampleFor(property);
  return result;
}
function propertyAt(contract: SemanticContract, path: string): PropertyContract | undefined {
  let properties = contract.properties; let current: PropertyContract | undefined;
  for (const part of path.split(".")) {
    if (/^\d+$/.test(part)) { if (!current?.items) return undefined; current = current.items; properties = current.properties ?? {}; continue; }
    current = properties[part]; if (!current) return undefined; properties = current.properties ?? {};
  }
  return current;
}
function setAtPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split("."); let current: unknown = target;
  for (const part of parts.slice(0, -1)) {
    if (isObject(current) && Object.hasOwn(current, part)) current = current[part];
    else if (Array.isArray(current) && /^\d+$/.test(part)) current = current[Number(part)]; else return;
  }
  const last = parts[parts.length - 1];
  if (isObject(current)) current[last] = clone(value); else if (Array.isArray(current) && /^\d+$/.test(last)) current[Number(last)] = clone(value);
}
function deleteAtPath(target: Record<string, unknown>, path: string): void {
  const parts = path.split("."); let current: unknown = target;
  for (const part of parts.slice(0, -1)) {
    if (isObject(current) && Object.hasOwn(current, part)) current = current[part];
    else if (Array.isArray(current) && /^\d+$/.test(part)) current = current[Number(part)]; else return;
  }
  const last = parts[parts.length - 1];
  if (isObject(current)) delete current[last]; else if (Array.isArray(current) && /^\d+$/.test(last)) delete current[Number(last)];
}
function valueAtPath(target: Record<string, unknown>, path: string): { exists: boolean; value: unknown } {
  const parts = path.split("."); let current: unknown = target;
  for (const part of parts) {
    if (isObject(current) && Object.hasOwn(current, part)) current = current[part];
    else if (Array.isArray(current) && /^\d+$/.test(part) && Number(part) < current.length) current = current[Number(part)]; else return { exists: false, value: undefined };
  }
  return { exists: true, value: current };
}

/** Generates deterministic cases for flat contracts, nested objects, and every declared array item. */
export function generateConstraintCases(contract: SemanticContract): ConstraintTestCase[] {
  assertValidContract(contract.properties);
  const baseline = baselineFor(contract); const cases: ConstraintTestCase[] = [];
  const add = (path: string, objective: string, value: unknown, expected: "accept" | "reject", rationale: string, omit = false) => {
    const input = clone(baseline); if (omit) deleteAtPath(input, path); else setAtPath(input, path, value);
    cases.push({ id: contract.name + "." + path + "." + objective, contract: contract.name, path, objective, input, expected, rationale });
  };
  cases.push({ id: contract.name + ".baseline.valid", contract: contract.name, path: "$", objective: "baseline.valid", input: clone(baseline), expected: "accept", rationale: "Declared example values form the baseline fixture." });
  const visit = (properties: Record<string, PropertyContract>, prefix = ""): void => {
    for (const [key, property] of Object.entries(properties)) {
      const path = prefix ? prefix + "." + key : key;
      add(path, "type.mismatch", mismatch(property.type), "reject", "The value must have semantic type " + property.type + ".");
      if (isRequired(property)) add(path, "presence.missing", undefined, "reject", "Required property must be present.", true);
      for (const [i, constraint] of (property.constraints ?? []).entries()) {
        if (constraint.kind === "required") { add(path, "constraint." + i + ".missing", undefined, "reject", "Required constraint rejects omission.", true); continue; }
        add(path, "constraint." + constraint.kind + ".violated", invalidValue(property.type, constraint), "reject", "Deliberately violates " + constraint.kind + ".");
        if (constraint.kind === "min") add(path, "boundary.min", constraint.value, "accept", "Exact minimum is included.");
        if (constraint.kind === "max") add(path, "boundary.max", constraint.value, "accept", "Exact maximum is included.");
        if (constraint.kind === "minLength") add(path, "boundary.minLength", "x".repeat(constraint.value), "accept", "Exact minimum length is included.");
        if (constraint.kind === "maxLength") add(path, "boundary.maxLength", "x".repeat(constraint.value), "accept", "Exact maximum length is included.");
      }
      if (property.type === "array" && (property.minItems !== undefined || property.maxItems !== undefined)) {
        const fixture = Array.isArray(property.example) ? clone(property.example) : [];
        const addCardinality = (objective: string, length: number, expected: "accept" | "reject", rationale: string) => {
          if (length > 0 && fixture.length === 0) return;
          const value = Array.from({ length }, (_, index) => clone(fixture[index % fixture.length]));
          add(path, objective, value, expected, rationale);
        };
        const min = property.minItems, max = property.maxItems;
        addCardinality("array.empty", 0, min === undefined || min === 0 ? "accept" : "reject", "An empty array is valid only when minItems permits zero.");
        if (min !== undefined && min > 0) {
          addCardinality("array.minItems.below", min - 1, "reject", "The array is one item below minItems.");
          addCardinality("array.minItems.boundary", min, "accept", "The exact minItems boundary is inclusive.");
        }
        if (max !== undefined) {
          addCardinality("array.maxItems.boundary", max, "accept", "The exact maxItems boundary is inclusive.");
          addCardinality("array.maxItems.above", max + 1, "reject", "The array is one item above maxItems.");
        }
      }
      if (property.type === "array" && property.uniqueItems !== undefined && Array.isArray(property.example) && property.example.length > 0) {
        const first = clone(property.example[0]);
        const duplicate = [first, clone(first)];
        add(path, "array.uniqueItems.duplicate", duplicate, property.uniqueItems ? "reject" : "accept",
          property.uniqueItems ? "Deeply duplicated elements violate uniqueItems." : "Duplicate elements are permitted when uniqueItems is false.");
        if (property.uniqueItems) {
          const distinct = property.example.length > 1 ? [clone(property.example[0]), clone(property.example[1])] : [first];
          add(path, "array.uniqueItems.distinct", distinct, "accept", "An array without duplicate elements satisfies uniqueItems.");
        }
      }
      if (property.type === "array" && property.contains) {
        const minimum = property.minContains ?? 1;
        const matching = clone(property.contains.example);
        const addContains = (objective: string, count: number, expected: "accept" | "reject", rationale: string) => {
          const values = Array.from({ length: count }, () => clone(matching));
          add(path, objective, values, expected, rationale);
        };
        addContains("array.contains.match", minimum, "accept",
          "The array contains the minimum required number of values matching the contains contract.");
        if (minimum > 0) addContains("array.contains.below-minimum", minimum - 1, "reject",
          "The array has fewer matches than minContains.");
        if (property.maxContains !== undefined) {
          addContains("array.contains.maximum", property.maxContains, "accept",
            "The number of matching values is at the inclusive maxContains boundary.");
          addContains("array.contains.above-maximum", property.maxContains + 1, "reject",
            "The array has more matches than maxContains.");
        }
        add(path, "array.contains.no-match", minimum === 0 ? [] : [mismatch(property.contains.type)], minimum === 0 ? "accept" : "reject",
          minimum === 0 ? "No match is permitted because minContains is zero." : "No array element matches the contains contract.");
      }
      if (property.properties) {
        visit(property.properties, path);
        const objectExample = exampleFor(property) as Record<string, unknown>;
        const known = new Set(Object.keys(property.properties));
        const extras = (isObject(property.example) ? Object.keys(property.example) : []).filter(key => !known.has(key));
        const withExtra = (value: Record<string, unknown>, key: string, extra: unknown) => ({ ...clone(value), [key]: clone(extra) });
        const objectKeys = Object.keys(objectExample);
        if (property.minProperties !== undefined || property.maxProperties !== undefined) {
          const min = property.minProperties ?? 0, max = property.maxProperties ?? Number.MAX_SAFE_INTEGER;
          add(path, "object.minProperties.boundary", Object.fromEntries(objectKeys.slice(0, min).map(key => [key, clone(objectExample[key])])), min <= objectKeys.length ? "accept" : "reject",
            "Object key count at the declared minimum boundary.");
          if (max < Number.MAX_SAFE_INTEGER) {
            const above = clone(objectExample);
            let index = 0;
            while (Object.keys(above).length <= max) above["extra-" + String.fromCharCode(97 + index++ % 26)] = "extra";
            add(path, "object.maxProperties.above", above, "reject",
              "Object key count exceeds the inclusive maximum by one or more keys.");
            const boundary = clone(objectExample);
            index = 0;
            while (Object.keys(boundary).length < max) boundary["boundary-" + String.fromCharCode(97 + index++ % 26)] = "extra";
            const boundaryExpected = max >= objectKeys.length ? "accept" : "reject";
            add(path, "object.maxProperties.boundary", boundary, boundaryExpected,
              "Object key count is placed at the inclusive maximum boundary.");
          }
        }
        if (property.propertyNames) {
          const key = "__invalid_property_name__";
          add(path, "object.propertyNames.valid", withExtra(objectExample, String(property.propertyNames.example), "extra"), "accept",
            "A declared property-name example is used as an object key.");
          add(path, "object.propertyNames.invalid", withExtra(objectExample, key, "extra"), "reject",
            "A key that violates the propertyNames contract is rejected.");
        }
        for (const [pattern, schema] of Object.entries(property.patternProperties ?? {})) {
          const sampleKey = Object.keys(property.example as object ?? {}).find(candidate => new RegExp(pattern).test(candidate))
            ?? (pattern.includes("^") && pattern.includes("[a-z") ? "a" : "x");
          add(path, "object.patternProperties.valid." + pattern, withExtra(objectExample, sampleKey, clone(schema.example)), "accept",
            "A matching key has a value satisfying its pattern schema.");
          add(path, "object.patternProperties.invalid." + pattern, withExtra(objectExample, sampleKey, mismatch(schema.type)), "reject",
            "A matching key has a value violating its pattern schema.");
        }
        if (property.additionalProperties === false) {
          const key = "__undeclared";
          add(path, "object.additionalProperties.forbidden", withExtra(objectExample, key, "extra"), "reject",
            "Undeclared keys are forbidden by additionalProperties=false.");
        } else if (property.additionalProperties && typeof property.additionalProperties === "object") {
          const key = "__declared_extra";
          add(path, "object.additionalProperties.valid", withExtra(objectExample, key, clone(property.additionalProperties.example)), "accept",
            "An undeclared key satisfies the additionalProperties schema.");
          add(path, "object.additionalProperties.type-mismatch", withExtra(objectExample, key, mismatch(property.additionalProperties.type)), "reject",
            "An undeclared key must satisfy the additionalProperties schema.");
        } else if (property.additionalProperties === true) {
          add(path, "object.additionalProperties.allowed", withExtra(objectExample, "__undeclared", "extra"), "accept",
            "Undeclared keys are explicitly allowed.");
        }
        for (const [trigger, dependencies] of Object.entries(property.dependentRequired ?? {})) {
          const activated = { ...clone(objectExample), [trigger]: clone(property.properties[trigger]?.example ?? "trigger") };
          for (const dependency of dependencies) activated[dependency] = clone(property.properties[dependency]?.example ?? "dependency");
          add(path, "object.dependentRequired.satisfied." + trigger, activated, "accept",
            "All dependent properties are present when the trigger exists.");
          if (dependencies.length > 0) {
            const missing = { ...activated }; delete missing[dependencies[0]];
            add(path, "object.dependentRequired.missing." + trigger, missing, "reject",
              "A triggered dependency is absent.");
          }
        }
        for (const [trigger, schema] of Object.entries(property.dependentSchemas ?? {})) {
          const activated = { ...clone(objectExample), [trigger]: clone(property.properties[trigger]?.example ?? "trigger") };
          const validDependent = exampleFor(schema) as Record<string, unknown>;
          const merged = { ...activated, ...validDependent };
          add(path, "object.dependentSchemas.valid." + trigger, merged, "accept",
            "The complete object satisfies the activated dependent schema.");
          const requiredKey = Object.entries(schema.properties ?? {}).find(([, child]) => isRequired(child))?.[0];
          if (requiredKey) {
            const invalid = { ...merged }; delete invalid[requiredKey];
            add(path, "object.dependentSchemas.invalid." + trigger, invalid, "reject",
              "The activated dependent schema rejects an object missing a required field.");
          }
        }
      }
      if (property.items && Array.isArray(property.example)) {
        // Exercise every declared fixture element; never synthesize an item when no example exists.
        const itemContracts = Object.fromEntries(
          property.example.map((_, index) => [String(index), property.items!]),
        ) as Record<string, PropertyContract>;
        if (Object.keys(itemContracts).length > 0) visit(itemContracts, path);
      }
    }
  };
  visit(contract.properties); return cases;
}

/** Independent oracle for scalar, array, and structural object invariants. */
export function evaluateConstraintCase(contract: SemanticContract, test: ConstraintTestCase): boolean {
  if (test.path === "$") return Object.entries(contract.properties).every(([path, property]) => { const found = valueAtPath(test.input, path); if (!found.exists) return !isRequired(property); return satisfies(found.value, property); });
  const property = propertyAt(contract, test.path); if (!property) return false;
  const found = valueAtPath(test.input, test.path); if (!found.exists) return !isRequired(property); return satisfies(found.value, property);
}
export function verifyConstraintCases(contract: SemanticContract, cases = generateConstraintCases(contract)): { total: number; passed: number; failed: string[] } {
  const failed = cases.filter(test => (evaluateConstraintCase(contract, test) ? "accept" : "reject") !== test.expected).map(test => test.id);
  return { total: cases.length, passed: cases.length - failed.length, failed };
}
