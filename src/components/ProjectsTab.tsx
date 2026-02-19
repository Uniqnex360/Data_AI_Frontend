import { useEffect, useState } from "react";
import {
  Download,
  FileSpreadsheet,
  FolderOpen,
  Plus,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { projectService } from "../services/projectService";
import type { Project } from "../types/database.types";
import { extractionService } from "../services/extractionService";
import { getStatusIcon } from "../utils/statusIcon";
import { Clock, XCircle, AlertCircle } from 'lucide-react';

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
      const allSources = await extractionService.getAllSources();
      setSources(allSources);
    } catch (error) {
      console.error("Failed to load projects:", error);
    }
  };
  const loadSourcesForProject = async (id: string) => {
    console.log(" Loading Sources for Project", {
      projectId: id,
      existingSources: projectSources[id],
    });

    if (!id) {
      console.error(" Invalid Project ID", { id });
      return;
    }

    try {
      console.log(" Calling API for Sources", {
        endpoint: `extractionService.getSourcesByProject(${id})`,
      });
      const sourcesData = await extractionService.getSourcesByProject(id);
      console.log(" API Response Received", {
        projectId: id,
        sourcesCount: sourcesData.length,
        sources: sourcesData,
      });

      setProjectSources((prev) => {
        const newState = { ...prev, [id]: sourcesData };
        console.log(" Updated Project Sources State", {
          projectId: id,
          newSources: newState[id],
        });
        return newState;
      });
    } catch (error) {
      console.error(" Failed to Load Sources", {
        projectId: id,
        error: (error as Error).message,
      });
    }
  };
  const toggleProject = async (projectId: string) => {
    console.log(" Toggle Project Clicked", {
      projectId,
      currentExpanded: expandedProjects.has(projectId),
    });
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
      console.log(" Collapsing Project", { projectId });
    } else {
      newExpanded.add(projectId);
      console.log(" Expanding Project", {
        projectId,
        hasCachedSources: !!projectSources[projectId],
      });
      await loadSourcesForProject(projectId);
    }
    setExpandedProjects(newExpanded);
    console.log(" Updated Expanded Projects", {
      newExpanded: Array.from(newExpanded),
    });
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
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Project Name"
              className="px-3 py-2 border border-slate-300 rounded-md"
            />
            <input
              type="text"
              value={formData.client}
              onChange={(e) =>
                setFormData({ ...formData, client: e.target.value })
              }
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
        {projects.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
            <FolderOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600">No projects yet</p>
          </div>
        ) : (
          projects.map((project, index) => (
            <div
              key={project.id}
              className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">
                    Project {index + 1}
                  </p>
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-semibold text-slate-900">
                      {project.name}
                    </h4>
                    <button
                      onClick={() => toggleProject(project.id)}
                      className="text-slate-500 hover:text-slate-700"
                    >
                      {expandedProjects.has(project.id) ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {project.client && (
                    <p className="text-sm text-slate-600">{project.client}</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedProject(project);
                    loadSourcesForProject(project.id);
                    onProjectSelect?.(project.id);
                  }}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  Select
                </button>
              </div>
              {expandedProjects.has(project.id) && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <h5 className="text-sm font-medium text-slate-700 mb-3">
                    Project {index + 1} Import History
                  </h5>
                  <div className="space-y-2">
                    {projectSources[project.id]?.length === 0 ? (
                      <div className="text-center py-4 bg-slate-50 rounded-md text-sm text-slate-500">
                        No imports for this project yet
                      </div>
                    ) : (
                      projectSources[project.id]?.map((source) => {
                        const aggStatus = source.metadata?.aggregation_status;
                        console.log('aggregation_status',aggStatus)
                        const isEnriched = aggStatus === 'completed'
                        const isAggregating = aggStatus === 'processing'
                        return (
                          <div
                            key={source.id}
                            className="flex items-center justify-between p-3 bg-slate-50 rounded-md text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                              <span>{source.source_url}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() =>
                                  extractionService.download(source.id, "input")
                                }
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
                              >
                                <Download className="w-3.5 h-3.5" /> Input
                              </button>

                              {isEnriched ? (
                                <button
                                  onClick={() => extractionService.download(source.id, "output")}
                                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-100"
                                >
                                  <Download className="w-3.5 h-3.5" /> Output
                                </button>
                              ) : isAggregating ? (
                                <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-purple-600 italic">
                                  <Clock className="w-3.5 h-3.5 animate-spin" /> Aggregating...
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-amber-600 italic">
                                  <AlertCircle className="w-3.5 h-3.5" /> Needs Aggregation
                                </div>
                              )}

                              {getStatusIcon(source.status)}
                            </div>
                          </div>
                        )

                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
