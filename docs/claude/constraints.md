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

## Day-view column width and header labels

`columnWidth` for Day view is fixed at **18px** for both PC and mobile. Week/Month views retain separate mobile/desktop values.

Day-view header cells (`text._9w8d5`) show only the day-of-month number. The original library text format is `"Mon, 7"`; `GanttWrapper` replaces `textContent` with the last segment after splitting on `", "`.

On initial render, `GanttWrapper` scrolls the horizontal container (`._2k9Ys`) so today's column is centered: `scrollLeft = todayX - containerWidth / 2`. This runs once per view-mode change (guarded by `scrolledToToday` flag).

Today's column is highlighted with an amber rect (`rgba(250,204,21,0.4)`) injected into `g.gridBody`, restored by the same MutationObserver that restores weekend rects.

## `npm audit fix --force` is prohibited

Running `npm audit fix --force` will downgrade or break `@aws-amplify/backend` and CDK packages. Known vulnerabilities are all in `devDependencies` and do not affect the production bundle. See README for details.

## Weekend highlighting — MutationObserver + RAF

Weekend `<rect>` elements are removed by React re-renders (gantt-task-react replaces DOM nodes). A `MutationObserver` on `g.gridBody` re-applies them via `requestAnimationFrame` after each mutation. The observer is disconnected during re-insertion to avoid infinite loops, then re-connected after.

### Weekend detection — `data-dow` cache on date labels

Each Day-view date label (`text._9w8d5`) gets a `data-dow` attribute (`0`–`6`) recording its day of week. This is required because two things can break naive detection when tasks are moved far from today:

1. **Today goes out of range.** `ganttDateRange` (Day) starts the chart at *earliest task start − 1 day*, so if all tasks are next month, today is never rendered — `g.today rect` has no `x` attribute and `todayX = -1`, making the column-index weekday math impossible.
2. **Reused labels keep stripped text.** gantt-task-react keys labels by `date.getTime()`; overlapping columns are reused as the same DOM nodes. Their `textContent` was already rewritten `"土, 21"` → `"21"` (React leaves it untouched since the value is unchanged), so the `"土,"` / `"日,"` prefix fallback also fails.

With both true, the old code could not determine the weekday and weekend coloring disappeared permanently. The fix: when the weekday *is* known (today in range → column math, or fresh `"土, 21"` text → prefix match), write it to `data-dow` **before** stripping the text. Detection reads `data-dow` first, so reused/stripped labels still resolve their weekday after today leaves the range. `dow` is intrinsic to the date, so the cache never goes stale even as the label's `x`/column index shifts on re-layout.

## `displayOrder` reorder strategy

`moveTask` swaps `displayOrder` values between two adjacent tasks (O(1) DB writes). `reorderTask` (drag-and-drop) assigns contiguous `1..n` values to all tasks after computing the new order — it only writes records whose `displayOrder` actually changed.

## No test suite

There are no unit or integration tests in this repo.
