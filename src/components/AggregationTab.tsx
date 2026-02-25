  import { useState, useEffect, useCallback, useRef } from "react";
  import {
    AlertTriangle,
    GitMerge,
    ChevronLeft,
    ChevronRight,
    Play,
    Loader2,
    Package,
    RefreshCw,
    Clock,
    CheckCircle2,
    StopCircle,
    ArrowRight,
    X,
    List,
    Box,
    FileSpreadsheet,
  } from "lucide-react";
  import { aggregationService } from "../services/aggregationService";
  import { notify } from "../lib/notifications";
  import type {
    Product,
    ProjectWithStats,
    AggregatedAttribute,
    AggregationJob,
  } from "../types/database.types";

  const PRODUCTS_PER_PAGE = 10;
  const POLL_INTERVAL = 3000;
  const PRODUCT_POLL_INTERVAL = 2000;

  const safeParseValue = (value: any): any => {
  if (value === null || value === undefined || value === "-" || value === "null")
    return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return value;

  const str = value.trim();
  if (!str || str === "[object Object]") return null;

  if (
    (str.startsWith("{") && str.endsWith("}")) ||
    (str.startsWith("[") && str.endsWith("]"))
  ) {
    try {
      return JSON.parse(str);
    } catch {
      try {
        const normalized = str
          .replace(/'/g, '"')
          .replace(/None/g, "null")
          .replace(/True/g, "true")
          .replace(/False/g, "false");
        return JSON.parse(normalized);
      } catch {
        return str;
      }
    }
  }
  return str;
};

  const unwrapSingleKeyObject = (obj: any): any => {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
    const keys = Object.keys(obj);
    if (keys.length === 1) {
      const val = obj[keys[0]];
      if (val && typeof val === "object") return unwrapSingleKeyObject(val);
      return val;
    }
    return obj;
  };

 const flattenForDisplay = (obj: any, parentKey = ""): Array<[string, any]> => {
  const items: Array<[string, any]> = [];
  
  if (!obj || typeof obj !== 'object') return items;

  for (const [key, value] of Object.entries(obj)) {
    const displayKey = parentKey ? `${parentKey} ${key}` : key;
    const cleanKey = displayKey.replace(/_/g, " ");

    if (Array.isArray(value)) {
      items.push([cleanKey, value]);
    } else if (value !== null && typeof value === "object") {
      items.push(...flattenForDisplay(value, cleanKey));
    } else {
      items.push([cleanKey, value]);
    }
  }
  return items;
};

  const renderTable = (items: any[]) => {
  if (!items.length || typeof items[0] !== "object") return null;
  
  // Collect all unique keys
  const allKeys = new Set<string>();
  items.forEach((item) => {
    if (typeof item === "object" && item !== null)
      Object.keys(item).forEach((k) => allKeys.add(k));
  });
  
  const keys = Array.from(allKeys);
  if (keys.length < 2) return null;

  return (
    <div className="overflow-x-auto -mx-1 mt-1 mb-2">
      <table className="min-w-full text-xs border border-slate-200 rounded-md">
        <thead className="bg-slate-50">
          <tr>
            {keys.map((key) => (
              <th
                key={key}
                className="px-2 py-1.5 text-left font-semibold text-slate-600 capitalize border-b border-slate-200 whitespace-nowrap"
              >
                {key.replace(/_/g, " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {items.map((item, idx) => (
            <tr key={idx} className="hover:bg-slate-50">
              {keys.map((key) => {
                const cellValue = item[key];
                
                // ✅ Handle nested objects and arrays in table cells
                let displayValue;
                if (cellValue === null || cellValue === undefined) {
                  displayValue = "-";
                } else if (typeof cellValue === 'object') {
                  // For nested objects/arrays, show compact JSON
                  displayValue = JSON.stringify(cellValue);
                } else {
                  displayValue = String(cellValue);
                }
                
                return (
                  <td
                    key={key}
                    className="px-2 py-1.5 text-slate-700 border-r border-slate-100 last:border-r-0"
                  >
                    <div className="max-w-xs truncate" title={displayValue}>
                      {displayValue}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
const formatValue = (value: any) => {
  if (!value || value === "-")
    return <span className="text-slate-400 text-sm">-</span>;

  // ✅ Step 1: Parse the value first
  let parsed = safeParseValue(value);
  
  if (parsed === null) 
    return <span className="text-slate-400 text-sm">-</span>;

  // ✅ Step 2: Unwrap single-key objects (critical!)
  parsed = unwrapSingleKeyObject(parsed);
  
  if (parsed === null) 
    return <span className="text-slate-400 text-sm">-</span>;

  // ✅ Step 3: Handle Arrays
  if (Array.isArray(parsed)) {
    // Check if it's an array of objects with multiple keys → render table
    if (parsed.length > 0 && typeof parsed[0] === "object" && parsed[0] !== null) {
      const firstObjKeys = Object.keys(parsed[0]);
      
      // If objects have 2+ keys, render as table
      if (firstObjKeys.length >= 2) {
        const table = renderTable(parsed);
        if (table) return table;
      }
    }
    
    // Otherwise, render as pills/badges
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {parsed.map((item, i) => (
          <span 
            key={i} 
            className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-xs text-slate-700"
          >
            {typeof item === 'object' && item !== null
              ? JSON.stringify(item) 
              : String(item)
            }
          </span>
        ))}
      </div>
    );
  }

  // ✅ Step 4: Handle Objects
  if (typeof parsed === "object" && parsed !== null) {
    const flattened = flattenForDisplay(parsed);
    
    // If only one key-value, display inline
    if (flattened.length === 1) {
      const [key, val] = flattened[0];
      return (
        <span className="text-slate-700 text-sm">
          {String(val)}
        </span>
      );
    }
    
return (
  <div className="space-y-1 mt-1 overflow-hidden">
    {flattened.map(([key, val], idx) => (
      <div key={idx} className="text-xs flex flex-col sm:flex-row gap-x-2 border-b border-slate-100 pb-1 last:border-0">
        <span className="text-slate-500 font-medium capitalize shrink-0">
          {key}:
        </span>
        <span className="text-slate-800 break-all sm:break-words">
          {typeof val === 'object' && val !== null 
            ? JSON.stringify(val)
            : String(val)
          }
        </span>
      </div>
    ))}
  </div>
);
  }

  // ✅ Step 5: Primitive values
  return <span className="text-slate-700 text-sm">{String(parsed)}</span>;
};

  interface Props {
    initialFilter?: "all" | "completed" | "failed" | "pending";
  }

  export default function AggregationTab({ initialFilter = "all" }: Props) {
    const [projects, setProjects] = useState<ProjectWithStats[]>([]);
    const [selectedProject, setSelectedProject] = useState<string | null>(null);
    const [projectsLoading, setProjectsLoading] = useState(true);

    const [products, setProducts] = useState<Product[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalProducts, setTotalProducts] = useState(0);
    const [productsLoading, setProductsLoading] = useState(false);

    const [statusFilter, setStatusFilter] = useState<
      "all" | "completed" | "failed" | "pending"
    >(initialFilter);

    const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
    const [attributes, setAttributes] = useState<AggregatedAttribute[]>([]);
    const [attributesLoading, setAttributesLoading] = useState(false);

    const [activeJob, setActiveJob] = useState<AggregationJob | null>(null);
    
    // Track products currently being aggregated (local UI state)
    const [processingProducts, setProcessingProducts] = useState<Set<string>>(new Set());
    
    // Track polling intervals for individual products
    const productPollingRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    const loadProjects = useCallback(async () => {
      try {
        setProjectsLoading(true);
        const data = await aggregationService.getProjectsWithAggregationStats();
        setProjects(data);
      } catch (error) {
        console.error("Failed to load projects:", error);
        notify.error("Failed to load projects");
      } finally {
        setProjectsLoading(false);
      }
    }, []);

    useEffect(() => {
      if (initialFilter) {
        setStatusFilter(initialFilter);
        setCurrentPage(1);
      }
    }, [initialFilter]);

    const loadProductsByProject = useCallback(
      async (projectId: string, page: number, status: string = "all") => {
        try {
          setProductsLoading(true);
          const skip = (page - 1) * PRODUCTS_PER_PAGE;

          const response = await aggregationService.getProductsByProject(
            projectId,
            skip,
            PRODUCTS_PER_PAGE,
            status,
          );

          setProducts(response.products);
          setTotalProducts(response.total);
        } catch (error) {
          console.error("Failed to load products:", error);
          notify.error("Failed to load products");
        } finally {
          setProductsLoading(false);
        }
      },
      [],
    );

    const loadAttributes = useCallback(async (productId: string) => {
      try {
        setAttributesLoading(true);
        const data = await aggregationService.getAggregatedAttributes(productId);
        setAttributes(data);
      } catch (error) {
        console.error("Failed to load attributes:", error);
      } finally {
        setAttributesLoading(false);
      }
    }, []);

    const loadAggregationStatus = useCallback(async (projectId: string) => {
      try {
        const status =
          await aggregationService.getProjectAggregationStatus(projectId);
        setActiveJob(status.status !== "idle" ? status : null);
        return status;
      } catch (error) {
        return null;
      }
    }, []);

    // Stop polling for a specific product
    const stopProductPolling = useCallback((productId: string) => {
      const interval = productPollingRef.current.get(productId);
      if (interval) {
        clearInterval(interval);
        productPollingRef.current.delete(productId);
      }
    }, []);

    // Stop all product polling
    const stopAllProductPolling = useCallback(() => {
      productPollingRef.current.forEach((interval, productId) => {
        clearInterval(interval);
      });
      productPollingRef.current.clear();
    }, []);

    // Poll for individual product status
    const startProductPolling = useCallback(
      (productId: string) => {
        // Clear existing polling for this product if any
        stopProductPolling(productId);

        const pollInterval = setInterval(async () => {
          try {
            // Fetch the product's current status from the list
            if (selectedProject) {
              const response = await aggregationService.getProductsByProject(
                selectedProject,
                0,
                1000, // Get all to find our product
                "all",
              );
              
              const product = response.products.find(p => p.id === productId);
              
              if (product && (product.enrichment_status === 'completed' || product.enrichment_status === 'failed')) {
                // Stop polling for this product
                stopProductPolling(productId);
                
                // Remove from local processing state
                setProcessingProducts(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(productId);
                  return newSet;
                });
                
                // Refresh the products list
                await loadProductsByProject(selectedProject, currentPage, statusFilter);
                
                // Refresh attributes if viewing this product
                if (selectedProduct === productId) {
                  await loadAttributes(productId);
                }
                
                // Refresh project stats
                await loadProjects();
                
                // Show notification
                if (product.enrichment_status === 'completed') {
                  notify.success('Product Aggregation Complete', product.product_name);
                } else {
                  notify.error('Product Aggregation Failed', product.product_name);
                }
              }
            }
          } catch (error) {
            console.error('Error polling product status:', error);
          }
        }, PRODUCT_POLL_INTERVAL);

        productPollingRef.current.set(productId, pollInterval);
      },
      [selectedProject, currentPage, statusFilter, selectedProduct, loadProductsByProject, loadAttributes, loadProjects, stopProductPolling],
    );

    const startPolling = useCallback(
      (projectId: string) => {
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = setInterval(async () => {
          const status = await loadAggregationStatus(projectId);
          if (
            status &&
            ["completed", "failed", "cancelled"].includes(status.status)
          ) {
            stopPolling();
            await loadProjects();
            await loadProductsByProject(projectId, currentPage, statusFilter);
            if (status.status === "completed")
              notify.success(
                "Aggregation Complete!",
                `${status.successful} enriched`,
              );
            else if (status.status === "failed")
              notify.error("Aggregation Failed", status.error_message);
          }
        }, POLL_INTERVAL);
      },
      [
        loadAggregationStatus,
        loadProjects,
        loadProductsByProject,
        currentPage,
        statusFilter,
      ],
    );

    const stopPolling = useCallback(() => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }, []);

    useEffect(() => {
      loadProjects();
      return () => {
        stopPolling();
        stopAllProductPolling();
        productPollingRef.current.forEach(clearInterval);
      };
    }, [loadProjects, stopPolling, stopAllProductPolling]);

    useEffect(() => {
      if (selectedProject) {
        loadProductsByProject(selectedProject, currentPage, statusFilter);
        loadAggregationStatus(selectedProject);
      }
    }, [
      selectedProject,
      currentPage,
      statusFilter,
      loadProductsByProject,
      loadAggregationStatus,
    ]);

    useEffect(() => {
      if (selectedProduct) {
        loadAttributes(selectedProduct);
        setIsDrawerOpen(true);
      } else {
        setIsDrawerOpen(false);
      }
    }, [selectedProduct, loadAttributes]);

    useEffect(() => {
      if (
        activeJob &&
        ["pending", "processing"].includes(activeJob.status) &&
        selectedProject
      )
        startPolling(selectedProject);
      else stopPolling();
    }, [activeJob, selectedProject, startPolling, stopPolling]);

    const handleAggregateProject = async (projectId: string) => {
      try {
        const response = await aggregationService.aggregateProject(projectId);
        notify.success("Aggregation Started", response.message);
        setActiveJob({
          id: response.job_id,
          project_id: projectId,
          status: "processing",
          total_products: response.total_products,
          successful: 0,
          failed: 0,
          progress_percent: 0,
        });
        startPolling(projectId);
      } catch (error: any) {
        if (error.response?.status === 409)
          notify.warning("Already Running", error.response.data.detail);
        else notify.error("Failed to Start", error.response?.data?.detail);
      }
    };

    const handleAggregateProduct = async (productId: string) => {
      try {
        // Add to local processing state immediately for instant UI feedback
        setProcessingProducts(prev => new Set(prev).add(productId));
        
        // Also update the product in the local products array for immediate UI update
        setProducts(prev => prev.map(p => 
          p.id === productId 
            ? { ...p, enrichment_status: 'processing' as const } 
            : p
        ));

        // Start the aggregation request
        const aggregationPromise = aggregationService.aggregateProduct(productId);
        
        // Start polling for this product's status
        startProductPolling(productId);
        
        // Wait for the API call to complete
        await aggregationPromise;
        
        // Note: We don't update UI here - the polling will handle it
        // This is because the backend might still be processing even after the API returns
        
      } catch (error: any) {
        // On immediate error (e.g., network error), remove from processing state
        setProcessingProducts(prev => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
        
        // Stop polling for this product
        stopProductPolling(productId);
        
        // Revert the local product status
        if (selectedProject) {
          await loadProductsByProject(selectedProject, currentPage, statusFilter);
        }
        
        notify.error("Product Aggregation Failed", error.message || "Unknown error");
      }
    };

    const handleCancelAggregation = async (projectId: string) => {
      await aggregationService.cancelProjectAggregation(projectId);
      stopPolling();
      await loadProjects();
      await loadAggregationStatus(projectId);
    };

    const closeDrawer = () => {
      setIsDrawerOpen(false);
      setTimeout(() => setSelectedProduct(null), 300);
    };

    const handleStatusClick = (
      e: React.MouseEvent,
      projectId: string,
      status: "completed" | "failed" | "pending",
    ) => {
      e.stopPropagation();

      if (selectedProject !== projectId) {
        setSelectedProject(projectId);
      }

      setStatusFilter(status);
      setCurrentPage(1);
    };

    // Helper to determine if a product is processing (either from local state or backend)
    const isProductProcessing = (product: Product): boolean => {
      return processingProducts.has(product.id) || product.enrichment_status === 'processing';
    };

    // Get the display status for a product (prioritize local processing state)
    const getProductDisplayStatus = (product: Product): string => {
      if (processingProducts.has(product.id)) {
        return 'processing';
      }
      return product.enrichment_status;
    };

    const getProjectStatusBadge = (project: ProjectWithStats) => {
      if (
        activeJob?.project_id === project.id &&
        ["pending", "processing"].includes(activeJob.status)
      )
        return (
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />{" "}
            {activeJob.progress_percent}%
          </span>
        );
      if (project.aggregationStatus === "completed")
        return (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex gap-1 items-center">
            <CheckCircle2 className="w-3 h-3" /> Done
          </span>
        );
      if (project.aggregationStatus === "in_progress")
        return (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full flex gap-1 items-center">
            <Clock className="w-3 h-3" /> Active
          </span>
        );
      return (
        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
          To Do
        </span>
      );
    };

    const getProductStatusBadge = (status: string) => {
      if (status === "completed")
        return (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
            Enriched
          </span>
        );
      if (status === "processing")
        return (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> Processing
          </span>
        );
      if (status === "failed")
        return (
          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
            Failed
          </span>
        );
      return (
        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
          Pending
        </span>
      );
    };

    const selectedProductData = products.find((p) => p.id === selectedProduct);

    return (
      <div className="h-[calc(100vh-140px)] flex flex-col relative">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Data Aggregation</h2>
            <p className="text-sm text-slate-600">
              Select a project to manage aggregation
            </p>
          </div>
          <button
            onClick={loadProjects}
            className="p-2 hover:bg-slate-100 rounded-full"
          >
            <RefreshCw
              className={`w-5 h-5 text-slate-500 ${projectsLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        <div className="flex-1 grid grid-cols-12 gap-6 overflow-hidden">
          <div className="col-span-3 flex flex-col gap-3 overflow-y-auto pr-2">
            {projects.map((project) => {
              const isSelected = selectedProject === project.id;
              const progress =
                project.totalProducts > 0
                  ? Math.round(
                      (project.aggregatedProducts / project.totalProducts) * 100,
                    )
                  : 0;

              return (
                <div
                  key={project.id}
                  onClick={() => {
                    setSelectedProject(project.id);
                    setStatusFilter("all");
                    setCurrentPage(1);
                  }}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${isSelected ? "bg-blue-50 border-blue-400 shadow-sm ring-1 ring-blue-200" : "bg-white border-slate-200 hover:border-blue-200 hover:shadow-sm"}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-slate-900 truncate pr-2">
                      {project.name}
                    </h3>
                    {getProjectStatusBadge(project)}
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full mb-3 overflow-hidden">
                    <div
                      className={`h-full ${progress === 100 ? "bg-green-500" : "bg-blue-500"}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div
                      onClick={(e) =>
                        handleStatusClick(e, project.id, "completed")
                      }
                      className={`flex flex-col items-center p-1.5 rounded cursor-pointer transition-colors ${statusFilter === "completed" && isSelected ? "bg-green-100 border border-green-200" : "bg-green-50 hover:bg-green-100"}`}
                    >
                      <span className="font-bold text-green-700">
                        {project.aggregatedProducts}
                      </span>
                      <span className="text-[10px] text-green-600">Success</span>
                    </div>
                    <div
                      onClick={(e) => handleStatusClick(e, project.id, "failed")}
                      className={`flex flex-col items-center p-1.5 rounded cursor-pointer transition-colors ${statusFilter === "failed" && isSelected ? "bg-red-100 border border-red-200" : "bg-red-50 hover:bg-red-100"}`}
                    >
                      <span className="font-bold text-red-700">
                        {project.failedProducts}
                      </span>
                      <span className="text-[10px] text-red-600">Failed</span>
                    </div>
                    <div
                      onClick={(e) => handleStatusClick(e, project.id, "pending")}
                      className={`flex flex-col items-center p-1.5 rounded cursor-pointer transition-colors ${statusFilter === "pending" && isSelected ? "bg-yellow-100 border border-yellow-200" : "bg-yellow-50 hover:bg-yellow-100"}`}
                    >
                      <span className="font-bold text-yellow-700">
                        {project.pendingProducts}
                      </span>
                      <span className="text-[10px] text-yellow-600">Pending</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {projects.length === 0 && !projectsLoading && (
              <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                No projects found
              </div>
            )}
          </div>

          <div className="col-span-9 flex flex-col gap-4 h-full overflow-hidden">
            {selectedProject ? (
              <>
                {activeJob &&
                  ["pending", "processing"].includes(activeJob.status) && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                        <div>
                          <p className="text-sm font-semibold text-purple-900">
                            Aggregation In Progress
                          </p>
                          <p className="text-xs text-purple-700">
                            Processing:{" "}
                            {activeJob.current_product || "Initializing..."} (
                            {Math.min(
                              activeJob.successful + activeJob.failed + 1,
                              activeJob.total_products,
                            )}{" "}
                            / {activeJob.total_products})
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          handleCancelAggregation(activeJob.project_id)
                        }
                        className="flex items-center gap-1 px-3 py-1.5 bg-white border border-red-200 text-red-600 text-xs font-medium rounded hover:bg-red-50"
                      >
                        <StopCircle className="w-3 h-3" /> Cancel
                      </button>
                    </div>
                  )}

                <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-slate-400" />
                      <span className="font-semibold text-slate-700">
                        {totalProducts} Products
                      </span>
                    </div>
                    {statusFilter !== "all" && (
                      <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                        Filter:{" "}
                        {statusFilter.charAt(0).toUpperCase() +
                          statusFilter.slice(1)}
                        <button
                          onClick={() => setStatusFilter("all")}
                          className="ml-1 hover:text-red-500 p-0.5 rounded-full hover:bg-slate-200"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {/* Show indicator if any products are being processed locally */}
                    {processingProducts.size > 0 && (
                      <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full border border-blue-200">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {processingProducts.size} Processing
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-slate-100 rounded-md p-1">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1 || productsLoading}
                        className="p-1 hover:bg-white rounded disabled:opacity-30"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs px-2 min-w-[60px] text-center">
                        Page {currentPage} /{" "}
                        {Math.ceil(totalProducts / PRODUCTS_PER_PAGE) || 1}
                      </span>
                      <button
                        onClick={() =>
                          setCurrentPage((p) =>
                            Math.min(
                              Math.ceil(totalProducts / PRODUCTS_PER_PAGE),
                              p + 1,
                            ),
                          )
                        }
                        disabled={
                          currentPage >=
                            Math.ceil(totalProducts / PRODUCTS_PER_PAGE) ||
                          productsLoading
                        }
                        className="p-1 hover:bg-white rounded disabled:opacity-30"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    {!(
                      activeJob &&
                      ["pending", "processing"].includes(activeJob.status)
                    ) && (
                      <button
                        onClick={() => handleAggregateProject(selectedProject)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-purple-blue shadow-sm"
                      >
                        <Play className="w-4 h-4" /> Aggregate All
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-white rounded-lg border border-slate-200 shadow-sm">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-slate-600">
                          Product Info
                        </th>
                        <th className="px-4 py-3 font-semibold text-slate-600">
                          Import Source
                        </th>
                        <th className="px-4 py-3 font-semibold text-slate-600">
                          Completeness
                        </th>
                        <th className="px-4 py-3 font-semibold text-slate-600">
                          Status
                        </th>
                        <th className="px-4 py-3 font-semibold text-slate-600 text-right">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {productsLoading ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
                          </td>
                        </tr>
                      ) : products.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="p-8 text-center text-slate-500"
                          >
                            No products found.
                          </td>
                        </tr>
                      ) : (
                        products.map((product) => {
                          const isSelected = selectedProduct === product.id;
                          const displayStatus = getProductDisplayStatus(product);
                          const isProcessing = isProductProcessing(product);
                          
                          return (
                            <tr
                              key={product.id}
                              onClick={() => setSelectedProduct(product.id)}
                              className={`hover:bg-slate-50 cursor-pointer ${isSelected ? "bg-blue-50" : ""} ${isProcessing ? "bg-blue-50/50" : ""}`}
                            >
                              <td className="px-4 py-3">
                                <div className="font-medium text-slate-900">
                                  {product.product_name}
                                </div>
                                <div className="text-xs text-slate-500 font-mono mt-0.5">
                                  {product.product_code}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                  <FileSpreadsheet className="w-3.5 h-3.5 text-blue-500" />
                                  <span
                                    className="truncate max-w-[150px]"
                                    title={product.source_url || "Unknown"}
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
                                  <div className="w-16 bg-slate-200 h-1.5 rounded-full">
                                    <div
                                      className={`h-1.5 rounded-full ${product.completeness_score > 80 ? "bg-green-500" : "bg-yellow-500"}`}
                                      style={{
                                        width: `${product.completeness_score}%`,
                                      }}
                                    />
                                  </div>
                                  <span className="text-xs text-slate-500">
                                    {product.completeness_score}%
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {getProductStatusBadge(displayStatus)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {displayStatus !== "completed" &&
                                  displayStatus !== "processing" && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAggregateProduct(product.id);
                                      }}
                                      disabled={
                                        isProcessing ||
                                        (activeJob?.status === "processing" &&
                                          activeJob?.project_id ===
                                            selectedProject)
                                      }
                                      className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded hover:bg-purple-100 disabled:opacity-50"
                                    >
                                      Run
                                    </button>
                                  )}
                                {displayStatus === "processing" && (
                                  <Loader2 className="w-4 h-4 animate-spin text-blue-500 inline-block" />
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center bg-slate-50 rounded-lg border border-dashed border-slate-300 text-slate-400">
                <ArrowRight className="w-12 h-12 mb-4 text-slate-300" />
                <p className="font-medium">
                  Select a project from the left sidebar
                </p>
                <p className="text-sm">
                  to view products and manage aggregation.
                </p>
              </div>
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

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-100 rounded-lg shadow-sm">
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
                    {getProductStatusBadge(getProductDisplayStatus(selectedProductData))}
                  </div>
                </div>

                {/* Show processing indicator in drawer */}
                {isProductProcessing(selectedProductData) && (
                  <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    <div>
                      <p className="text-sm font-semibold text-blue-900">
                        Aggregation In Progress
                      </p>
                      <p className="text-xs text-blue-700">
                        Please wait while we enrich this product's data...
                      </p>
                    </div>
                  </div>
                )}

                {attributesLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <Loader2 className="w-8 h-8 animate-spin mb-2 text-blue-500" />
                    <p>Loading attributes...</p>
                  </div>
                ) : attributes.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                    <GitMerge className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                    <p>No attributes found for this product.</p>
                    {!isProductProcessing(selectedProductData) && (
                      <button
                        onClick={() =>
                          handleAggregateProduct(selectedProductData.id)
                        }
                        className="mt-3 text-blue-600 hover:underline text-sm font-medium"
                      >
                        Run Aggregation Now
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div>
                      {selectedProductData.image_url_1 && (
                        <div className="mb-6 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm aspect-video flex items-center justify-center p-4">
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
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <Box className="w-4 h-4" /> Specifications
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        {attributes.map((attr) => (
                          <div
                            key={attr.id}
                            className="p-3 bg-slate-50 rounded border border-slate-100 hover:shadow-sm transition-shadow overflow-hidden break-words"
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-xs font-semibold text-slate-500 uppercase truncate mr-2">
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
                      <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
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
                                Source ID
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {attributes.map((attr) => (
                              <tr key={attr.id} className="hover:bg-slate-50">
                               <td className="px-4 py-2 font-medium text-slate-700 whitespace-nowrap">
                                  {attr.attribute_name}
                                </td>
                                <td className="px-4 py-2 text-slate-600 min-w-[200px]">
                                  <div className="max-h-32 overflow-y-auto break-words text-xs leading-relaxed">
                                    {formatValue(attr.values[0]?.value)}
                                  </div>
                                </td>
                                <td className="px-4 py-2 text-right">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-xs font-medium ${attr.values[0]?.confidence > 0.8 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}
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
                  onClick={() => handleAggregateProduct(selectedProductData.id)}
                  disabled={isProductProcessing(selectedProductData)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProductProcessing(selectedProductData) ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                    {selectedProductData.enrichment_status==='pending'?(
                      <>
                      <Play className="w-4 h-4"/>Start Aggregation
                      </>
                    ):(
                      <>
                      <RefreshCw className="w-4 h-4" /> Re-Aggregate

                      </>
                    )}
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