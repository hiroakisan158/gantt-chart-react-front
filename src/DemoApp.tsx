import React, { useEffect, useRef, useState } from "react";
import { Gantt, Task as GanttTask, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";

// Module-level handler object (same stale-closure workaround as App.tsx)
const _hd = {
  moveTask: (_taskId: string, _adjacentTaskId: string) => {},
  openEditTask: (_task: GanttTask) => {},
};

// ── 今日基準のダミーデータ ──────────────────────────────────────────
function makeDemoData(): { projects: DemoProject[]; tasksByProject: Record<string, GanttTask[]> } {
  const d = (offsetDays: number) => {
    const dt = new Date();
    dt.setHours(0, 0, 0, 0);
    dt.setDate(dt.getDate() + offsetDays);
    return dt;
  };

  const projects: DemoProject[] = [
    { id: "demo-project-1", name: "Webサイトリニューアル", displayOrder: 0 },
    { id: "demo-project-2", name: "モバイルアプリ開発", displayOrder: 1 },
  ];

  const tasksByProject: Record<string, GanttTask[]> = {
    "demo-project-1": [
      { id: "t1", name: "要件定義",             start: d(-21), end: d(-10), progress: 100, type: "task",      project: "demo-project-1", displayOrder: 1 },
      { id: "t2", name: "デザイン制作",          start: d(-9),  end: d(5),   progress: 65,  type: "task",      project: "demo-project-1", displayOrder: 2 },
      { id: "t3", name: "フロントエンド実装",    start: d(4),   end: d(24),  progress: 0,   type: "task",      project: "demo-project-1", displayOrder: 3 },
      { id: "t4", name: "バックエンド実装",      start: d(8),   end: d(30),  progress: 0,   type: "task",      project: "demo-project-1", displayOrder: 4 },
      { id: "t5", name: "テスト",                start: d(28),  end: d(38),  progress: 0,   type: "task",      project: "demo-project-1", displayOrder: 5 },
      { id: "t6", name: "リリース",              start: d(38),  end: d(38),  progress: 0,   type: "milestone", project: "demo-project-1", displayOrder: 6 },
    ],
    "demo-project-2": [
      { id: "t7",  name: "企画・設計",           start: d(-28), end: d(-8),  progress: 100, type: "task",      project: "demo-project-2", displayOrder: 1 },
      { id: "t8",  name: "UI設計",               start: d(-7),  end: d(1),   progress: 85,  type: "task",      project: "demo-project-2", displayOrder: 2 },
      { id: "t9",  name: "iOS実装",              start: d(0),   end: d(30),  progress: 10,  type: "task",      project: "demo-project-2", displayOrder: 3 },
      { id: "t10", name: "Android実装",          start: d(7),   end: d(37),  progress: 0,   type: "task",      project: "demo-project-2", displayOrder: 4 },
      { id: "t11", name: "QAテスト",             start: d(35),  end: d(49),  progress: 0,   type: "task",      project: "demo-project-2", displayOrder: 5 },
    ],
  };

  return { projects, tasksByProject };
}

type DemoProject = { id: string; name: string; displayOrder: number };

function GanttWrapper({
  children,
  isMobile,
  viewMode,
  tasks,
}: {
  children: React.ReactNode;
  isMobile: boolean;
  viewMode: ViewMode;
  tasks: GanttTask[];
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isHorizontalScroll = useRef<boolean | null>(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const getScrollEl = () => el.querySelector<HTMLElement>("._2k9Ys");
    const onTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      isHorizontalScroll.current = null;
    };
    const onTouchMove = (e: TouchEvent) => {
      const dx = e.touches[0].clientX - touchStartX.current;
      const dy = e.touches[0].clientY - touchStartY.current;
      if (isHorizontalScroll.current === null) {
        isHorizontalScroll.current = Math.abs(dx) > Math.abs(dy);
      }
      if (!isHorizontalScroll.current) return;
      const scrollEl = getScrollEl();
      if (!scrollEl) return;
      scrollEl.scrollLeft -= dx;
      touchStartX.current = e.touches[0].clientX;
      e.preventDefault();
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  useEffect(() => {
    if (viewMode !== ViewMode.Day) return;
    const el = wrapperRef.current;
    if (!el) return;
    let weekendCols: Array<{ colLeft: number; isSat: boolean }> = [];
    let cachedColWidth = 40;
    let observer: MutationObserver | null = null;

    const applyColors = () => {
      const gridBodyG = el.querySelector<SVGGElement>("g.gridBody");
      if (!gridBodyG) return;
      if (weekendCols.length === 0) {
        const textEls = el.querySelectorAll<SVGTextElement>("text._9w8d5");
        if (textEls.length === 0) return;
        if (textEls.length >= 2) {
          const x0 = parseFloat(textEls[0].getAttribute("x") ?? "0");
          const x1 = parseFloat(textEls[1].getAttribute("x") ?? "40");
          cachedColWidth = Math.abs(x1 - x0);
        } else {
          cachedColWidth = parseFloat(textEls[0].getAttribute("x") ?? "20") * 2;
        }
        const todayRectEl = el.querySelector<SVGRectElement>("g.today rect[x]");
        const todayX = todayRectEl ? parseFloat(todayRectEl.getAttribute("x") ?? "-1") : -1;
        const todayColIndex = todayX >= 0 ? Math.round(todayX / cachedColWidth) : -1;
        const todayDow = new Date().getDay();
        const locale = window.navigator.language;
        const satName = new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2024, 0, 6));
        const sunName = new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2024, 0, 7));
        textEls.forEach((textEl) => {
          const original = textEl.textContent ?? "";
          const x = parseFloat(textEl.getAttribute("x") ?? "0");
          const colLeft = x - cachedColWidth / 2;
          const colIndex = Math.round(colLeft / cachedColWidth);
          let isSat = false;
          let isSun = false;
          if (todayColIndex >= 0) {
            const dow = ((todayDow + colIndex - todayColIndex) % 7 + 7) % 7;
            isSat = dow === 6;
            isSun = dow === 0;
          } else {
            isSat = original.startsWith(satName + ",");
            isSun = original.startsWith(sunName + ",");
          }
          if (isSat || isSun) weekendCols.push({ colLeft, isSat });
          if (isMobile) {
            const parts = original.split(", ");
            textEl.textContent = parts[parts.length - 1];
          }
        });
      }
      const bodySvg = el.querySelector<SVGSVGElement>("._2B2zv svg");
      const gridHeight = bodySvg ? parseFloat(bodySvg.getAttribute("height") ?? "0") : 0;
      if (gridHeight === 0) return;
      observer?.disconnect();
      el.querySelectorAll(".weekend-highlight").forEach((r) => r.remove());
      const rowsG = gridBodyG.querySelector<SVGGElement>("g.rows");
      const insertAfterRows = rowsG ? rowsG.nextSibling : gridBodyG.firstChild;
      weekendCols.forEach(({ colLeft, isSat }) => {
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", String(colLeft));
        rect.setAttribute("y", "0");
        rect.setAttribute("width", String(cachedColWidth));
        rect.setAttribute("height", String(gridHeight));
        rect.setAttribute("fill", isSat ? "rgba(59,130,246,0.22)" : "rgba(239,68,68,0.22)");
        rect.classList.add("weekend-highlight");
        gridBodyG.insertBefore(rect, insertAfterRows);
      });
      if (observer) observer.observe(gridBodyG, { childList: true });
    };

    const rafId = requestAnimationFrame(() => {
      const gridBodyG = el.querySelector<SVGGElement>("g.gridBody");
      if (!gridBodyG) return;
      applyColors();
      observer = new MutationObserver(applyColors);
      observer.observe(gridBodyG, { childList: true });
    });
    return () => {
      cancelAnimationFrame(rafId);
      observer?.disconnect();
      el.querySelectorAll(".weekend-highlight").forEach((r) => r.remove());
    };
  }, [isMobile, viewMode, tasks]);

  return <div ref={wrapperRef}>{children}</div>;
}

