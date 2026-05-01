# Architecture

## Entry point

`src/main.tsx` — checks `fetchAuthSession()` on load. If the user has a valid access token, renders `<Authenticator><App /></Authenticator>`; otherwise renders `<DemoApp onLogin={...} />`. No loading spinner: returns `null` while checking.

## Components

### `src/App.tsx` — authenticated app
- Single-file component. All state is in the default export `App`.
- Reads/writes DynamoDB via the Amplify Data client (`generateClient<Schema>()`).
- On mount: lists all projects, selects the one most recently updated.
- On project select: lists tasks sorted by `displayOrder`.
- Contains `GanttWrapper`, `CustomTaskListHeader`, `CustomTaskListTable` as module-level helpers (not exported).

### `src/DemoApp.tsx` — demo mode (no login required)
- Identical UI to App, but all data is in-memory (`useState`). Resets on page reload.
- Shows an orange banner with a "login" CTA.
- Does not have drag-and-drop reordering (App.tsx adds this; DemoApp only has arrow buttons).
- Task ID generation: module-level counter `_demoIdCounter` incremented per task.

### `GanttWrapper` (in both files)
Wraps `<Gantt>` from `gantt-task-react` and adds two behaviors via direct DOM manipulation:
1. **Touch horizontal scroll** — intercepts `touchmove`, detects horizontal vs vertical intent, and manually updates `scrollLeft` on `._2k9Ys` (gantt's inner scroll container).
2. **Sticky date header + weekend coloring** (Day view only) — uses `transform: translateY(scrollTop)` on the calendar SVG and task list header to simulate stickiness. Weekend columns are detected by comparing column index against today's weekday (via `g.today rect[x]`) and injected as SVG `<rect class="weekend-highlight">` elements inside `g.gridBody`.

### `CustomTaskListHeader` / `CustomTaskListTable`
Passed as `TaskListHeader` / `TaskListTable` props to `<Gantt>`. Override the default left panel.
- `CustomTaskListTable` in App.tsx adds drag-and-drop reordering (HTML5 drag events + drop indicators).
- `CustomTaskListTable` in DemoApp.tsx only has up/down arrow buttons.

## Stale-closure workaround

`gantt-task-react` captures callbacks at render time and does not support stable refs. Both files use a module-level object (`_h` in App, `_hd` in DemoApp) that is overwritten on every render with the latest function references. Child components call through this object instead of closing over stale values.

## Mobile layout

- `isMobile = window.innerWidth < 768`, recalculated on `resize`.
- Mobile: sidebar slides in/out with a hamburger button; backdrop overlay closes it.
- Gantt `listCellWidth` and `columnWidth` are narrower on mobile.
- Day-view date labels are shortened on mobile (only day number shown, not `"Weekday, DD"`).
