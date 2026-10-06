import type {CanonicalTestType} from "./types.ts";

export interface SkillContract {
  invariants:string[];
  forbidden:string[];
  minimumCoverage:string[];
  acceptance:string[];
}

const commonAcceptance=[
  "npm run check reports zero validation errors",
  "npm test executes every generated case with explicit pass/fail",
  "evidence names scenario, skill, action, actor and assertions",
  "mandatory invariant violations cannot be marked passed",
  "generation is deterministic"
];

export const SKILL_CONTRACTS:Record<CanonicalTestType,SkillContract>={
  intent:{invariants:["declared intent reaches only declared actors/actions","fixture references resolve only to declared values","nominal types and IDs remain exact","missing contract data fails closed"],forbidden:["undeclared action/actor/value/type/channel/terminal","invented acceptance semantics","silent invariant downgrade"],minimumCoverage:["all 16 actions","web and whatsapp","positive and negative boundaries"],acceptance:commonAcceptance},
  trajectory:{invariants:["dependency graph is preserved","actions cannot execute before dependencies","actor ownership remains exact","fixture references remain declared"],forbidden:["skipped dependency","early dependent action","invented transition"],minimumCoverage:["all actions","every dependency edge"],acceptance:commonAcceptance},
  behavioral:{invariants:["observed behavior stays inside action contract","inputs and outputs use declared values/types","undeclared side effects are rejected"],forbidden:["undeclared output","actor substitution","invented side effect"],minimumCoverage:["all actions","every input/output field","every semantic type"],acceptance:commonAcceptance},
  acceptance:{invariants:["acceptance derives only from declared authentication outcome","only declared fixtures and semantics are used","missing contract data fails closed"],forbidden:["accepting unauthenticated state","inventing business criteria","warning on mandatory failure"],minimumCoverage:["web happy path","whatsapp happy path","number/existence/magic-link/passkey failures"],acceptance:commonAcceptance},
  unit:{invariants:["one atomic action is isolated","inputs are exact","outputs are exact","dependencies are declared"],forbidden:["cross-action hidden state","undeclared input/output","external service dependency"],minimumCoverage:["each action","missing input","extra input","exact output contract"],acceptance:commonAcceptance},
  component:{invariants:["each actor boundary owns only declared actions","unknown actions fail closed","boundary metadata is exact"],forbidden:["acting as another actor","undeclared action","hidden fallback"],minimumCoverage:["each actor","each assigned action","unknown action rejection"],acceptance:commonAcceptance},
  integration:{invariants:["action-to-agent boundaries preserve contracts","dependency edges remain intact","shared values keep nominal meaning"],forbidden:["bypassing boundary","type/value substitution","dependency bypass"],minimumCoverage:["all action-agent edges","all dependency edges"],acceptance:commonAcceptance},
  contract:{invariants:["provider and consumer IDs match","input/output keys and nominal types match","channels preserve terminal semantics"],forbidden:["schema drift","undeclared field","contradictory terminal result"],minimumCoverage:["all action contracts","all actor contracts","both channels"],acceptance:commonAcceptance},
  system:{invariants:["complete declared system graph remains coherent","authentication requires the declared validation chain","terminal result is reachable only through declared route"],forbidden:["alternate authentication path","missing validation","undeclared terminal"],minimumCoverage:["complete graph","both channels","all failure guards"],acceptance:commonAcceptance},
  e2e:{invariants:["user journey starts and ends in declared semantics","web and whatsapp have equivalent authentication meaning","no trust boundary is skipped"],forbidden:["successful login without passkey validation","channel contradiction","unvalidated number"],minimumCoverage:["web journey","whatsapp journey","terminal equivalence"],acceptance:commonAcceptance},
  smoke:{invariants:["critical path contains all mandatory authentication gates","critical path is deterministic"],forbidden:["passkey bypass","number validation bypass","session validation bypass"],minimumCoverage:["one critical web path","one critical whatsapp path"],acceptance:commonAcceptance},
  regression:{invariants:["previously declared contracts remain unchanged","all 16 actions remain covered","all 17 skill types remain generated"],forbidden:["coverage shrinkage","contract drift","silent behavior change"],minimumCoverage:["16x17 matrix","contract snapshot"],acceptance:commonAcceptance},
  performance:{invariants:["generation is deterministic","execution has no network dependency","latency evidence is numeric"],forbidden:["unbounded loop","network call","nondeterministic timing assertion"],minimumCoverage:["16 actions","17 skills","repeat generation"],acceptance:commonAcceptance},
  security:{invariants:["authentication requires validated WhatsApp number and passkey","trust boundaries are explicit","failures do not produce authenticated terminal"],forbidden:["authenticate without passkey","authenticate unvalidated number","dependency bypass"],minimumCoverage:["invalid number","unknown WhatsApp","invalid passkey","missing session","terminal guard"],acceptance:commonAcceptance},
  accessibility:{invariants:["channel result retains declared semantic meaning","messages come only from declared fixtures","web and whatsapp terminal meaning remains equivalent"],forbidden:["invented user-facing message","contradictory channel state","loss of authentication meaning"],minimumCoverage:["web result","whatsapp result","terminal equivalence"],acceptance:commonAcceptance},
  compatibility:{invariants:["web and whatsapp adapters consume the same core result","adapter boundaries preserve declared fields","supported channels remain exact"],forbidden:["channel-specific authentication logic","schema divergence","unsupported channel invention"],minimumCoverage:["web adapter","whatsapp adapter","shared terminal"],acceptance:commonAcceptance},
  reliability:{invariants:["repeated generation produces identical contracts","invalid states fail closed","idempotent metadata remains stable"],forbidden:["stateful hidden mutation","random result","silent recovery from invalid contract"],minimumCoverage:["repeat generation","invalid contract guard","all actions"],acceptance:commonAcceptance}
};
