export type Primitive = string | number | boolean;
export type SemanticAtomicBehavior<T> = { name: string; validate(input: unknown): ValidationResult<T> };
type Diagnostic = { stage: "unwrap2primitive" | "normalize" | "invariants" | "constraints" | "process"; code: string; path: string; expected: string; actual: string; repairable: boolean };
type ValidationResult<T> = { ok: true; value: T; diagnostics: Diagnostic[]; healed: boolean } | { ok: false; diagnostics: Diagnostic[]; healed: boolean };
type Address = { street: string; number: number; neighborhood: string; city: string; state: string; country: "Brasil" };
type Network = { name: string; user: string };
export type Person = { name: string; birth: string; phone: string; email: string; address: Address; networks: Network[] };
const diagnostic = (d: Diagnostic): Diagnostic => d;
function unwrap2primitive(value: unknown): unknown { let current = value; const seen = new Set<object>(); while (current !== null && typeof current === "object" && "value" in current) { if (seen.has(current)) break; seen.add(current); current = (current as { value: unknown }).value; } return current; }
function normalizePerson(input: Person): Person { return { ...input, name: input.name.trim(), birth: input.birth.trim(), phone: input.phone.replace(/[\s().-]/g, ""), email: input.email.trim().toLowerCase(), address: { ...input.address, street: input.address.street.trim(), neighborhood: input.address.neighborhood.trim(), city: input.address.city.trim(), state: input.address.state.trim().toUpperCase() }, networks: input.networks.map(n => ({ name: n.name.trim().toLowerCase(), user: n.user.trim() })) }; }
function validatePerson(input: unknown): ValidationResult<Person> {
  const diagnostics: Diagnostic[] = []; const ingress = unwrap2primitive(input);
  if (typeof ingress !== "object" || ingress === null || Array.isArray(ingress)) return { ok: false, diagnostics: [diagnostic({ stage: "unwrap2primitive", code: "wrong_type", path: "$", expected: "Person object", actual: typeof ingress, repairable: false })], healed: false };
  const p = ingress as Partial<Person>;
  for (const key of ["name", "birth", "phone", "email", "address", "networks"] as const) if (!(key in p)) diagnostics.push(diagnostic({ stage: "constraints", code: "required", path: key, expected: "present", actual: "missing", repairable: false }));
  if (diagnostics.length) return { ok: false, diagnostics, healed: false };
  if (typeof p.name !== "string") diagnostics.push(diagnostic({ stage: "unwrap2primitive", code: "wrong_type", path: "name", expected: "string", actual: typeof p.name, repairable: false }));
  if (typeof p.birth !== "string") diagnostics.push(diagnostic({ stage: "unwrap2primitive", code: "wrong_type", path: "birth", expected: "YYYY-MM-DD string", actual: typeof p.birth, repairable: false }));
  if (typeof p.phone !== "string") diagnostics.push(diagnostic({ stage: "unwrap2primitive", code: "wrong_type", path: "phone", expected: "string", actual: typeof p.phone, repairable: false }));
  if (typeof p.email !== "string") diagnostics.push(diagnostic({ stage: "unwrap2primitive", code: "wrong_type", path: "email", expected: "string", actual: typeof p.email, repairable: false }));
  if (typeof p.address !== "object" || p.address === null || Array.isArray(p.address)) diagnostics.push(diagnostic({ stage: "unwrap2primitive", code: "wrong_type", path: "address", expected: "Address object", actual: typeof p.address, repairable: false }));
  if (!Array.isArray(p.networks)) diagnostics.push(diagnostic({ stage: "unwrap2primitive", code: "wrong_type", path: "networks", expected: "Network[]", actual: typeof p.networks, repairable: false }));
  if (diagnostics.length) return { ok: false, diagnostics, healed: false };
  const normalized = normalizePerson(p as Person); const failures: Diagnostic[] = [];
  if (normalized.name.length < 2) failures.push(diagnostic({ stage: "invariants", code: "name_nonempty", path: "name", expected: "trimmed length >= 2", actual: JSON.stringify(normalized.name), repairable: false }));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized.birth)) failures.push(diagnostic({ stage: "invariants", code: "birth_iso_date", path: "birth", expected: "YYYY-MM-DD", actual: normalized.birth, repairable: false });
  else if (new Date(`${normalized.birth}T00:00:00Z`).getTime() > Date.now()) failures.push(diagnostic({ stage: "invariants", code: "birth_not_future", path: "birth", expected: "date <= now", actual: normalized.birth, repairable: false }));
  if (!/^\+[1-9]\d{10,14}$/.test(normalized.phone)) failures.push(diagnostic({ stage: "invariants", code: "phone_e164", path: "phone", expected: "+<country><digits>", actual: normalized.phone, repairable: false }));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)) failures.push(diagnostic({ stage: "invariants", code: "email_shape", path: "email", expected: "valid email", actual: normalized.email, repairable: false }));
  const a = normalized.address;
  if (!a.street) failures.push(diagnostic({ stage: "invariants", code: "address_street", path: "address.street", expected: "non-empty", actual: a.street, repairable: false }));
  if (!Number.isInteger(a.number) || a.number <= 0) failures.push(diagnostic({ stage: "constraints", code: "address_number", path: "address.number", expected: "positive integer", actual: String(a.number), repairable: false }));
  if (!a.neighborhood) failures.push(diagnostic({ stage: "invariants", code: "address_neighborhood", path: "address.neighborhood", expected: "non-empty", actual: a.neighborhood, repairable: false }));
  if (!a.city) failures.push(diagnostic({ stage: "invariants", code: "address_city", path: "address.city", expected: "non-empty", actual: a.city, repairable: false }));
  if (!a.state) failures.push(diagnostic({ stage: "invariants", code: "address_state", path: "address.state", expected: "non-empty", actual: a.state, repairable: false }));
  if (normalized.address.country !== "Brasil") failures.push(diagnostic({ stage: "constraints", code: "country_brazil", path: "address.country", expected: "Brasil", actual: normalized.address.country, repairable: false }));
  const seen = new Set<string>(); normalized.networks.forEach((network, i) => { if (!network.name || !network.user) failures.push(diagnostic({ stage: "invariants", code: "network_fields", path: `networks.${i}`, expected: "name and user non-empty", actual: JSON.stringify(network), repairable: false })); const key = `${network.name}:${network.user}`; if (seen.has(key)) failures.push(diagnostic({ stage: "invariants", code: "network_unique", path: `networks.${i}`, expected: "unique network identity", actual: key, repairable: false })); seen.add(key); });
  if (failures.length) return { ok: false, diagnostics: failures, healed: JSON.stringify(input) !== JSON.stringify(normalized) };
  return { ok: true, value: normalized, diagnostics, healed: JSON.stringify(input) !== JSON.stringify(normalized) };
}
export const PersonSemanticAtomicBehavior: SemanticAtomicBehavior<Person> = { name: "Person", validate: validatePerson };
export function processPerson(person: Person): Person { return person; }
export function validateThenProcess(input: unknown): { ok: true; value: Person; path: "[true]" } | { ok: false; diagnostics: Diagnostic[]; path: "[false]" } { const result = PersonSemanticAtomicBehavior.validate(input); return result.ok ? { ok: true, value: processPerson(result.value), path: "[true]" } : { ok: false, diagnostics: result.diagnostics, path: "[false]" }; }
export const validPerson: Person = { name: " Maria Silva ", birth: "1990-05-12", phone: "+55 (15) 99999-0000", email: " MARIA@EXAMPLE.COM ", address: { street: " Rua A ", number: 10, neighborhood: " Centro ", city: " Itararé ", state: "sp", country: "Brasil" }, networks: [{ name: " GitHub ", user: "suissa" }, { name: " LinkedIn ", user: "maria" }] };
