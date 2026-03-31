import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  Loader2,
  Download,
} from "lucide-react";
import { productService } from "../services/productService";
import { projectService } from "../services/projectService";
import { notify } from "../lib/notifications";
import { Product, Project } from "../types/business-rules.types.ts";
import { cleansingService } from "../services/cleansingService";
import { getStatusBadge } from "../utils/projectStatusColorizer";
import { useProjectFilters } from "../hooks/useProjectFilters.ts";

const statusStyles: Record<string, string> = {
  validated: "bg-green-100 text-green-700",
  draft: "bg-yellow-100 text-yellow-700",
  pending: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  processing: "bg-blue-100 text-blue-700",
};

export default function DataCleaningTab() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const sharedScrollRef = useRef<HTMLDivElement | null>(null);
  const sharedScrollContentRef = useRef<HTMLDivElement | null>(null);
  const attributeRowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [attributeFilter, setAttributeFilter] = useState<string>("");
  const [availableAttributes, setAvailableAttributes] = useState<string[]>([]);
  const [savingAttributes, setSavingAttributes] = useState<Record<string, boolean>>({});
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const isSyncingScroll = useRef(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [selectedBulkAttributes, setSelectedBulkAttributes] = useState<
    string[]
  >([]);

  const [bulkAttributeValues, setBulkAttributeValues] = useState<
    Record<string, string>
  >({});
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(
    new Set(),
  );
  const [editingAttributes, setEditingAttributes] = useState<
    Record<string, Record<string, { value: string; uom: string }>>
  >({});
  const [selectedLLM, setSelectedLLM] = useState<string>("openai");

  const llmOptions = [
    { value: "openai", label: "Datavio Algo-1" },
    { value: "gemini", label: "Datavio Algo-2" },
    {value:'claude',label:"Datavio Algo-3"}
  ];

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(
    new Set(),
  );

  const [brandFilter, setBrandFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const { availableBrands, availableCategories, loadProjectFilters } =
    useProjectFilters();
  useEffect(() => {
    loadProjects();
    loadProjectFilters();
  }, [loadProjectFilters]);

  useEffect(() => {
    if (selectedProjectId) {
      loadProducts();
    }
  }, [selectedProjectId]);
  const syncAllAttributeRows = (scrollLeft: number) => {
    isSyncingScroll.current = true;

    Object.values(attributeRowRefs.current).forEach((el) => {
      if (el && el.scrollLeft !== scrollLeft) {
        el.scrollLeft = scrollLeft;
      }
    });

    if (
      sharedScrollRef.current &&
      sharedScrollRef.current.scrollLeft !== scrollLeft
    ) {
      sharedScrollRef.current.scrollLeft = scrollLeft;
    }

    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  };

  const handleSharedScroll = () => {
    if (!sharedScrollRef.current || isSyncingScroll.current) return;
    syncAllAttributeRows(sharedScrollRef.current.scrollLeft);
  };
  const loadProjectAttributes = useCallback(
    async (projectId: string, category?: string) => {
      if (!projectId) {
        setAvailableAttributes([]);
        return;
      }

      try {
        const attributes = await productService.getProjectAttributes(
          projectId,
          category,
        );
        setAvailableAttributes(attributes);
      } catch (error) {
        console.error("Failed to load project attributes:", error);
        setAvailableAttributes([]);
        notify.error("Failed to load attributes");
      }
    },
    [],
  );
  const toggleSelectProject = (projectId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();

    setSelectedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const toggleSelectAllProjects = () => {
    if (selectedProjectIds.size === projects.length) {
      setSelectedProjectIds(new Set());
    } else {
      setSelectedProjectIds(new Set(projects.map((p) => p.id)));
    }
  };
  const handleDownloadSelected = async () => {
    const selectedProjects = Array.from(selectedProjectIds);
    const selectedProducts = Array.from(selectedProductIds);

    if (selectedProjects.length === 0 && selectedProducts.length === 0) {
      notify.info("No projects or products selected");
      return;
    }

    setDownloading(true);
    try {
      const blob = await cleansingService.downloadSelected({
        project_ids: selectedProjects,
        product_ids: selectedProducts,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "selected_cleaning_export.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      notify.success("Download started");
    } catch (error) {
      console.error("Failed to download cleaned export:", error);
      notify.error("Failed to download export");
    } finally {
      setDownloading(false);
    }
  };
  // const handleRowScroll = (productId: string) => {
  //   const rowEl = attributeRowRefs.current[productId];
  //   if (!rowEl || isSyncingScroll.current) return;

  //   if (sharedScrollRef.current) {
  //     isSyncingScroll.current = true;
  //     sharedScrollRef.current.scrollLeft = rowEl.scrollLeft;

  //     requestAnimationFrame(() => {
  //       isSyncingScroll.current = false;
  //     });
  //   }
  // };
  const loadProjects = async () => {
    setProjectsLoading(true);

    try {
      const data = await projectService.getAllProjects();
      const cleaningProjects = data.filter(
        (p: Project) => p.operation_mode === "cleaning",
      );
      setProjects(cleaningProjects);
    } catch (error) {
      console.error("Failed to load projects:", error);
      notify.error("Failed to load projects");
    } finally {
      setProjectsLoading(false);
    }
  };
  const handleReset = () => {
    setSelectedProjectId("");
    setSelectedProjectIds(new Set());
    setSelectedProductIds(new Set());
    setStatusFilter("");
    setBrandFilter("");
    setCategoryFilter("");
    setAttributeFilter("");
    setAvailableAttributes([]);
    setProducts([]);
    setSelectedBulkAttributes([]);
    setBulkAttributeValues({});
    loadProjectFilters();
    setEditingAttributes({});
  };
  const loadProducts = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const data = await productService.getProductsByProject(selectedProjectId);
      setProducts(data);
    } catch (error) {
      console.error("Failed to load products:", error);
      notify.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };
  const handleCleanProduct = async (productId: string) => {
    setCleaning(true);

    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, enrichment_status: "processing" } : p,
      ),
    );

    try {
      const result = await cleansingService.runCleaning(
        selectedProjectId,
        selectedLLM,
        [productId],
      );

      notify.success("Cleaning started", "Product cleaning in progress");

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const pollStatus = setInterval(async () => {
        try {
          const status = await cleansingService.getTaskStatus(result.task_id);

          if (status.status === "completed") {
            clearInterval(pollStatus);
            await loadProducts();
            notify.success("Cleaning completed");
            setCleaning(false);
          } else if (status.status === "failed") {
            clearInterval(pollStatus);

            setProducts((prev) =>
              prev.map((p) =>
                p.id === productId ? { ...p, enrichment_status: "failed" } : p,
              ),
            );

            await loadProducts();
            notify.error("Cleaning failed");
            setCleaning(false);
          }
        } catch (pollError) {
          clearInterval(pollStatus);
          console.error("Polling failed:", pollError);

          setProducts((prev) =>
            prev.map((p) =>
              p.id === productId ? { ...p, enrichment_status: "failed" } : p,
            ),
          );

          notify.error("Failed to fetch cleaning status");
          setCleaning(false);
        }
      }, 2000);
    } catch (error: any) {
      console.error("Cleaning failed:", error);

      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, enrichment_status: "pending" } : p,
        ),
      );

      notify.error("Cleaning failed", error.message);
      setCleaning(false);
    }
  };

  const handleCleanSelected = async () => {
    if (selectedProductIds.size === 0) {
      notify.info("No products selected");
      return;
    }

    const idsToClean = new Set(selectedProductIds);

    setCleaning(true);

    setProducts((prev) =>
      prev.map((p) =>
        idsToClean.has(p.id) ? { ...p, enrichment_status: "processing" } : p,
      ),
    );

    try {
      const result = await cleansingService.runCleaning(
        selectedProjectId,
        selectedLLM,
        Array.from(idsToClean),
      );

      notify.success(
        "Cleaning started",
        `Cleaning ${idsToClean.size} selected product(s)`,
      );

      const pollStatus = setInterval(async () => {
        try {
          const status = await cleansingService.getTaskStatus(result.task_id);

          if (status.status === "completed") {
            clearInterval(pollStatus);
            await loadProducts();
            notify.success("Cleaning completed");
          } else if (status.status === "failed") {
            clearInterval(pollStatus);

            setProducts((prev) =>
              prev.map((p) =>
                idsToClean.has(p.id)
                  ? { ...p, enrichment_status: "failed" }
                  : p,
              ),
            );

            await loadProducts();
            notify.error("Cleaning failed");
          }
        } catch (pollError) {
          clearInterval(pollStatus);
          console.error("Polling failed:", pollError);
          await loadProducts();
          notify.error("Failed to fetch cleaning status");
        }
      }, 3000);

      setSelectedProductIds(new Set());
    } catch (error: any) {
      console.error("Batch cleaning failed:", error);

      setProducts((prev) =>
        prev.map((p) =>
          idsToClean.has(p.id) ? { ...p, enrichment_status: "pending" } : p,
        ),
      );

      notify.error("Batch cleaning failed", error.message);
    } finally {
      setCleaning(false);
    }
  };

  const handleAttributeChange = (
    productId: string,
    attrName: string,
    field: "value" | "uom",
    newValue: string,
  ) => {
    setEditingAttributes((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || {}),
        [attrName]: {
          value:
            field === "value"
              ? newValue
              : (prev[productId]?.[attrName]?.value ?? ""),
          uom:
            field === "uom"
              ? newValue
              : (prev[productId]?.[attrName]?.uom ?? ""),
        },
      },
    }));
  };
  const handleSaveAttributes = async (productId: string) => {
    const changes = editingAttributes[productId];
    if (!changes || Object.keys(changes).length === 0) return;
    setSavingAttributes((prev) => ({ ...prev, [productId]: true }));

    const formattedChanges = Object.fromEntries(
      Object.entries(changes).map(([attrName, attrData]) => [
        attrName,
        {
          value: attrData.value,
          uom: attrData.uom,
        },
      ]),
    );

    try {
      await cleansingService.updateProductAttributes(
        productId,
        formattedChanges,
      );
      notify.success("Attributes updated");
      await loadProducts();
      setEditingAttributes((prev) => {
        const newState = { ...prev };
        delete newState[productId];
        return newState;
      });
    } catch (error) {
      console.error("Failed to update attributes:", error);
      notify.error("Failed to update attributes");
    } finally {
      setSavingAttributes((prev) => {
        const newState = { ...prev };
        delete newState[productId];
        return newState;
      });
    }
  };

  const toggleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProductIds);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProductIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedProductIds.size === filteredProducts.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(filteredProducts.map((p) => p.id)));
    }
  };

  const handleBulkUpdateAttributes = async () => {
    if (selectedProductIds.size === 0) {
      notify.info("No products selected");
      return;
    }

    if (selectedBulkAttributes.length === 0) {
      notify.info("Select at least one attribute");
      return;
    }

    const attributesToUpdate = Object.fromEntries(
      selectedBulkAttributes
        .map((attr) => [attr, (bulkAttributeValues[attr] || "").trim()])
        .filter(([_, value]) => value),
    );

    if (Object.keys(attributesToUpdate).length === 0) {
      notify.info("Enter at least one value");
      return;
    }

    setBulkUpdating(true);

    try {
      await cleansingService.bulkUpdateProductAttributes({
        product_ids: Array.from(selectedProductIds),
        attributes: attributesToUpdate,
      });

      notify.success(
        "Bulk update completed",
        `Updated ${
          Object.keys(attributesToUpdate).length
        } attribute(s) for ${selectedProductIds.size} product(s)`,
      );

      await loadProducts();
      setBulkAttributeValues({});
      setSelectedBulkAttributes([]);
      setSelectedProductIds(new Set());
    } catch (error: any) {
      console.error("Bulk update failed:", error);
      notify.error(
        "Bulk update failed",
        error.message || "Failed to update attributes",
      );
    } finally {
      setBulkUpdating(false);
    }
  };
  const filteredProjects = projects.filter((project) => {
    if (statusFilter && project.source_status !== statusFilter) return false;
    return true;
  });
 const canDownloadSelected =
  selectedProjectIds.size > 0 ||
  (selectedProductIds.size > 0 &&
    products.some(
      (p) =>
        selectedProductIds.has(p.id) &&
        p.enrichment_status !== "pending",
    ));
  const filteredProducts = products.filter((product) => {
    if (brandFilter && product.brand_name !== brandFilter) return false;
    if (categoryFilter && product.category_1 !== categoryFilter) return false;

    if (attributeFilter) {
      const hasAttribute = (product.dynamic_attributes || []).some(
        (attr) => attr?.name === attributeFilter,
      );
      if (!hasAttribute) return false;
    }

    return true;
  });
  const maxAttributeWidth = Math.max(
    ...filteredProducts.map(
      (product) => (product.dynamic_attributes?.length || 0) * 260,
    ),
    800,
  );
  const hasActiveFilters =
    !!statusFilter || !!brandFilter || !!categoryFilter || !!attributeFilter;
  return (
    <div className="p-1 bg-slate-50 min-h-screen">
      <div className="mb-6">
        <p>
          
        </p>
        <h3 className="text-xl font-semibold text-slate-900 mb-1">
          Data Cleaning & Validation
        </h3>
        <p className="text-sm text-slate-600 mt-1">
          Select projects to manage cleaning and standarization
        </p>
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
                disabled={cleaning || selectedProductIds.size === 0}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm disabled:opacity-50"
              >
                {llmOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
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
                  await loadProjectFilters(projectId || undefined);
                  await loadProjectAttributes(projectId);
                }}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm"
              >
                <option value="">Select Project</option>
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
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm"
              >
                <option value="">All Status</option>
                <option value="Yet to Start">Yet to Start</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-700 mb-2">Brand</label>
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                disabled={availableBrands.length === 0}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm disabled:opacity-50"
              >
                <option value="">All</option>
                {availableBrands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </div>

            {/* <div>
              <label className="block text-sm text-slate-700 mb-2">
                Attribute
              </label>
              <select
                value={attributeFilter}
                onChange={(e) => setAttributeFilter(e.target.value)}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm"
              >
                <option value="">All</option>
                {uniqueAttributes.map((attr) => (
                  <option key={attr} value={attr}>
                    {attr}
                  </option>
                ))}
              </select>
            </div> */}

            <div>
              <label className="block text-sm text-slate-700 mb-2">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={async (e) => {
                  const category = e.target.value;
                  setCategoryFilter(category);
                  setAttributeFilter("");
                  await loadProjectAttributes(
                    selectedProjectId,
                    category || undefined,
                  );
                }}
                disabled={availableCategories.length === 0}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm disabled:opacity-50"
              >
                <option value="">All</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="h-10 px-4 border border-slate-300 rounded-lg bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Reset
            </button>
          )}
        </div>
      </div>
      {(selectedProjectIds.size > 0 || selectedProductIds.size > 0) && (
        <div className="flex justify-end mb-4">
          <button
            onClick={handleDownloadSelected}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
          >
            {downloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Download Selected
          </button>
        </div>
      )}
      {/* {selectedProjectId && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={
                selectedProductIds.size === filteredProducts.length &&
                filteredProducts.length > 0
              }
              onChange={toggleSelectAll}
              className="rounded border-slate-300"
            />
            <span className="text-sm text-slate-600">
              {selectedProductIds.size} of {filteredProducts.length} selected
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCleanSelected}
              disabled={cleaning || selectedProductIds.size === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              {cleaning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Clean Selected ({selectedProductIds.size})
            </button>
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
          </div>
        </div>
      )} */}
      {selectedProjectId && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
          <div className="flex items-end gap-4 flex-wrap w-full">
            <div className="flex-1 min-w-[320px]">
              <label className="block text-sm text-slate-700 mb-2">
                Bulk Update Attributes
              </label>

              <div className="border border-slate-300 rounded-lg bg-white p-3 max-h-56 overflow-y-auto space-y-2">
                {availableAttributes.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    No attributes available
                  </p>
                ) : (
                  availableAttributes.map((attr) => {
                    const checked = selectedBulkAttributes.includes(attr);

                    return (
                      <div key={attr} className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBulkAttributes((prev) =>
                                prev.includes(attr) ? prev : [...prev, attr],
                              );
                            } else {
                              setSelectedBulkAttributes((prev) =>
                                prev.filter((a) => a !== attr),
                              );
                              setBulkAttributeValues((prev) => {
                                const next = { ...prev };
                                delete next[attr];
                                return next;
                              });
                            }
                          }}
                          className="rounded border-slate-300"
                        />

                        <span className="text-sm text-slate-700 w-[180px] truncate">
                          {attr}
                        </span>

                        {checked && (
                          <input
                            type="text"
                            value={bulkAttributeValues[attr] || ""}
                            onChange={(e) =>
                              setBulkAttributeValues((prev) => ({
                                ...prev,
                                [attr]: e.target.value,
                              }))
                            }
                            placeholder="Enter value"
                            className="flex-1 h-9 px-3 border border-slate-300 rounded-md bg-white text-sm"
                          />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div>
              <button
                onClick={handleBulkUpdateAttributes}
                disabled={
                  bulkUpdating ||
                  selectedProductIds.size === 0 ||
                  selectedBulkAttributes.length === 0 ||
                  !selectedBulkAttributes.some(
                    (attr) =>
                      (bulkAttributeValues[attr] || "").trim().length > 0,
                  )
                }
                className="h-10 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
              >
                {bulkUpdating
                  ? "Updating..."
                  : `Update ${selectedProductIds.size} Selected`}
              </button>
            </div>
          </div>
        </div>
      )}
      {selectedProjectId ? (
        loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600">No products found in this project</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {filteredProducts.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl px-6 py-2 mb-2">
                <div className="flex">
                  <div className="w-[800px] shrink-0" />
                  <div
                    ref={sharedScrollRef}
                    onScroll={handleSharedScroll}
                    className="flex-1 overflow-x-auto"
                  >
                    <div
                      ref={sharedScrollContentRef}
                      style={{ width: `${maxAttributeWidth}px` }}
                      className="h-4"
                    />
                  </div>
                  <div className="w-[100px] shrink-0" />
                </div>
              </div>
            )}
            <table className="w-full table-fixed">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <th className="px-6 py-4 w-[40px]">
                    <input
                      type="checkbox"
                      checked={
                        selectedProductIds.size === filteredProducts.length &&
                        filteredProducts.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300"
                    />
                  </th>
                  <th className="px-6 py-4 w-[100px]">Status</th>
                  <th className="px-6 py-4 w-[160px]">Brand</th>
                  <th className="px-6 py-4 w-[200px]">Category</th>
                  <th className="px-6 py-4 w-[300px]">Product Name</th>
                  <th className="px-6 py-4">Attributes</th>
                  <th className="px-6 py-4 w-[100px]">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-slate-200 align-top hover:bg-slate-50"
                  >
                    <td className="px-6 py-5">
                      <input
                        type="checkbox"
                        checked={selectedProductIds.has(product.id)}
                        onChange={() => toggleSelectProduct(product.id)}
                        className="rounded border-slate-300"
                      />
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                          statusStyles[product.enrichment_status] ||
                          "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {product.enrichment_status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-800">
                      {product.brand_name}
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-800">
                      {product.category_1}
                    </td>
                    <td className="px-6 py-5">
                      <div>
                        <span className="text-sm font-medium text-slate-900">
                          {product.product_name}
                        </span>
                        <p className="text-xs text-slate-500 mt-1">
                          MPN: {product.product_code}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div
                        ref={(el) => {
                          attributeRowRefs.current[product.id] = el;
                        }}
                        // onScroll={() => handleRowScroll(product.id)}
                        className="overflow-x-auto"
                      >
                        <div className="flex items-center gap-2 min-w-max">
                          {product.dynamic_attributes?.length ? (
                            product.dynamic_attributes.map((attr, idx) => {
                              const editedAttr =
                                editingAttributes[product.id]?.[attr.name];
                              const currentValue =
                                editedAttr?.value ?? attr.value ?? "";
                              const currentUom =
                                editedAttr?.uom ?? attr.unit ?? attr.uom ?? "";

                              const hasConflict =
                                product.validation_conflicts?.[attr.name];

                              return (
                                <div
                                  key={idx}
                                  className="flex items-center border border-slate-200 rounded-md bg-white overflow-hidden flex-shrink-0"
                                >
                                  <div className="px-3 py-3 bg-slate-50 text-xs font-medium text-slate-700 border-r border-slate-200 whitespace-nowrap">
                                    {attr.name}
                                  </div>
                                  <input
                                    type="text"
                                    value={currentValue}
                                    onChange={(e) =>
                                      handleAttributeChange(
                                        product.id,
                                        attr.name,
                                        "value",
                                        e.target.value,
                                      )
                                    }
                                    className={`px-3 py-2 text-xs outline-none min-w-[140px] bg-white ${
                                      hasConflict ? "bg-amber-50" : ""
                                    } ${
                                      savingAttributes[product.id]
                                        ? "opacity-50"
                                        : ""
                                    }`}
                                    placeholder="Value"
                                    disabled={savingAttributes[product.id]}
                                  />
                                  <input
                                    type="text"
                                    value={currentUom}
                                    onChange={(e) =>
                                      handleAttributeChange(
                                        product.id,
                                        attr.name,
                                        "uom",
                                        e.target.value,
                                      )
                                    }
                                    className="px-2 py-2 text-xs outline-none w-[70px] border-l border-slate-200 bg-slate-50"
                                    placeholder="UOM"
                                  />
                                  {hasConflict && (
                                    <div className="px-2 border-l border-slate-200 flex items-center justify-center">
                                      <AlertCircle
                                        className="w-4 h-4 text-amber-500"
                                        title="AI suggested correction"
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-sm text-slate-400 italic">
                              No attributes to clean
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <button
                        onClick={() => handleCleanProduct(product.id)}
                        disabled={
                          cleaning || product.enrichment_status === "processing"
                        }
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50 hover:underline"
                      >
                        {product.enrichment_status === "processing" ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : product.enrichment_status === "completed" ? (
                          "Re-clean"
                        ) : (
                          "Clean"
                        )}
                      </button>
                      {Object.keys(editingAttributes[product.id] || {}).length >
                        0 && (
                        <button
                          onClick={() => handleSaveAttributes(product.id)}
                          disabled={savingAttributes[product.id]}
                          className="ml-2 text-green-600 hover:text-green-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
                        >
                          {savingAttributes[product.id] ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save"
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900">
              Cleaning Projects
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Select a project to view and clean products
            </p>
          </div>

          {projectsLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
              <p className="text-slate-500 text-sm">Loading projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">No cleaning projects found</p>
              <p className="text-sm text-slate-500 mt-1">
                Projects with use case "Data cleaning and Standardization" will
                appear here
              </p>
              {projects.length > 0 && (
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    checked={
                      projects.length > 0 &&
                      selectedProjectIds.size === projects.length
                    }
                    onChange={toggleSelectAllProjects}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-600">
                    {selectedProjectIds.size} of {projects.length} projects
                    selected
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  checked={
                    projects.length > 0 &&
                    selectedProjectIds.size === filteredProjects.length
                  }
                  onChange={toggleSelectAllProjects}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-600">
                  {selectedProjectIds.size} of {filteredProjects.length}{" "}
                  projects selected
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProjects.map((project) => (
  <div
    key={project.id}
    className={`w-full p-4 border rounded-lg transition-colors ${
      selectedProjectId === project.id
        ? "border-blue-300 bg-blue-50"
        : "border-slate-200 hover:bg-slate-50 hover:border-blue-300"
    }`}
  >
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <input
          type="checkbox"
          checked={selectedProjectIds.has(project.id)}
          onChange={(e) => toggleSelectProject(project.id, e as any)}
          onClick={(e) => e.stopPropagation()}
          className="rounded border-slate-300"
        />

        <button
          type="button"
          onClick={async () => {
            setSelectedProjectId(project.id);
            await loadProjectFilters(project.id);
            await loadProjectAttributes(project.id);
          }}
          className="flex-1 text-left"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold text-slate-900">
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
            {project.source_status && getStatusBadge(project.source_status)}
          </div>
        </button>
      </div>

      <ChevronDown
        className={`w-4 h-4 shrink-0 ${
          selectedProjectId === project.id
            ? "text-blue-600"
            : "text-slate-400"
        }`}
        aria-hidden="true"
      />
    </div>
  </div>
))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
