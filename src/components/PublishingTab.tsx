import React from "react";
import { ChevronRight, ExternalLink, Loader2 } from "lucide-react";
import { ProjectsTableProps } from "../types/business-rules.types.ts";
import { getStatusBadge } from "../utils/projectStatusColorizer.tsx";

export function ProjectsTable({
  projects,
  loading,
  selectedProjectIds,
  aggregatingProjects,
  projectEnrichmentCounts,
  onToggleSelectAll,
  onToggleProjectSelection,
  onSelectProject,
  selectedProjectId,
}: ProjectsTableProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={projects.length > 0 && selectedProjectIds.size === projects.length}
            onChange={onToggleSelectAll}
            className="rounded border-slate-300"
          />
          <span className="text-sm font-semibold text-slate-900">{projects.length} Projects</span>
          {selectedProjectIds.size > 0 && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
              {selectedProjectIds.size} selected
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="w-12 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={projects.length > 0 && selectedProjectIds.size === projects.length}
                  onChange={onToggleSelectAll}
                  className="rounded border-slate-300"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Project Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Use Case</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Products</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Enrichment</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 w-20">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                  <p className="text-slate-500 text-sm">Loading projects...</p>
                </td>
              </tr>
            ) : projects.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No projects found
                </td>
              </tr>
            ) : (
              projects.map((project) => (
                <tr
                  key={project.id}
                  className={`hover:bg-slate-50 transition-colors ${
                    selectedProjectId === project.id ? "bg-blue-50" : ""
                  } ${aggregatingProjects.has(project.id) ? "bg-blue-50/30" : ""}`}
                >
                  <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedProjectIds.has(project.id)}
                      onChange={(e) => onToggleProjectSelection(project.id, e as any)}
                      className="rounded border-slate-300"
                      disabled={aggregatingProjects.has(project.id)}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-semibold text-slate-900">{project.name}</div>
                  </td>
                  <td className="px-4 py-4">
                    {project.use_case && (
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded-full">
                        {project.use_case}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                      {project.product_count ?? 0} products
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {getStatusBadge(project.source_status || "NA")}
                    {aggregatingProjects.has(project.id) && (
                      <span className="ml-2 inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Aggregating
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {projectEnrichmentCounts[project.id] > 0 && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full flex items-center gap-1 w-fit">
                        <ChevronRight className="w-3 h-3" />
                        {projectEnrichmentCounts[project.id]} in Enrichment
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={() => onSelectProject(project.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View Products
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}