# UbiQTestsForger

Canonical test-skill forge for intent-driven, event-driven web systems.

The executable fixture `examples/2FA-passwordless` models passwordless authentication starting on Web or WhatsApp.

Canonical skills: Intent, Trajectory, Behavioral, Acceptance, Unit, Component, Integration, Contract, System, E2E, Smoke, Regression, Performance, Security, Accessibility, Compatibility and Reliability.

Every skill expands across every declared action. The generated matrix is **17 skills x 16 actions = 272 test cases**.

The generated test can only use fixture values through `$ref: values.<name>` and only nominal semantic types declared in the fixture schema. The engine rejects undeclared values/types/references.

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

HTTP and WebSocket credentials are redacted from evidence. The in-memory adapter remains the deterministic test double and is never silently selected when an external runtime configuration is supplied.


### RuntimeConformance

The canonical runtime gate now exercises the transport boundary as a conformance contract rather than only a happy-path fixture.

`npm run test:runtime` validates:

- HTTP success against the canonical trajectory;
- unexpected HTTP status;
- HTTP timeout;
- missing HTTP binding;
- failed HTTP actions do not mutate runtime state or return output;
- WebSocket success with `open -> send -> receive` evidence;
- WebSocket multi-message reception through `receive.messages`;
- WebSocket close before a required message;
- WebSocket close before opening;
- WebSocket transport failure;
- explicit error evidence on failed transport operations.

The conformance fixture is local and dependency-free. It does not silently fall back to the in-memory adapter.
The matrix is executable, not descriptive-only. Each canonical conformance ID is registered in `src/runtime-conformance.ts`, and `test:runtime` marks every case as it executes it. The gate fails if a declared case is unknown, duplicated, or not executed, preventing the contract from drifting away from its implementation.

`runtime-check` performs a fail-closed preflight of the external runtime contract: required trajectory bindings, protocol, URL, method, status, timeout and WebSocket message-count semantics are validated before any network call. Extra bindings are rejected so the runtime manifest cannot silently diverge from the declared trajectory.
