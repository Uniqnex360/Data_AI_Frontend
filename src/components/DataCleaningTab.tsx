import { useState, useEffect, useRef } from "react";
import { Loader2, Play, AlertCircle } from "lucide-react";
import { productService } from "../services/productService";
import { projectService } from "../services/projectService";
import { aggregationService } from "../services/aggregationService";
import { notify } from "../lib/notifications";
import { Product, Project } from "../types/business-rules.types.ts";
import { cleansingService } from "../services/cleansingService";

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
  const sharedScrollRef = useRef<HTMLDivElement | null>(null);
  const sharedScrollContentRef = useRef<HTMLDivElement | null>(null);
  const attributeRowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const isSyncingScroll = useRef(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(
    new Set(),
  );
  const [editingAttributes, setEditingAttributes] = useState<
    Record<string, Record<string, string>>
  >({});
  const [selectedLLM, setSelectedLLM] = useState<string>("openai");

  const llmOptions = [
    { value: "openai", label: "OpenAI" },
    { value: "gemini", label: "Google Gemini" },
  ];

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [brandFilter, setBrandFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  useEffect(() => {
    loadProjects();
  }, []);

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
    try {
      const data = await projectService.getAllProjects();
      const cleaningProjects = data.filter(
        (p: Project) => p.operation_mode === "cleaning",
      );
      setProjects(cleaningProjects);
    } catch (error) {
      console.error("Failed to load projects:", error);
      notify.error("Failed to load projects");
    }
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

  // optimistic update
  setProducts((prev) =>
    prev.map((p) =>
      p.id === productId ? { ...p, enrichment_status: "processing" } : p
    )
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
              p.id === productId
                ? { ...p, enrichment_status: "failed" }
                : p
            )
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
            p.id === productId
              ? { ...p, enrichment_status: "failed" }
              : p
          )
        );

        notify.error("Failed to fetch cleaning status");
        setCleaning(false);
      }
    }, 2000);
  } catch (error: any) {
    console.error("Cleaning failed:", error);

    // revert optimistic update
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, enrichment_status: "pending" } : p
      )
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

  // Optimistically mark selected products as processing
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

          // Fallback local update in case refresh fails / is delayed
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

    // Revert optimistic update on request failure
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
    newValue: string,
  ) => {
    setEditingAttributes((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || {}),
        [attrName]: newValue,
      },
    }));
  };

  const handleSaveAttributes = async (productId: string) => {
    const changes = editingAttributes[productId];
    if (!changes || Object.keys(changes).length === 0) return;

    try {
      await cleansingService.updateProductAttributes(productId, changes);
      notify.success("Attributes updated");
      // Refresh products
      await loadProducts();
      // Clear editing state
      setEditingAttributes((prev) => {
        const newState = { ...prev };
        delete newState[productId];
        return newState;
      });
    } catch (error) {
      console.error("Failed to update attributes:", error);
      notify.error("Failed to update attributes");
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

  // Get unique values for filters
  const uniqueBrands = [
    ...new Set(products.map((p) => p.brand_name).filter(Boolean)),
  ];
  const uniqueCategories = [
    ...new Set(products.map((p) => p.category_1).filter(Boolean)),
  ];

  // Filter products
  const filteredProducts = products.filter((product) => {
    if (statusFilter && product.enrichment_status !== statusFilter)
      return false;
    if (brandFilter && product.brand_name !== brandFilter) return false;
    if (categoryFilter && product.category_1 !== categoryFilter) return false;
    return true;
  });
  const maxAttributeWidth = Math.max(
    ...filteredProducts.map(
      (product) => (product.dynamic_attributes?.length || 0) * 260,
    ),
    800,
  );
  return (
    <div className="p-5 bg-slate-50 min-h-screen">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">
          Data Cleaning & Validation
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          {/* Review and clean product attributes using AI */}
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm text-slate-700 mb-2">Project</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm"
            >
              <option value="">Select Project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-700 mb-2">
              LLM Provider
            </label>
            <select
              value={selectedLLM}
              onChange={(e) => setSelectedLLM(e.target.value)}
              className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm"
            >
              {llmOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="processing">Processing</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-700 mb-2">Brand</label>
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm"
            >
              <option value="">All</option>
              {uniqueBrands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
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
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm"
            >
              <option value="">All</option>
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedProjectId && (
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
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${statusStyles[product.enrichment_status] || "bg-slate-100 text-slate-700"}`}
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
                          SKU: {product.product_code}
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
                              const currentValue =
                                editingAttributes[product.id]?.[attr.name] ??
                                attr.value;
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
                                        e.target.value,
                                      )
                                    }
                                    className={`px-3 py-2 text-xs outline-none min-w-[140px] bg-white ${
                                      hasConflict ? "bg-amber-50" : ""
                                    }`}
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
                          className="ml-2 text-green-600 hover:text-green-700 text-sm font-medium"
                        >
                          Save
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
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600">
            Select a project to view and clean products
          </p>
          <p className="text-sm text-slate-500 mt-1">
            Projects with use case "Data cleaning and Standardization" will
            appear here
          </p>
        </div>
      )}
    </div>
  );
}