function CustomTaskListHeader({
  headerHeight,
  rowWidth,
}: {
  headerHeight: number;
  rowWidth: string;
  fontFamily: string;
  fontSize: string;
}) {
  return (
    <div
      style={{
        height: headerHeight,
        width: rowWidth,
        background: "#fff",
        borderBottom: "1px solid #e2e8f0",
        display: "flex",
        alignItems: "center",
        paddingLeft: 6,
        boxSizing: "border-box",
        fontWeight: 600,
        fontSize: "0.8em",
        color: "#64748b",
      }}
    >
      タスク名
    </div>
  );
}

function CustomTaskListTable({
  tasks: listTasks,
  rowHeight,
  rowWidth,
}: {
  rowHeight: number;
  rowWidth: string;
  fontFamily: string;
  fontSize: string;
  locale: string;
  tasks: GanttTask[];
  selectedTaskId: string;
  setSelectedTask: (taskId: string) => void;
  onExpanderClick: (task: GanttTask) => void;
}) {
  return (
    <div>
      {listTasks.map((task, index) => {
        const isFirst = index === 0;
        const isLast = index === listTasks.length - 1;
        return (
          <div
            key={task.id}
            style={{
              display: "flex",
              alignItems: "center",
              height: rowHeight,
              width: rowWidth,
              borderBottom: "1px solid #e2e8f0",
              paddingLeft: 6,
              boxSizing: "border-box",
              background: "#fff",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", flexShrink: 0, marginRight: 4 }}>
              <button
                onMouseDown={(e) => { e.stopPropagation(); if (!isFirst) _hd.moveTask(task.id, listTasks[index - 1].id); }}
                disabled={isFirst}
                style={arrowBtnStyle(isFirst)}
                title="上へ"
              >▲</button>
              <button
                onMouseDown={(e) => { e.stopPropagation(); if (!isLast) _hd.moveTask(task.id, listTasks[index + 1].id); }}
                disabled={isLast}
                style={arrowBtnStyle(isLast)}
                title="下へ"
              >▼</button>
            </div>
            <span
              style={{
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: "0.875em",
                cursor: "pointer",
                userSelect: "none",
              }}
              onDoubleClick={() => _hd.openEditTask(task)}
              title={task.name}
            >
              {task.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const TODAY = new Date();
function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

let _demoIdCounter = 100;
function newDemoId() {
  return `demo-task-${++_demoIdCounter}`;
}

export default function DemoApp({ onLogin }: { onLogin: () => void }) {
  const initialData = makeDemoData();
  const [projects, setProjects] = useState<DemoProject[]>(initialData.projects);
  const [tasksByProject, setTasksByProject] = useState<Record<string, GanttTask[]>>(initialData.tasksByProject);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialData.projects[0].id);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // --- Project modal ---
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectName, setProjectName] = useState("");

  // --- Task modal ---
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<GanttTask | null>(null);
  const [taskForm, setTaskForm] = useState({
    name: "",
    start: fmtDate(TODAY),
    end: fmtDate(new Date(TODAY.getTime() + 7 * 86400000)),
    progress: 0,
    type: "task" as GanttTask["type"],
  });

  const tasks = tasksByProject[selectedProjectId] ?? [];

  _hd.moveTask = moveTask;
  _hd.openEditTask = openEditTask;

  // --- Project CRUD (in-memory only) ---
  function createProject() {
    if (!projectName.trim()) return;
    const newProject: DemoProject = {
      id: `demo-project-${Date.now()}`,
      name: projectName.trim(),
      displayOrder: projects.length,
    };
    setProjects((prev) => [...prev, newProject]);
    setTasksByProject((prev) => ({ ...prev, [newProject.id]: [] }));
    setSelectedProjectId(newProject.id);
    setProjectName("");
    setShowProjectModal(false);
  }

  function deleteProject(id: string) {
    if (!confirm("このプロジェクトとタスクをすべて削除しますか？")) return;
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setTasksByProject((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (selectedProjectId === id) {
      const remaining = projects.filter((p) => p.id !== id);
      setSelectedProjectId(remaining[0]?.id ?? "");
    }
  }

  // --- Task CRUD (in-memory only) ---
  function openNewTask() {
    setEditingTask(null);
    setTaskForm({
      name: "",
      start: fmtDate(TODAY),
      end: fmtDate(new Date(TODAY.getTime() + 7 * 86400000)),
      progress: 0,
      type: "task",
    });
    setShowTaskModal(true);
  }

  function openEditTask(task: GanttTask) {
    setEditingTask(task);
    setTaskForm({
      name: task.name,
      start: fmtDate(task.start),
      end: fmtDate(task.end),
      progress: task.progress,
      type: task.type,
    });
    setShowTaskModal(true);
  }

  function saveTask() {
    if (!selectedProjectId || !taskForm.name.trim()) return;
    if (editingTask) {
      setTasksByProject((prev) => ({
        ...prev,
        [selectedProjectId]: prev[selectedProjectId].map((t) =>
          t.id === editingTask.id
            ? {
                ...t,
                name: taskForm.name.trim(),
                start: new Date(taskForm.start),
                end: new Date(taskForm.end),
                progress: taskForm.progress,
                type: taskForm.type,
              }
            : t
        ),
      }));
    } else {
      const newTask: GanttTask = {
        id: newDemoId(),
        name: taskForm.name.trim(),
        start: new Date(taskForm.start),
        end: new Date(taskForm.end),
        progress: taskForm.progress,
        type: taskForm.type,
        project: selectedProjectId,
        displayOrder: tasks.length + 1,
      };
      setTasksByProject((prev) => ({
        ...prev,
        [selectedProjectId]: [...(prev[selectedProjectId] ?? []), newTask],
      }));
    }
    setShowTaskModal(false);
  }

  function deleteTask(task: GanttTask) {
    setTasksByProject((prev) => ({
      ...prev,
      [selectedProjectId]: prev[selectedProjectId].filter((t) => t.id !== task.id),
    }));
  }

  function moveTask(taskId: string, adjacentTaskId: string) {
    setTasksByProject((prev) => {
      const list = [...(prev[selectedProjectId] ?? [])];
      const idxA = list.findIndex((t) => t.id === taskId);
      const idxB = list.findIndex((t) => t.id === adjacentTaskId);
      if (idxA < 0 || idxB < 0) return prev;
      const orderA = list[idxA].displayOrder ?? idxA + 1;
      const orderB = list[idxB].displayOrder ?? idxB + 1;
      return {
        ...prev,
        [selectedProjectId]: list.map((t) => {
          if (t.id === taskId) return { ...t, displayOrder: orderB };
          if (t.id === adjacentTaskId) return { ...t, displayOrder: orderA };
          return t;
        }),
      };
    });
  }

  function handleTaskChange(task: GanttTask) {
    setTasksByProject((prev) => ({
      ...prev,
      [selectedProjectId]: prev[selectedProjectId].map((t) =>
        t.id === task.id ? { ...t, start: task.start, end: task.end, progress: task.progress } : t
      ),
    }));
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Demo banner */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          background: "linear-gradient(90deg, #f59e0b, #ef4444)",
          color: "#fff",
          textAlign: "center",
          padding: "6px 12px",
          fontSize: "0.85em",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}
      >
        <span>デモモード — データはページをリロードするとリセットされます</span>
        <button
          onClick={onLogin}
          style={{
            background: "#fff",
            color: "#ef4444",
            border: "none",
            borderRadius: 6,
            padding: "3px 12px",
            fontWeight: 700,
            fontSize: "0.9em",
            cursor: "pointer",
          }}
        >
          ログインしてはじめる →
        </button>
      </div>

      {/* Offset for banner */}
      <div style={{ display: "flex", width: "100%", marginTop: 36, overflow: "hidden" }}>
        {/* Mobile backdrop */}
        {isMobile && sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 99,
            }}
          />
        )}

        {/* Sidebar */}
        <aside
          style={{
            width: 220,
            background: "#1e1e2e",
            color: "#cdd6f4",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
            ...(isMobile && {
              position: "fixed",
              top: 36,
              left: 0,
              height: "calc(100vh - 36px)",
              zIndex: 100,
              transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
              transition: "transform 0.25s ease",
            }),
          }}
        >
          <div style={{ padding: "16px 12px 8px", borderBottom: "1px solid #313244" }}>
            <div style={{ fontWeight: 700, fontSize: "1.1em", marginBottom: 4 }}>Gantt Chart</div>
            <div style={{ fontSize: "0.75em", color: "#f59e0b" }}>デモモード</div>
          </div>

          <div style={{ padding: "8px 12px 4px", fontSize: "0.75em", color: "#a6adc8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Projects
          </div>
          <ul style={{ flex: 1, overflowY: "auto", listStyle: "none", padding: "0 8px" }}>
            {projects.map((p) => (
              <li
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  borderRadius: 6,
                  padding: "6px 8px",
                  marginBottom: 2,
                  background: p.id === selectedProjectId ? "#313244" : "transparent",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  onClick={() => { setSelectedProjectId(p.id); if (isMobile) setSidebarOpen(false); }}
                >
                  {p.name}
                </span>
                <button
                  onClick={() => deleteProject(p.id)}
                  style={{ background: "none", border: "none", color: "#f38ba8", fontSize: "0.85em", padding: "0 2px" }}
                  title="削除"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>

          <div style={{ padding: "8px" }}>
            <button
              onClick={() => setShowProjectModal(true)}
              style={{
                width: "100%",
                padding: "8px",
                background: "#89b4fa",
                color: "#1e1e2e",
                border: "none",
                borderRadius: 6,
                fontWeight: 600,
                fontSize: "0.9em",
              }}
            >
              + New Project
            </button>
          </div>

          <div style={{ padding: "8px", borderTop: "1px solid #313244" }}>
            <button
              onClick={onLogin}
              style={{
                width: "100%",
                padding: "6px",
                background: "#f59e0b",
                color: "#1e1e2e",
                border: "none",
                borderRadius: 6,
                fontWeight: 700,
                fontSize: "0.85em",
              }}
            >
              ログインしてはじめる
            </button>
          </div>
        </aside>

        {/* Main */}
        <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Header */}
          <div
            style={{
              padding: "12px 20px",
              background: "#fff",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexShrink: 0,
            }}
          >
            {isMobile && (
              <button
                onClick={() => setSidebarOpen((o) => !o)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  flexShrink: 0,
                }}
                title="メニュー"
              >
                <span style={{ display: "block", width: 20, height: 2, background: "#333" }} />
                <span style={{ display: "block", width: 20, height: 2, background: "#333" }} />
                <span style={{ display: "block", width: 20, height: 2, background: "#333" }} />
              </button>
            )}
            <h2 style={{ fontWeight: 700, fontSize: "1.1em", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selectedProject ? selectedProject.name : "プロジェクトを選択してください"}
            </h2>

            <div style={{ display: "flex", gap: 4 }}>
              {([ViewMode.Day, ViewMode.Week, ViewMode.Month] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 4,
                    border: "1px solid #cbd5e1",
                    background: viewMode === mode ? "#3b82f6" : "#fff",
                    color: viewMode === mode ? "#fff" : "#333",
                    fontSize: "0.8em",
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>

            {selectedProjectId && (
              <button
                onClick={openNewTask}
                style={{
                  padding: isMobile ? "6px 10px" : "6px 14px",
                  background: "#3b82f6",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  fontWeight: 600,
                  fontSize: "0.9em",
                  flexShrink: 0,
                }}
              >
                {isMobile ? "+" : "+ Add Task"}
              </button>
            )}
          </div>

          {/* Gantt area */}
          <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
            {!selectedProjectId ? (
              <div style={{ color: "#94a3b8", textAlign: "center", marginTop: 80, fontSize: "1.1em" }}>
                左のサイドバーからプロジェクトを選択するか、新規作成してください
              </div>
            ) : tasks.length === 0 ? (
              <div style={{ color: "#94a3b8", textAlign: "center", marginTop: 80, fontSize: "1.1em" }}>
                タスクがありません。「+ Add Task」から追加してください
              </div>
            ) : (
              <GanttWrapper isMobile={isMobile} viewMode={viewMode} tasks={tasks}>
                <Gantt
                  tasks={tasks}
                  viewMode={viewMode}
                  onDateChange={handleTaskChange}
                  onProgressChange={handleTaskChange}
                  onDoubleClick={openEditTask}
                  onDelete={deleteTask}
                  listCellWidth={isMobile ? "140px" : "220px"}
                  columnWidth={viewMode === ViewMode.Month ? (isMobile ? 160 : 300) : viewMode === ViewMode.Week ? (isMobile ? 140 : 250) : (isMobile ? 40 : 60)}
                  TaskListTable={CustomTaskListTable}
                  TaskListHeader={CustomTaskListHeader}
                />
              </GanttWrapper>
            )}
          </div>
        </main>
      </div>

      {/* Project Modal */}
      {showProjectModal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3 style={{ marginBottom: 12 }}>新規プロジェクト</h3>
            <input
              autoFocus
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createProject()}
              placeholder="プロジェクト名"
              style={inputStyle}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={() => setShowProjectModal(false)} style={cancelBtnStyle}>キャンセル</button>
              <button onClick={createProject} style={primaryBtnStyle}>作成</button>
            </div>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3 style={{ marginBottom: 12 }}>{editingTask ? "タスク編集" : "新規タスク"}</h3>
            <label style={labelStyle}>タスク名</label>
            <input
              autoFocus
              value={taskForm.name}
              onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
              placeholder="タスク名"
              style={inputStyle}
            />
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>開始日</label>
                <input
                  type="date"
                  value={taskForm.start}
                  onChange={(e) => setTaskForm({ ...taskForm, start: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>終了日</label>
                <input
                  type="date"
                  value={taskForm.end}
                  onChange={(e) => setTaskForm({ ...taskForm, end: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>進捗 ({taskForm.progress}%)</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={taskForm.progress}
                  onChange={(e) => setTaskForm({ ...taskForm, progress: Number(e.target.value) })}
                  style={{ width: "100%" }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>種別</label>
                <select
                  value={taskForm.type}
                  onChange={(e) => setTaskForm({ ...taskForm, type: e.target.value as GanttTask["type"] })}
                  style={inputStyle}
                >
                  <option value="task">task</option>
                  <option value="milestone">milestone</option>
                  <option value="project">project</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={() => setShowTaskModal(false)} style={cancelBtnStyle}>キャンセル</button>
              <button onClick={saveTask} style={primaryBtnStyle}>{editingTask ? "更新" : "追加"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};
const modalStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 10,
  padding: 24,
  width: 420,
  maxWidth: "90vw",
  boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  fontSize: "0.95em",
};
const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.8em",
  color: "#64748b",
  marginBottom: 4,
};
const primaryBtnStyle: React.CSSProperties = {
  padding: "8px 20px",
  background: "#3b82f6",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  fontWeight: 600,
};
const cancelBtnStyle: React.CSSProperties = {
  padding: "8px 20px",
  background: "#f1f5f9",
  color: "#333",
  border: "1px solid #cbd5e1",
  borderRadius: 6,
};
function arrowBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    display: "block",
    padding: "0 2px",
    lineHeight: 1,
    fontSize: "0.6em",
    background: "none",
    border: "none",
    cursor: disabled ? "default" : "pointer",
    color: disabled ? "#cbd5e1" : "#64748b",
  };
}
