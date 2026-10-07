# IMPLEMENTATION-01 — Canonical Test-Skill Forge

**Repository:** `suissa/UbiQTestsForger`  
**Scenario:** `examples/2FA-passwordless`  
**Runtime:** Node.js 24.x, dependency-free runtime  
**Implementation status:** complete  
**Canonical matrix:** 17 skills × 16 actions = 272 generated test cases

## 1. Purpose

This implementation establishes the first executable version of the UbiQ Tests Forger as a declarative, contract-driven test-skill forge.

The implementation does not merely enumerate conventional test categories. Each canonical skill has an explicit semantic contract containing:

- invariants;
- forbidden scenarios;
- minimum coverage;
- acceptance criteria.

The engine then expands every skill over every declared action in the scenario, validates that generated cases can only reference declared actors, actions, values and nominal semantic types, executes the skill-specific contract checks, and materializes deterministic evidence under `tests/generated`.

The central design principle is fail-closed: missing or undeclared semantic information is an error, not an invitation for the test generator to invent behavior.

## 2. Implemented architecture

The implementation is divided into four executable layers.

### 2.1 Scenario model

`src/types.ts` defines the nominal runtime model:

- `Scenario`
- `Action`
- `TestCase`
- `TestRun`
- `CanonicalTestType`

An action contains its exact actor, input, output, dependencies and semantic types. A scenario contains the declared actors, actions, channels, fixture values and nominal types.

The generator therefore works from the scenario contract instead of reconstructing behavior from natural-language assumptions.

### 2.2 Skill contracts

`src/skill-contracts.ts` defines `SkillContract`:

```ts
interface SkillContract {
  invariants: string[];
  forbidden: string[];
  minimumCoverage: string[];
  acceptance: string[];
}
```

All 17 canonical skills have explicit contracts:

1. Intent
2. Trajectory
3. Behavioral
4. Acceptance
5. Unit
6. Component
7. Integration
8. Contract
9. System
10. E2E
11. Smoke
12. Regression
13. Performance
14. Security
15. Accessibility
16. Compatibility
17. Reliability

Every contract also inherits common acceptance requirements:

- `npm run check` reports zero validation errors;
- `npm test` executes every generated case with explicit pass/fail;
- evidence identifies scenario, skill, action, actor and assertions;
- mandatory invariant violations cannot be marked as passed;
- generation is deterministic.

This makes each skill an executable specification rather than a descriptive label.

### 2.3 Skill execution

`src/skills.ts` creates the canonical skill objects from the contracts.

Each skill has:

- stable ID: `ubiq.skill.<type>`;
- purpose;
- execution condition;
- contract;
- deterministic test-case generator;
- deterministic test executor.

Generation takes one declared action at a time and creates a test case containing:

- skill type;
- action ID and index;
- target actor;
- copied input;
- expected action/actor/output/dependency information;
- allowed fixture values;
- allowed nominal types.

Execution verifies the action and actor, checks input/output contracts, validates fixture and nominal-type declarations, and applies additional authentication invariants for System, E2E, Smoke and Security skills.

### 2.4 Engine

`src/engine.ts` is responsible for the complete lifecycle:

```
Scenario
  -> generateTests()
  -> validateGeneratedTests()
  -> executeTests()
  -> materialize()
```

The engine explicitly enforces the canonical cardinality:

```
17 skills × 16 actions = 272 cases
```

It also validates:

- every generated action exists;
- every target actor is declared;
- every fixture value is declared;
- every nominal type is declared;
- every input key belongs to the action contract;
- every output fixture reference is declared;
- every semantic type is declared;
- every dependency is declared;
- the authentication dependency chain is preserved.

## 3. Canonical 2FA/passwordless fixture

The executable scenario represents passwordless authentication initiated through Web or WhatsApp.

The canonical authentication path is:

