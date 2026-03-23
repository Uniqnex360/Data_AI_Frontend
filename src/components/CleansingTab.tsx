import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle, Sparkles, Play } from "lucide-react";
import { cleansingService } from "../services/cleansingService";
import { projectService } from "../services/projectService"; // assume exists
import type { CleansingIssue, Project } from "../types/database.types";

export default function CleansingTab() {
  const [issues, setIssues] = useState<CleansingIssue[]>([]);
  const [filter, setFilter] = useState<"all" | "unresolved" | "resolved">(
    "unresolved",
  );
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<
    "pending" | "completed" | "failed" | null
  >(null);

  useEffect(() => {
    loadIssues();
    loadProjects();
  }, []);

  // Optional: poll task status if taskId exists
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (taskId && (taskStatus === "pending" || taskStatus === "running")) {
      interval = setInterval(async () => {
        try {
          const { logs: newLogs } = await cleansingService.getTaskLogs(taskId);
          setLogs(newLogs);
        } catch (error) {
          console.error("Failed to fetch logs:", error);
        }
      }, 2000); // every 2 seconds
    }
    return () => clearInterval(interval);
  }, [taskId, taskStatus]);

  const loadIssues = async () => {
    try {
      const data = await cleansingService.getAllIssues();
      setIssues(data);
    } catch (error) {
      console.error("Failed to load issues:", error);
    }
  };

  const loadProjects = async () => {
    try {
      const data = await projectService.getAllProjects();
      setProjects(data);
      if (data.length > 0) setSelectedProjectId(data[0].id);
    } catch (error) {
      console.error("Failed to load projects:", error);
    }
  };

  const handleRunCleaning = async () => {
    if (!selectedProjectId) return;
    setIsRunning(true);
    setTaskStatus("pending");
    try {
      const { task_id } =
        await cleansingService.runProjectCleaning(selectedProjectId);
      setTaskId(task_id);
    } catch (error) {
      console.error("Failed to start cleaning:", error);
      setTaskStatus("failed");
    } finally {
      setIsRunning(false);
    }
  };

  const handleResolve = async (issueId: string) => {
    try {
      await cleansingService.resolveIssue(issueId);
      await loadIssues();
    } catch (error) {
      console.error("Failed to resolve issue:", error);
    }
  };
  const handleDownload = async () => {
    if (!selectedProjectId) return;
    try {
      const blob =
        await cleansingService.downloadCleanedProject(selectedProjectId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cleaned_project_${selectedProjectId}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download cleaned file:", error);
    }
  };
  const filteredIssues = issues.filter((issue) => {
    if (filter === "resolved") return issue.resolved;
    if (filter === "unresolved") return !issue.resolved;
    return true;
  });

  const getIssueColor = (type: string) => {
    switch (type) {
      case "invalid":
        return "text-red-600 bg-red-100";
      case "duplicate":
        return "text-amber-600 bg-amber-100";
      case "missing":
        return "text-slate-600 bg-slate-100";
      case "inconsistent":
        return "text-orange-600 bg-orange-100";
      default:
        return "text-slate-600 bg-slate-100";
    }
  };

  const stats = {
    total: issues.length,
    resolved: issues.filter((i) => i.resolved).length,
    unresolved: issues.filter((i) => !i.resolved).length,
  };

  return (
    <div className="space-y-6">
      {/* <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label
              htmlFor="project-select"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Select Project
            </label>
            <select
              id="project-select"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleDownload}
            disabled={!selectedProjectId}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300"
          >
            Download Cleaned
          </button>
          <button
            onClick={handleRunCleaning}
            disabled={!selectedProjectId || isRunning}
            className={`
              px-4 py-2 rounded-md text-white font-medium flex items-center gap-2
              ${isRunning ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}
            `}
          >
            <Play className="w-4 h-4" />
            {isRunning ? "Starting..." : "Run Cleaning & Standardization"}
          </button>
        </div>
        {taskId && (
          <div className="mt-3 text-sm">
            <span className="font-medium text-slate-700">Task ID:</span>{" "}
            {taskId}
            <span className="ml-3">
              Status:
              {taskStatus === "pending" && (
                <span className="text-amber-600 ml-1">⏳ Running...</span>
              )}
              {taskStatus === "completed" && (
                <span className="text-green-600 ml-1">✅ Completed</span>
              )}
              {taskStatus === "failed" && (
                <span className="text-red-600 ml-1">❌ Failed</span>
              )}
            </span>
          </div>
        )}
        {taskId && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-slate-700 mb-2">
              Live Logs
            </h4>
            <div className="bg-slate-900 text-slate-200 p-3 rounded-md font-mono text-xs h-48 overflow-y-auto">
              {logs.length === 0 ? (
                <span className="text-slate-500">Waiting for logs...</span>
              ) : (
                logs.map((log, i) => <div key={i}>{log}</div>)
              )}
            </div>
          </div>
        )}
      </div> */}

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium mb-1">Total Issues</p>
          <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-600 font-medium mb-1">Unresolved</p>
          <p className="text-2xl font-bold text-amber-900">
            {stats.unresolved}
          </p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium mb-1">Resolved</p>
          <p className="text-2xl font-bold text-green-900">{stats.resolved}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">
          Data Quality Issues
        </h3>
        <div className="flex gap-2">
          {(["all", "unresolved", "resolved"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`
                px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                ${
                  filter === f
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
                }
              `}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredIssues.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
            <Sparkles className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600">
              {filter === "unresolved"
                ? "No unresolved issues"
                : "No issues found"}
            </p>
          </div>
        ) : (
          filteredIssues.map((issue) => (
            <div
              key={issue.id}
              className="p-4 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getIssueColor(issue.issue_type)}`}
                    >
                      {issue.issue_type}
                    </span>
                    <span className="text-sm font-medium text-slate-900">
                      {issue.attribute_name}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{issue.details}</p>
                  <p className="text-xs text-slate-500">
                    Detected: {new Date(issue.detected_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {issue.resolved ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">Resolved</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleResolve(issue.id)}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
