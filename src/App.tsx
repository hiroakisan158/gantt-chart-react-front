import { useEffect, useState } from "react";
import { Gantt, Task as GanttTask, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import { generateClient } from "aws-amplify/data";
import { useAuthenticator } from "@aws-amplify/ui-react";
import type { Schema } from "../amplify/data/resource";

const client = generateClient<Schema>();

// Module-level object updated on every App render.
// Avoids stale-closure / context-propagation issues with gantt-task-react.
const _h = {
  moveTask: (_taskId: string, _adjacentTaskId: string) => {},
  openEditTask: (_task: GanttTask) => {},
};

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
                onMouseDown={(e) => {
                  e.stopPropagation();
                  if (!isFirst) _h.moveTask(task.id, listTasks[index - 1].id);
                }}
                disabled={isFirst}
                style={arrowBtnStyle(isFirst)}
                title="上へ"
              >▲</button>
              <button
                onMouseDown={(e) => {
                  e.stopPropagation();
                  if (!isLast) _h.moveTask(task.id, listTasks[index + 1].id);
                }}
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
              onDoubleClick={() => _h.openEditTask(task)}
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

type Project = Schema["GanttProject"]["type"];
type TaskRecord = Schema["GanttTask"]["type"];

function toGanttTask(t: TaskRecord): GanttTask {
  return {
    id: t.id,
    name: t.name,
    start: new Date(t.start),
    end: new Date(t.end),
    progress: t.progress,
    type: (t.type as GanttTask["type"]) ?? "task",
    project: t.projectId,
    dependencies: (t.dependencies ?? []).filter(Boolean) as string[],
    displayOrder: t.displayOrder ?? undefined,
  };
}

const TODAY = new Date();
function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function App() {
  const { user, signOut } = useAuthenticator();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week);

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

  // Always sync _h with the latest closures before render
  _h.moveTask = moveTask;
  _h.openEditTask = openEditTask;

  // Load projects on mount
  useEffect(() => {
    client.models.GanttProject.list().then(({ data }) => {
      const sorted = [...data].sort(
        (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
      );
      setProjects(sorted);
      if (sorted.length > 0) setSelectedProjectId(sorted[0].id);
    });
  }, []);

  // Load tasks when project changes
  useEffect(() => {
    if (!selectedProjectId) {
      setTasks([]);
      return;
    }
    client.models.GanttTask.listByProject({ projectId: selectedProjectId }).then(
      ({ data }) => {
        const sorted = [...data].sort(
          (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
        );
        setTasks(sorted.map(toGanttTask));
      }
    );
  }, [selectedProjectId]);

  // --- Project CRUD ---
  async function createProject() {
    if (!projectName.trim()) return;
    const { data } = await client.models.GanttProject.create({
      name: projectName.trim(),
      displayOrder: projects.length,
    });
    if (data) {
      setProjects((prev) => [...prev, data]);
      setSelectedProjectId(data.id);
    }
    setProjectName("");
    setShowProjectModal(false);
  }

  async function deleteProject(id: string) {
    if (!confirm("このプロジェクトとタスクをすべて削除しますか？")) return;
    const { data: taskData } = await client.models.GanttTask.listByProject({ projectId: id });
    await Promise.all(taskData.map((t) => client.models.GanttTask.delete({ id: t.id })));
    await client.models.GanttProject.delete({ id });
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (selectedProjectId === id) {
      const remaining = projects.filter((p) => p.id !== id);
      setSelectedProjectId(remaining[0]?.id ?? null);
    }
  }

  // --- Task CRUD ---
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

  async function saveTask() {
    if (!selectedProjectId || !taskForm.name.trim()) return;
    const payload = {
      projectId: selectedProjectId,
      name: taskForm.name.trim(),
      start: new Date(taskForm.start).toISOString(),
      end: new Date(taskForm.end).toISOString(),
      progress: taskForm.progress,
      type: taskForm.type,
      displayOrder: editingTask
        ? (editingTask.displayOrder ?? tasks.findIndex((t) => t.id === editingTask.id) + 1)
        : tasks.length + 1,
    };
    if (editingTask) {
      const { data } = await client.models.GanttTask.update({
        id: editingTask.id,
        ...payload,
      });
      if (data) {
        setTasks((prev) =>
          prev.map((t) => (t.id === editingTask.id ? toGanttTask(data) : t))
        );
      }
    } else {
      const { data } = await client.models.GanttTask.create(payload);
      if (data) setTasks((prev) => [...prev, toGanttTask(data)]);
    }
    setShowTaskModal(false);
  }

  async function deleteTask(task: GanttTask) {
    await client.models.GanttTask.delete({ id: task.id });
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
  }

  async function moveTask(taskId: string, adjacentTaskId: string) {
    const taskA = tasks.find((t) => t.id === taskId);
    const taskB = tasks.find((t) => t.id === adjacentTaskId);
    if (!taskA || !taskB) return;

    const orderA = taskA.displayOrder ?? 1;
    const orderB = taskB.displayOrder ?? 1;

    // Optimistic update: swap displayOrder values
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) return { ...t, displayOrder: orderB };
        if (t.id === adjacentTaskId) return { ...t, displayOrder: orderA };
        return t;
      })
    );

    await Promise.all([
      client.models.GanttTask.update({ id: taskId, displayOrder: orderB }),
      client.models.GanttTask.update({ id: adjacentTaskId, displayOrder: orderA }),
    ]);
  }

  async function handleTaskChange(task: GanttTask) {
    const { data } = await client.models.GanttTask.update({
      id: task.id,
      start: task.start.toISOString(),
      end: task.end.toISOString(),
      progress: task.progress,
    });
    if (data) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? toGanttTask(data) : t)));
    }
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 220,
          background: "#1e1e2e",
          color: "#cdd6f4",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        <div style={{ padding: "16px 12px 8px", borderBottom: "1px solid #313244" }}>
          <div style={{ fontWeight: 700, fontSize: "1.1em", marginBottom: 4 }}>
            Gantt Chart
          </div>
          <div style={{ fontSize: "0.75em", color: "#a6adc8", wordBreak: "break-all" }}>
            {user?.signInDetails?.loginId}
          </div>
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
                onClick={() => setSelectedProjectId(p.id)}
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
            onClick={signOut}
            style={{
              width: "100%",
              padding: "6px",
              background: "transparent",
              color: "#a6adc8",
              border: "1px solid #45475a",
              borderRadius: 6,
              fontSize: "0.85em",
            }}
          >
            Sign out
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
          <h2 style={{ fontWeight: 700, fontSize: "1.1em", flex: 1 }}>
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
                padding: "6px 14px",
                background: "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontWeight: 600,
                fontSize: "0.9em",
              }}
            >
              + Add Task
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
            <Gantt
              tasks={tasks}
              viewMode={viewMode}
              onDateChange={handleTaskChange}
              onProgressChange={handleTaskChange}
              onDoubleClick={openEditTask}
              onDelete={deleteTask}
              listCellWidth="220px"
              columnWidth={viewMode === ViewMode.Month ? 300 : viewMode === ViewMode.Week ? 250 : 60}
              TaskListTable={CustomTaskListTable}
            />
          )}
        </div>
      </main>

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
              <button onClick={() => setShowProjectModal(false)} style={cancelBtnStyle}>
                キャンセル
              </button>
              <button onClick={createProject} style={primaryBtnStyle}>
                作成
              </button>
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
              <button onClick={() => setShowTaskModal(false)} style={cancelBtnStyle}>
                キャンセル
              </button>
              <button onClick={saveTask} style={primaryBtnStyle}>
                {editingTask ? "更新" : "追加"}
              </button>
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
