# Data Model

## Amplify Gen2 backend (`amplify/`)

- `amplify/backend.ts` — registers `auth` and `data`.
- `amplify/auth/resource.ts` — Cognito email-only login.
- `amplify/data/resource.ts` — DynamoDB schema via Amplify Data.

Authorization: `allow.owner()` on both models — each user sees only their own records. Default auth mode: `userPool`.

## Schema

### GanttProject

| Field | Type | Notes |
|---|---|---|
| `id` | string (auto) | Primary key |
| `name` | string (required) | Project display name |
| `displayOrder` | integer | Sort order in sidebar |
| `createdAt` / `updatedAt` | datetime (auto) | Used to select the most recently updated project on load |

### GanttTask

| Field | Type | Notes |
|---|---|---|
| `id` | string (auto) | Primary key |
| `projectId` | id (required) | FK to GanttProject |
| `name` | string (required) | Task display name |
| `start` | datetime (required) | ISO 8601, stored as UTC |
| `end` | datetime (required) | ISO 8601, stored as UTC. Must be > start (enforced client-side) |
| `progress` | float (required) | 0–100 |
| `type` | string (required) | `"task"` \| `"milestone"` \| `"project"` |
| `dependencies` | string[] | Task IDs this task depends on |
| `displayOrder` | integer | Sort order within project |

Secondary index: `projectId` → query field `listByProject` (used instead of scanning all tasks).

## Client usage

```ts
const client = generateClient<Schema>();
client.models.GanttProject.list()
client.models.GanttTask.listByProject({ projectId })
client.models.GanttTask.create(payload)
client.models.GanttTask.update({ id, ...payload })
client.models.GanttTask.delete({ id })
```

## `toGanttTask` conversion

`TaskRecord` (DynamoDB) → `GanttTask` (gantt-task-react):
- `start`/`end` strings are parsed as `Date`.
- If `end <= start`, end is forced to `start + 1 day` (gantt-task-react requires positive duration).
