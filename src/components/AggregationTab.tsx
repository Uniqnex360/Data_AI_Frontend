import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { productService } from "../services/productService";
import { extractionService } from "../services/extractionService";
import { projectService } from "../services/projectService";
import type { Product } from "../types/database.types";
import { notify } from "../lib/notifications";
import { aggregationService } from '../services/aggregationService';
import { GitMerge } from 'lucide-react';

interface AggregationTabProps {
  projectId?: string;
  initialFilter?: string;
}

interface Project {
  id: string;
  name: string;
  client?: string;
}

interface Stats {
  success: number;
  failed: number;
  pending: number;
}

const ITEMS_PER_PAGE = 10;

export default function AggregationTab({
  projectId,
  initialFilter = "all",
}: AggregationTabProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(
    new Set(),
  );

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [attributes, setAttributes] = useState<AggregatedAttribute[]>([]);
  const [attributesLoading, setAttributesLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);

  const [statusFilter, setStatusFilter] = useState(initialFilter);
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || "");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const [stats, setStats] = useState<Stats>({
    success: 0,
    failed: 0,
    pending: 0,
  });

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const data = await projectService.getAllProjects();
      setProjects(data);
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

  useEffect(() => {
    if (projectId) {
      setSelectedProjectId(projectId);
    }
  }, [projectId]);

  useEffect(() => {
    setStatusFilter(initialFilter);
    setCurrentPage(1);
  }, [initialFilter]);

  const loadProducts = useCallback(async () => {
    if (!selectedProjectId) return;

    setLoading(true);
    try {
      const data = await productService.getProductsByProject(selectedProjectId);
      setAllProducts(data);

      const uniqueCategories = [
        ...new Set(data.map((p) => p.category_1).filter(Boolean) as string[]),
      ];
      const uniqueBrands = [
        ...new Set(data.map((p) => p.brand_name).filter(Boolean) as string[]),
      ];
      setCategories(uniqueCategories);
      setBrands(uniqueBrands);

      setStats({
        success: data.filter((p) => p.enrichment_status === "completed").length,
        failed: data.filter((p) => p.enrichment_status === "failed").length,
        pending: data.filter((p) => p.enrichment_status === "pending").length,
      });
    } catch (error) {
      console.error("Failed to load products:", error);
      notify.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);
  
  useEffect(() => {
    let filtered = [...allProducts];

    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => p.enrichment_status === statusFilter);
    }

    if (categoryFilter) {
      filtered = filtered.filter((p) => p.category_1 === categoryFilter);
    }

    if (brandFilter) {
      filtered = filtered.filter((p) => p.brand_name === brandFilter);
    }

    setProducts(filtered);
    setCurrentPage(1);
  }, [statusFilter, categoryFilter, brandFilter, allProducts]);

  const handleAggregate = useCallback(
    async (productId: string) => {
      try {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === productId ? { ...p, enrichment_status: "processing" } : p,
          ),
        );

        await aggregationService.aggregateProduct(productId);
        notify.success("Aggregation started");
        await loadProducts();
      } catch (error: any) {
        console.error("Aggregation failed:", error);
        const errorMessage =
          error.response?.data?.detail || error.message || "Aggregation failed";
        notify.error("Aggregation Failed", errorMessage);

        await loadProducts();
      }
    },
    [loadProducts],
  );

  const handleAggregateAll = useCallback(async () => {
    const pendingProducts = allProducts.filter(
      (p) => p.enrichment_status === "pending",
    );

    if (pendingProducts.length === 0) {
      notify.info("No pending products to aggregate");
      return;
    }

    setLoading(true);
    try {
      await Promise.allSettled(
        pendingProducts.map((product) => handleAggregate(product.id)),
      );
      notify.success(
        "Batch Aggregation Started",
        `Processing ${pendingProducts.length} products`,
      );
    } catch (error) {
      console.error("Batch aggregation failed:", error);
      notify.error("Batch aggregation failed");
    } finally {
      setLoading(false);
    }
  }, [allProducts, handleAggregate]);

  const handleAggregateSelected = useCallback(async () => {
    if (selectedProducts.size === 0) {
      notify.info("No products selected");
      return;
    }

    setLoading(true);
    try {
      await Promise.allSettled(
        Array.from(selectedProducts).map((id) => handleAggregate(id)),
      );
      notify.success(
        "Aggregation Started",
        `Processing ${selectedProducts.size} selected products`,
      );
      setSelectedProducts(new Set());
    } catch (error) {
      console.error("Selected aggregation failed:", error);
      notify.error("Aggregation failed for selected products");
    } finally {
      setLoading(false);
    }
  }, [selectedProducts, handleAggregate]);

  const toggleSelectProduct = useCallback((productId: string) => {
    setSelectedProducts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedProducts((prev) =>
      prev.size === currentProducts.length
        ? new Set()
        : new Set(currentProducts.map((p) => p.id)),
    );
  }, [products]);

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
  const resetFilters = useCallback(() => {
    setStatusFilter("all");
    setCategoryFilter("");
    setBrandFilter("");
    setCurrentPage(1);
  }, []);
  const closeDrawer = () => {
  setIsDrawerOpen(false);
  setTimeout(() => setSelectedProduct(null), 300);
};
const formatValue = (value: any): JSX.Element | string => {
  if (value === null || value === undefined || value === "" || value === "-") {
    return <span className="text-slate-400">-</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-slate-400">-</span>;
    return <span className="text-slate-700">{value.join(", ")}</span>;
  }

  if (typeof value === "object" && value !== null) {
    return <span className="text-slate-700">{JSON.stringify(value)}</span>;
  }

  return String(value);
};

