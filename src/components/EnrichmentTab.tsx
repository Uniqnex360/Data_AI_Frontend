import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  AlertTriangle,
  Box,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Download,
  FileText,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  Target,
  X,
} from "lucide-react";
import { productService } from "../services/productService";
import { projectService } from "../services/projectService";
import { enrichmentService } from "../services/enrichmentService";
import { notify } from "../lib/notifications";
import type { Product, Enrichment } from "../types/database.types";
import type {
  AggregatedAttribute,
  Project,
} from "../types/business-rules.types.ts";
import {
  getProductStatusBadge,
  getStatusBadge,
} from "../utils/projectStatusColorizer";
import { useProjectFilters } from "../hooks/useProjectFilters.ts";
import { aggregationService } from "../services/aggregationService";
import { formatValue } from "../utils/valueParser.tsx";
import { useProductMovement } from "../hooks/useProductMovement.ts";

const ITEMS_PER_PAGE = 10;

export default function EnrichmentTab() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedUseCase, setSelectedUseCase] = useState("");
  const [useCases, setUseCases] = useState<string[]>([]);

  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(
    null,
  );
  const [expandedProjectProducts, setExpandedProjectProducts] = useState<
    Product[]
  >([]);
  const [expandedLoading, setExpandedLoading] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [attributes, setAttributes] = useState<AggregatedAttribute[]>([]);
  const [attributesLoading, setAttributesLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const [categoryFilter, setCategoryFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(
    new Set(),
  );
  const [downloading, setDownloading] = useState(false);
  const [enrichingProjects, setEnrichingProjects] = useState<Set<string>>(
    new Set(),
  );
  const [pollingProductIds, setPollingProductIds] = useState<Set<string>>(
    new Set(),
  );
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [selectedLLM, setSelectedLLM] = useState<string>("openai");
  const [llmOptions] = useState([
    { value: "openai", label: "Datavio Algo-1" },
    { value: "gemini", label: "Datavio Algo-2" },
    { value: "claude", label: "Datavio Algo-3" },
  ]);

  const { availableBrands, availableCategories, loadProjectFilters } =
    useProjectFilters();

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const data = await projectService.getAllProjects({
        operation_mode: "aggregation,pdf_extraction,enrichment",
        tab: "enrichment",
      });
      console.log("loadProjects", data);

      const enrichmentProjects = data.filter(
  (p: Project) => p.operation_mode === "aggregation" || 
                 p.operation_mode === "pdf_extraction" || 
                 p.operation_mode === "enrichment"
);

      setProjects(enrichmentProjects);
      

      const uniqueUseCases = [
      ...new Set(
        enrichmentProjects
          .map((p: Project) => p.use_case)
          .filter(Boolean) as string[],
      ),
    ];
    const sortedUseCases = uniqueUseCases.sort((a, b) => {
      const aIsAggregation = a === "Products with Category Assignments" || a === "Products without Category Assignments";
      const bIsAggregation = b === "Products with Category Assignments" || b === "Products without Category Assignments";
      
      if (aIsAggregation && !bIsAggregation) return -1;
      if (!aIsAggregation && bIsAggregation) return 1;
      return a.localeCompare(b);
    });
      setUseCases(sortedUseCases);
    } catch (error) {
      console.error("Failed to load enrichment projects:", error);
      notify.error("Failed to load enrichment projects");
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const loadDefaultFilters = useCallback(async () => {
    await loadProjectFilters();
  }, [loadProjectFilters]);

  useEffect(() => {
    loadDefaultFilters();
  }, [loadDefaultFilters]);

  useEffect(() => {
    if (selectedProjectId && projects.length > 0) {
      const project = projects.find((p) => p.id === selectedProjectId);
      if (project?.use_case) {
        setSelectedUseCase(project.use_case);
      }
    }
  }, [selectedProjectId, projects]);

  const filteredProjects = useMemo(() => {
    let filtered = projects;

    if (selectedUseCase) {
      filtered = filtered.filter((p) => p.use_case === selectedUseCase);
    }
    if (statusFilter) {
      filtered = filtered.filter((p) => p.source_status === statusFilter);
    }

    if (selectedProjectId) {
      filtered = filtered.filter((p) => p.id === selectedProjectId);
    }

    return filtered;
  }, [projects, selectedUseCase, selectedProjectId, statusFilter]);

  const resetLocalFilters = useCallback(() => {
    setSearchQuery("");
    setStatusFilter("");
    setCategoryFilter("");
    setBrandFilter("");
    setCurrentPage(1);
  }, []);

  const toggleExpandProject = useCallback(
    async (projectId: string) => {
      if (expandedProjectId === projectId) {
        setExpandedProjectId(null);
        setExpandedProjectProducts([]);
        setSelectedProduct(null);
        setAttributes([]);
        setCurrentPage(1);
        setSearchQuery("");
        resetLocalFilters();
        return;
      }

      setExpandedProjectId(projectId);
      setExpandedLoading(true);
      setSelectedProduct(null);
      setAttributes([]);
      setSearchQuery("");
      resetLocalFilters();

      try {
        const data = await productService.getProductsByProject(
          projectId,
          "enrichment",
        );
        setExpandedProjectProducts(data);
        setCurrentPage(1);
        await loadProjectFilters(projectId);

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
        console.error("Failed to load project products:", error);
        notify.error("Failed to load products");
      } finally {
        setExpandedLoading(false);
        setSelectedProductIds(new Set());
      }
    },
    [expandedProjectId, loadProjectFilters, resetLocalFilters],
  );

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

  const loadAttributes = useCallback(async (productId: string) => {
    try {
      setAttributesLoading(true);
      const data = await aggregationService.getAggregatedAttributes(productId);
      setAttributes(data);
    } catch (error) {
      console.error("Failed to load attributes:", error);
      notify.error("Failed to load attributes");
      setAttributes([]);
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
  const { trackProcessingProduct, removeTrackingProduct } = useProductMovement({
    projectId: expandedProjectId,
    currentTab: "enrichment",
    onProductsMoved: useCallback(() => {
      if (expandedProjectId) {
        productService
          .getProductsByProject(expandedProjectId, "enrichment")
          .then(setExpandedProjectProducts)
          .catch(console.error);
      }
    }, [expandedProjectId]),
    enabled: !!expandedProjectId && expandedProjectProducts.length > 0,
  });

  const handleEnrich = async (productId: string) => {
    setLoading(true);
    try {
      setExpandedProjectProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, enrichment_status: "processing" } : p,
        ),
      );
      trackProcessingProduct(productId);
      await aggregationService.aggregateProduct(productId, selectedLLM);
      setPollingProductIds((prev) => new Set(prev).add(productId));
      notify.success("Enrichment started");

      // await loadEnrichment(productId);

      if (expandedProjectId) {
        const fresh = await productService.getProductsByProject(
          expandedProjectId,
          "enrichment",
        );
        setExpandedProjectProducts(fresh);
      }
    } catch (error: any) {
      console.error("Enrichment failed:", error);
      removeTrackingProduct(productId)
      const errorMessage =
        error.response?.data?.detail || error.message || "Enrichment failed";
      notify.error("Enrichment Failed", errorMessage);

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
    } finally {
      setLoading(false);
    }
  };

  const handleEnrichAllInExpanded = useCallback(async () => {
    if (!expandedProjectId) return;

    const selectedPendingProducts = expandedProjectProducts.filter(
      (p) =>
        selectedProductIds.has(p.id) &&
        (p.enrichment_status === "pending" || p.enrichment_status === "failed"),
    );

    const pendingProducts =
      selectedProductIds.size > 0
        ? selectedPendingProducts
        : expandedProjectProducts.filter(
            (p) =>
              p.enrichment_status === "pending" ||
              p.enrichment_status === "failed",
          );

    if (pendingProducts.length === 0) {
      notify.info(
        selectedProductIds.size > 0
          ? "No pending selected products in this project"
          : "No pending products in this project",
      );
      return;
    }

    setLoading(true);
    try {
      pendingProducts.forEach(p=>trackProcessingProduct(p.id))
      await Promise.allSettled(
        pendingProducts.map((p) =>
          aggregationService.aggregateProduct(p.id, selectedLLM),
        ),
      );

      const newPollingIds = pendingProducts.map((p) => p.id);
      setPollingProductIds((prev) => {
        const updated = new Set(prev);
        newPollingIds.forEach((id) => updated.add(id));
        return updated;
      });

      setExpandedProjectProducts((prev) =>
        prev.map((p) =>
          pendingProducts.some((pp) => pp.id === p.id)
            ? { ...p, enrichment_status: "processing" }
            : p,
        ),
      );

      notify.success(
        `Enrichment started for ${pendingProducts.length} product(s)`,
      );
    } catch (error) {
      console.error("Batch enrichment failed", error);
      notify.error("Batch enrichment failed");
      pendingProducts.forEach(p=>removeTrackingProduct(p.id))
    } finally {
      setLoading(false);
    }
  }, [
    expandedProjectId,
    expandedProjectProducts,
    selectedProductIds,
    selectedLLM,
  ]);
  const pollProductStatuses = useCallback(async () => {
  if (pollingProductIds.size === 0 || !expandedProjectId) return;
  try {
    // Fetch from BOTH tabs
    const [enrichmentData, aggregationData] = await Promise.all([
      productService.getProductsByProject(expandedProjectId, 'enrichment'),
      productService.getProductsByProject(expandedProjectId, 'aggregation'),
    ]);
    
    const completedOrFailed: string[] = [];
    
    pollingProductIds.forEach((productId) => {
      // Check if product still in enrichment tab
      const productInEnrichment = enrichmentData.find(p => p.id === productId);
      const productInAggregation = aggregationData.find(p => p.id === productId);
      
      // Case 1: Product moved to Aggregation tab (score >= 90)
      if (!productInEnrichment && productInAggregation) {
        const score = productInAggregation.completeness_score || 0;
        completedOrFailed.push(productId);
        notify.success(
          "Ready for Export",
          `${productInAggregation.product_name || productInAggregation.product_code} has reached ${score}% completeness and is ready in the Aggregation tab.`
        );
      }
      // Case 2: Product completed and still in enrichment (but score >= 90 - should not happen normally)
      else if (productInEnrichment && productInEnrichment.enrichment_status === "completed") {
        const score = productInEnrichment.completeness_score || 0;
        if (score >= 90) {
          completedOrFailed.push(productId);
          notify.success("Enrichment Complete", productInEnrichment.product_name);
        } else {
          completedOrFailed.push(productId);
          notify.info("Enrichment Complete", `${productInEnrichment.product_name} has been processed.`);
        }
      }
      // Case 3: Product failed
      else if (productInEnrichment && productInEnrichment.enrichment_status === "failed") {
        completedOrFailed.push(productId);
        notify.error("Enrichment Failed", productInEnrichment.product_name);
      }
      // Case 4: Still processing - do nothing
    });
    
    // Update current tab view only
    setExpandedProjectProducts(enrichmentData);
    
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
}, [pollingProductIds, expandedProjectId, selectedProduct, loadAttributes]);
  const handleEnrichSelectedProjects = useCallback(async () => {
    if (selectedProjectIds.size === 0) return;
    const projectIdsToEnrich = Array.from(selectedProjectIds);
    setLoading(true);
    let successCount = 0;
    const batchSize = 3;

    try {
      for (let i = 0; i < projectIdsToEnrich.length; i += batchSize) {
        const batch = projectIdsToEnrich.slice(i, i + batchSize);
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
            setEnrichingProjects((prev) => new Set(prev).add(result.projectId));
          } else {
            notify.error(`Failed to start enrichment for project`);
          }
        }

        if (i + batchSize < projectIdsToEnrich.length) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      if (expandedProjectId && projectIdsToEnrich.includes(expandedProjectId)) {
        const freshData = await productService.getProductsByProject(
          expandedProjectId,
          "enrichment",
        );
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
        notify.success(`Enrichment started for ${successCount} project(s)`);
      }
    } catch (error) {
      console.error("Failed to enrich:", error);
      notify.error("Enrichment failed");
    } finally {
      setLoading(false);
      setSelectedProjectIds(new Set());
    }
  }, [selectedProjectIds, expandedProjectId, selectedLLM]);

  const pollProjectStatuses = useCallback(async () => {
    if (enrichingProjects.size === 0) return;
    const newEnrichingProjects = new Set(enrichingProjects);
    const completedProjects: string[] = [];

    for (const projectId of enrichingProjects) {
      try {
        const job =
          await aggregationService.getProjectAggregationStatus(projectId);

        if (job.status === "completed" || job.status === "failed") {
          newEnrichingProjects.delete(projectId);
          completedProjects.push(projectId);
          const projectName =
            projects.find((p) => p.id === projectId)?.name || projectId;
          if (job.status === "completed") {
            notify.success(`Enrichment completed for "${projectName}"`);
          } else {
            notify.error(`Enrichment failed for "${projectName}"`);
          }
        }
      } catch (error) {
        console.error(`Failed to poll project ${projectId}:`, error);
      }
    }

    if (completedProjects.length > 0) {
      setEnrichingProjects(newEnrichingProjects);
      if (expandedProjectId && completedProjects.includes(expandedProjectId)) {
        try {
          const fresh = await productService.getProductsByProject(
            expandedProjectId,
            "enrichment",
          );
          setExpandedProjectProducts(fresh);
        } catch (error) {
          console.error("Failed to refresh expanded project:", error);
        }
      }
    }
  }, [enrichingProjects, expandedProjectId, projects]);

  useEffect(() => {
    if (enrichingProjects.size > 0) {
      const interval = setInterval(pollProjectStatuses, 3000);
      return () => clearInterval(interval);
    }
  }, [enrichingProjects, pollProjectStatuses]);

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

  const toggleStatusFilter = (status: "completed" | "failed" | "pending") => {
    setStatusFilter((prev) => (prev === status ? "" : status));
    setCurrentPage(1);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedProduct(null), 300);
  };

  const resetFilters = useCallback(() => {
    setSearchQuery("");
    setStatusFilter("");
    setCategoryFilter("");
    setBrandFilter("");
    setSelectedUseCase("");
    setSelectedProjectId("");
    setExpandedProjectId(null);
    setExpandedProjectProducts([]);
    setSelectedProduct(null);
    setAttributes([]);
    setCurrentPage(1);
    loadDefaultFilters();
  }, [loadDefaultFilters]);

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

  const canDownloadSelected = useMemo(() => {
    const downloadableStatuses = new Set(["completed", "failed",'pending']);

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
          downloadableStatuses.has(pr.processing_status ?? ""),
      );

    return productOk || projectOk;
  }, [
    selectedProductIds,
    expandedProjectProducts,
    selectedProjectIds,
    projects,
  ]);

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
      a.download = `enrichment_export.xlsx`;
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

  const isExpandedProjectSelected = expandedProjectId
    ? selectedProjectIds.has(expandedProjectId)
    : false;

  const hasProductsInSelectedProjects = useMemo(() => {
    if (selectedProjectIds.size === 0) return false;
    const selectedProjectsList = projects.filter((p) =>
      selectedProjectIds.has(p.id),
    );
    return selectedProjectsList.some((p) => (p.product_count ?? 0) > 0);
  }, [selectedProjectIds, projects]);

  const selectedProductData = expandedProjectProducts.find(
    (p) => p.id === selectedProduct,
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-900 mb-1">
              Product Enrichment
            </h3>
            <p className="text-sm text-slate-600">
              Select projects to manage product enrichment
            </p>
          </div>

          <div
            className={`flex items-center gap-3 transition-all duration-200 ${
              expandedProjectId ? "mr-[600px]" : ""
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
                onClick={handleEnrichSelectedProjects}
                disabled={loading || !hasProductsInSelectedProjects}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Enrich {selectedProjectIds.size} Project
                {selectedProjectIds.size !== 1 ? "s" : ""}
              </button>
            )}
          </div>
        </div>

        <div
          className={`absolute right-0 top-0 w-[420px] z-10 transition-all duration-200 ${
            expandedProjectId
              ? "opacity-100 translate-x-0"
              : "opacity-0 translate-x-4 pointer-events-none"
          }`}
        >
          <div className="bg-white border border-slate-200 rounded-[12px] py-1.5 px-3 shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-slate-900 truncate max-w-[150px]">
                  {projects.find((p) => p.id === expandedProjectId)?.name ||
                    "Project"}
                </h4>
                <div className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full">
                  <Clock className="w-3 h-3" />
                  <span className="text-xs font-medium">Active</span>
                </div>
              </div>

              <div className="w-[100px]">
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        (expandedStats.success /
                          (expandedProjectProducts.length || 1)) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-1.5">
              <button
                onClick={() => toggleStatusFilter("completed")}
                className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md border transition-colors ${
                  statusFilter === "completed"
                    ? "bg-emerald-100 border-emerald-300"
                    : "bg-emerald-50/50 border-emerald-100 hover:bg-emerald-100"
                }`}
              >
                <span className="text-xs font-bold text-emerald-600">
                  {expandedStats.success}
                </span>
                <span className="text-[10px] font-medium text-emerald-700">
                  Completed
                </span>
              </button>

              <button
                onClick={() => toggleStatusFilter("failed")}
                className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md border transition-colors ${
                  statusFilter === "failed"
                    ? "bg-rose-100 border-rose-300"
                    : "bg-rose-50/50 border-rose-100 hover:bg-rose-100"
                }`}
              >
                <span className="text-xs font-bold text-rose-600">
                  {expandedStats.failed}
                </span>
                <span className="text-[10px] font-medium text-rose-700">
                  Failed
                </span>
              </button>

              <button
                onClick={() => toggleStatusFilter("pending")}
                className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md border transition-colors ${
                  statusFilter === "pending"
                    ? "bg-amber-100 border-amber-300"
                    : "bg-amber-50/50 border-amber-100 hover:bg-amber-100"
                }`}
              >
                <span className="text-xs font-bold text-amber-500">
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

      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 flex-1">
            <div>
              <label className="block text-sm text-slate-700 mb-2">
                LLM Provider
              </label>
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
                className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm disabled:opacity-50"
              >
                {llmOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
  <label className="block text-sm text-slate-700 mb-2">
    Use Case
  </label>
  <select
    value={selectedUseCase}
    onChange={(e) => {
      setSelectedUseCase(e.target.value);
      setSelectedProjectId("");
      setExpandedProjectId(null);
      setExpandedProjectProducts([]);
      setSelectedProduct(null);
      setAttributes([]);
    }}
    disabled={projectsLoading}
    className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm"
  >
    <option value="">All Use Case</option>
    {[...new Set(
      projects  
        .filter((p) => !statusFilter || p.source_status === statusFilter)
        .map((p) => p.use_case)
        .filter(Boolean) as string[]
    )].sort((a, b) => {
      const aIsAggregation = a === "Products with Category Assignments" || a === "Products without Category Assignments";
      const bIsAggregation = b === "Products with Category Assignments" || b === "Products without Category Assignments";
      if (aIsAggregation && !bIsAggregation) return -1;
      if (!aIsAggregation && bIsAggregation) return 1;
      return a.localeCompare(b);
    }).map((useCase) => (
      <option key={useCase} value={useCase}>
        {useCase}
      </option>
    ))}
  </select>
</div>

            <div>
  <label className="block text-sm text-slate-700 mb-2">
    Project
  </label>
  <select
    value={selectedProjectId}
    onChange={async (e) => {
      const projectId = e.target.value;
      setSelectedProjectId(projectId);
      await loadProjectFilters(projectId);
    }}
    disabled={
      projectsLoading ||
      (!!selectedUseCase && filteredProjects.length === 0)
    }
    className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm"
  >
    <option value="">All Project</option>
    {filteredProjects.map((project) => (
      <option key={project.id} value={project.id}>
        {project.name}
      </option>
    ))}
  </select>
</div>

            <div>
              <label className="block text-sm text-slate-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm"
              >
                <option value="">All Status</option>
                <option value="Yet to Start">Yet to Start</option>
                <option value="In Progress">In Progress</option>
                 <option value="Partially Completed">Partially Completed</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-700 mb-2">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                disabled={availableCategories.length === 0}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm disabled:opacity-50"
              >
                <option value="">All Category</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-700 mb-2">Brand</label>
              <select
                value={brandFilter}
                onChange={(e) => {
                  setBrandFilter(e.target.value);
                  setCurrentPage(1);
                }}
                disabled={availableBrands.length === 0}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm disabled:opacity-50"
              >
                <option value="">All Brand</option>
                {availableBrands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(statusFilter ||
            categoryFilter ||
            brandFilter ||
            selectedUseCase ||
            selectedProjectId ||
            searchQuery) && (
            <button
              onClick={resetFilters}
              className="h-10 px-4 border border-slate-300 rounded-lg bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Reset
            </button>
          )}
        </div>

        {expandedProjectId && (
          <div className="mt-4 relative">
            {/* <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /> */}
            {/* <input
              type="text"
              placeholder="Search by product name, code, SKU, brand, or MPN..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-10 pl-10 pr-10 border border-slate-300 rounded-lg bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            /> */}
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
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
          {projectsLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
              <p className="text-slate-500 text-sm">Loading projects...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No projects found
            </div>
          ) : (
            filteredProjects.map((project) => (
              <div key={project.id}>
                <div
                  className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                    expandedProjectId === project.id ? "bg-blue-50" : ""
                  } ${
                    selectedProjectIds.has(project.id) ? "bg-blue-50/50" : ""
                  } ${
                    enrichingProjects.has(project.id) ? "bg-blue-50/30" : ""
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
                    disabled={enrichingProjects.has(project.id)}
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

                      {getStatusBadge(project.source_status || "NA")}

                      {enrichingProjects.has(project.id) && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Enriching...
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {enrichingProjects.has(project.id) ? (
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
                      {!(statusFilter === "completed") && (
                        <button
                          onClick={handleEnrichAllInExpanded}
                          disabled={
                            loading ||
                            enrichingProjects.has(project.id) ||
                            (selectedProductIds.size > 0
                              ? !expandedProjectProducts.some((p) =>
                                  selectedProductIds.has(p.id),
                                )
                              : expandedStats.pending === 0)
                          }
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                        >
                          {loading || enrichingProjects.has(project.id) ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                          {enrichingProjects.has(project.id)
                            ? "Enriching..."
                            : selectedProductIds.size > 0
                              ? `Enrich Selected (${selectedProductIds.size})`
                              : "Enrich All"}
                        </button>
                      )}
                    </div>

                    <div className="overflow-x-auto max-h-[600px]">
                      <table className="w-full border-separate border-spacing-0">
                        <thead className="bg-white sticky top-0 z-20 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 bg-slate-50">
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
                              Category
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 bg-slate-50">
                              Completeness
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 bg-slate-50">
                              Status
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 bg-slate-50">
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
                                {searchQuery || categoryFilter || brandFilter
                                  ? "No products match your filters"
                                  : "No products found"}
                              </td>
                            </tr>
                          ) : (
                            paginatedProducts.map((product) => (
                              <tr
                                key={product.id}
                                onClick={() => setSelectedProduct(product.id)}
                                className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                                  selectedProduct === product.id
                                    ? "bg-blue-100"
                                    : ""
                                }`}
                              >
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

                                <td className="px-4 py-3 text-sm text-slate-600">
                                  {product.category_1 || "-"}
                                </td>

                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden max-w-[120px]">
                                      <div
                                        className={`h-full rounded-full transition-all duration-300 ${
                                          (product.completeness_score || 0) >=
                                          90
                                            ? "bg-green-500"
                                            : (product.completeness_score ||
                                                  0) >= 60
                                              ? "bg-amber-500"
                                              : "bg-red-400"
                                        }`}
                                        style={{
                                          width: `${product.completeness_score || 0}%`,
                                        }}
                                      />
                                    </div>
                                    <span className="text-xs text-slate-600 min-w-[35px]">
                                      {product.completeness_score || 0}%
                                    </span>
                                  </div>
                                </td>

                                <td className="px-4 py-3">
                                  {getProductStatusBadge(
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
                                      onClick={() => handleEnrich(product.id)}
                                      disabled={
                                        loading ||
                                        product.enrichment_status ===
                                          "processing" ||
                                        enrichingProjects.has(project.id)
                                      }
                                      className="text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50 hover:underline inline-flex items-center gap-1 transition-colors"
                                    >
                                      {product.enrichment_status ===
                                      "completed" ? (
                                        <>
                                          <RefreshCw className="w-4 h-4" />
                                          Re-Enrich
                                        </>
                                      ) : (
                                        <>
                                          <Sparkles className="w-4 h-4" />
                                          Enrich
                                        </>
                                      )}
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
                            className="p-1 hover:bg-slate-100 rounded disabled:opacity-50 transition-colors"
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
                            className="p-1 hover:bg-slate-100 rounded disabled:opacity-50 transition-colors"
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
                        className="bg-blue-600 h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${selectedProductData.completeness_score || 0}%`,
                        }}
                      />
                    </div>
                    <span className="font-bold text-blue-700">
                      {selectedProductData.completeness_score || 0}%
                    </span>
                  </div>
                </div>

                <div className="px-4 border-l border-blue-200">
                  <p className="text-xs text-blue-600 uppercase font-bold tracking-wider mb-1">
                    Status
                  </p>
                  {getProductStatusBadge(
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
                      Enrichment In Progress
                    </p>
                    <p className="text-xs text-blue-700">
                      Please wait while enrichment is being processed
                    </p>
                  </div>
                </div>
              ) : attributes.length === 0 ? (
                <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                  <Target className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p>No attributes found for this product.</p>
                  <button
                    onClick={() => handleEnrich(selectedProductData.id)}
                    className="mt-3 text-blue-600 hover:underline text-sm font-medium"
                  >
                    Run Enrichment Now
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
                      <FileText className="w-4 h-4" /> Technical Data Source
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
                onClick={() => handleEnrich(selectedProductData.id)}
                disabled={
                  loading ||
                  selectedProductData.enrichment_status === "processing"
                }
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ||
                selectedProductData.enrichment_status === "processing" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                  </>
                ) : selectedProductData.enrichment_status === "completed" ? (
                  <>
                    <RefreshCw className="w-4 h-4" /> Re-Enrich
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Start Enrichment
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
