import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  FileText,
  Play,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader2,
  X,
  Box,
  AlertTriangle,
  List,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { productService } from "../services/productService";
import { projectService } from "../services/projectService";
import type { Product } from "../types/database.types";
import { notify } from "../lib/notifications";
import { aggregationService } from "../services/aggregationService";
import { GitMerge, Download } from "lucide-react";
import { AggregatedAttribute, Project } from "../types/business-rules.types.ts";
import { AggregationTabProps } from "../types/business-rules.types";

const ITEMS_PER_PAGE = 10;
export default function AggregationTab({
  projectId,
  initialFilter = "all",
}: AggregationTabProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [useCases, setUseCases] = useState<string[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || "");
  const [selectedUseCase, setSelectedUseCase] = useState("");
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(
    null,
  );
  const [expandedProjectProducts, setExpandedProjectProducts] = useState<
    Product[]
  >([]);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(
    new Set(),
  );
  const [downloading, setDownloading] = useState(false);
  const [selectedLLM, setSelectedLLM] = useState<string>("openai");
  const [llmOptions] = useState([
    { value: "openai", label: "OpenAI" },
    { value: "gemini", label: "Google Gemini" },
  ]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [aggregatingProjects, setAggregatingProjects] = useState<Set<string>>(
    new Set(),
  );
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(
    new Set(),
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [pollingProductIds, setPollingProductIds] = useState<Set<string>>(
    new Set(),
  );
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [attributes, setAttributes] = useState<AggregatedAttribute[]>([]);
  const [attributesLoading, setAttributesLoading] = useState(false);

  const filteredProjects = useMemo(() => {
    let filtered = projects;
    if (selectedUseCase) {
      filtered = filtered.filter((p) => p.use_case === selectedUseCase);
    }
    if (selectedProjectId) {
      filtered = filtered.filter((p) => p.id === selectedProjectId);
    }
    return filtered;
  }, [projects, selectedUseCase, selectedProjectId]);
  useEffect(() => {
    if (selectedProjectId && projects.length > 0) {
      const project = projects.find((p) => p.id === selectedProjectId);
      if (project && project.use_case) {
        setSelectedUseCase(project.use_case);
      }
    }
  }, [selectedProjectId, projects]);
  const expandedStats = useMemo(
    () => ({
      success: expandedProjectProducts.filter(
        (p) => p.enrichment_status === "completed",
      ).length,
      failed: expandedProjectProducts.filter(
        (p) => p.enrichment_status === "failed",
      ).length,
      pending: expandedProjectProducts.filter(
        (p) => p.enrichment_status === "pending",
      ).length,
    }),
    [expandedProjectProducts],
  );
  const pollProjectStatuses = useCallback(async () => {
    if (aggregatingProjects.size === 0) return;
    const newAggregatingProjects = new Set(aggregatingProjects);
    const completedProjects: string[] = [];
    for (const projectId of aggregatingProjects) {
      try {
        const job =
          await aggregationService.getProjectAggregationStatus(projectId);
        console.log(`Polling status for project ${projectId}:`, job.status);
        if (job.status === "completed" || job.status === "failed") {
          newAggregatingProjects.delete(projectId);
          completedProjects.push(projectId);
          const projectName =
            projects.find((p) => p.id === projectId)?.name || projectId;
          if (job.status === "completed") {
            notify.success(`Aggregation completed for "${projectName}"`);
          } else {
            notify.error(`Aggregation failed for "${projectName}"`);
          }
        }
      } catch (error) {
        console.error(`Failed to poll project ${projectId}:`, error);
      }
    }
    if (completedProjects.length > 0) {
      setAggregatingProjects(newAggregatingProjects);
      if (expandedProjectId && completedProjects.includes(expandedProjectId)) {
        try {
          const fresh =
            await productService.getProductsByProject(expandedProjectId);
          setExpandedProjectProducts(fresh);
        } catch (error) {
          console.error("Failed to refresh expanded project:", error);
        }
      }
    }
  }, [aggregatingProjects, expandedProjectId, projects]);
  useEffect(() => {
    if (aggregatingProjects.size > 0) {
      const interval = setInterval(pollProjectStatuses, 3000);
      return () => clearInterval(interval);
    }
  }, [aggregatingProjects, pollProjectStatuses]);
  const filteredExpandedProducts = useMemo(() => {
    let filtered = [...expandedProjectProducts];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          p.product_name?.toLowerCase().includes(query) ||
          p.product_code?.toLowerCase().includes(query) ||
          p.sku?.toLowerCase().includes(query) ||
          p.brand_name?.toLowerCase().includes(query) ||
          p.mpn?.toLowerCase().includes(query),
      );
    }
    if (statusFilter.size > 0) {
      filtered = filtered.filter((p) => statusFilter.has(p.enrichment_status));
    }
    if (categoryFilter) {
      filtered = filtered.filter((p) => p.category_1 === categoryFilter);
    }
    if (brandFilter) {
      filtered = filtered.filter((p) => p.brand_name === brandFilter);
    }
    return filtered;
  }, [
    expandedProjectProducts,
    searchQuery,
    statusFilter,
    categoryFilter,
    brandFilter,
  ]);
  const totalPages = Math.ceil(
    filteredExpandedProducts.length / ITEMS_PER_PAGE,
  );
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProducts = filteredExpandedProducts.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );
  const loadProjects = useCallback(async () => {
  setProjectsLoading(true);
  try {
    const data = await projectService.getAllProjects();
    setProjects(data);
    
    const aggregationData = data.filter((p: Project) => p.operation_mode === 'aggregation');
    const uniqueUseCases = [
      ...new Set(
        aggregationData.map((p: Project) => p.use_case).filter(Boolean) as string[],
      ),
    ];
    setUseCases(uniqueUseCases);
  } catch (error) {
    console.error("Failed to load projects:", error);
    notify.error("Failed to load projects");
  } finally {
    setProjectsLoading(false);
  }
}, []);
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);
  const resetFilters = useCallback(() => {
    setSearchQuery("");
    setStatusFilter(new Set());
    setCategoryFilter("");
    setBrandFilter("");
    setSelectedUseCase("");
    setSelectedProjectId("");
    setCurrentPage(1);
  }, []);
  const toggleExpandProject = useCallback(
    async (projectId: string) => {
      if (expandedProjectId === projectId) {
        setExpandedProjectId(null);
        setExpandedProjectProducts([]);
        setCurrentPage(1);
        resetFilters();
        return;
      }
      setExpandedProjectId(projectId);
      setExpandedLoading(true);
      try {
        const data = await productService.getProductsByProject(projectId);
        setExpandedProjectProducts(data);
        setCurrentPage(1);
        resetFilters();
        const processingProductIds = data
          .filter((p) => p.enrichment_status === "processing")
          .map((p) => p.id);
        if (processingProductIds.length > 0) {
          setPollingProductIds((prev) => {
            const newSet = new Set(prev);
            processingProductIds.forEach((id) => newSet.add(id));
            return newSet;
          });
        }
      } catch (error) {
        console.error("Failed to load products for project", projectId, error);
        notify.error("Failed to load products");
      } finally {
        setExpandedLoading(false);
        setSelectedProductIds(new Set());
      }
    },
    [expandedProjectId, resetFilters],
  );
  const toggleStatusFilter = (status: "completed" | "failed" | "pending") => {
    setStatusFilter((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(status)) newSet.delete(status);
      else newSet.add(status);
      return newSet;
    });
    setCurrentPage(1);
  };
  const canDownloadSelected = useMemo(() => {
    const downloadableStatuses = new Set(["completed", "failed"]);

    const productOk =
      selectedProductIds.size > 0 &&
      expandedProjectProducts.some(
        (p) =>
          selectedProductIds.has(p.id) &&
          downloadableStatuses.has(p.enrichment_status),
      );

    const projectOk =
      selectedProjectIds.size > 0 &&
      projects.some(
        (pr) =>
          selectedProjectIds.has(pr.id) &&
          downloadableStatuses.has(pr.aggregation_status ?? ""),
      );

    return productOk || projectOk;
  }, [
    selectedProductIds,
    expandedProjectProducts,
    selectedProjectIds,
    projects,
  ]);
  const isExpandedProjectSelected = expandedProjectId
    ? selectedProjectIds.has(expandedProjectId)
    : false;

  const handleAggregate = useCallback(
    async (productId: string) => {
      try {
        setExpandedProjectProducts((prev) =>
          prev.map((p) =>
            p.id === productId ? { ...p, enrichment_status: "processing" } : p,
          ),
        );
        await aggregationService.aggregateProduct(productId, selectedLLM);
        setPollingProductIds((prev) => new Set(prev).add(productId));
        notify.success("Aggregation started");
      } catch (error: any) {
        console.error("Aggregation failed:", error);
        const errorMessage =
          error.response?.data?.detail || error.message || "Aggregation failed";
        notify.error("Aggregation Failed", errorMessage);
        setPollingProductIds((prev) => {
          const updated = new Set(prev);
          updated.delete(productId);
          return updated;
        });
        setExpandedProjectProducts((prev) =>
          prev.map((p) =>
            p.id === productId ? { ...p, enrichment_status: "failed" } : p,
          ),
        );
      }
    },
    [selectedLLM],
  );
  const handleAggregateAllInExpanded = useCallback(async () => {
    if (!expandedProjectId) return;
    const pending = expandedProjectProducts.filter(
      (p) => p.enrichment_status === "pending",
    );
    if (pending.length === 0) {
      notify.info("No pending products in this project");
      return;
    }
    setLoading(true);
    try {
      await Promise.allSettled(
        pending.map((p) =>
          aggregationService.aggregateProduct(p.id, selectedLLM),
        ),
      );
      const newPollingIds = pending.map((p) => p.id);
      setPollingProductIds((prev) => {
        const updated = new Set(prev);
        newPollingIds.forEach((id) => updated.add(id));
        return updated;
      });
      setExpandedProjectProducts((prev) =>
        prev.map((p) =>
          pending.some((pp) => pp.id === p.id)
            ? { ...p, enrichment_status: "processing" }
            : p,
        ),
      );
      notify.success(`Aggregation started for ${pending.length} products`);
    } catch (error) {
      console.error("Batch aggregation failed", error);
      notify.error("Batch aggregation failed");
    } finally {
      setLoading(false);
    }
  }, [expandedProjectId, expandedProjectProducts, selectedLLM]);
  const handleAggregateSelectedProjects = useCallback(async () => {
    if (selectedProjectIds.size === 0) return;
    const projectIdsToAggregate = Array.from(selectedProjectIds);
    setLoading(true);
    let successCount = 0;
    const batchSize = 3;
    try {
      for (let i = 0; i < projectIdsToAggregate.length; i += batchSize) {
        const batch = projectIdsToAggregate.slice(i, i + batchSize);
        const promises = batch.map((projectId) =>
          aggregationService
            .aggregateProject(projectId, selectedLLM)
            .then((result) => ({
              status: "fulfilled" as const,
              projectId,
              result,
            }))
            .catch((error) => ({
              status: "rejected" as const,
              projectId,
              error,
            })),
        );
        const results = await Promise.all(promises);
        for (const result of results) {
          if (result.status === "fulfilled") {
            successCount++;
            setAggregatingProjects((prev) =>
              new Set(prev).add(result.projectId),
            );
          } else {
            notify.error(`Failed to start aggregation for project`);
          }
        }
        if (i + batchSize < projectIdsToAggregate.length) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
      if (
        expandedProjectId &&
        projectIdsToAggregate.includes(expandedProjectId)
      ) {
        const freshData =
          await productService.getProductsByProject(expandedProjectId);
        setExpandedProjectProducts(freshData);
        const processingIds = freshData
          .filter((p) => p.enrichment_status === "processing")
          .map((p) => p.id);
        if (processingIds.length > 0) {
          setPollingProductIds((prev) => {
            const newSet = new Set(prev);
            processingIds.forEach((id) => newSet.add(id));
            return newSet;
          });
        }
      }
      if (successCount > 0) {
        notify.success(`Aggregation started for ${successCount} project(s)`);
      }
    } catch (error) {
      console.error("Failed to aggregate:", error);
      notify.error("Aggregation failed");
    } finally {
      setLoading(false);
      setSelectedProjectIds(new Set());
    }
  }, [selectedProjectIds, expandedProjectId, selectedLLM]);
  const pollProductStatuses = useCallback(async () => {
    if (pollingProductIds.size === 0 || !expandedProjectId) return;
    try {
      const data = await productService.getProductsByProject(expandedProjectId);
      const completedOrFailed: string[] = [];
      pollingProductIds.forEach((productId) => {
        const updatedProduct = data.find((p) => p.id === productId);
        if (
          updatedProduct &&
          (updatedProduct.enrichment_status === "completed" ||
            updatedProduct.enrichment_status === "failed")
        ) {
          completedOrFailed.push(productId);
          if (updatedProduct.enrichment_status === "completed") {
            notify.success("Aggregation Complete", updatedProduct.product_name);
          } else {
            notify.error("Aggregation Failed", updatedProduct.product_name);
          }
        }
      });
      setExpandedProjectProducts(data);
      if (completedOrFailed.length > 0) {
        setPollingProductIds((prev) => {
          const updated = new Set(prev);
          completedOrFailed.forEach((id) => updated.delete(id));
          return updated;
        });
      }
      if (selectedProduct && completedOrFailed.includes(selectedProduct)) {
        await loadAttributes(selectedProduct);
      }
    } catch (error) {
      console.error("Polling error:", error);
    }
  }, [pollingProductIds, expandedProjectId, selectedProduct]);
  const handleDownloadSelected = useCallback(async () => {
    const selectedProjects = Array.from(selectedProjectIds);
    const selectedProducts = Array.from(selectedProductIds);
    if (selectedProjects.length === 0 && selectedProducts.length === 0) {
      notify.info("No projects or products selected");
      return;
    }
    setDownloading(true);
    try {
      const blob = await aggregationService.exportSelectedItems(
        selectedProjects,
        selectedProducts,
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `selected_export.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      notify.success("Export started");
    } catch (error) {
      console.error("Export failed:", error);
      notify.error("Export failed");
    } finally {
      setDownloading(false);
    }
  }, [selectedProjectIds, selectedProductIds]);
  useEffect(() => {
    if (pollingProductIds.size > 0 && expandedProjectId) {
      pollingIntervalRef.current = setInterval(pollProductStatuses, 3000);
    } else {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [pollingProductIds.size, expandedProjectId, pollProductStatuses]);
  const loadAttributes = useCallback(async (productId: string) => {
    try {
      setAttributesLoading(true);
      const data = await aggregationService.getAggregatedAttributes(productId);
      setAttributes(data);
    } catch (error) {
      console.error("Failed to load attributes:", error);
      notify.error("Failed to load attributes");
    } finally {
      setAttributesLoading(false);
    }
  }, []);
  useEffect(() => {
    if (selectedProduct) {
      loadAttributes(selectedProduct);
      setIsDrawerOpen(true);
    } else {
      setIsDrawerOpen(false);
    }
  }, [selectedProduct, loadAttributes]);
  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedProduct(null), 300);
  };
  const toggleSelectAllProjects = useCallback(() => {
    setSelectedProjectIds((prev) =>
      prev.size === filteredProjects.length
        ? new Set()
        : new Set(filteredProjects.map((p) => p.id)),
    );
  }, [filteredProjects]);
  const toggleProjectSelection = useCallback(
    (projectId: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      setSelectedProjectIds((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(projectId)) {
          newSet.delete(projectId);
        } else {
          newSet.add(projectId);
          if (expandedProjectId === projectId) {
            setSelectedProductIds(new Set());
          }
        }
        return newSet;
      });
    },
    [expandedProjectId],
  );
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3 h-3" /> Failed
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Loader2 className="w-3 h-3 animate-spin" /> Processing
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };
  const safeParseValue = (value: any): any => {
    if (typeof value !== "string") return value;
    const str = value.trim();
    if (
      (str.startsWith("{") && str.endsWith("}")) ||
      (str.startsWith("[") && str.endsWith("]"))
    ) {
      try {
        return JSON.parse(str);
      } catch {
        try {
          const pythonLikeStr = str
            .replace(/'/g, '"')
            .replace(/None/g, "null")
            .replace(/True/g, "true")
            .replace(/False/g, "false");
          return JSON.parse(pythonLikeStr);
        } catch (e) {
          return str;
        }
      }
    }
    return str;
  };
  const formatValue = (value: any): JSX.Element | string => {
    if (value === null || value === undefined || value === "") {
      return <span className="text-slate-400">-</span>;
    }
    let parsedValue = safeParseValue(value);
    while (typeof parsedValue === "string" && parsedValue !== value) {
      value = parsedValue;
      parsedValue = safeParseValue(value);
    }
    if (typeof parsedValue === "object" && parsedValue !== null) {
      if (Array.isArray(parsedValue)) {
        if (parsedValue.length === 0)
          return <span className="text-slate-400">-</span>;
        return parsedValue.join(", ");
      } else {
        if ("standard_value" in parsedValue || "value" in parsedValue) {
          const displayValue = parsedValue.standard_value ?? parsedValue.value;
          const uom = parsedValue.uom ?? parsedValue.unit;
          return (
            <span>
              {String(displayValue)}
              {uom && <span className="ml-1 text-slate-500">{uom}</span>}
            </span>
          );
        }
        return JSON.stringify(parsedValue);
      }
    }
    return String(parsedValue);
  };
  const selectedProductData = expandedProjectProducts.find(
    (p) => p.id === selectedProduct,
  );
  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-900 mb-1">
              Data Aggregation
            </h3>
            <p className="text-sm text-slate-600">
              Select projects to manage aggregation
            </p>
          </div>

          <div
            className={`flex items-center gap-3 transition-all duration-200 ${
              expandedProjectId ? "mr-[380px]" : ""
            }`}
          >
            {(selectedProjectIds.size > 0 || selectedProductIds.size > 0) && (
              <button
                onClick={handleDownloadSelected}
                disabled={downloading || !canDownloadSelected}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
              >
                {downloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Download Selected
              </button>
            )}
            {selectedProjectIds.size > 0 && (
              <button
                onClick={handleAggregateSelectedProjects}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Aggregate {selectedProjectIds.size} Projects
              </button>
            )}
          </div>
        </div>

        {/* Stats card — absolutely positioned, never affects layout */}
        <div
          className={`absolute right-0 top-1/2 -translate-y-1/2 w-[360px] z-10 transition-all duration-200 ${
            expandedProjectId
              ? "opacity-100 translate-x-0"
              : "opacity-0 translate-x-4 pointer-events-none"
          }`}
        >
          <div className="bg-white border border-slate-200 rounded-[12px] p-2 shadow-xs mt-11">
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <div className="flex flex-col gap-0.5">
                <h4 className="text-sm font-semibold text-slate-900 truncate max-w-[120px]">
                  {projects.find((p) => p.id === expandedProjectId)?.name ||
                    "Project"}
                </h4>
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full w-fit">
                  <Clock className="w-2.5 h-2.5" />
                  <span className="text-xs font-medium">Active</span>
                </div>
              </div>
              <div className="w-[60px] ml-auto">
                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{
                      width: `${(expandedStats.success / (expandedProjectProducts.length || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => toggleStatusFilter("completed")}
                className={`flex-1 flex flex-col items-center justify-center p-1 rounded-md border transition-colors ${
                  statusFilter.has("completed")
                    ? "bg-emerald-100 border-emerald-300"
                    : "bg-emerald-50/50 border-emerald-100 hover:bg-emerald-100"
                }`}
              >
                <span className="text-sm font-bold text-emerald-600">
                  {expandedStats.success}
                </span>
                <span className="text-[10px] font-medium text-emerald-700">
                  Completed
                </span>
              </button>
              <button
                onClick={() => toggleStatusFilter("failed")}
                className={`flex-1 flex flex-col items-center justify-center p-1 rounded-md border transition-colors ${
                  statusFilter.has("failed")
                    ? "bg-rose-100 border-rose-300"
                    : "bg-rose-50/50 border-rose-100 hover:bg-rose-100"
                }`}
              >
                <span className="text-sm font-bold text-rose-600">
                  {expandedStats.failed}
                </span>
                <span className="text-[10px] font-medium text-rose-700">
                  Failed
                </span>
              </button>
              <button
                onClick={() => toggleStatusFilter("pending")}
                className={`flex-1 flex flex-col items-center justify-center p-1 rounded-md border transition-colors ${
                  statusFilter.has("pending")
                    ? "bg-amber-100 border-amber-300"
                    : "bg-amber-50/50 border-amber-100 hover:bg-amber-100"
                }`}
              >
                <span className="text-sm font-bold text-amber-500">
                  {expandedStats.pending}
                </span>
                <span className="text-[10px] font-medium text-amber-600">
                  Pending
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="pt-16">
        <div className="flex items-center gap-2 flex-wrap w-full">
          <select
            value={selectedLLM}
            onChange={(e) => setSelectedLLM(e.target.value)}
            disabled={
              projectsLoading ||
              (selectedProjectIds.size === 0 &&
                selectedProductIds.size === 0 &&
                (!expandedProjectId ||
                  expandedProjectProducts.filter(
                    (p) => p.enrichment_status === "pending",
                  ).length === 0))
            }
            className="flex-1 min-w-[180px] px-4 py-2 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {llmOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={selectedUseCase}
            onChange={(e) => {
              setSelectedUseCase(e.target.value);
              setSelectedProjectId("");
              setExpandedProjectId(null);
              setExpandedProjectProducts([]);
            }}
            disabled={projectsLoading}
            className="flex-1 min-w-[180px] px-4 py-2 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">All Use Cases</option>
            {useCases.map((useCase) => (
              <option key={useCase} value={useCase}>
                {useCase}
              </option>
            ))}
          </select>

          <select
            value={selectedProjectId}
            onChange={(e) => {
              setSelectedProjectId(e.target.value);
            }}
            disabled={
              projectsLoading ||
              (!!selectedUseCase && filteredProjects.length === 0)
            }
            className="flex-1 min-w-[180px] px-4 py-2 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">All Projects</option>
            {(selectedUseCase
              ? projects.filter((p) => p.use_case === selectedUseCase)
              : projects
            ).map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          <select
            value={
              statusFilter.size === 1 ? Array.from(statusFilter)[0] : "all"
            }
            disabled={!expandedProjectId}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "all") setStatusFilter(new Set());
              else setStatusFilter(new Set([val]));
              setCurrentPage(1);
            }}
            className="flex-1 min-w-[180px] px-4 py-2 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            disabled={
              !expandedProjectId ||
              [
                ...new Set(
                  expandedProjectProducts
                    .map((p) => p.category_1)
                    .filter(Boolean),
                ),
              ].length === 0
            }
            className="flex-1 min-w-[180px] px-4 py-2 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">All Categories</option>
            {[
              ...new Set(
                expandedProjectProducts
                  .map((p) => p.category_1)
                  .filter(Boolean),
              ),
            ].map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={brandFilter}
            onChange={(e) => {
              setBrandFilter(e.target.value);
              setCurrentPage(1);
            }}
            disabled={
              !expandedProjectId ||
              [
                ...new Set(
                  expandedProjectProducts
                    .map((p) => p.brand_name)
                    .filter(Boolean),
                ),
              ].length === 0
            }
            className="flex-1 min-w-[180px] px-4 py-2 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">All Brands</option>
            {[
              ...new Set(
                expandedProjectProducts
                  .map((p) => p.brand_name)
                  .filter(Boolean),
              ),
            ].map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>

          {(statusFilter.size > 0 ||
            categoryFilter ||
            brandFilter ||
            selectedUseCase ||
            selectedProjectId ||
            searchQuery) && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-md bg-white text-sm hover:bg-slate-50 transition-colors"
            >
              <X className="w-4 h-4" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-lg">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={
                filteredProjects.length > 0 &&
                selectedProjectIds.size === filteredProjects.length
              }
              onChange={toggleSelectAllProjects}
              className="rounded border-slate-300"
            />
            <span className="text-sm font-semibold text-slate-900">
              {filteredProjects.length} Projects
            </span>
            {selectedProjectIds.size > 0 && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                {selectedProjectIds.size} selected
              </span>
            )}
          </div>
        </div>
        <div className="divide-y divide-slate-200">
          {filteredProjects.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No projects found
            </div>
          ) : (
            filteredProjects.map((project) => (
              <div key={project.id}>
                <div
                  className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                    expandedProjectId === project.id ? "bg-blue-50" : ""
                  } ${selectedProjectIds.has(project.id) ? "bg-blue-50/50" : ""} ${
                    aggregatingProjects.has(project.id) ? "bg-blue-50/30" : ""
                  }`}
                  onClick={() => toggleExpandProject(project.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedProjectIds.has(project.id)}
                    onChange={(e) =>
                      toggleProjectSelection(project.id, e as any)
                    }
                    onClick={(e) => e.stopPropagation()}
                    className="rounded border-slate-300"
                    disabled={aggregatingProjects.has(project.id)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-900">
                        {project.name}
                      </h4>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                        {project.product_count ?? 0} products
                      </span>
                      {project.use_case && (
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded-full">
                          {project.use_case}
                        </span>
                      )}
                      {aggregatingProjects.has(project.id) && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Aggregating...
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {aggregatingProjects.has(project.id) ? (
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    ) : expandedProjectId === project.id ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>
                {expandedProjectId === project.id && (
                  <div className="border-t border-slate-200">
                    <div className="p-4 border-b border-slate-200 flex items-center justify-end gap-3">
                      {!(
                        statusFilter.size === 1 && statusFilter.has("completed")
                      ) && (
                        <button
                          onClick={handleAggregateAllInExpanded}
                          disabled={
                            loading ||
                            expandedStats.pending === 0 ||
                            aggregatingProjects.has(project.id)
                          }
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                        >
                          {loading || aggregatingProjects.has(project.id) ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                          {aggregatingProjects.has(project.id)
                            ? "Aggregating..."
                            : "Aggregate All"}
                        </button>
                      )}
                    </div>
                    <div className="overflow-x-auto max-h-[600px]">
                      <table className="w-full border-separate border-spacing-0">
                        <thead className="bg-white sticky top-0 z-20 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 bg-slate-50 first:rounded-tl-lg">
                              {!isExpandedProjectSelected && (
                                <input
                                  type="checkbox"
                                  checked={
                                    paginatedProducts.length > 0 &&
                                    paginatedProducts.every((p) =>
                                      selectedProductIds.has(p.id),
                                    )
                                  }
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedProductIds(
                                        (prev) =>
                                          new Set([
                                            ...prev,
                                            ...paginatedProducts.map(
                                              (p) => p.id,
                                            ),
                                          ]),
                                      );
                                    } else {
                                      setSelectedProductIds((prev) => {
                                        const newSet = new Set(prev);
                                        paginatedProducts.forEach((p) =>
                                          newSet.delete(p.id),
                                        );
                                        return newSet;
                                      });
                                    }
                                  }}
                                  className="rounded border-slate-300"
                                />
                              )}
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 bg-slate-50">
                              Product Info
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 bg-slate-50">
                              Import Source
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 bg-slate-50">
                              Completeness
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 bg-slate-50">
                              Status
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 bg-slate-50 last:rounded-tr-lg">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {expandedLoading ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-8 text-center">
                                <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
                              </td>
                            </tr>
                          ) : paginatedProducts.length === 0 ? (
                            <tr>
                              <td
                                colSpan={6}
                                className="px-4 py-8 text-center text-slate-500"
                              >
                                No products found
                              </td>
                            </tr>
                          ) : (
                            paginatedProducts.map((product) => (
                              <tr
                                key={product.id}
                                onClick={() => setSelectedProduct(product.id)}
                                className={`hover:bg-slate-50 cursor-pointer ${
                                  selectedProduct === product.id
                                    ? "bg-blue-100"
                                    : ""
                                }`}
                              >
                                <td className="px-4 py-3"></td>
                                <td
                                  className="px-4 py-3"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {!isExpandedProjectSelected && (
                                    <input
                                      type="checkbox"
                                      checked={selectedProductIds.has(
                                        product.id,
                                      )}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedProductIds((prev) =>
                                            new Set(prev).add(product.id),
                                          );
                                        } else {
                                          setSelectedProductIds((prev) => {
                                            const newSet = new Set(prev);
                                            newSet.delete(product.id);
                                            return newSet;
                                          });
                                        }
                                      }}
                                      className="rounded border-slate-300"
                                    />
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <div>
                                    <div className="font-semibold text-slate-900 text-sm">
                                      {product.product_name ||
                                        product.product_code ||
                                        "N/A"}
                                    </div>
                                    <div className="text-xs text-slate-500 font-mono">
                                      {product.product_code ||
                                        product.sku ||
                                        "No SKU"}
                                    </div>
                                    {product.brand_name && (
                                      <div className="text-xs text-slate-400">
                                        {product.brand_name}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                    <span
                                      className="text-xs truncate max-w-[150px]"
                                      title={
                                        product.source_url || "Unknown source"
                                      }
                                    >
                                      {product.source_url
                                        ? product.source_url.replace(
                                            /^Manual_\d+_/,
                                            "",
                                          )
                                        : "Manual Entry"}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden max-w-[120px]">
                                      <div
                                        className={`h-full rounded-full ${
                                          (product.completeness_score || 0) > 80
                                            ? "bg-green-500"
                                            : (product.completeness_score ||
                                                  0) > 50
                                              ? "bg-amber-500"
                                              : "bg-red-400"
                                        }`}
                                        style={{
                                          width: `${product.completeness_score || 10}%`,
                                        }}
                                      />
                                    </div>
                                    <span className="text-xs text-slate-600">
                                      {product.completeness_score || 10}%
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  {getStatusBadge(
                                    product.enrichment_status || "pending",
                                  )}
                                </td>
                                <td
                                  className="px-4 py-3"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {product.enrichment_status !==
                                    "processing" && (
                                    <button
                                      onClick={() =>
                                        handleAggregate(product.id)
                                      }
                                      disabled={
                                        loading ||
                                        product.enrichment_status ===
                                          "processing" ||
                                        aggregatingProjects.has(project.id)
                                      }
                                      className="text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50 hover:underline"
                                    >
                                      {product.enrichment_status === "completed"
                                        ? "Re-run"
                                        : "Run"}
                                    </button>
                                  )}
                                  {product.enrichment_status ===
                                    "processing" && (
                                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    {filteredExpandedProducts.length > 0 && (
                      <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
                        <span>
                          Showing {startIndex + 1} -{" "}
                          {Math.min(
                            startIndex + ITEMS_PER_PAGE,
                            filteredExpandedProducts.length,
                          )}{" "}
                          of {filteredExpandedProducts.length} products
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setCurrentPage(Math.max(1, currentPage - 1))
                            }
                            disabled={currentPage === 1}
                            className="p-1 hover:bg-slate-100 rounded disabled:opacity-50"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span>
                            Page {currentPage} / {totalPages || 1}
                          </span>
                          <button
                            onClick={() =>
                              setCurrentPage(
                                Math.min(totalPages, currentPage + 1),
                              )
                            }
                            disabled={
                              currentPage === totalPages || totalPages === 0
                            }
                            className="p-1 hover:bg-slate-100 rounded disabled:opacity-50"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      {isDrawerOpen && selectedProductData && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
            onClick={closeDrawer}
          />
          <div className="relative w-full max-w-2xl bg-white shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 leading-tight">
                  {selectedProductData.product_name}
                </h2>
                <div className="flex items-center gap-3 mt-1 text-sm text-slate-600">
                  <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    {selectedProductData.product_code}
                  </span>
                  <span>{selectedProductData.brand_name}</span>
                </div>
              </div>
              <button
                onClick={closeDrawer}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <div className="flex-1">
                  <p className="text-xs text-blue-600 uppercase font-bold tracking-wider mb-1">
                    Data Completeness
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-blue-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full"
                        style={{
                          width: `${selectedProductData.completeness_score}%`,
                        }}
                      />
                    </div>
                    <span className="font-bold text-blue-700">
                      {selectedProductData.completeness_score}%
                    </span>
                  </div>
                </div>
                <div className="px-4 border-l border-blue-200">
                  <p className="text-xs text-blue-600 uppercase font-bold tracking-wider mb-1">
                    Status
                  </p>
                  {getStatusBadge(
                    selectedProductData.enrichment_status || "pending",
                  )}
                </div>
              </div>
              {attributesLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin mb-2 text-blue-500" />
                  <p>Loading attributes...</p>
                </div>
              ) : selectedProductData.enrichment_status === "processing" ? (
                <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900">
                      Aggregation In Progress
                    </p>
                    <p className="text-xs text-blue-700">
                      Please wait while the aggregation is done
                    </p>
                  </div>
                </div>
              ) : attributes.length === 0 ? (
                <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                  <GitMerge className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p>No attributes found for this product.</p>
                  <button
                    onClick={() => handleAggregate(selectedProductData.id)}
                    className="mt-3 text-blue-600 hover:underline text-sm font-medium"
                  >
                    Run Aggregation Now
                  </button>
                </div>
              ) : (
                <>
                  {selectedProductData.image_url_1 && (
                    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm aspect-video flex items-center justify-center p-4">
                      <img
                        src={selectedProductData.image_url_1}
                        alt={selectedProductData.product_name}
                        className="max-h-full max-w-full object-contain"
                        onError={(e) =>
                          (e.currentTarget.style.display = "none")
                        }
                      />
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                      <Box className="w-4 h-4" /> Specifications
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {attributes.map((attr) => (
                        <div
                          key={attr.id}
                          className="p-3 bg-slate-50 rounded border border-slate-100 hover:shadow-sm transition-shadow"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-semibold text-slate-500 uppercase truncate">
                              {attr.attribute_name}
                            </span>
                            {attr.has_conflict && (
                              <AlertTriangle
                                className="w-3 h-3 text-amber-500"
                                title="Source Conflict"
                              />
                            )}
                          </div>
                          <div className="text-sm text-slate-900 font-medium">
                            {formatValue(attr.values[0]?.value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                      <List className="w-4 h-4" /> Technical Data Source
                    </h3>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase">
                          <tr>
                            <th className="px-4 py-2 font-semibold text-left">
                              Attribute
                            </th>
                            <th className="px-4 py-2 font-semibold text-left">
                              Value
                            </th>
                            <th className="px-4 py-2 font-semibold text-right">
                              Confidence
                            </th>
                            <th className="px-4 py-2 font-semibold text-right">
                              Source
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {attributes.map((attr) => (
                            <tr key={attr.id} className="hover:bg-slate-50">
                              <td className="px-4 py-2 font-medium text-slate-700">
                                {attr.attribute_name}
                              </td>
                              <td className="px-4 py-2 text-slate-600 max-w-[200px] truncate">
                                {formatValue(attr.values[0]?.value)}
                              </td>
                              <td className="px-4 py-2 text-right">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                    attr.values[0]?.confidence > 0.8
                                      ? "bg-green-100 text-green-700"
                                      : "bg-yellow-100 text-yellow-700"
                                  }`}
                                >
                                  {(attr.values[0]?.confidence * 100).toFixed(
                                    0,
                                  )}
                                  %
                                </span>
                              </td>
                              <td className="px-4 py-2 text-right font-mono text-xs text-slate-400">
                                {attr.values[0]?.source_id?.slice(0, 8)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
              <span className="text-xs text-slate-500">
                Last updated: {new Date().toLocaleDateString()}
              </span>
              <button
                onClick={() => handleAggregate(selectedProductData.id)}
                disabled={
                  selectedProductData.enrichment_status === "processing"
                }
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {selectedProductData.enrichment_status === "processing" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                  </>
                ) : selectedProductData.enrichment_status === "pending" ? (
                  <>
                    <Play className="w-4 h-4" /> Start Aggregation
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" /> Re-Aggregate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