```
receive WhatsApp number
  -> validate chat number
  -> check WhatsApp existence
  -> create magic link
  -> send magic link
  -> receive passkey
  -> validate passkey
  -> send result to UserGateway
  -> adapt result for Web / WhatsApp
  -> authenticated terminal result
```

The scenario also models the chatbot entry path:

```
receive WhatsApp message
  -> check active session
  -> if no session:
       create magic link
       send magic link
```

The implementation therefore covers both the browser authentication path and the WhatsApp conversational path while preserving a single declared authentication meaning.

## 4. Canonical actions

The scenario contains exactly 16 actions:

1. `gateway.receive_whatsapp_number`
2. `gateway.validate_chat_number`
3. `gateway.check_whatsapp_exists`
4. `login.create_magic_link`
5. `login.send_magic_link`
6. `login.receive_passkey`
7. `login.validate_passkey`
8. `gateway.send_result_user_gateway`
9. `user_gateway.adapt_web_result`
10. `user_gateway.adapt_whatsapp_result`
11. `chatbot.receive_message`
12. `chatbot.check_active_session`
13. `chatbot.create_magic_link`
14. `chatbot.send_magic_link`
15. `web.receive_passkey_route`
16. `gateway.return_authenticated_result`

The implementation files for these actions live under:

`examples/2FA-passwordless/implementations/actions/`

Each action implementation declares its identity, actor, input keys, output keys and dependencies and provides deterministic execution with rejection of undeclared input.

## 5. Agents and intent

Six agents are explicitly implemented:

- `GatewayPlane`
- `UserGatewayAgent`
- `UserLoginIntent`
- `EvolutionGoAdapter`
- `WebAuthnAdapter`
- `ChatbotService`

They are represented under:

`examples/2FA-passwordless/implementations/agents/`

The canonical intent is:

`UserLoginIntent`

Its implementation declares:

- scenario: `2FA-passwordless`;
- entry actor: `UserLoginIntent`;
- channels: `web`, `whatsapp`;
- all 16 action IDs;
- the authenticated terminal semantic;
- forbidden terminal semantics.

The intent implementation is located at:

`examples/2FA-passwordless/implementations/intents/UserLoginIntent.ts`

## 6. Contract boundaries and anti-hallucination rules

The implementation deliberately constrains what a generated test may say.

A generated case may only use:

- an action present in the scenario;
- an actor present in the actor manifest;
- fixture values declared by the scenario;
- nominal semantic types declared by the scenario;
- dependencies declared by the action.

Fixture references are restricted to the declared form:

```
$ref: values.<name>
```

An undeclared reference produces a validation error.

This is important because the generator is intended to be used by an AI-assisted workflow. The AI is not allowed to fill semantic gaps by inventing a plausible value, actor, action, type or transition.

The contract is therefore the authority.

## 7. Security and authentication invariants

The implementation explicitly protects the authentication terminal.

The following dependency is mandatory:

```
login.validate_passkey
  -> login.receive_passkey
```

The authenticated terminal is also required to remain behind the declared Web passkey route:

```
gateway.return_authenticated_result
  -> web.receive_passkey_route
```

Security, System, E2E and Smoke execution additionally verify these guards.

Forbidden examples include:

- authentication without passkey validation;
- authentication using an unvalidated WhatsApp number;
- bypassing an action dependency;
- reaching the authenticated terminal through an undeclared route;
- inventing an alternate authentication path.

The implementation consequently treats authentication as a trajectory with mandatory semantic gates rather than as a boolean result that can be asserted independently.

## 8. What each skill means in this implementation

Intent verifies that the declared intent reaches only declared actors and actions.

Trajectory verifies ordering and dependency preservation.

Behavioral verifies that observed behavior stays inside the action contract.

Acceptance verifies the declared business/user outcome without inventing acceptance semantics.

Unit isolates one atomic action and rejects undeclared input/output or hidden external dependencies.

Component verifies actor/action boundaries.

