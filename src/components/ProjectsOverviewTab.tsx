import { useMemo, useState, useEffect, useCallback } from "react";
import {
  Folder,
  Search,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  XCircle,
  Clock,
  X,
} from "lucide-react";

import { ProjectOverview } from "../types/business-rules.types.ts";
import { extractionService } from "../services/extractionService";
import { aggregationService } from "../services/aggregationService";
import { cleansingService } from "../services/cleansingService";
import { notify } from "../lib/notifications";

interface Props {
  projects: ProjectOverview[];
  totalCount?: number;
  selectedProjectId?: string;
  onOpenProject?: (id: string) => void;
  onSelectProject?: (id: string) => void;
  onDeselectProject?: (id: string) => void;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onFilterChange?: (filter: string) => void;
  onSearchChange?: (search: string) => void;
  currentFilter?: string;
  loading?: boolean;
}

function ProgressBar({
  value,
  total,
  color,
  failed,
}: {
  value: number;
  total: number;
  color: string;
  failed?: number;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs text-slate-500 flex gap-2">
        <span className="font-semibold text-slate-700">
          {value} / {total}
        </span>
        {failed ? (
          <span className="text-red-500">· {failed} failed</span>
        ) : null}
      </div>
    </div>
  );
}

export default function ProjectsOverviewTab({
  projects,
  totalCount,
  selectedProjectId,
  onOpenProject,
  onSelectProject,
  onDeselectProject,
  page = 1,
  totalPages = 1,
  onPageChange,
  onFilterChange,
  onSearchChange,
  currentFilter = "all",
  loading = false,
}: Props) {
  const [search, setSearch] = useState("");
  const [projectSources, setProjectSources] = useState<Record<string, any[]>>(
    {},
  );
  const [loadingSources, setLoadingSources] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState<Set<string>>(new Set());

  const [brandFilter, setBrandFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const filtered = useMemo(() => {
    let list =
      currentFilter === "all"
        ? projects
        : projects.filter((p) => p.status === currentFilter);

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q),
      );
    }

    if (brandFilter !== "all") {
      list = list.filter((p) => p.operationMode === brandFilter);
    }
    if (categoryFilter !== "all") {
      list = list.filter((p) => p.useCase === categoryFilter);
    }

    return list;
  }, [currentFilter, projects, search, brandFilter, categoryFilter]);
  
  const availableOperationModes = useMemo(() => {
    let list = [...projects];

    
    if (currentFilter !== "all") {
      list = list.filter((p) => p.status === currentFilter);
    }
    
    if (categoryFilter !== "all") {
      list = list.filter((p) => p.useCase === categoryFilter);
    }
    
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q),
      );
    }

    return [...new Set(list.map((p) => p.operationMode).filter(Boolean))];
  }, [projects, currentFilter, categoryFilter, search]);

  const availableUseCases = useMemo(() => {
    let list = [...projects];

    if (currentFilter !== "all") {
      list = list.filter((p) => p.status === currentFilter);
    }
    if (brandFilter !== "all") {
      list = list.filter((p) => p.operationMode === brandFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q),
      );
    }

    return [...new Set(list.map((p) => p.useCase).filter(Boolean))];
  }, [projects, currentFilter, brandFilter, search]);

  const availableStatuses = useMemo(() => {
    let list = [...projects];

    if (brandFilter !== "all") {
      list = list.filter((p) => p.operationMode === brandFilter);
    }
    if (categoryFilter !== "all") {
      list = list.filter((p) => p.useCase === categoryFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q),
      );
    }

    return [...new Set(list.map((p) => p.status).filter(Boolean))];
  }, [projects, brandFilter, categoryFilter, search]);
  const effectiveTotalPages = search.trim()
    ? Math.max(1, Math.ceil(filtered.length / 20))
    : totalPages;

  const effectivePage = search.trim()
    ? Math.min(page, effectiveTotalPages)
    : page;

  const displayedProjects = search.trim()
    ? filtered.slice((effectivePage - 1) * 20, effectivePage * 20)
    : filtered;
  const loadSources = useCallback(
    async (projectId: string) => {
      if (projectSources[projectId]) return;
      setLoadingSources((prev) => new Set(prev).add(projectId));
      try {
        const sources = await extractionService.getSourcesByProject(projectId);
        setProjectSources((prev) => ({ ...prev, [projectId]: sources || [] }));
      } catch (error) {
        console.error("Failed to load sources for project:", projectId);
      } finally {
        setLoadingSources((prev) => {
          const newSet = new Set(prev);
          newSet.delete(projectId);
          return newSet;
        });
      }
    },
    [projectSources],
  );

  useEffect(() => {
    filtered.forEach((p) => {
      if (!projectSources[p.id] && !loadingSources.has(p.id)) {
        loadSources(p.id);
      }
    });
  }, [filtered, loadSources, projectSources, loadingSources]);

  const getImportFileName = (projectId: string): string | null => {
    const sources = projectSources[projectId];
    if (!sources || sources.length === 0) return null;
    const excelSource = sources.find((s) => s.source_type === "excel");
    if (excelSource) return excelSource.source_url;
    return sources[0].source_url;
  };

  const getSourceStatusInfo = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    const sources = projectSources[projectId] || [];
    const isCleaningProject = project?.operationMode === "cleaning";
    const isEnrichmentProject = project?.operationMode === "enrichment";
    const isPdfExtractionProject = project?.operationMode === "pdf_extraction";

    if (!sources.length) {
      return {
        isCompleted: false,
        isProcessing: false,
        isFailed: false,
        pendingLabel: "",
        processingLabel: "",
      };
    }

    const completedSource = sources.find(
      (s) => s.metadata?.processing_status === "completed",
    );
    const processingSource = sources.find(
      (s) => s.metadata?.processing_status === "processing",
    );
    const failedSource = sources.find(
      (s) => s.metadata?.processing_status === "failed",
    );

    const processStatus =
      completedSource?.metadata?.processing_status ||
      processingSource?.metadata?.processing_status ||
      failedSource?.metadata?.processing_status ||
      "pending";

    const isCompleted = processStatus === "completed";
    const isProcessing = processStatus === "processing";
    const isFailed = processStatus === "failed";

    const pendingLabel = isCleaningProject
      ? "Needs Cleaning"
      : isEnrichmentProject
        ? "Needs Enrichment"
        : isPdfExtractionProject
          ? "Needs Extraction"
          : "Needs Aggregation";

    const processingLabel = isCleaningProject
      ? "Cleaning..."
      : isEnrichmentProject
        ? "Enriching..."
        : "Aggregating...";

    return {
      isCompleted,
      isProcessing,
      isFailed,
      pendingLabel,
      processingLabel,
    };
  };
  const handleDownloadOutput = async (
    e: React.MouseEvent,
    projectId: string,
  ) => {
    e.stopPropagation();
    const project = projects.find((p) => p.id === projectId);
    const projectName = project?.name || "project";

    setDownloading((prev) => new Set(prev).add(projectId));
    try {
      const sources = projectSources[projectId] || [];
      const completedSource = sources.find((s) => s.status === "completed");

      if (project?.operationMode === "cleaning") {
        await cleansingService.downloadCleanedProject(projectId);
      } else if (completedSource) {
        await extractionService.download(completedSource.id, "output");
      } else if (sources.length > 0) {
        await extractionService.download(sources[0].id, "output");
      } else {
        const { blob, filename } = await aggregationService.exportSelectedItems(
          [projectId],
          [],
        );
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename || `${projectName}_export.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }

      notify.success("Download started");
    } catch (error) {
      console.error("Download failed:", error);
      notify.error("Failed to download output");
    } finally {
      setDownloading((prev) => {
        const newSet = new Set(prev);
        newSet.delete(projectId);
        return newSet;
      });
    }
  };

  const Pagination = () => (
    <div className="flex items-center justify-end text-xs text-slate-500 gap-2">
      <button
        type="button"
        onClick={() => onPageChange?.(effectivePage - 1)}
        disabled={effectivePage <= 1}
        className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors"
      >
        <ChevronLeft className="w-3 h-3" /> Previous
      </button>
      <span className="flex items-center gap-1">
        {Array.from({ length: effectiveTotalPages }, (_, i) => i + 1).map(
          (p) => (
            <button
              type="button"
              key={p}
              onClick={() => onPageChange?.(p)}
              className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                p === effectivePage
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {p}
            </button>
          ),
        )}
      </span>
      <button
        type="button"
        onClick={() => onPageChange?.(effectivePage + 1)}
        disabled={effectivePage >= effectiveTotalPages}
        className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors"
      >
        Next <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );

  return (
   <div
  className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col"
  style={{ 
    height: "calc(100vh - 190px)", 
  }}
>
      <div className="shrink-0 bg-white">
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 shrink-0">
              <Folder className="w-5 h-5 text-slate-700" />
              <h3 className="text-lg font-bold text-slate-900">
                Projects Overview
              </h3>
              <span className="text-sm text-slate-500">
                {totalCount ?? projects.length} projects
              </span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={currentFilter}
                onChange={(e) => onFilterChange?.(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 outline-none"
              >
                <option value="all">All Status</option>
                {availableStatuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 outline-none"
              >
                <option value="all">All Modes</option>
                {availableOperationModes.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 outline-none"
              >
                <option value="all">All Use Cases</option>
                {availableUseCases.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <div className="relative w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSearchChange?.(search);
                  }}
                  onBlur={() => onSearchChange?.(search)}
                  placeholder="Search projects..."
                  className="w-full pl-9 pr-8 py-1.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      onSearchChange?.("");
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <Pagination />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto min-h-0 border-t border-slate-100">
        <table
          className="w-full text-sm table-fixed"
          style={{ minWidth: 1200 }}
        >
          <thead
            className="bg-slate-50 text-slate-500  text-[11px] font-bold tracking-wide"
            style={{ position: "sticky", top: 0, zIndex: 10 }}
          >
            <tr>
              <th className="px-4 py-2 text-left w-[200px]">Project Name</th>
              <th className="px-4 py-2 text-left w-[120px]">Operation Mode</th>
              <th className="px-4 py-2 text-left w-[180px]">Use Case</th>
              <th className="px-4 py-2 text-center w-[80px]">Products</th>
              <th className="px-4 py-2 text-left w-[140px]">Aggregated</th>
              <th className="px-4 py-2 text-left w-[140px]">Enriched</th>
              <th className="px-4 py-2 text-left w-[140px]">Cleansed</th>
              <th className="px-4 py-2 text-left w-[130px]">Import File</th>
              <th className="px-4 py-2 text-center w-[80px]">Output</th>
              <th className="px-4 py-2 text-center w-[90px]">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-6 py-12 text-center text-slate-500"
                >
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                  <p className="text-sm">Loading projects...</p>
                </td>
              </tr>
            ) : displayedProjects.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-6 py-12 text-center text-slate-400"
                >
                  {search
                    ? `No projects matching "${search}"`
                    : "No projects found."}
                </td>
              </tr>
            ) : (
              displayedProjects.map((p) => {
                const isSelected = p.id === selectedProjectId;
                const importFileName = getImportFileName(p.id);
                const isLoading = loadingSources.has(p.id);
                const isDownloading = downloading.has(p.id);

                return (
                  <tr
                    key={p.id}
                    onClick={() => onOpenProject?.(p.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-blue-50 hover:bg-blue-100/60"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="px-4 py-2">
                      <div
                        className={`font-semibold whitespace-normal break-words ${isSelected ? "text-blue-700" : "text-slate-900"}`}
                        title={p.name}
                      >
                        {isSelected && (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-600 mr-2 mb-0.5" />
                        )}
                        {p.name}
                      </div>
                      {p.description && (
                        <div className="text-xs text-slate-400 mt-0.5 whitespace-normal break-words">
                          {p.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full capitalize">
                        {p.operationMode || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className="text-xs text-slate-600 line-clamp-2"
                        title={p.useCase}
                      >
                        {p.useCase || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center font-bold text-slate-800 text-sm">
                      {p.totalProducts}
                    </td>
                    <td className="px-4 py-2 w-36">
                      {p.operationMode === "aggregation" ||
                      p.operationMode === "pdf_extraction" ? (
                        <ProgressBar
                          value={p.aggregated}
                          total={p.totalProducts}
                          color="bg-blue-500"
                          failed={p.aggregationFailed}
                        />
                      ) : (
                        <span className="text-slate-400 text-sm">—</span>
                      )}
                    </td>

                    <td className="px-4 py-2 w-36">
                      {p.operationMode === "enrichment" ? (
                        <ProgressBar
                          value={p.enrichment}
                          total={p.totalProducts}
                          color="bg-orange-500"
                          failed={p.enrichmentFailed}
                        />
                      ) : (
                        <span className="text-slate-400 text-sm">—</span>
                      )}
                    </td>

                    <td className="px-4 py-2 w-36">
                      {p.operationMode === "cleaning" ? (
                        <ProgressBar
                          value={p.cleaning}
                          total={p.totalProducts}
                          color="bg-emerald-500"
                        />
                      ) : (
                        <span className="text-slate-400 text-sm">—</span>
                      )}
                    </td>

                    <td
                      className="px-4 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                      ) : importFileName ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={async () => {
                              const sources = projectSources[p.id] || [];
                              if (sources.length > 0) {
                                setDownloading((prev) =>
                                  new Set(prev).add(p.id),
                                );
                                try {
                                  await extractionService.download(
                                    sources[0].id,
                                    "input",
                                  );
                                  notify.success("Download started");
                                } catch {
                                  notify.error("Failed to download input");
                                } finally {
                                  setDownloading((prev) => {
                                    const newSet = new Set(prev);
                                    newSet.delete(p.id);
                                    return newSet;
                                  });
                                }
                              }
                            }}
                            disabled={isDownloading}
                            className="flex items-center gap-1.5 hover:underline"
                          >
                            {isDownloading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                            ) : (
                              <Download className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            )}
                            <span
                              className="text-xs text-slate-600 font-mono truncate block max-w-[100px]"
                              title={importFileName}
                            >
                              {importFileName}
                            </span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td
                      className="px-4 py-3 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400 mx-auto" />
                      ) : (
                        (() => {
                          const {
                            isCompleted,
                            isProcessing,
                            isFailed,
                            pendingLabel,
                            processingLabel,
                          } = getSourceStatusInfo(p.id);

                          if (isCompleted) {
                            return (
                              <div className="relative group/tip">
                                <button
                                  onClick={(e) => handleDownloadOutput(e, p.id)}
                                  disabled={isDownloading}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg text-green-600 bg-green-50 hover:bg-green-100 border border-green-100 disabled:opacity-50"
                                >
                                  {isDownloading ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Download className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-[11px] font-medium text-white opacity-0 group-hover/tip:opacity-100 transition-opacity z-50">
                                  Download Output
                                </span>
                              </div>
                            );
                          }

                          if (isProcessing) {
                            return (
                              <div className="relative group/tip">
                                <div className="w-7 h-7 flex items-center justify-center rounded-lg text-purple-600 bg-purple-50 border border-purple-100">
                                  <Clock className="w-3.5 h-3.5 animate-spin" />
                                </div>
                                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-[11px] font-medium text-white opacity-0 group-hover/tip:opacity-100 transition-opacity z-50">
                                  {processingLabel}
                                </span>
                              </div>
                            );
                          }

                          if (isFailed) {
                            return (
                              <div className="relative group/tip">
                                <div className="w-7 h-7 flex items-center justify-center rounded-lg text-red-600 bg-red-50 border border-red-100">
                                  <XCircle className="w-3.5 h-3.5" />
                                </div>
                                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-[11px] font-medium text-white opacity-0 group-hover/tip:opacity-100 transition-opacity z-50">
                                  Failed
                                </span>
                              </div>
                            );
                          }

                          if (pendingLabel) {
                            return (
                              <div className="relative group/tip">
                                <div className="w-7 h-7 flex items-center justify-center rounded-lg text-amber-600 bg-amber-50 border border-amber-100">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                </div>
                                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-[11px] font-medium text-white opacity-0 group-hover/tip:opacity-100 transition-opacity z-50">
                                  {pendingLabel}
                                </span>
                              </div>
                            );
                          }

                          return (
                            <span className="text-slate-300 text-xs">—</span>
                          );
                        })()
                      )}
                    </td>
                    <td
                      className="px-4 py-3 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isSelected ? (
                        <button
                          onClick={() => onDeselectProject?.(p.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                        >
                          Selected
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            onSelectProject?.(p.id);
                            onOpenProject?.(p.id);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                        >
                          Select
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="shrink-0 px-5 py-2 border-t border-slate-100 bg-white">
        <Pagination />
      </div>
    </div>
  );
}
