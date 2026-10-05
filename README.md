# UbiQTestsForger

Canonical test-skill forge for intent-driven, event-driven web systems.

The executable fixture `examples/2FA-passwordless` models passwordless authentication starting on Web or WhatsApp.

Canonical skills: Intent, Trajectory, Behavioral, Acceptance, Unit, Component, Integration, Contract, System, E2E, Smoke, Regression, Performance, Security, Accessibility, Compatibility and Reliability.

Every skill expands across every declared action. The generated matrix is **17 skills x 15 actions = 255 test cases**.

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
```

The YAML files are JSON-subset YAML 1.2 so they remain dependency-free under Node 24.
