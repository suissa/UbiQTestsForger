export type Primitive = string | number | boolean;
export type Nominal<T extends Primitive, Name extends string> = T & { readonly __semantic_atomic_behavior__: Name };
export type ValidationStage = "unwrap" | "primitive" | "sanitize" | "normalize" | "logical";
export type ValidationResult<T extends Primitive, Name extends string> =
  | { ok: true; value: Nominal<T, Name>; stages: ValidationStage[]; healed: boolean }
  | { ok: false; error: string; stages: ValidationStage[]; healed: boolean };

function unwrap(value: unknown): unknown {
  let current = value;
  const seen = new Set<object>();
  while (current !== null && typeof current === "object" && "value" in current) {
    if (seen.has(current as object)) break;
    seen.add(current as object);
    current = (current as { value: unknown }).value;
  }
  return current;
}
function primitiveOf(value: unknown): Primitive | undefined {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? value : undefined;
}

export class SemanticAtomicBehavior<T extends Primitive, Name extends string> {
  constructor(
    readonly name: Name,
    readonly parse: (value: Primitive) => T,
    readonly sanitize: (value: T) => T,
    readonly normalize: (value: T) => T,
    readonly validateLogical: (value: T) => boolean
  ) {}
  validate(input: unknown): ValidationResult<T, Name> {
    const stages: ValidationStage[] = ["unwrap"];
    const raw = primitiveOf(unwrap(input));
    if (raw === undefined) return { ok: false, error: `[${this.name}] value is not primitive`, stages, healed: false };
    stages.push("primitive");
    let parsed: T;
    try { parsed = this.parse(raw); } catch {
      return { ok: false, error: `[${this.name}] primitive parser rejected value`, stages, healed: true };
    }
    stages.push("sanitize");
    const sanitized = this.sanitize(parsed);
    stages.push("normalize");
    const normalized = this.normalize(sanitized);
    stages.push("logical");
    if (!this.validateLogical(normalized)) return { ok: false, error: `[${this.name}] logical validation failed`, stages, healed: true };
    return { ok: true, value: normalized as Nominal<T, Name>, stages, healed: JSON.stringify(input) !== JSON.stringify(normalized) };
  }
}
export const WhatsAppNumber = new SemanticAtomicBehavior("WhatsAppNumber",
  value => String(value), value => value.replace(/[\\s().-]/g, ""), value => value.startsWith("+") ? value : `+${value}`,
  value => /^\\+[1-9]\\d{10,14}$/.test(value));
export const ChatNumber = new SemanticAtomicBehavior("ChatNumber",
  value => String(value), value => value.trim(), value => value,
  value => /^\\+[1-9]\\d{10,14}$/.test(value));
export const PasskeyCredential = new SemanticAtomicBehavior("PasskeyCredential",
  value => String(value), value => value.trim(), value => value,
  value => value.length >= 16);
export const SessionId = new SemanticAtomicBehavior("SessionId",
  value => String(value), value => value.trim(), value => value,
  value => /^sess_[a-z0-9_-]+$/i.test(value));
