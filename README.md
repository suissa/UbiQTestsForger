# UbiQTestsForger

```
UbiQTestForger
│
├── Test Contract
│   ├── Intent
│   ├── Preconditions
│   ├── Actions
│   ├── Expected Behavior
│   ├── Oracle
│   └── Assertions
│
├── Test Type
│   ├── Unit
│   ├── Integration
│   ├── Contract
│   ├── E2E
│   ├── Acceptance
│   ├── Performance
│   ├── Security
│   ├── Accessibility
│   ├── Compatibility
│   ├── Chaos
│   ├── Mutation
│   ├── Property
│   ├── Fuzz
│   ├── AI/Agent
│   └── ...
│
├── Execution Mode
│   ├── Local
│   ├── CI
│   ├── Distributed
│   ├── Parallel
│   ├── Continuous
│   ├── Manual
│   └── Automated
│
├── Runtime
│   ├── Browser
│   ├── Node
│   ├── Zig
│   ├── WASM
│   ├── Mobile
│   └── Remote
│
└── Consumers
    ├── CLI
    ├── Web
    ├── TUI
    ├── API
    ├── WebSocket
    └── CI Reporter
```

## UbiQTest Interface

```
TestRun
 ├── test_id
 ├── contract
 ├── type
 ├── execution
 ├── trajectory
 ├── markers
 ├── assertions
 ├── measurements
 ├── artifacts
 └── result
```

## UbiQIntent Contract

O UbiQIntent Contract não será o teste. Ele será o contrato que descreve a intenção. O UbiQIntent Trajectory Speech seria a forma textual/semântica de expressar essa intenção e sua trajetória. O UbiQTestForger seria o mecanismo que transforma esse contrato em diferentes estratégias de verificação.
Isso evita transformar o Speech em uma “nova linguagem de programação”. Ele fica mais próximo de um idiom/protocol speech: uma forma padronizada de expressar intenções e trajetórias que diferentes runtimes podem interpretar.
A nomenclatura poderia ficar bastante limpa:
```
UbiQ Intent Contract
        ↓
UbiQ Intent Trajectory Speech
        ↓
UbiQ Test Forger
        ↓
Test Contract / Test Plan
        ↓
Test Runtime
        ↓
OpenTrajectory
        ↓
TestRun
        ↓
┌──────────┬───────────┬──────────┬─────────┐
│ CLI      │ Web       │ TUI      │ CI/API  │
└──────────┴───────────┴──────────┴─────────┘
```
