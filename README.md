# UbiQTestsForger

Canonical test-skill forge for intent-driven, event-driven web systems.

The executable fixture `examples/2FA-passwordless` models passwordless authentication starting on Web or WhatsApp.

Canonical skills: Intent, Trajectory, Behavioral, Acceptance, Unit, Component, Integration, Contract, System, E2E, Smoke, Regression, Performance, Security, Accessibility, Compatibility and Reliability.

Every skill expands across every declared action. The generated matrix is **17 skills x 16 actions = 272 test cases**.

The generated test can only use fixture values through `$ref: values.<name>` and only nominal semantic types declared in the fixture schema. The engine rejects undeclared values/types/references.

## Constraint-driven semantic cases

`src/constraint-cases.ts` generates deterministic cases from semantic contracts: a baseline, type mismatches, missing required properties, violated constraints, and inclusive numeric/string-length boundaries. Cases target one path at a time so failures remain attributable. Valid examples are supplied by the contract; the generator does not invent business fixtures.

Contracts support flat properties, nested object properties using `properties`, and array element schemas using `items`. Nested case paths use dot notation with numeric indexes (for example, `address.street` and `networks.0.name`). The first declared array item is used as the deterministic fixture target; its child schema is traversed recursively. The independent oracle validates array types and every element against the declared item contract.

Supported constraints: `required`, `min`, `max`, `minLength`, `maxLength`, `pattern`, `enum`, `positive`, and `non_empty`.

Run the focused conformance test with:

```bash
npm run test:constraints
```

## Authentication flow

Web and WhatsApp can initiate the same identity journey.

1. Receive only the WhatsApp number.
2. Validate the chat number again at the canonical gateway boundary.
3. Ask Evolution Go whether that WhatsApp number exists.
4. Generate a magic link bound to the validated number.
5. Send the magic link through Evolution Go.
6. Wait for the user to present the passkey.
7. Validate the passkey and session.
8. Send the authenticated result to `UserGatewayAgent`.
9. Adapt the result for Web and WhatsApp. The fixture explicitly returns: **“Você acabou de fazer login com a passkey deste WhatsApp.”**
10. The central chatbot route accepts a WhatsApp message, checks for an active session and, when there is none, generates and sends the magic link directly to that WhatsApp.

## Semantic Atomic Behavior

`SemanticAtomicBehavior<T, Name>` is the nominal type boundary. `validate()` runs:

`unwrap -> primitive extraction -> primitive parser/cast -> sanitization -> normalization -> logical validation`.

This is the self-healing boundary: wrapped/dirty input is unpacked and normalized before logical validation. Application code consumes the nominal result instead of treating raw strings as trusted identity data.

## Node 24

No runtime dependencies are required.

```bash
npm test
npm run check
npm run check:runtime
npm run test:constraints
```

The YAML files are JSON-subset YAML 1.2 so they remain dependency-free under Node 24.

## Real runtime verification

Trajectory verification can execute against a real HTTP or WebSocket runtime. Runtime configuration is external to the scenario so URLs and credentials are never embedded in the semantic contract.

Use the supplied template as a starting point:

```bash
cp examples/2FA-passwordless/runtime/runtime.example.json /tmp/ubiq-runtime.json
```

Set `UBIQ_RUNTIME_BASE_URL` in the environment and run:

```bash
node --experimental-strip-types src/cli.ts trajectory examples/2FA-passwordless /tmp/ubiq-runtime.json
```

The adapter is fail-closed: a missing binding, missing environment variable, timeout, transport failure, connection closure, or unexpected HTTP status produces explicit runtime evidence and cannot be reported as a satisfied trajectory. WebSocket bindings also honor `receive.messages`, allowing the runtime contract to require one or multiple received messages.