Integration verifies action-to-agent boundaries and dependency edges.

Contract verifies provider/consumer identity, fields, nominal types and terminal semantics.

System verifies the complete declared graph.

E2E verifies the complete user journey across Web and WhatsApp.

Smoke verifies the smallest critical authentication paths.

Regression protects the canonical matrix and contract shape against shrinkage or drift.

Performance verifies deterministic, bounded local generation/execution and numeric evidence requirements.

Security verifies authentication gates and trust boundaries.

Accessibility verifies preservation of semantic meaning across channel responses.

Compatibility verifies that Web and WhatsApp adapters consume the same core authentication result without duplicating authentication logic.

Reliability verifies repeatability, deterministic generation and fail-closed invalid states.

## 9. CLI usage

The project targets Node 24.x and has no runtime dependencies.

Install/use Node 24, then run from the repository root.

### Generate

```bash
npm run generate
```

This generates the canonical test matrix and materializes the generated artifacts.

### Run

```bash
npm test
```

This generates, validates and executes all 272 cases.

The CLI reports:

- scenario;
- generated test count;
- passed count;
- failed count;
- validation errors.

The process exits with failure when validation errors exist or any generated case fails.

### Check

```bash
npm run check
```

This validates the generated matrix without executing the skill runs.

A successful check reports the generated case count and exits successfully.

### Direct CLI form

The same commands can be targeted at another fixture:

```bash
node --experimental-strip-types src/cli.ts generate <example-root>
node --experimental-strip-types src/cli.ts run <example-root>
node --experimental-strip-types src/cli.ts check <example-root>
```

## 10. Generated evidence

Execution materializes:

```
tests/generated/
  manifest.json
  intent.json
  trajectory.json
  behavioral.json
  acceptance.json
  unit.json
  component.json
  integration.json
  contract.json
  system.json
  e2e.json
  smoke.json
  regression.json
  performance.json
  security.json
  accessibility.json
  compatibility.json
  reliability.json
  result.json
```

`manifest.json` contains the scenario, canonical skill types, actions, case count and aggregate status.

Each skill JSON contains:

- skill identity;
- purpose;
- execution condition;
- complete contract;
- generated cases;
- execution results.

`result.json` contains aggregate pass/fail counts and the complete execution evidence.

This makes the generated test suite inspectable instead of treating execution as an opaque console operation.

## 11. Issue-driven implementation

The implementation was specified through explicit GitHub issues before the corresponding code was finalized.

The completed implementation scope contains:

- 17 skill issues: #1–#17;
- 16 action issues: #38–#53;
- 6 agent issues: #54–#59;
- 1 intent issue: #60.

Total:

```
17 + 16 + 6 + 1 = 40 implementation issues
```

The issues were closed as completed after implementation.

The important distinction is that the issue is not merely a task description. It defines the semantic boundary that the implementation must satisfy: invariants, forbidden scenarios, minimum coverage and acceptance criteria.

## 12. Validation and CI

The canonical GitHub Actions workflow is:

`canonical-tests`

The latest verified run is:

- run: `37464475979`;
- commit: `ee3e5b685f0cfc45383a9d440832690f4f673796`;
- status: `completed`;
- conclusion: `success`.

The successful run follows the correction that resolved actor IDs through the scenario actor manifest rather than treating actor IDs as object keys.

This correction is significant because it demonstrates the intended fail-closed development loop: the first CI execution exposed a contract-resolution defect, the implementation was corrected, and the canonical workflow subsequently passed.

## 13. Files introduced or changed

The main executable implementation consists of:

```
src/skill-contracts.ts
src/skills.ts
src/engine.ts
src/cli.ts
src/types.ts

examples/2FA-passwordless/implementations/
  actions/
  agents/
  intents/
```

The existing scenario manifests remain the source of truth for the fixture.

This report is intentionally placed under:

`docs/reports/IMPLEMENTATION-01.md`

