import { useEffect, useState } from "react";
import { Download, FileSpreadsheet, FolderOpen, Plus } from "lucide-react";
import { projectService } from "../services/projectService";
import type { Project } from "../types/database.types";
import { extractionService } from "../services/extractionService";
import { getStatusIcon } from "../utils/statusIcon";
import { Clock, XCircle } from "lucide-react";

interface Props {
  onProjectSelect?: (projectId: string) => void;
}

export default function ProjectsTab({ onProjectSelect }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set(),
  );
  const [projectSources, setProjectSources] = useState<
    Record<string, Source[]>
  >({});
  const [formData, setFormData] = useState({
    name: "",
    client: "",
    target_platform: "shopify",
    status: "draft" as const,
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await projectService.getAllProjects();
      setProjects(data);
    } catch (error) {
      console.error("Failed to load projects:", error);
    }
  };

  //   const toggleProject = async (projectId: string) => {
  //   const newExpanded = new Set(expandedProjects);
  //   if (newExpanded.has(projectId)) {
  //     newExpanded.delete(projectId);
  //   } else {
  //     newExpanded.add(projectId);
  //     if (!projectSources[projectId]) {
  //       await loadSourcesForProject(projectId);
  //     }
  //   }
  //   setExpandedProjects(newExpanded);
  // };
  const loadSourcesForProject = async (projectId: string) => {
    try {
      const data = await extractionService.getSourcesByProject(projectId);
      setSources(data);
    } catch (error) {
      console.error("Failed to load project sources:", error);
    }
  };
  const handleCreate = async () => {
    try {
      await projectService.createProject({
        ...formData,
        categories: [],
        output_schema: {},
      });
      setShowCreateForm(false);
      await loadProjects();
    } catch (error) {
      console.error("Failed to create project:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-slate-900">Projects</h3>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-slate-900 mb-4">
            Create New Project
          </h4>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })}
              placeholder="Project Name"
              className="px-3 py-2 border border-slate-300 rounded-md"
            />
            <input
              type="text"
              value={formData.client}
              onChange={(e) =>
                setFormData({ ...formData, client: e.target.value })}
              placeholder="Client / Brand"
              className="px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!formData.name}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Create Project
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {projects.length === 0
          ? (
            <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
              <FolderOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">No projects yet</p>
            </div>
          )
          : (
            projects.map((project) => (
              <div
                key={project.id}
                className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900">
                      {project.name}
                    </h4>
                    {project.client && (
                      <p className="text-sm text-slate-600">{project.client}</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedProject(project);
                      loadSourcesForProject(project.id);
                    }}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  >
                    Select
                  </button>
                </div>
              </div>
            ))
          )}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          {selectedProject ? selectedProject.name : "Import History"}
        </h3>
        <div className="space-y-2">
          {sources.length === 0
            ? (
              <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
                <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600">
                  No imports yet. Select a project to view imports.
                </p>
              </div>
            )
            : (
              sources.map((source) => (
                <div
                  key={source.id}
                  className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {source.source_url}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(source.uploaded_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        extractionService.download(source.id, "input")}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
                    >
                      <Download className="w-3.5 h-3.5" /> Input
                    </button>

                    {source.status === "completed"
                      ? (
                        <button
                          onClick={() =>
                            extractionService.download(source.id, "output")}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-100 animate-in fade-in"
                        >
                          <Download className="w-3.5 h-3.5" /> Output
                        </button>
                      )
                      : source.status === "processing"
                      ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-400 italic">
                          <Clock className="w-3.5 h-3.5 animate-spin" />{" "}
                          Preparing Output...
                        </div>
                      )
                      : source.status === "failed"
                      ? (
                        <div className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-400 uppercase tracking-tighter">
                          <XCircle className="w-3.5 h-3.5" /> Failed
                        </div>
                      )
                      : null}
                  </div>
                </div>
              ))
            )}
        </div>
      </div>
    </div>
  );
}
