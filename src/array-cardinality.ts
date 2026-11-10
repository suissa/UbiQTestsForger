export interface ArrayCardinalityContract<T = unknown> {
  name: string;
  example: readonly T[];
  minItems?: number;
  maxItems?: number;
}

export interface ArrayCardinalityCase<T = unknown> {
  id: string;
  contract: string;
  objective: string;
  input: T[];
  expected: "accept" | "reject";
  rationale: string;
}

const clone = <T>(value: T): T => structuredClone(value);

function validLength(length: number, contract: ArrayCardinalityContract): boolean {
  return Number.isInteger(length)
    && length >= 0
    && (contract.minItems === undefined || length >= contract.minItems)
    && (contract.maxItems === undefined || length <= contract.maxItems);
}

/** Generate deterministic cardinality boundaries using only declared example items. */
export function generateArrayCardinalityCases<T>(
  contract: ArrayCardinalityContract<T>,
): ArrayCardinalityCase<T>[] {
  const { minItems, maxItems } = contract;
  if (minItems !== undefined && (!Number.isInteger(minItems) || minItems < 0)) {
    throw new RangeError("minItems must be a non-negative integer");
  }
  if (maxItems !== undefined && (!Number.isInteger(maxItems) || maxItems < 0)) {
    throw new RangeError("maxItems must be a non-negative integer");
  }
  if (minItems !== undefined && maxItems !== undefined && minItems > maxItems) {
    throw new RangeError("minItems cannot exceed maxItems");
  }

  const fixture = clone([...contract.example]);
  const cases: ArrayCardinalityCase<T>[] = [];
  const add = (objective: string, length: number, expected: "accept" | "reject", rationale: string) => {
    // A cardinality case is emitted only when its array can be built from declared fixture values.
    if (length > 0 && fixture.length === 0) return;
    const input = Array.from({ length }, (_, index) => clone(fixture[index % fixture.length]));
    cases.push({
      id: contract.name + ".array." + objective,
      contract: contract.name,
      objective,
      input,
      expected,
      rationale,
    });
  };

  add("empty", 0, validLength(0, contract) ? "accept" : "reject",
    "An empty array is valid only when minItems permits zero.");
  if (minItems !== undefined && minItems > 0) {
    add("minItems.below", minItems - 1, "reject", "The array is one item below minItems.");
    add("minItems.boundary", minItems, "accept", "The exact minItems boundary is inclusive.");
  }
  if (maxItems !== undefined) {
    add("maxItems.boundary", maxItems, "accept", "The exact maxItems boundary is inclusive.");
    add("maxItems.above", maxItems + 1, "reject", "The array is one item above maxItems.");
  }
  if (minItems === undefined && maxItems === undefined) {
    add("unbounded.fixture", fixture.length, "accept", "No cardinality bounds are declared.");
  }
  return cases;
}

/** Independent cardinality oracle; item semantics remain the responsibility of the item-contract oracle. */
export function evaluateArrayCardinalityCase<T>(
  contract: ArrayCardinalityContract<T>,
  test: ArrayCardinalityCase<T>,
): boolean {
  return Array.isArray(test.input) && validLength(test.input.length, contract);
}

export function verifyArrayCardinalityCases<T>(
  contract: ArrayCardinalityContract<T>,
  cases = generateArrayCardinalityCases(contract),
): { total: number; passed: number; failed: string[] } {
  const failed = cases
    .filter(test => (evaluateArrayCardinalityCase(contract, test) ? "accept" : "reject") !== test.expected)
    .map(test => test.id);
  return { total: cases.length, passed: cases.length - failed.length, failed };
}