so that the implementation itself has a durable architectural record separate from the generated test output.

## 14. Design result

The resulting architecture can be summarized as:

```
Declared Scenario
      |
      v
Semantic Skill Contracts
      |
      v
17 × 16 Deterministic Expansion
      |
      v
Generated Test Cases
      |
      +--> Structural Validation
      |
      +--> Contract Execution
      |
      v
Explicit Evidence
      |
      v
Materialized JSON
```

The important property is that the test generator is not the source of truth.

The scenario and its contracts are the source of truth.

The generator derives executable tests from them.

The validator prevents the generated tests from escaping those declarations.

The executor records whether the contract can be satisfied.

The materialized evidence makes the result inspectable and reproducible.

## 15. Next extension point

The current implementation establishes the forge and the canonical fixture. New scenarios can now follow the same model without changing the conceptual architecture:

1. declare the scenario;
2. declare actors;
3. declare actions and dependencies;
4. declare fixture values;
5. declare nominal semantic types;
6. declare intent/channels;
7. provide action/agent/intent implementations;
8. run the canonical 17-skill expansion;
9. validate;
10. execute;
11. inspect generated evidence.

The next architectural step can therefore focus on richer semantic behavior—trajectory/event evidence, real adapters, external runtime execution and deeper temporal assertions—without changing the fundamental contract-driven generation model.

## 16. Final status

Implementation-01 establishes a working baseline for UbiQ Tests Forger:

- 17 canonical skill types;
- 16 canonical actions;
- 6 agents;
- 1 canonical intent;
- 40 implementation issues;
- 272 generated skill/action cases;
- explicit invariants;
- explicit forbidden scenarios;
- explicit minimum coverage;
- explicit acceptance criteria;
- deterministic generation;
- fail-closed validation;
- materialized execution evidence;
- Node 24 dependency-free runtime;
- successful canonical CI run.

The implementation is therefore ready to serve as the executable foundation for the next UbiQ/Intent Trajectory layer.


## 17. Phase 02 — Intent Trajectory Verification Engine

The next architectural layer was implemented through issues #61–#72.

The 12 issues define and implement:

- formal semantic operators: →, ∧, ¬, * and ⊨;
- typed Intent Trajectory AST and parser;
- BehaviorFlow graph with dependency and terminal semantics;
- immutable runtime evidence for events and state;
- declared-vs-observed trajectory matching;
- forbidden-path verification;
- semantic coverage;
- RuntimeAdapter and deterministic InMemoryRuntimeAdapter;
- canonical 2FA trajectory execution;
- SemanticAtomicBehavior validation/healing pipeline;
- trajectory/coverage CLI commands and materialized reports;
- OpenTrajectory-compatible JSON projection.

The canonical trajectory is now represented in:

`examples/2FA-passwordless/intent/trajectory.dsl`

and includes the authentication ordering constraint:

`login.receive_passkey → login.validate_passkey → web.receive_passkey_route → gateway.return_authenticated_result`

The implementation deliberately separates:

`Declared Trajectory ≠ Observed Trajectory`

and only reports trajectory satisfaction when the observed event sequence matches the declared obligations.

The new CLI commands are:

```bash
node --experimental-strip-types src/cli.ts trajectory examples/2FA-passwordless
node --experimental-strip-types src/cli.ts coverage examples/2FA-passwordless
```

They materialize:

```
tests/trajectory/
  declared.json
  flow.json
  evidence.json
  match.json
  coverage.json
  negative.json
  projection.json
```

The semantic coverage engine now distinguishes Intent, Actor, Action, Transition, Event, State, Dependency, Terminal, Channel, Failure, Recovery and Trajectory.

The runtime boundary is explicit: fixture declarations generate inputs, while RuntimeAdapter execution produces the evidence used for trajectory verification.

With issues #61–#72 completed, the repository has moved from a deterministic test-skill forge toward an executable Intent Trajectory Verification Engine.