const selectedProductData = products.find((p) => p.id === selectedProduct);
  const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentProducts = products.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
            <CheckCircle2 className="w-3 h-3" /> Success
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap flex-1">
          <div>
            <h3 className="text-xl font-semibold text-slate-900 mb-1">
              Data Aggregation
            </h3>
            <p className="text-sm text-slate-600">
              Select a project to manage aggregation
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Success</option>
              <option value="failed">Failed</option>
            </select>

            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setCurrentPage(1);
                resetFilters();
              }}
              disabled={projectsLoading}
              className="px-4 py-2 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">
                {projectsLoading ? "Loading..." : "Select Project"}
              </option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              disabled={!selectedProjectId || categories.length === 0}
              className="px-4 py-2 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">Categories</option>
              {categories.map((cat) => (
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
              disabled={!selectedProjectId || brands.length === 0}
              className="px-4 py-2 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value=""> Brands</option>
              {brands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>

            {(statusFilter !== "all" || categoryFilter || brandFilter) && (
              <button
                onClick={resetFilters}
                className="px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md border border-red-200 transition-colors"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {selectedProjectId && (
          <div className="bg-white border border-slate-200 rounded-[12px] p-2 min-w-[400px] shadow-xs">
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <div className="flex flex-col gap-0.5">
                <h4 className="text-sm font-semibold text-slate-900 truncate max-w-[120px]">
                  {selectedProject?.name || "Project 01"}
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
                      width: `${(stats.success / (allProducts.length || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setStatusFilter("completed")}
                className="flex-1 flex flex-col items-center justify-center p-1 rounded-md bg-emerald-50/50 border border-emerald-100 hover:bg-emerald-50 transition-colors"
              >
                <span className="text-sm font-bold text-emerald-600">
                  {stats.success}
                </span>
                <span className="text-[10px] font-medium text-emerald-700">
                  Success
                </span>
              </button>

              <button
                onClick={() => setStatusFilter("failed")}
                className="flex-1 flex flex-col items-center justify-center p-1 rounded-md bg-rose-50/50 border border-rose-100 hover:bg-rose-50 transition-colors"
              >
                <span className="text-sm font-bold text-rose-600">
                  {stats.failed}
                </span>
                <span className="text-[10px] font-medium text-rose-700">
                  Failed
                </span>
              </button>

              <button
                onClick={() => setStatusFilter("pending")}
                className="flex-1 flex flex-col items-center justify-center p-1 rounded-md bg-amber-50/50 border border-blue-500/30 hover:bg-amber-50 transition-colors"
              >
                <span className="text-sm font-bold text-amber-500">
                  {stats.pending}
                </span>
                <span className="text-[10px] font-medium text-amber-600">
                  Pending
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {!selectedProjectId && (
        <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
          <p className="text-slate-500 font-medium">No project selected</p>
          <p className="text-sm text-slate-400 mt-1">
            Select a project from the dropdown above to manage aggregation
          </p>
        </div>
      )}

      {selectedProjectId && (
        <div className="bg-white border border-slate-200 rounded-lg">
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-900">
                {products.length} Products
              </span>
              {statusFilter !== "all" && (
                <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded">
                  Filter:{" "}
                  {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                </span>
              )}
              {categoryFilter && (
                <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                  Category: {categoryFilter}
                </span>
              )}
              {brandFilter && (
                <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded">
                  Brand: {brandFilter}
                </span>
              )}
              {selectedProducts.size > 0 && (
                <button
                  onClick={handleAggregateSelected}
                  disabled={loading}
                  className="flex items-center gap-1 px-3 py-1 bg-purple-600 text-white text-xs rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  <Play className="w-3 h-3" />
                  Run Selected ({selectedProducts.size})
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="p-1 hover:bg-slate-100 rounded disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span>
                  Page {currentPage}/{totalPages || 1}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="p-1 hover:bg-slate-100 rounded disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleAggregateAll}
                disabled={loading || stats.pending === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Aggregate All
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full border-separate border-spacing-0">
              <thead className="bg-white sticky top-0 z-20 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
                <tr>
                  <th  onClick={(e) => e.stopPropagation()} className="px-4 py-3 text-left bg-slate-50 first:rounded-tl-lg">
                    <input
                      type="checkbox"
                      checked={
                        currentProducts.length > 0 &&
                        selectedProducts.size === currentProducts.length
                      }
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300"
                    />
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
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
                    </td>
                  </tr>
                ) : currentProducts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No products found
                    </td>
                  </tr>
                ) : (
                  currentProducts.map((product) => (
                    <tr
  key={product.id}
  onClick={() => setSelectedProduct(product.id)}  
  className={`hover:bg-slate-50 cursor-pointer ${  
    selectedProducts.has(product.id) ? "bg-blue-50" : ""
  } ${selectedProduct === product.id ? "bg-blue-100" : ""}`}  
>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(product.id)}
                          onChange={() => toggleSelectProduct(product.id)}
                          className="rounded border-slate-300"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">
                            {product.product_name ||
                              product.product_code ||
                              "N/A"}
                          </div>
                          <div className="text-xs text-slate-500 font-mono">
                            {product.product_code || product.sku || "No SKU"}
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
                            title={product.source_url || "Unknown source"}
                          >
                            {product.source_url
                              ? product.source_url.replace(/^Manual_\d+_/, "")
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
                                  : (product.completeness_score || 0) > 50
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
                        {getStatusBadge(product.enrichment_status || "pending")}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {product.enrichment_status !== "processing" && (
                          <button
                            onClick={() => handleAggregate(product.id)}
                            disabled={
                              loading ||
                              product.enrichment_status === "processing"
                            }
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50 hover:underline"
                          >
                            {product.enrichment_status === "completed"
                              ? "Re-run"
                              : "Run"}
                          </button>
                        )}
                        {product.enrichment_status === "processing" && (
                          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {products.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing {startIndex + 1} -{" "}
                {Math.min(startIndex + ITEMS_PER_PAGE, products.length)} of{" "}
                {products.length} products
              </span>
              <span>
                {selectedProducts.size > 0 &&
                  `${selectedProducts.size} selected`}
              </span>
            </div>
          )}
        </div>
      )}
      {/* ✅ ADD DRAWER COMPONENT */}
{isDrawerOpen && selectedProductData && (
  <div className="fixed inset-0 z-50 flex justify-end">
    <div
      className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
      onClick={closeDrawer}
    />
    <div className="relative w-full max-w-2xl bg-white shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300">
      {/* DRAWER HEADER */}
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

      {/* DRAWER CONTENT */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* COMPLETENESS BAR */}
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
            {getStatusBadge(selectedProductData.enrichment_status || "pending")}
          </div>
        </div>

        {attributesLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mb-2 text-blue-500" />
            <p>Loading attributes...</p>
          </div>
        ) :selectedProductData.enrichment_status==='processing'?(
          <div className="flex  items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin"/>
            <div>
              <p className="text-sm font-semibold text-blue-900">
              Aggregation In Progress
              </p>
              <p className="text-xs text-blue-700">
                Please wait while the aggregation is done
              </p>
            </div>
          </div>
        ):
         attributes.length === 0 ? (
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
            {/* PRODUCT IMAGE */}
            {selectedProductData.image_url_1 && (
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm aspect-video flex items-center justify-center p-4">
                <img
                  src={selectedProductData.image_url_1}
                  alt={selectedProductData.product_name}
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              </div>
            )}

            {/* SPECIFICATIONS GRID */}
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

            {/* TECHNICAL DATA TABLE */}
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
                            {(attr.values[0]?.confidence * 100).toFixed(0)}%
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

      {/* DRAWER FOOTER */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
        <span className="text-xs text-slate-500">
          Last updated: {new Date().toLocaleDateString()}
        </span>
        <button
          onClick={() => handleAggregate(selectedProductData.id)}
          disabled={selectedProductData.enrichment_status === "processing"}
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
