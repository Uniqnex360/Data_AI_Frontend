import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Loader2,
  Play,
  RefreshCw,
  Sparkles,
  X,
  Zap,
  Target,
  Search,
} from "lucide-react";
import { productService } from "../services/productService";
import { projectService } from "../services/projectService";
import { notify } from "../lib/notifications";
import type { Product } from "../types/database.types";
import type {
  AggregatedAttribute,
  EnrichmentTabProps,
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
import { Pagination } from "./Pagination";
import { ProjectStats } from "./ProjectStats.tsx";
import { getDashboardFilter } from "../utils/dashboardFilter.ts";

const ITEMS_PER_PAGE = 10;
export default function EnrichmentTab({
  projectId,
  initialFilter = "all",
  onNavigate,
}: EnrichmentTabProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedUseCase, setSelectedUseCase] = useState("");
  const [useCases, setUseCases] = useState<string[]>([]);
  const [projectsPage, setProjectsPage] = useState(1);
  const PROJECTS_PER_PAGE = 10;
  const [projectEnrichmentCounts, setProjectEnrichmentCounts] = useState<
    Record<string, number>
  >({});
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(
    null,
  );
  const [expandedProjectProducts, setExpandedProjectProducts] = useState<
    Product[]
  >([]);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [statsProjectId, setStatsProjectId] = useState<string | null>(null);
  const [statsProject, setStatsProject] = useState<Project | null>(null);
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
  useEffect(() => {
    if (projectId) {
      setSelectedProjectId(projectId);
      const project=projects.find((p)=>p.id===projectId)
      if(project)
      {
        openProjectStats(projectId)
      }

    }
  }, [projectId,projects]);
  const openProjectStats = useCallback(
    (pid: string) => {
      setIsDrawerOpen(false);
      setSelectedProduct(null);
      setStatsProjectId(pid);
      const proj = projects.find((p) => p.id === pid) || null;
      setStatsProject(proj);
    },
    [projects],
  );

  const closeProjectStats = useCallback(() => {
    setStatsProjectId(null);
    setStatsProject(null);
  }, []);

  const loadProjects = useCallback(
  async (silent = false) => {
    if (!silent) setProjectsLoading(true);
    try {
      const data = await projectService.getAllProjects({
        operation_mode: "aggregation,pdf_extraction,enrichment",
        tab: "enrichment",
        ...getDashboardFilter(),              // 🔹 use common filter here
      });
    const enrichmentProjects = data.filter(
      (p: Project) => p.operation_mode === "enrichment",
    );
    setProjects(enrichmentProjects);
    const counts: Record<string, number> = {};
    enrichmentProjects.forEach((p: Project) => {
      counts[p.id] = (p as any).enrichment_pending_count ?? 0;
    });
    setProjectEnrichmentCounts((prev) => ({ ...prev, ...counts }));
    const uniqueUseCases = [
      ...new Set(enrichmentProjects.map((p: Project) => p.use_case).filter(Boolean) as string[]),
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
    if (!silent) notify.error("Failed to load enrichment projects");
  } finally {
    if (!silent) setProjectsLoading(false);
  }
}, []);
 useEffect(() => {
  loadProjects(false);
}, [loadProjects]);

useEffect(() => {
  const handler = () => {
    loadProjects(false); 
  };

  window.addEventListener("dashboard-date-changed", handler);
  return () => {
    window.removeEventListener("dashboard-date-changed", handler);
  };
}, [loadProjects]);
  const loadDefaultFilters = useCallback(async () => {
    await loadProjectFilters();
  }, [loadProjectFilters]);
    useEffect(() => {
    if (!projectId) {
      loadDefaultFilters();
    }
  }, [loadDefaultFilters, projectId]);
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
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.use_case?.toLowerCase().includes(q),
      );
    }
    return filtered;
  }, [projects, selectedUseCase, selectedProjectId, statusFilter, searchQuery]);
  const resetLocalFilters = useCallback(() => {
    setSearchQuery("");
    setStatusFilter("");
    setCategoryFilter("");
    setBrandFilter("");
    setCurrentPage(1);
  }, []);
  const paginatedProjects = useMemo(() => {
    const start = (projectsPage - 1) * PROJECTS_PER_PAGE;
    return filteredProjects.slice(start, start + PROJECTS_PER_PAGE);
  }, [filteredProjects, projectsPage]);
  const projectsTotalPages = Math.max(
    1,
    Math.ceil(filteredProjects.length / PROJECTS_PER_PAGE),
  );
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
        const result = await productService.getProductsByProject(
          projectId,
          "enrichment",
        );
        let products: Product[] = [];
        if (Array.isArray(result)) {
          products = result;
        } else if (
          result &&
          typeof result === "object" &&
          "products" in result
        ) {
          products = Array.isArray(result.products) ? result.products : [];
        }
        setExpandedProjectProducts(products);
        setCurrentPage(1);
        await loadProjectFilters(projectId, undefined, undefined, "enrichment");
        const processingProductIds = products
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
        setExpandedProjectProducts([]);
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
          (p as any).mpn?.toLowerCase().includes(query),
      );
    }
    if (categoryFilter) {
      filtered = filtered.filter((p) => p.category_3 === categoryFilter);
    }
    if (brandFilter) {
      filtered = filtered.filter((p) => p.brand_name === brandFilter);
    }
    return filtered;
  }, [
    expandedProjectProducts,
    searchQuery,
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
      loadProjects(true);
      if (expandedProjectId) {
        const fresh = await productService.getProductsByProject(
          expandedProjectId,
          "enrichment",
        );
        setExpandedProjectProducts(fresh);
      }
    } catch (error: any) {
      console.error("Enrichment failed:", error);
      removeTrackingProduct(productId);
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
    // const selectedPendingProducts = expandedProjectProducts.filter(
    //   (p) =>
    //     selectedProductIds.has(p.id) &&
    //     (p.enrichment_status === "pending" || p.enrichment_status === "failed"),
    // );
    const pendingProducts =selectedProductIds.size > 0
    ? expandedProjectProducts.filter((p) => selectedProductIds.has(p.id))
    : expandedProjectProducts;

  if (pendingProducts.length === 0) {
    notify.info("No products found to process in this project");
    return;
  }
    setLoading(true);
    try {
      pendingProducts.forEach((p) => trackProcessingProduct(p.id));
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
        loadProjects(true);

    } catch (error) {
      console.error("Batch enrichment failed", error);
      notify.error("Batch enrichment failed");
      pendingProducts.forEach((p) => removeTrackingProduct(p.id));
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
      const [enrichmentData, aggregationData] = await Promise.all([
        productService.getProductsByProject(expandedProjectId, "enrichment"),
        productService.getProductsByProject(expandedProjectId, "aggregation"),
      ]);
      const completedOrFailed: string[] = [];
      pollingProductIds.forEach((productId) => {
        const productInEnrichment = enrichmentData.find(
          (p) => p.id === productId,
        );
        const productInAggregation = aggregationData.find(
          (p) => p.id === productId,
        );
        if (!productInEnrichment && productInAggregation) {
          const score = productInAggregation.completeness_score || 0;
          completedOrFailed.push(productId);
          notify.success(
            "Ready for Export",
            `${productInAggregation.product_name || productInAggregation.product_code} has reached ${score}% completeness and is ready in the Aggregation tab.`,
          );
        } else if (
          productInEnrichment &&
          productInEnrichment.enrichment_status === "completed"
        ) {
          const score = productInEnrichment.completeness_score || 0;
          completedOrFailed.push(productId);
          if (score >= 90) {
            notify.success(
              "Enrichment Complete",
              productInEnrichment.product_name,
            );
          } else {
            notify.info(
              "Enrichment Complete",
              `${productInEnrichment.product_name} has been processed.`,
            );
          }
        } else if (
          productInEnrichment &&
          productInEnrichment.enrichment_status === "failed"
        ) {
          completedOrFailed.push(productId);
          notify.error("Enrichment Failed", productInEnrichment.product_name);
        }
      });
      setExpandedProjectProducts(enrichmentData);
      if (completedOrFailed.length > 0) {
        setPollingProductIds((prev) => {
          const updated = new Set(prev);
          completedOrFailed.forEach((id) => updated.delete(id));
          return updated;
        });
        loadProjects(true);
      }
      if (selectedProduct && completedOrFailed.includes(selectedProduct)) {
        await loadAttributes(selectedProduct);
      }
    } catch (error) {
      console.error("Polling error:", error);
    }
  }, [pollingProductIds, expandedProjectId, selectedProduct, loadAttributes,loadProjects]);
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
        loadProjects(true);
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
      loadProjects(true);
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
  }, [enrichingProjects, expandedProjectId, projects,loadProjects]);
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
          loadProjectFilters(projectId, undefined, undefined, "enrichment");
          if (expandedProjectId === projectId) {
            setSelectedProductIds(new Set());
          }
        }
        return newSet;
      });
    },
    [expandedProjectId, loadProjectFilters],
  );
  const canDownloadSelected = useMemo(() => {
    const downloadableStatuses = new Set(["completed", "failed", "pending"]);
    const productOk =
      selectedProductIds.size > 0 &&
      expandedProjectProducts.some(
        (p) =>
          selectedProductIds.has(p.id) &&
          downloadableStatuses.has(p.enrichment_status as any),
      );
    const projectOk =
      selectedProjectIds.size > 0 &&
      projects.some(
        (pr) =>
          selectedProjectIds.has(pr.id) &&
          downloadableStatuses.has((pr.processing_status ?? "") as any),
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
      const { blob, filename } = await aggregationService.exportSelectedItems(
        selectedProjects,
        selectedProducts,
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || `enrichment_export.xlsx`;
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
  const getMissingAttributes = useCallback((product: Product): string[] => {
    const raw =
      (product as any).missing_attributes ??
      (product as any).missingAttributes ??
      (product as any).missing_fields ??
      (product as any).missingFields;
    if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
    if (typeof raw === "string") {
      return raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  }, []);
  if (statsProjectId) {
    return (
      <ProjectStats
        projectId={statsProjectId}
        project={statsProject ?? undefined}
        onClose={closeProjectStats}
        onNavigateProject={onNavigate}
         defaultTab="enrichment"  
      />
    );
  }
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
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4 flex-1">
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
                {[
                  ...new Set(
                    projects
                      .filter(
                        (p) =>
                          !statusFilter || p.source_status === statusFilter,
                      )
                      .map((p) => p.use_case)
                      .filter(Boolean) as string[],
                  ),
                ]
                  .sort((a, b) => {
                    const aIsAggregation =
                      a === "Products with Category Assignments" ||
                      a === "Products without Category Assignments";
                    const bIsAggregation =
                      b === "Products with Category Assignments" ||
                      b === "Products without Category Assignments";
                    if (aIsAggregation && !bIsAggregation) return -1;
                    if (!aIsAggregation && bIsAggregation) return 1;
                    return a.localeCompare(b);
                  })
                  .map((useCase) => (
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
            <div>
              <label className="block text-sm text-slate-700 mb-2">
                Search Projects
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search project..."
                  className="w-full h-10 pl-9 pr-3 border border-slate-300 rounded-lg bg-white text-sm"
                />
              </div>
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
              Clear
            </button>
          )}
        </div>
        {expandedProjectId && (
          <div className="mt-4 relative">
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
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 sticky top-0 z-20">
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
            <span className="text-xs text-slate-500">
              {selectedProjectIds.size === filteredProjects.length &&
              filteredProjects.length > 0
                ? "Deselect All"
                : "Select All"}
            </span>
            {selectedProjectIds.size > 0 && (
              <button
                onClick={() => setSelectedProjectIds(new Set())}
                className="text-xs text-red-600 hover:text-red-700 font-medium hover:underline ml-1"
              >
                Clear selection
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-slate-900">
              {filteredProjects.length} Projects
            </span>
            {selectedProjectIds.size > 0 && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                {selectedProjectIds.size} selected
              </span>
            )}
            <div className="flex items-center justify-end text-xs text-slate-500">
              <Pagination
                page={projectsPage}
                totalPages={projectsTotalPages}
                onPageChange={setProjectsPage}
              />
            </div>
          </div>
        </div>
        <div
          className="overflow-auto border-t border-slate-100"
          style={{ height: "calc(100vh - 450px)" }}
        >
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-[13px] font-semibold text-slate-500 w-12">
                  Select
                </th>
                <th className="px-4 py-3 text-left text-[13px] font-semibold text-slate-500">
                  Project Name
                </th>
                <th className="px-4 py-3 text-left text-[13px] font-semibold text-slate-500">
                  Aggregation Type
                </th>
                <th className="px-4 py-3 text-left text-[13px] font-semibold text-slate-500">
                  Use Case
                </th>
                <th className="px-4 py-3 text-center text-[13px] font-semibold text-slate-500">
                  Products
                </th>
              
                <th className="px-4 py-3 text-center text-[13px] font-semibold text-slate-500">
                  Enrichment
                </th>
                <th className="px-4 py-3 text-center text-[13px] font-semibold text-slate-500">
                  Completeness
                </th>
                <th className="px-4 py-3 text-center text-[13px] font-semibold text-slate-500">
                  Data Quality
                </th>
                <th className="px-4 py-3 text-center text-[13px] font-semibold text-slate-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {projectsLoading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                    <p className="text-slate-500 text-sm">
                      Loading projects...
                    </p>
                  </td>
                </tr>
              ) : paginatedProjects.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">
                    No projects found
                  </td>
                </tr>
              ) : (
                paginatedProjects.map((project) => (
                  <React.Fragment key={project.id}>
                    <tr
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                        expandedProjectId === project.id ? "bg-blue-50" : ""
                      } ${selectedProjectIds.has(project.id) ? "bg-blue-50/50" : ""} ${
                        enrichingProjects.has(project.id) ? "bg-blue-50/30" : ""
                      }`}
                      onClick={() => toggleExpandProject(project.id)}
                    >
                      <td
                        className="px-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedProjectIds.has(project.id)}
                          onChange={(e) =>
                            toggleProjectSelection(project.id, e as any)
                          }
                          className="rounded border-slate-300"
                          disabled={enrichingProjects.has(project.id)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="font-semibold text-slate-900 hover:underline text-left"
                          onClick={(e) => {
                            e.stopPropagation();
                            openProjectStats(project.id);
                          }}
                        >
                          {project.name}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full capitalize">
                          {(project as any).aggregation_type ||
                          project.operation_mode === "aggregation"
                            ? "web"
                            : project.operation_mode === "pdf_extraction"
                              ? "pdf"
                              : project.operation_mode === "enrichment"
                                ? "enrichment"
                                : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {project.use_case ? (
                          <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-xs rounded-full">
                            {project.use_case}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-1 bg-slate-100 text-slate-700 text-sm font-medium rounded-full">
                          {project.product_count ?? 0}
                        </span>
                      </td>
                      
                      <td className="px-4 py-3 text-center">
  {project.enriched_count && project.enriched_count > 0 ? (
    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
      {project.enriched_count}
    </span>
  ) : (
    <span className="text-slate-400 text-xs">—</span>
  )}
</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                (project.completeness_score || 0) > 80
                                  ? "bg-green-500"
                                  : (project.completeness_score || 0) > 50
                                    ? "bg-amber-500"
                                    : "bg-red-400"
                              }`}
                              style={{
                                width: `${project.completeness_score || 0}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-slate-600 font-medium min-w-[35px]">
                            {project.completeness_score || 0}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {(project as any).data_quality_score != null ? (
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-bold ${
                              (project as any).data_quality_score >= 90
                                ? "bg-emerald-100 text-emerald-700"
                                : (project as any).data_quality_score >= 70
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            {(project as any).data_quality_score}%
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          title={project.source_status || "NA"}
                          className="cursor-default"
                        >
                          {getStatusBadge(project.source_status || "NA", true)}
                        </span>
                      </td>
                    </tr>
                   
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end text-xs text-slate-500">
          <Pagination
            page={projectsPage}
            totalPages={projectsTotalPages}
            onPageChange={setProjectsPage}
          />
        </div>  
        </div>
        
      </div>
      {isDrawerOpen && selectedProductData && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
            onClick={closeDrawer}
          />
          <div className="relative w-full max-w-2xl bg-white shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300">
            <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-lg font-bold text-slate-900 leading-tight truncate max-w-[520px]">
                    {selectedProductData.product_name}
                  </h2>
                  {selectedProductData.category_3 ? (
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      {selectedProductData.category_3}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      <TagIcon />
                      No Category
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-2 text-sm text-slate-600 flex-wrap">
                  <span className="font-mono bg-white px-2 py-1 rounded border border-slate-200">
                    {selectedProductData.product_code}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span>{selectedProductData.brand_name}</span>
                </div>
              </div>
              <button
                onClick={closeDrawer}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 border-b border-slate-100 bg-white">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                <div className="lg:col-span-3">
                  <div className="text-xs text-slate-500 mb-1">
                    Completeness
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-400 rounded-full transition-all duration-300"
                        style={{
                          width: `${selectedProductData.completeness_score || 0}%`,
                        }}
                      />
                    </div>
                    <div className="text-sm font-semibold text-rose-600">
                      {selectedProductData.completeness_score || 0}%
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-6">
                  <div className="text-xs text-slate-500 mb-1">
                    Missing Attributes
                  </div>
                  {getMissingAttributes(selectedProductData).length === 0 ? (
                    <div className="text-sm text-slate-400">—</div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {getMissingAttributes(selectedProductData)
                        .slice(0, 3)
                        .map((m) => (
                          <span
                            key={m}
                            className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            {m}
                          </span>
                        ))}
                      {getMissingAttributes(selectedProductData).length > 3 && (
                        <span className="text-xs text-slate-500 px-2 py-1">
                          +
                          {getMissingAttributes(selectedProductData).length - 3}{" "}
                          more
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="lg:col-span-3 flex items-center justify-end gap-3">
                  {getProductStatusBadge(
                    selectedProductData.enrichment_status || "pending",
                  )}
                  <button
                    onClick={() => handleEnrich(selectedProductData.id)}
                    disabled={
                      loading ||
                      selectedProductData.enrichment_status === "processing"
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {loading ||
                    selectedProductData.enrichment_status === "processing" ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Backfill
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Backfill
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                          ✓
                        </span>
                        Existing Attributes
                      </div>
                      <div className="space-y-3">
                        {attributes.map((attr) => (
                          <div
                            key={attr.id}
                            className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl border border-slate-200 bg-white"
                          >
                            <div className="min-w-0">
                              <div className="text-sm text-slate-600 truncate">
                                {attr.attribute_name}
                              </div>
                            </div>
                            <div className="text-sm font-semibold text-slate-900 shrink-0">
                              {formatValue(attr.values[0]?.value)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        Attributes to Backfill
                      </div>
                      <div className="space-y-3">
                        {getMissingAttributes(selectedProductData).length ===
                        0 ? (
                          <div className="px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500">
                            No missing attributes detected.
                          </div>
                        ) : (
                          getMissingAttributes(selectedProductData).map((m) => (
                            <div
                              key={m}
                              className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50/30"
                            >
                              <div className="text-sm text-amber-900">{m}</div>
                              <div className="text-sm italic text-amber-600">
                                Will be filled
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                  {/* <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Technical Data Source
                    </h3>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase">
                          <tr>
                            <th className="px-4 py-2 font-semibold text-left">Attribute</th>
                            <th className="px-4 py-2 font-semibold text-left">Value</th>
                            <th className="px-4 py-2 font-semibold text-right">Confidence</th>
                            <th className="px-4 py-2 font-semibold text-right">Source</th>
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
                                    (attr.values[0]?.confidence ?? 0) > 0.8
                                      ? "bg-green-100 text-green-700"
                                      : "bg-yellow-100 text-yellow-700"
                                  }`}
                                >
                                  {(((attr.values[0]?.confidence ?? 0) as number) * 100).toFixed(0)}%
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
                  </div> */}
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
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ||
                selectedProductData.enrichment_status === "processing" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                  </>
                ) : selectedProductData.enrichment_status === "completed" ? (
                  <>
                    <RefreshCw className="w-4 h-4" /> Backfill
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" /> Backfill
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
function TagIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      className="text-amber-700"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M20.59 13.41L12 4.83V2H2v10h2.83l8.59 8.59a2 2 0 0 0 2.83 0l4.34-4.34a2 2 0 0 0 0-2.83Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 7h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
