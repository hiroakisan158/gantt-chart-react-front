# Constraints

## Date handling

**Do not use `toISOString()` for date formatting in App.tsx.** `toISOString()` outputs UTC, which causes off-by-one errors in local timezones. App.tsx uses `fmtDate(d)` which builds `"YYYY-MM-DD"` from local date parts.

**`snapToDay(date)`** — dates with hours ≥ 12 snap to the *next* day's midnight. This is intentional: gantt-task-react drag events produce timestamps around noon when the user drops on a day boundary, and rounding to the nearest midnight would place the task on the wrong day without this heuristic.

**Date input values** — `<input type="date">` gives `"YYYY-MM-DD"` strings. These are passed through `snapToDay(new Date(str))` before saving. `new Date("YYYY-MM-DD")` parses as UTC midnight, so `snapToDay` may advance by one day in negative-UTC-offset timezones. This is the current behavior; changing it requires testing across timezones.

## gantt-task-react DOM selectors

`GanttWrapper` targets internal CSS class names from `gantt-task-react`. These are not part of the public API and may break on library upgrades:

| Selector | Purpose |
|---|---|
| `._2k9Ys` | Horizontal scroll container (touch scroll target) |
| `text._9w8d5` | Day-view date labels (used to compute column width and weekend position) |
| `g.gridBody` | SVG grid body (weekend highlight rects are injected here) |
| `g.today rect[x]` | Today marker rect (used to anchor weekday calculation) |
| `._CZjuD > svg:first-child` | Calendar SVG (sticky header transform applied here) |
| `._3eULf > div:first-child > div:first-child` | Task list header div (sticky transform applied here) |
| `._2B2zv svg` | Grid body SVG (read `height` attribute for weekend rect height) |

## `npm audit fix --force` is prohibited

Running `npm audit fix --force` will downgrade or break `@aws-amplify/backend` and CDK packages. Known vulnerabilities are all in `devDependencies` and do not affect the production bundle. See README for details.

## Weekend highlighting — MutationObserver + RAF

Weekend `<rect>` elements are removed by React re-renders (gantt-task-react replaces DOM nodes). A `MutationObserver` on `g.gridBody` re-applies them via `requestAnimationFrame` after each mutation. The observer is disconnected during re-insertion to avoid infinite loops, then re-connected after.

## `displayOrder` reorder strategy

`moveTask` swaps `displayOrder` values between two adjacent tasks (O(1) DB writes). `reorderTask` (drag-and-drop) assigns contiguous `1..n` values to all tasks after computing the new order — it only writes records whose `displayOrder` actually changed.

## No test suite

There are no unit or integration tests in this repo.
