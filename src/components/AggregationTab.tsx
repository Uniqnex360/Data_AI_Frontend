import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  Box,
  Clock,
  FileText,
  List,
  Loader2,
  Play,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { productService } from "../services/productService";
import { projectService } from "../services/projectService";
import { notify } from "../lib/notifications";
import { aggregationService } from "../services/aggregationService";
import { Download, GitMerge } from "lucide-react";
import {
  AggregatedAttribute,
  Product,
  Project,
} from "../types/business-rules.types.ts";
import { AggregationTabProps } from "../types/business-rules.types";
import { getStatusBadge } from "../utils/projectStatusColorizer";
import { useProjectFilters } from "../hooks/useProjectFilters.ts";
import { formatValue } from "../utils/valueParser";
import { useProductMovement } from "../hooks/useProductMovement";
import { extractionService } from "../services/extractionService.ts";
import { ProjectStats } from "./ProjectStats";
import { Pagination } from "./Pagination.tsx";
export default function AggregationTab({
  projectId,
  onNavigateToProject,
}: AggregationTabProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  // const [extractingPdf, setExtractingPdf] = useState<Set<string>>(new Set());
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || "");
  const [projectsPage, setProjectsPage] = useState(1);
  const PROJECTS_PER_PAGE = 10;
  const [projectStatusFilter, setProjectStatusFilter] = useState<string>("");

  const [projectEnrichmentCounts, setProjectEnrichmentCounts] = useState<
    Record<string, number>
  >({});

  const [selectedUseCase, setSelectedUseCase] = useState("");
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(
    null,
  );
  const [expandedProjectProducts, setExpandedProjectProducts] = useState<
    Product[]
  >([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(
    new Set(),
  );
  const [downloading, setDownloading] = useState(false);
  const [selectedLLM, setSelectedLLM] = useState<string>("openai");
  const [llmOptions] = useState([
    { value: "openai", label: "Datavio Algo-1" },
    { value: "gemini", label: "Datavio Algo-2" },
    { value: "claude", label: "Datavio Algo-3" },
    { value: "openai_gemini", label: "Algo 1 & 2" },
    { value: "gemini_openai", label: "Algo 2 & 1" },
  ]);
  const [projectSearch, setProjectSearch] = useState("");
  const [projectOptions, setProjectOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [jobProgress, setJobProgress] = useState<Record<string, any>>({});

  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [aggregatingProjects, setAggregatingProjects] = useState<Set<string>>(
    new Set(),
  );
  const [statsProjectId, setStatsProjectId] = useState<string | null>(null);
  const [statsProject, setStatsProject] = useState<Project | null>(null);
  const [aggregationTypeFilter, setAggregationTypeFilter] =
    useState<string>("");
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(
    new Set(),
  );
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
    if (aggregationTypeFilter) {
      filtered = filtered.filter((p) => {
        const type =
          (p as any).aggregation_type ||
          (p.operation_mode === "aggregation"
            ? "web"
            : p.operation_mode === "pdf_extraction"
              ? "pdf"
              : null);
        return type === aggregationTypeFilter;
      });
    }
    if (projectStatusFilter) {
      filtered = filtered.filter(
        (p) => p.source_status === projectStatusFilter,
      );
    }
    if (projectSearch.trim()) {
      const q = projectSearch.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.use_case?.toLowerCase().includes(q),
      );
    }
    return filtered;
  }, [
    projects,
    selectedUseCase,
    selectedProjectId,
    aggregationTypeFilter,
    projectStatusFilter,
    projectSearch,
  ]);
  const paginatedProjects = useMemo(() => {
    const start = (projectsPage - 1) * PROJECTS_PER_PAGE;
    return filteredProjects.slice(start, start + PROJECTS_PER_PAGE);
  }, [filteredProjects, projectsPage]);

  const projectsTotalPages = Math.max(
    1,
    Math.ceil(filteredProjects.length / PROJECTS_PER_PAGE),
  );
  const useCaseMap: Record<string, string[]> = {
    web: [
      "Products with Category Assignments",
      "Products without Category Assignments",
    ],
    pdf: [
      "Structured PDF Extraction (Given MPNs)",
      "Unstructured PDF Extraction (Given MPNs)",
      "Blind PDF Extraction (No MPNs - Title/Description based)",
      "Title & Description Based PDF Extraction",
      "Multi-PDF + Multi-MPN Extraction (Structured/Unstructured)",
      "MPN/UPC based PDF Extraction",
    ],
  };
  const getUseCasesForAggregationType = (type: string): string[] => {
    if (!type) {
      return [...(useCaseMap.web || []), ...(useCaseMap.pdf || [])];
    }
    return useCaseMap[type] || [];
  };
  const fetchJobProgress = useCallback(async (projectId: string) => {
    try {
      const status =
        await aggregationService.getProjectAggregationStatus(projectId);
      console.log(`Job status for ${projectId}:`, status);
      const jobId = status.job_id || status.id;
      if (
        jobId &&
        (status.status === "processing" || status.status === "pending")
      ) {
        const progress = await aggregationService.getJobProgress(jobId);
        console.log(`Progress for ${projectId}:`, progress);
        setJobProgress((prev) => ({
          ...prev,
          [projectId]: progress,
        }));
      }
    } catch (error) {
      console.error(`Failed to fetch job progress for ${projectId}:`, error);
    }
  }, []);
  const availableAggregationTypes = useMemo(() => {
    const types = new Set<string>();
    projects.forEach((p) => {
      const type =
        (p as any).aggregation_type ||
        (p.operation_mode === "aggregation"
          ? "web"
          : p.operation_mode === "pdf_extraction"
            ? "pdf"
            : null);
      if (type) types.add(type);
    });
    return Array.from(types).sort();
  }, [projects]);

  const availableStatuses = useMemo(() => {
    const statuses = new Set<string>();
    projects.forEach((p) => {
      if (p.source_status) statuses.add(p.source_status);
    });
    return Array.from(statuses).sort();
  }, [projects]);
  const availableUseCases = useMemo(() => {
    const projectUseCases = [
      ...new Set(projects.map((p) => p.use_case).filter(Boolean)),
    ] as string[];
    if (!aggregationTypeFilter) {
      return projectUseCases.sort((a, b) => {
        const aIsWeb = useCaseMap.web?.includes(a);
        const bIsWeb = useCaseMap.web?.includes(b);
        if (aIsWeb && !bIsWeb) return -1;
        if (!aIsWeb && bIsWeb) return 1;
        return a.localeCompare(b);
      });
    }

    const allowedUseCases = getUseCasesForAggregationType(
      aggregationTypeFilter,
    );
    const filtered = projectUseCases.filter((uc) =>
      allowedUseCases.includes(uc),
    );
    return filtered.sort((a, b) => {
      const aIsWeb = useCaseMap.web?.includes(a);
      const bIsWeb = useCaseMap.web?.includes(b);
      if (aIsWeb && !bIsWeb) return -1;
      if (!aIsWeb && bIsWeb) return 1;
      return a.localeCompare(b);
    });
  }, [aggregationTypeFilter, projects]);
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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        projectDropdownRef.current &&
        !projectDropdownRef.current.contains(e.target as Node)
      ) {
        setProjectDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const closeProjectStats = useCallback(() => {
    setStatsProjectId(null);
    setStatsProject(null);
  }, []);
  const loadProjectEnrichmentCounts = useCallback(async () => {
    try {
      const counts = await productService.getEnrichmentCounts();
      setProjectEnrichmentCounts(counts);
    } catch (error) {
      console.error("Failed to load enrichment counts:", error);
    }
  }, []);
  // const handleExtractFreshMpn = async (productId: string, mpn: string) => {
  //   if (!expandedProjectId) {
  //     notify.error("No project selected");
  //     return;
  //   }
  //   setExtractingPdf((prev) => new Set(prev).add(productId));
  //   setExpandedProjectProducts((prev) =>
  //     prev.map((p) =>
  //       p.id === productId ? { ...p, enrichment_status: "processing" } : p,
  //     ),
  //   );
  //   try {
  //     const project = projects.find((p) => p.id === expandedProjectId);
  //     const response = await extractionService.freshAggregation({
  //       mpns: [mpn],
  //       project_id: expandedProjectId!,
  //       use_case: project?.use_case || selectedUseCase,
  //     });
  //     setPollingProductIds((prev) => new Set(prev).add(productId));
  //     notify.success("Extraction Started", `Extracting data for ${mpn}`);
  //     pollBatchStatus(response.batch_id, async () => {
  //       const freshResult = await productService.getProductsByProject(
  //         expandedProjectId!,
  //         "aggregation",
  //       );
  //       const freshData = Array.isArray(freshResult)
  //         ? freshResult
  //         : (freshResult?.products ?? []);
  //       setExpandedProjectProducts(freshData);
  //       await loadProjects();
  //       setPollingProductIds((prev) => {
  //         const updated = new Set(prev);
  //         updated.delete(productId);
  //         return updated;
  //       });
  //     });
  //   } catch (error: any) {
  //     notify.error("Extraction failed", error.message);
  //     setExpandedProjectProducts((prev) =>
  //       prev.map((p) =>
  //         p.id === productId ? { ...p, enrichment_status: "failed" } : p,
  //       ),
  //     );
  //     setPollingProductIds((prev) => {
  //       const updated = new Set(prev);
  //       updated.delete(productId);
  //       return updated;
  //     });
  //   } finally {
  //     setExtractingPdf((prev) => {
  //       const newSet = new Set(prev);
  //       newSet.delete(productId);
  //       return newSet;
  //     });
  //   }
  // };
  const handleProjectSearch = useCallback((value: string) => {
    setProjectSearch(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (value.trim().length < 2) {
      setProjectOptions([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await projectService.searchProjects(
          value,
          "aggregation,pdf_extraction",
        );
        setProjectOptions(results);
      } catch (error) {
        console.error("Project search failed:", error);
      }
    }, 300);
  }, []);
  // const handleExtractFromPdf = async (productId: string, mpn: string) => {
  //   setExtractingPdf((prev) => new Set(prev).add(productId));
  //   setExpandedProjectProducts((prev) =>
  //     prev.map((p) =>
  //       p.id === productId ? { ...p, enrichment_status: "processing" } : p,
  //     ),
  //   );
  //   try {
  //     const response = await extractionService.extractPdfForProduct(
  //       mpn,
  //       expandedProjectId!,
  //     );
  //     setPollingProductIds((prev) => new Set(prev).add(productId));
  //     notify.success("PDF Extraction Started", `Extracting data for ${mpn}`);
  //     pollBatchStatus(response.batch_id, async () => {
  //       const freshResult = await productService.getProductsByProject(
  //         expandedProjectId!,
  //         "aggregation",
  //       );
  //       const freshData = Array.isArray(freshResult)
  //         ? freshResult
  //         : (freshResult?.products ?? []);
  //       setExpandedProjectProducts(freshData);
  //       await loadProjects();
  //       setPollingProductIds((prev) => {
  //         const updated = new Set(prev);
  //         updated.delete(productId);
  //         return updated;
  //       });
  //     });
  //   } catch (error: any) {
  //     notify.error("Extraction failed", error.message);
  //     setExpandedProjectProducts((prev) =>
  //       prev.map((p) =>
  //         p.id === productId ? { ...p, enrichment_status: "failed" } : p,
  //       ),
  //     );
  //     setPollingProductIds((prev) => {
  //       const updated = new Set(prev);
  //       updated.delete(productId);
  //       return updated;
  //     });
  //   } finally {
  //     setExtractingPdf((prev) => {
  //       const newSet = new Set(prev);
  //       newSet.delete(productId);
  //       return newSet;
  //     });
  //   }
  // };
  // const handleBlindExtract = async (productId: string) => {
  //   if (!expandedProjectId) {
  //     notify.error("No project selected");
  //     return;
  //   }
  //   if (extractingPdf.size >= 5) {
  //     notify.warning(
  //       "Extraction Limit",
  //       "Maximum 5 concurrent extractions allowed. Please wait for some to complete.",
  //     );
  //     return;
  //   }
  //   const product = expandedProjectProducts.find((p) => p.id === productId);
  //   if (!product) {
  //     notify.error("Product not found");
  //     return;
  //   }
  //   setExtractingPdf((prev) => new Set(prev).add(productId));
  //   setExpandedProjectProducts((prev) =>
  //     prev.map((p) =>
  //       p.id === productId ? { ...p, enrichment_status: "processing" } : p,
  //     ),
  //   );
  //   try {
  //     const response = await extractionService.extractPdfForProduct(
  //       product.product_code,
  //       expandedProjectId,
  //     );
  //     setPollingProductIds((prev) => new Set(prev).add(productId));
  //     notify.success("Extraction Started", "Extracting product data from PDF");
  //     pollBatchStatus(response.batch_id, async () => {
  //       const freshResult = await productService.getProductsByProject(
  //         expandedProjectId!,
  //         "aggregation",
  //       );
  //       const freshData = Array.isArray(freshResult)
  //         ? freshResult
  //         : (freshResult?.products ?? []);
  //       setExpandedProjectProducts(freshData);
  //       await loadProjects();
  //       setPollingProductIds((prev) => {
  //         const updated = new Set(prev);
  //         updated.delete(productId);
  //         return updated;
  //       });
  //     });
  //   } catch (error: any) {
  //     notify.error("Extraction failed", error.message);
  //     setExpandedProjectProducts((prev) =>
  //       prev.map((p) =>
  //         p.id === productId ? { ...p, enrichment_status: "failed" } : p,
  //       ),
  //     );
  //     setPollingProductIds((prev) => {
  //       const updated = new Set(prev);
  //       updated.delete(productId);
  //       return updated;
  //     });
  //   } finally {
  //     setExtractingPdf((prev) => {
  //       const newSet = new Set(prev);
  //       newSet.delete(productId);
  //       return newSet;
  //     });
  //   }
  // };
  useEffect(() => {
    if (aggregatingProjects.size === 0) return;

    const interval = setInterval(async () => {
      for (const projectId of aggregatingProjects) {
        await fetchJobProgress(projectId);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [aggregatingProjects, fetchJobProgress]);
  // const pollProjectStatuses = useCallback(async () => {
  //   if (aggregatingProjects.size === 0) return;
  //   const newAggregatingProjects = new Set(aggregatingProjects);
  //   const completedProjects: string[] = [];
  //   for (const projectId of aggregatingProjects) {
  //     try {
  //       const job =
  //         await aggregationService.getProjectAggregationStatus(projectId);
  //       if (job.status === "completed" || job.status === "failed") {
  //         newAggregatingProjects.delete(projectId);
  //         completedProjects.push(projectId);
  //         const projectName =
  //           projects.find((p) => p.id === projectId)?.name || projectId;
  //         if (job.status === "completed") {
  //           notify.success(`Aggregation completed for "${projectName}"`);
  //         } else {
  //           notify.error(`Aggregation failed for "${projectName}"`);
  //         }
  //       }
  //     } catch (error) {
  //       console.error(`Failed to poll project ${projectId}:`, error);
  //     }
  //   }
  //   if (completedProjects.length > 0) {
  //     setAggregatingProjects(newAggregatingProjects);
  //     loadProjects(true);
  //     if (expandedProjectId && completedProjects.includes(expandedProjectId)) {
  //       try {
  //         const freshResult = await productService.getProductsByProject(
  //           expandedProjectId,
  //           "aggregation",
  //         );
  //         const freshData = Array.isArray(freshResult)
  //           ? freshResult
  //           : (freshResult?.products ?? []);
  //         setExpandedProjectProducts(freshData);
  //       } catch (error) {
  //         console.error("Failed to refresh expanded project:", error);
  //       }
  //     }
  //   }
  // }, [aggregatingProjects, expandedProjectId, projects]);
  const pollProjectStatuses = useCallback(async () => {
    if (aggregatingProjects.size === 0) return;
    
    // Reload projects to get latest statuses
    const data = await projectService.getAllProjects({
      operation_mode: "aggregation,pdf_extraction",
      tab: "aggregation",
    });
    
    const newAggregatingProjects = new Set(aggregatingProjects);
    const completedProjects: string[] = [];
    
    for (const projectId of aggregatingProjects) {
      const updated = data.find((p: Project) => p.id === projectId);
      const project = projects.find((p) => p.id === projectId);
      const isPdfProject = project?.operation_mode === "pdf_extraction";
      
      if (isPdfProject) {
        // For PDF projects, check source_status from reloaded data
        if (updated && (updated.source_status === "Completed" || updated.source_status === "Failed")) {
          newAggregatingProjects.delete(projectId);
          completedProjects.push(projectId);
          if (updated.source_status === "Completed") {
            notify.success(`Extraction completed for "${updated.name}"`);
          } else {
            notify.error(`Extraction failed for "${updated.name}"`);
          }
        }
      } else {
        // For web aggregation, use existing job check
        try {
          const job = await aggregationService.getProjectAggregationStatus(projectId);
          if (job.status === "completed" || job.status === "failed") {
            newAggregatingProjects.delete(projectId);
            completedProjects.push(projectId);
            const projectName = projects.find((p) => p.id === projectId)?.name || projectId;
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
    }
       setProjects(data.filter(
        (p: Project) => p.operation_mode === "aggregation" || p.operation_mode === "pdf_extraction"
      ));
    if (completedProjects.length > 0) {
      setAggregatingProjects(newAggregatingProjects);
     
      if (expandedProjectId && completedProjects.includes(expandedProjectId)) {
        try {
          const freshResult = await productService.getProductsByProject(
            expandedProjectId,
            "aggregation",
          );
          const freshData = Array.isArray(freshResult)
            ? freshResult
            : (freshResult?.products ?? []);
          setExpandedProjectProducts(freshData);
        } catch (error) {
          console.error("Failed to refresh expanded project:", error);
        }
      }
    }
  }, [aggregatingProjects, expandedProjectId, projects]); 
  useEffect(() => {
    if (aggregatingProjects.size > 0) {
      const interval = setInterval(pollProjectStatuses, 5000);
      return () => clearInterval(interval);
    }
  }, [aggregatingProjects, pollProjectStatuses]);
  const { availableBrands, availableCategories, loadProjectFilters } =
    useProjectFilters();
  const loadDefaultFilters = useCallback(async () => {
    await loadProjectFilters();
  }, [loadProjectFilters]);
  useEffect(() => {
    loadDefaultFilters();
  }, [loadDefaultFilters]);

  const loadProjects = useCallback(
    async (silent = false) => {
      if (!silent) setProjectsLoading(true);
      try {
        const data = await projectService.getAllProjects({
          operation_mode: "aggregation,pdf_extraction",
          tab: "aggregation",
        });
        const aggregationData = data.filter(
          (p: Project) =>
            p.operation_mode === "aggregation" ||
            p.operation_mode === "pdf_extraction",
        );
        setProjects(aggregationData);
        await loadProjectEnrichmentCounts();
      } catch (error) {
        console.error("Failed to load projects:", error);
        if (!silent) notify.error("Failed to load projects");
      } finally {
        if (!silent) setProjectsLoading(false);
      }
    },
    [loadProjectEnrichmentCounts],
  );
  useEffect(() => {
    console.time("initialLoad");
    loadProjects().then(() => {
      console.timeEnd("initialLoad");
    });
  }, [loadProjects]);
  const resetFilters = useCallback(() => {
    setSearchQuery("");
    setStatusFilter(new Set());
    setAggregationTypeFilter("");
    setCategoryFilter("");
    setBrandFilter("");
    setSelectedUseCase("");
    setSelectedProjectId("");
    setProjectStatusFilter("");
    setExpandedProjectId(null);
    setExpandedProjectProducts([]);
    loadDefaultFilters();
  }, [loadDefaultFilters]);

  // useEffect(() => {
  //   const hasActiveProjects = projects.some(
  //     (p) =>
  //       p.source_status === "In Progress" ||
  //       p.processing_status === "processing",
  //   );
  //   if (hasActiveProjects) {
  //     const interval = setInterval(() => {
  //       loadProjects();
  //     }, 5000);
  //     return () => clearInterval(interval);
  //   }
  // }, [projects, loadProjects]);
  useEffect(() => {
    if (!expandedProjectId || expandedProjectProducts.length === 0) return;
    const blindProductsNeedingPolling = expandedProjectProducts.filter(
      (p) =>
        p.source_url?.startsWith("blind_pdf") &&
        ["pending", "processing"].includes(p.enrichment_status) &&
        p.completeness_score === 0,
    );
    if (blindProductsNeedingPolling.length > 0) {
      setPollingProductIds((prev) => {
        const newSet = new Set(prev);
        blindProductsNeedingPolling.forEach((p) => newSet.add(p.id));
        return newSet;
      });
    }
  }, [expandedProjectId, expandedProjectProducts]);
  const toggleStatusFilter = (status: "completed" | "failed" | "pending") => {
    setStatusFilter((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(status)) newSet.delete(status);
      else newSet.add(status);
      return newSet;
    });
  };
  // const canDownloadSelected = useMemo(() => {
  //   const downloadableStatuses = new Set(["completed", "failed"]);
  //   const productOk =
  //     selectedProductIds.size > 0 &&
  //     expandedProjectProducts.some(
  //       (p) =>
  //         selectedProductIds.has(p.id) &&
  //         downloadableStatuses.has(p.enrichment_status),
  //     );
  //   const projectOk =
  //     selectedProjectIds.size > 0 &&
  //     projects.some(
  //       (pr) =>
  //         selectedProjectIds.has(pr.id) &&
  //         downloadableStatuses.has(pr.processing_status ?? ""),
  //     );
  //   return productOk || projectOk;
  // }, [
  //   selectedProductIds,
  //   expandedProjectProducts,
  //   selectedProjectIds,
  //   projects,
  // ]);
  const canDownloadSelected = useMemo(() => {
    // Can download if any products or projects are selected
    if (selectedProductIds.size > 0) return true;
    if (selectedProjectIds.size > 0) return true;
    return false;
  }, [selectedProductIds, selectedProjectIds]);

  const { trackProcessingProduct, removeTrackingProduct } = useProductMovement({
    projectId: expandedProjectId,
    currentTab: "aggregation",
    onProductsMoved: useCallback(() => {
      if (expandedProjectId) {
        productService
          .getProductsByProject(expandedProjectId, "aggregation")
          .then((result) => {
            const products = Array.isArray(result)
              ? result
              : (result?.products ?? []);
            setExpandedProjectProducts(products);
          })
          .catch(console.error);
      }
    }, [expandedProjectId]),
    enabled: !!expandedProjectId && expandedProjectProducts.length > 0,
  });
  const handleAggregate = useCallback(
    async (productId: string) => {
      try {
        let primaryLLM = selectedLLM;
        let missingLLM = selectedLLM;
        if (selectedLLM === "openai_gemini") {
          primaryLLM = "openai";
          missingLLM = "gemini";
        } else if (selectedLLM === "gemini_openai") {
          primaryLLM = "gemini";
          missingLLM = "openai";
        }

        setExpandedProjectProducts((prev) =>
          prev.map((p) =>
            p.id === productId ? { ...p, enrichment_status: "processing" } : p,
          ),
        );
        trackProcessingProduct(productId);
        await aggregationService.aggregateProduct(
          productId,
          primaryLLM,
          missingLLM,
        );
        setPollingProductIds((prev) => new Set(prev).add(productId));
        notify.success("Aggregation started");
        loadProjects(true);
      } catch (error: any) {
        console.error("Aggregation failed:", error);
        removeTrackingProduct(productId);
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

  const handleAggregateSelectedProjects = useCallback(async () => {
    if (selectedProjectIds.size === 0) return;
    let primaryLLM = selectedLLM;
    let missingLLM = selectedLLM;
    if (selectedLLM === "openai_gemini") {
      primaryLLM = "openai";
      missingLLM = "gemini";
    } else if (selectedLLM === "gemini_openai") {
      primaryLLM = "gemini";
      missingLLM = "openai";
    }
    const projectIdsToAggregate = Array.from(selectedProjectIds);
    setLoading(true);
    let successCount = 0;
    const batchSize = 3;
    try {
      for (let i = 0; i < projectIdsToAggregate.length; i += batchSize) {
        const batch = projectIdsToAggregate.slice(i, i + batchSize);
        const promises = batch.map((projectId) =>
          aggregationService
            .aggregateProject(projectId, primaryLLM, missingLLM)
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
        const freshResult = await productService.getProductsByProject(
          expandedProjectId,
          "aggregation",
        );
        const freshData = Array.isArray(freshResult)
          ? freshResult
          : (freshResult?.products ?? []);
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
        loadProjects(true);
      }
    } catch (error) {
      console.error("Failed to aggregate:", error);
      notify.error("Aggregation failed");
    } finally {
      setLoading(false);
      setSelectedProjectIds(new Set());
    }
  }, [selectedProjectIds, expandedProjectId, selectedLLM]);
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
    return () => {
      setProjectEnrichmentCounts({});
    };
  }, []);
  const pollProductStatuses = useCallback(async () => {
    if (pollingProductIds.size === 0 || !expandedProjectId) return;
    try {
      const [aggregationResult, enrichmentResult] = await Promise.all([
        productService.getProductsByProject(expandedProjectId, "aggregation"),
        productService.getProductsByProject(expandedProjectId, "enrichment"),
      ]);
      const aggregationData = Array.isArray(aggregationResult)
        ? aggregationResult
        : (aggregationResult?.products ?? []);
      const enrichmentData = Array.isArray(enrichmentResult)
        ? enrichmentResult
        : (enrichmentResult?.products ?? []);
      const enrichmentPendingCount = enrichmentData.filter(
        (p) =>
          p.workflow_stage === "enrichment" &&
          p.enrichment_status === "pending",
      ).length;
      setProjectEnrichmentCounts((prev) => ({
        ...prev,
        [expandedProjectId]: enrichmentPendingCount,
      }));
      const completedOrFailed: string[] = [];
      pollingProductIds.forEach((productId) => {
        const productInAggregation = aggregationData.find(
          (p) => p.id === productId,
        );
        const productInEnrichment = enrichmentData.find(
          (p) => p.id === productId,
        );
        if (!productInAggregation && productInEnrichment) {
          const score = productInEnrichment.completeness_score || 0;
          completedOrFailed.push(productId);
          notify.info(
            "Moved to Enrichment",
            `${
              productInEnrichment.product_name ||
              productInEnrichment.product_code
            } has ${score}% completeness and requires further enrichment.`,
          );
        } else if (
          productInAggregation &&
          productInAggregation.enrichment_status === "completed"
        ) {
          const score = productInAggregation.completeness_score || 0;
          if (score >= 90) {
            completedOrFailed.push(productId);
            notify.success(
              "Aggregation Complete",
              productInAggregation.product_name,
            );
          }
        } else if (
          productInAggregation &&
          productInAggregation.enrichment_status === "failed"
        ) {
          completedOrFailed.push(productId);
          notify.error("Aggregation Failed", productInAggregation.product_name);
        }
      });
      setExpandedProjectProducts(aggregationData);
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
  }, [
    pollingProductIds,
    expandedProjectId,
    selectedProduct,
    loadAttributes,
    loadProjects,
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
      a.download = filename || "selected_export.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
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
      pollingIntervalRef.current = setInterval(pollProductStatuses, 5000);
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
  useEffect(() => {
    if (selectedProduct) {
      loadAttributes(selectedProduct);
      setIsDrawerOpen(true);
    } else {
      setIsDrawerOpen(false);
    }
  }, [selectedProduct, loadAttributes]);
  useEffect(() => {
    if (!projectId) {
      setStatsProjectId(null);
      setStatsProject(null);
    } else {
      setStatsProjectId(projectId);
      const proj = projects.find((p) => p.id === projectId);
      if (proj) setStatsProject(proj);
    }
  }, [projectId, projects]);
  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedProduct(null), 300);
  };
  const handleExtractSelectedProjects = useCallback(async () => {
    if (selectedProjectIds.size === 0) return;
    const projectIdsToExtract = Array.from(selectedProjectIds);
    setLoading(true);
    let successCount = 0;
     setAggregatingProjects((prev) => {
      const newSet = new Set(prev);
      projectIdsToExtract.forEach((id) => newSet.add(id));
      return newSet;
    });
    
    try {
      for (const projectId of projectIdsToExtract) {
        try {
          const productsResult = await productService.getProductsByProject(
            projectId,
            "aggregation",
          );
          const products = Array.isArray(productsResult)
            ? productsResult
            : (productsResult?.products ?? []);
          const pendingProducts = products.filter(
            (p) =>
              p.enrichment_status === "pending" ||
              p.enrichment_status === "failed" ||
              (p.enrichment_status === "completed")
          );
          for (const product of pendingProducts) {
            try {
              if (product.source_url === "web_search_pending") {
                const project = projects.find((p) => p.id === projectId);
                await extractionService.freshAggregation({
                  mpns: [product.product_code],
                  project_id: projectId,
                  use_case: project?.use_case || selectedUseCase,
                });
              } else {
                await extractionService.extractPdfForProduct(
                  product.product_code,
                  projectId,
                );
              }
              await new Promise((resolve) => setTimeout(resolve, 300));
            } catch (e) {
              console.error(`Failed to extract ${product.product_code}:`, e);
            }
          }
          successCount++;
        } catch (e) {
          console.error(`Failed to process project ${projectId}:`, e);
          setAggregatingProjects((prev) => {
        const newSet = new Set(prev);
        newSet.delete(projectId); 
        return newSet;
      });
        }
      }
      if (successCount > 0) {
        notify.success(`Extraction started for ${successCount} project(s)`);
         loadProjects(true)
      }
      if (
        expandedProjectId &&
        projectIdsToExtract.includes(expandedProjectId)
      ) {
        const freshResult = await productService.getProductsByProject(
          expandedProjectId,
          "aggregation",
        );
        const freshData = Array.isArray(freshResult)
          ? freshResult
          : (freshResult?.products ?? []);
        setExpandedProjectProducts(freshData);
      }
    } catch (error) {
      console.error("Failed to extract projects:", error);
      notify.error("Extraction failed");
    } finally {
      setLoading(false);
      setSelectedProjectIds(new Set());
    }
  }, [selectedProjectIds, expandedProjectId, selectedUseCase, projects]);
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
          loadProjectFilters(projectId, undefined, undefined, "aggregation");
          if (expandedProjectId === projectId) {
            setSelectedProductIds(new Set());
          }
        }
        return newSet;
      });
    },
    [expandedProjectId, loadProjectFilters],
  );
  const selectedProductData = expandedProjectProducts.find(
    (p) => p.id === selectedProduct,
  );
  const hasProductsInSelectedProjects = useMemo(() => {
    if (selectedProjectIds.size === 0) return false;
    const selectedProjectsList = projects.filter((p) =>
      selectedProjectIds.has(p.id),
    );
    return selectedProjectsList.some((p) => (p.product_count ?? 0) > 0);
  }, [selectedProjectIds, projects]);
  if (statsProjectId) {
    return (
      <ProjectStats
        projectId={statsProjectId}
        project={statsProject ?? undefined}
        onClose={closeProjectStats}
        onNavigateProject={onNavigateToProject}
      />
    );
  }
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
                onClick={
                  projects.find((p) => selectedProjectIds.has(p.id))
                    ?.operation_mode === "pdf_extraction"
                    ? handleExtractSelectedProjects
                    : handleAggregateSelectedProjects
                }
                disabled={loading || !hasProductsInSelectedProjects}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : projects.find((p) => selectedProjectIds.has(p.id))
                    ?.operation_mode === "pdf_extraction" ? (
                  <FileText className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {projects.find((p) => selectedProjectIds.has(p.id))
                  ?.operation_mode === "pdf_extraction"
                  ? `Extract ${selectedProjectIds.size} Project${
                      selectedProjectIds.size !== 1 ? "s" : ""
                    }`
                  : `Aggregate ${selectedProjectIds.size} Project${
                      selectedProjectIds.size !== 1 ? "s" : ""
                    }`}
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
                  statusFilter.has("completed")
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
                  statusFilter.has("failed")
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
                  statusFilter.has("pending")
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
          <div className="grid grid-cols-1 md:grid-cols-8 gap-4 flex-1">
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
                    !expandedProjectId)
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
                Aggregation Type
              </label>
              <select
                value={aggregationTypeFilter}
                onChange={(e) => {
                  setAggregationTypeFilter(e.target.value);
                  setSelectedUseCase("");
                }}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm"
              >
                <option value="">All Types</option>
                {availableAggregationTypes.includes("web") && (
                  <option value="web">Web Aggregation</option>
                )}
                {availableAggregationTypes.includes("pdf") && (
                  <option value="pdf">PDF Extraction</option>
                )}
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
                }}
                disabled={projectsLoading || availableUseCases.length === 0}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm disabled:opacity-50"
              >
                <option value="">All Use Case</option>
                {availableUseCases.map((useCase) => (
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
                value={projectStatusFilter}
                onChange={(e) => {
                  setProjectStatusFilter(e.target.value);
                }}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm"
              >
                <option value="">All Status</option>
                {availableStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
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
                  value={projectSearch}
                  onChange={(e) => handleProjectSearch(e.target.value)}
                  placeholder="Search project..."
                  className="w-full h-10 pl-9 pr-3 border border-slate-300 rounded-lg bg-white text-sm"
                />
              </div>
            </div>
          </div>
          {(statusFilter.size > 0 ||
            projectStatusFilter ||
            categoryFilter ||
            brandFilter ||
            aggregationTypeFilter ||
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
      </div>
      <div className="bg-white border border-slate-200 rounded-lg">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={
                filteredProjects.length > 0 &&
                selectedProjectIds.size === filteredProjects.length
              }
              onChange={toggleSelectAllProjects}
              className="rounded border-slate-300 cursor-pointer"
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
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center gap-1.5">
                {selectedProjectIds.size} selected
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProjectIds(new Set());
                  }}
                  className="hover:bg-blue-200 rounded-full p-0.5"
                  title="Clear all selections"
                >
                  <X className="w-3 h-3" />
                </button>
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
          className="overflow-auto"
          style={{ height: "calc(100vh - 400px)" }}
        >
          <table className="w-full">
            <thead className="sticky top-0 z-30 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-[13px] font-semibold text-slate-500 w-12 bg-white border-b border-slate-200">
                  Select
                </th>
                <th className="px-4 py-3 text-left text-[13px] font-semibold text-slate-500 bg-white border-b border-slate-200">
                  Project Name
                </th>
                <th className="px-4 py-3 text-left text-[13px] font-semibold text-slate-500 bg-white border-b border-slate-200">
                  Aggregation Type
                </th>
                <th className="px-4 py-3 text-left text-[13px] font-semibold text-slate-500 bg-white border-b border-slate-200">
                  Use Case
                </th>
                <th className="px-4 py-3 text-center text-[13px] font-semibold text-slate-500 bg-white border-b border-slate-200">
                  Products
                </th>
                <th className="px-4 py-3 text-center text-[13px] font-semibold text-slate-500 bg-white border-b border-slate-200">
                  Aggregated
                </th>
                <th className="px-4 py-3 text-center text-[13px] font-semibold text-slate-500 bg-white border-b border-slate-200">
                  Enrichment
                </th>
                <th className="px-4 py-3 text-center text-[13px] font-semibold text-slate-500 bg-white border-b border-slate-200">
                  Completeness
                </th>
                <th className="px-4 py-3 text-center text-[13px] font-semibold text-slate-500 bg-white border-b border-slate-200">
                  Data Quality
                </th>
                <th className="px-4 py-3 text-center text-[13px] font-semibold text-slate-500 bg-white border-b border-slate-200">
                  Algorithm
                </th>
                <th className="px-4 py-3 text-center text-[13px] font-semibold text-slate-500 bg-white border-b border-slate-200">
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
              ) : filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">
                    No projects found
                  </td>
                </tr>
              ) : (
                paginatedProjects.map((project) => (
                  <tr
                    key={project.id}
                    className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                      expandedProjectId === project.id ? "bg-blue-50" : ""
                    } ${
                      selectedProjectIds.has(project.id) ? "bg-blue-50/50" : ""
                    } ${
                      aggregatingProjects.has(project.id) ? "bg-blue-50/30" : ""
                    }`}
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
                        disabled={aggregatingProjects.has(project.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
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
                        {aggregatingProjects.has(project.id) && (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Processing
                            </span>
                            {jobProgress[project.id] && (
                              <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
                                {Math.round(
                                  jobProgress[project.id].progress_percentage ||
                                    0,
                                )}
                                %
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {/* Optional: Show current product being processed */}
                      {aggregatingProjects.has(project.id) &&
                        jobProgress[project.id]?.current_product && (
                          <p className="text-[10px] text-slate-400 mt-1 truncate max-w-[200px]">
                            Current: {jobProgress[project.id].current_product}
                          </p>
                        )}
                    </td>
                    <td className="px-4 py-3">
                      {aggregatingProjects.has(project.id) &&
                      jobProgress[project.id] ? (
                        <div className="space-y-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full capitalize">
                            {(project as any).aggregation_type ||
                            project.operation_mode === "aggregation"
                              ? "web"
                              : project.operation_mode === "pdf_extraction"
                                ? "pdf"
                                : "—"}
                          </span>
                        </div>
                      ) : (
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full capitalize">
                          {(project as any).aggregation_type ||
                          project.operation_mode === "aggregation"
                            ? "web"
                            : project.operation_mode === "pdf_extraction"
                              ? "pdf"
                              : "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {project.use_case && (
                        <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-xs rounded-full">
                          {project.use_case}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 text-sm font-medium rounded-full">
                        {project.product_count ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 text-sm font-medium rounded-full">
                        {project.aggregated_count ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {projectEnrichmentCounts[project.id] > 0 ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateToProject?.("enrichment", project.id);
                          }}
                          className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full w-fit hover:bg-purple-200 transition-colors cursor-pointer font-medium"
                        >
                          {projectEnrichmentCounts[project.id]}
                        </button>
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
                      {(project as any).algorithm_used ? (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                          {(project as any).algorithm_used}
                        </span>
                      ) : aggregatingProjects.has(project.id) &&
                        jobProgress[project.id] ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full">
                          {Math.round(
                            jobProgress[project.id].progress_percentage || 0,
                          )}
                          %
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
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
                                aria-label="Source Conflict"
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
              {expandedProjectId &&
                projects.find((p) => p.id === expandedProjectId)
                  ?.operation_mode !== "pdf_extraction" && (
                  <button
                    onClick={() => handleAggregate(selectedProductData.id)}
                    disabled={
                      selectedProductData.enrichment_status === "processing"
                    }
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {selectedProductData.enrichment_status === "processing" ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />{" "}
                        Processing...
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
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
