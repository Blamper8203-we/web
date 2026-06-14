# DINBoard `.harness/`

The Mavis team definition for the DINBoard Web / Tauri project. This directory is the team — commit it to git so it ships with the repo.

## What's in here

```
.harness/
├── agent.md                         # Orchestrator (Harness) — routes, never edits
├── docs/
│   ├── code-standards.md            # Layer discipline, performance, SVG rules, style
│   ├── test-policy.md               # Vitest policy, must-test areas, round-trip rules
│   └── git-workflow.md              # Branching, commit prefixes, high-risk change rules
├── hooks/
│   └── high-risk-area-gate.md       # Tool-gate spec; install with `mavis hook create`
└── reins/
    ├── developer/                   # General implementer for cross-cutting changes
    ├── tester/                      # Vitest, test discipline, coverage strategy
    ├── code-reviewer/               # Pre-merge quality gate against AGENTS.md rules
    ├── electrical-expert/           # Phase balance, validation, circuit rows, RCD/MCB
    ├── canvas-expert/               # DIN rail + schematic + SVG module assets, perf
    ├── pdf-expert/                  # PDF generator, preview, measurement protocols
    └── project-io-expert/           # Project file, save/load, undo/redo, Tauri
```

## Roster at a glance

| Rein | One-line role |
|---|---|
| `developer` | Cross-cutting or unscoped code changes; defers to experts on high-risk subsystems. |
| `tester` | Vitest ownership, characterisation-before-change on risky logic, round-trip tests. |
| `code-reviewer` | Pre-merge review against AGENTS.md and code-standards. |
| `electrical-expert` | Phase balance, validation, circuit rows, RCD/MCB grouping, project metadata. |
| `canvas-expert` | DIN rail canvas, schematic canvas, SVG module assets, snap/selection/wire routing. |
| `pdf-expert` | PDF generator, preview, measurement protocols, snapshot services consumed by the canvas. |
| `project-io-expert` | Project file format, save/load, migrations, undo/redo, Tauri integration. |

## How a task flows

1. The user (or the parent session) sends a task to the Harness.
2. The Harness identifies the dominant subsystem and delegates to the right rein.
3. The rein does the work, follows `.harness/docs/code-standards.md` and `.harness/docs/test-policy.md`, and reports back with: problem / cause / safe fix / what changed / what was tested.
4. If a high-risk area was touched, the Harness routes a `code-reviewer` review before accepting.
5. The Harness reports back to the parent session.

## How to grow the team later

- Add a rein: load the `create-agent` skill, run `scaffold-project-rein`, then write `agent.md` in the new folder. Keep names by responsibility (`xxx-expert`, not `senior-yyy`).
- Adjust routing: edit the routing table in `.harness/agent.md` (the orchestrator).
- Adjust standards: edit the file under `.harness/docs/`. The reins link to these files rather than inlining the rules.
- Install the high-risk-area hook: see `.harness/hooks/high-risk-area-gate.md` for the install command.

## Don't

- Do NOT hardcode a roster list inside `agent.md` (the daemon injects the team at runtime).
- Do NOT inline full project conventions inside rein `agent.md` files. Link to `docs/` instead.
- Do NOT add a new rein whose scope overlaps with an existing one. Tighten the existing rein's body first.
