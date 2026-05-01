# CLAUDE.md

This is a Gantt chart app built with Vite + React 18 + TypeScript, backed by AWS Amplify Gen2 (Cognito + DynamoDB).

## Commands

```bash
# Local development (run both in separate terminals)
npx ampx sandbox          # Starts Amplify backend; generates amplify_outputs.json
npm run dev               # Starts Vite dev server at http://localhost:5173

# Build & lint
npm run build             # tsc + vite build
npm run lint              # ESLint (0 warnings allowed)
npm run preview           # Preview production build locally

# Teardown sandbox
npx ampx sandbox delete
```

> `amplify_outputs.json` is gitignored. Run `npx ampx sandbox` to generate it before starting the frontend.

## Docs

- [Architecture](docs/claude/architecture.md) — component structure, entry point, demo mode
- [Data Model](docs/claude/data-model.md) — DynamoDB schema, Amplify backend
- [Constraints](docs/claude/constraints.md) — non-obvious workarounds, critical invariants
