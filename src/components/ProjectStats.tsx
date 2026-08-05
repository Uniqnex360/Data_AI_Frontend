import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Download,
  Loader2,
  X,
  FileText,
  ChevronLeft,
  AlertTriangle,
  Box,
  List,
  Play,
  Eye,
  ImageIcon,
} from "lucide-react";
import { aggregationService } from "../services/aggregationService";
import { extractionService } from "../services/extractionService.ts";
import { notify } from "../lib/notifications";
import { getStatusBadge } from "../utils/projectStatusColorizer";
import type { Product, Source } from "../types/database.types";
import type { Project, ProjectWithStats } from "../types/business-rules.types";
import { ProductDetailView } from "./ProductDetailView";
import { useRef } from "react";
import { productService } from "../services/productService.ts";
import { Pagination } from "./Pagination.tsx";
import { SearchableDropdown } from "../utils/SearchableDropdown";
type TabKey = "listing" | "aggregated" | "enrichment";
interface ProjectStatsProps {
  projectId: string;
  project?: Project;
  onClose?: () => void;
  onAggregateProducts?: (productId: string) => Promise<void>;
  onNavigateProject?: (tab: string, projectId: string) => void;
  defaultTab?: "listing" | "aggregated" | "enrichment";
}
const ITEMS_PER_PAGE = 10;
export function ProjectStats({
  projectId,
  project: projectProp,
  onClose,
  onNavigateProject,
  defaultTab,
}: ProjectStatsProps) {
  const [projectStats, setProjectStats] = useState<ProjectWithStats | null>(
    null,
  );
  const [aggregatingProducts, setAggregatingProducts] = useState<Set<string>>(
    new Set(),
  );
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [aggregationProducts, setAggregationProducts] = useState<Product[]>([]);
  const [enrichmentProducts, setEnrichmentProducts] = useState<Product[]>([]);
  const [projectSource, setProjectSource] = useState<Source | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(
    new Set(),
  );
  const [downloading, setDownloading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>(defaultTab || "listing");
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showDetailView, setShowDetailView] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [attributes, setAttributes] = useState<any[]>([]);
  const [attributesLoading, setAttributesLoading] = useState(false);
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [stats, movement, sources] = await Promise.all([
        aggregationService.getProjectsWithAggregationStats(),
        aggregationService.getProductsWithMovement(projectId),
        extractionService.getSourcesByProject(projectId),
      ]);
      const matched = stats.find((s) => s.id === projectId) || null;
      setProjectStats(matched);
      setAggregationProducts(movement.aggregation_products || []);
      setEnrichmentProducts(movement.enrichment_products || []);
      setLastUpdated(movement.last_updated || null);
      if (sources && sources.length > 0) {
        setProjectSource(sources[0]);
      }
    } catch (e) {
      console.error(e);
      notify.error("Failed to load project statistics");
    } finally {
      setLoading(false);
    }
  }, [projectId]);
  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (aggregatingProducts.size === 0) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const result = await productService.getProductsByProject(
          projectId,
          "aggregation",
        );
        const products = Array.isArray(result)
          ? result
          : (result?.products ?? []);
        const stillProcessing = new Set(aggregatingProducts);
        for (const id of aggregatingProducts) {
          const product = products.find((p: Product) => p.id === id);
          if (
            product &&
            (product.enrichment_status === "completed" ||
              product.enrichment_status === "failed")
          ) {
            stillProcessing.delete(id);
          }
        }
        if (stillProcessing.size === 0) {
          clearInterval(pollingIntervalRef.current!);
          pollingIntervalRef.current = null;
          setAggregatingProducts(new Set());
          setSelectedProductIds(new Set());
          await loadData();
          notify.success("All selected products have completed aggregation");
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    }, 3000);
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [aggregatingProducts, projectId, loadData]);
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);
  
 
  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedProduct(null), 300);
  };
  const baseProducts = useMemo(() => {
    if (tab === "enrichment") return enrichmentProducts;
    return aggregationProducts;
  }, [tab, aggregationProducts, enrichmentProducts]);
  const filtered = useMemo(() => {
    let arr = [...baseProducts];
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(
        (p) =>
          p.product_name?.toLowerCase().includes(q) ||
          p.brand_name?.toLowerCase().includes(q) ||
          p.mpn?.toLowerCase().includes(q) ||
           p.sku?.toLowerCase().includes(q) ||
          p.category_3?.toLowerCase().includes(q),
      );
    }
    if (brandFilter.length > 0)
      arr = arr.filter((p) => brandFilter.includes(p.brand_name ?? ""));
    if (categoryFilter)
      arr = arr.filter((p) => p.category_3 === categoryFilter);
    if (statusFilter)
      arr = arr.filter(
        (p) => (p.enrichment_status || "pending") === statusFilter,
      );
    if (tab === "aggregated")
      arr = arr.filter((p) => p.enrichment_status === "completed");
    return arr;
  }, [baseProducts, search, brandFilter, categoryFilter, statusFilter, tab]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const start = (page - 1) * ITEMS_PER_PAGE;
  const pageRows = filtered.slice(start, start + ITEMS_PER_PAGE);
  const completeness = parseFloat(
    String(
      projectProp?.completeness_score || projectStats?.completeness_score || 0,
    ),
  );
  const totalProducts =
    projectProp?.product_count ?? projectStats?.totalProducts ?? 0;
  const aggregatedCount =
    projectStats?.aggregatedProducts ??
    aggregationProducts.filter((p) => p.enrichment_status === "completed")
      .length;
  const failedCount =
    projectStats?.failedProducts ??
    aggregationProducts.filter((p) => p.enrichment_status === "failed").length;
  const inProgress = aggregationProducts.filter(
    (p) => p.enrichment_status === "processing",
  ).length;
  const movedToEnrichment = enrichmentProducts.filter(
    (p) => p.workflow_stage === "enrichment",
  ).length;
  const projectName = projectProp?.name ?? projectStats?.name ?? "Project";
  const handleDownloadSelected = async () => {
    if (selectedProductIds.size === 0) {
      notify.info("No products selected");
      return;
    }
    setDownloading(true);
    try {
      const selectedProducts = Array.from(selectedProductIds);
      const { blob, filename } = await aggregationService.exportSelectedItems(
        [],
        selectedProducts,
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || `selected_export.xlsx`;
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
  };
  const toggleSelectAll = () => {
    if (selectedProductIds.size === filtered.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(filtered.map((p) => p.id)));
    }
  };
  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) newSet.delete(productId);
      else newSet.add(productId);
      return newSet;
    });
  };
  const handleDownload = async () => {
    try {
      setDownloading(true);
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
      notify.success("Export successful");
    } catch (error) {
      notify.error("Export failed");
    } finally {
      setDownloading(false);
    }
  };
  return (
    <div className="h-full flex flex-col bg-white text-slate-900">
      {showDetailView ? (
        <ProductDetailView
          projectId={projectId}
          projectName={projectName}
          products={baseProducts.filter((p) => selectedProductIds.has(p.id))}
          onBack={() => setShowDetailView(false)}
          initialBrandFilter={brandFilter}
          onAggregate={async (productId: string) => {
            try {
              await aggregationService.aggregateProduct(productId, "openai");
              notify.success("Aggregation started");
            } catch (e: any) {
              notify.error("Aggregation failed", e.message);
            }
          }}
        />
      ) : (
        <>
          <div className="px-6 py-2 flex items-center justify-between border-b border-slate-200 bg-slate-50/30">
            <div className="flex flex-col justify-center">
              <button
                onClick={onClose}
                className="text-[10px] text-indigo-500 hover:text-indigo-400 font-bold uppercase flex items-center gap-1 mb-1"
              >
                <ChevronLeft className="w-3 h-3" /> Back
              </button>
              <h1
                className="text-lg font-bold tracking-tight truncate"
                title={projectName}
              >
                {projectName}
              </h1>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <div className="px-6 py-2 grid grid-cols-1 md:grid-cols-3 gap-3 border-b border-slate-200 bg-slate-50/30">
            <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Total Completeness
                </p>
                <p className="text-3xl font-bold text-emerald-400 mt-2">
                  {completeness.toFixed(2)}%
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Avg. completeness across all products
                </p>
              </div>
              <div className="relative w-10 h-10">
                <svg className="w-full h-full" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                    strokeDasharray={`${completeness}, 100`}
                    strokeLinecap="round"
                    transform="rotate(-90 18 18)"
                  />
                </svg>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-3">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
                Project Status
              </p>
              <div className="flex flex-col gap-2">
                {getStatusBadge(
                  projectProp?.source_status ||
                    projectStats?.aggregationStatus ||
                    "Yet to Start",
                )}

                {projectStats?.algorithm_used && (
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <span className="text-slate-500">Algorithm:</span>
                    <span className="font-medium text-purple-600">
                      {projectStats.algorithm_used}
                    </span>
                  </div>
                )}

                <p className="text-[10px] text-slate-400">
                  Last updated:{" "}
                  {lastUpdated
                    ? new Date(lastUpdated).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "Just now"}
                </p>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
                  Imported File Name
                </p>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                  <p
                    className="text-sm text-blue-700 truncate"
                    title={projectSource?.source_url}
                  >
                    {projectSource?.source_url?.replace(/^Manual_\d+_/, "") ||
                      "No file"}
                  </p>
                </div>
                {projectSource?.uploaded_at && (
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    Imported on:{" "}
                    {new Date(projectSource.uploaded_at).toLocaleDateString(
                      "en-US",
                      {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      },
                    )}
                  </p>
                )}
              </div>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
              >
                {downloading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                Download
              </button>
            </div>
          </div>
          <div className="px-6 py-2 grid grid-cols-2 md:grid-cols-5 gap-2 border-b border-slate-200 bg-white">
            <MetricPill label="Total Products" value={totalProducts} />
            <MetricPill
              label="Aggregated"
              value={aggregatedCount}
              color="text-indigo-400"
            />
            <MetricPill
              label="Moved to Enrichment"
              value={movedToEnrichment}
              color="text-amber-400"
              clickable={movedToEnrichment > 0}
              onClick={
                movedToEnrichment > 0
                  ? () => onNavigateProject?.("enrichment", projectId)
                  : undefined
              }
            />
            <MetricPill
              label="In Progress"
              value={inProgress}
              color="text-sky-400"
            />
            <MetricPill
              label="Failed"
              value={failedCount}
              color="text-rose-400"
            />
          </div>
          <div className="px-6 pt-2 border-b border-slate-200">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <TabButton
                  label="Product Listing"
                  active={tab === "listing"}
                  onClick={() => {
                    setTab("listing");
                    setPage(1);
                  }}
                />
                <TabButton
                  label="Aggregated Products"
                  active={tab === "aggregated"}
                  onClick={() => {
                    setTab("aggregated");
                    setPage(1);
                  }}
                />
                <TabButton
                  label="Enrichment Products"
                  active={tab === "enrichment"}
                  onClick={() => {
                    setTab("enrichment");
                    setPage(1);
                  }}
                />
              </div>
              <div className="flex items-center gap-2">
                {selectedProductIds.size > 0 && (
                  <>
                    <button
                      onClick={async () => {
                        const ids = Array.from(selectedProductIds);
                        setAggregatingProducts(new Set(ids));

                        const isPdfProject =
                          projectProp?.operation_mode === "pdf_extraction";
                        let successCount = 0;
                        try {
                          for (const productId of ids) {
                            try {
                              if (isPdfProject) {
                                const product = aggregationProducts.find(
                                  (p) => p.id === productId,
                                );
                                if (product) {
                                  await extractionService.extractPdfForProduct(
                                    product.product_code,
                                    projectId,
                                  );
                                }
                              } else {
                                await aggregationService.aggregateProduct(
                                  productId,
                                  "openai",
                                );
                              }
                              successCount++;
                            } catch (e) {
                              console.error(
                                `Failed to aggregate ${productId}:`,
                                e,
                              );
                            }
                          }
                          if (successCount > 0)
                            notify.success(
                              `Aggregation started for ${successCount} product(s)`,
                            );
                          await loadData();
                        } catch (e: any) {
                          notify.error("Aggregation failed", e.message);
                          setAggregatingProducts(new Set());
                        }
                      }}
                      disabled={aggregatingProducts.size > 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 text-xs font-medium"
                    >
                      {aggregatingProducts.size > 0 ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                      Aggregate ({selectedProductIds.size})
                    </button>
                    <button
                      onClick={handleDownloadSelected}
                      disabled={downloading}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-xs font-medium"
                    >
                      {downloading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      Download ({selectedProductIds.size})
                    </button>
                  </>
                )}
                {selectedProductIds.size > 0 && (
                  <button
                    onClick={() => setShowDetailView(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-xs font-medium"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View ({selectedProductIds.size})
                  </button>
                )}
              </div>
            </div>
            <div className="py-1 flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by product name,mpn,sku, brand, category..."
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg pl-4 pr-8 py-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <SearchableDropdown
                label="All Brands"
                options={(() => {
                  let list = [...baseProducts];
                  if (search.trim()) {
                    const q = search.toLowerCase();
                    list = list.filter(
                      (p) =>
                        p.product_name?.toLowerCase().includes(q) ||
                        p.brand_name?.toLowerCase().includes(q) ||
                        p.category_3?.toLowerCase().includes(q),
                    );
                  }
                  if (categoryFilter)
                    list = list.filter((p) => p.category_3 === categoryFilter);
                  if (statusFilter)
                    list = list.filter(
                      (p) =>
                        (p.enrichment_status || "pending") === statusFilter,
                    );
                  return [
                    ...new Set(list.map((p) => p.brand_name).filter(Boolean)),
                  ];
                })()}
                value={brandFilter}
                onChange={(v) => {
                  setBrandFilter(v as string[]);
                  setPage(1);
                }}
                multi={true}
              />
              <SearchableDropdown
                label="All Categories"
                options={(() => {
                  let list = [...baseProducts];
                  if (search.trim()) {
                    const q = search.toLowerCase();
                    list = list.filter(
                      (p) =>
                        p.product_name?.toLowerCase().includes(q) ||
                        p.brand_name?.toLowerCase().includes(q) ||
                        p.category_3?.toLowerCase().includes(q),
                    );
                  }
                  if (brandFilter.length > 0)
                    list = list.filter((p) =>
                      brandFilter.includes(p.brand_name ?? ""),
                    );
                  if (statusFilter)
                    list = list.filter(
                      (p) =>
                        (p.enrichment_status || "pending") === statusFilter,
                    );
                  return [
                    ...new Set(list.map((p) => p.category_3).filter(Boolean)),
                  ];
                })()}
                value={categoryFilter}
                onChange={(v) => {
                  setCategoryFilter(v as string);
                  setPage(1);
                }}
              />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs"
              >
                <option value="">Status: All</option>
                <option value="completed">Aggregated</option>
                <option value="pending">Pending</option>
                <option value="processing">In Progress</option>
                <option value="failed">Failed</option>
              </select>
              {(search ||
                brandFilter.length > 0 ||
                categoryFilter ||
                statusFilter) && (
                <button
                  onClick={() => {
                    setSearch("");
                    setBrandFilter([]);
                    setCategoryFilter("");
                    setStatusFilter("");
                    setPage(1);
                  }}
                  className="h-8 px-3 border border-slate-300 rounded-lg bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1.5 shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear All
                </button>
              )}
            </div>
          </div>
          <div className="px-6 py-2 border-t border-slate-100 flex items-center justify-end text-xs text-slate-500 gap-3">
            <span className="text-slate-400">
              {filtered.length} product{filtered.length !== 1 ? "s" : ""} found
            </span>
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
          <div className="flex-1 overflow-auto px-6">
            <table
              className="w-full text-xs text-left border-separate border-spacing-x-2 border-spacing-y-0"
              style={{ tableLayout: "fixed" }}
            >
              <thead className="sticky top-0 bg-white z-10">
                <tr className="text-[11px] font-bold tracking-wider text-slate-400">
                  <th
                    className="py-2 border-b border-slate-200 text-center"
                    style={{ width: 40 }}
                  >
                    <input
                      type="checkbox"
                      checked={
                        filtered.length > 0 &&
                        selectedProductIds.size === filtered.length
                      }
                      onChange={toggleSelectAll}
                      className="rounded border-slate-600"
                    />
                  </th>
                  <th
                    className="py-2 border-b border-slate-200"
                    style={{ width: 280 }}
                  >
                    Product Name & MPN
                  </th>
                  <th
  className="py-2 border-b border-slate-200"
  style={{ width: 300 }}
>
  Recommended Title
</th>
                  <th
                    className="py-2 border-b border-slate-200 whitespace-nowrap"
                    style={{ width: 120 }}
                  >
                    Brand
                  </th>
                  <th
                    className="py-2 border-b border-slate-200 whitespace-nowrap"
                    style={{ width: 120 }}
                  >
                    Category
                  </th>
                  <th
                    className="py-2 border-b border-slate-200 text-center whitespace-nowrap"
                    style={{ width: 90 }}
                  >
                    Attributes
                  </th>
                  <th
                    className="py-2 border-b border-slate-200 text-center whitespace-nowrap"
                    style={{ width: 140 }}
                  >
                    Completeness
                  </th>
                  <th
                    className="py-2 border-b border-slate-200 text-center whitespace-nowrap"
                    style={{ width: 100 }}
                  >
                    Data Quality
                  </th>
                  <th
                    className="py-2 border-b border-slate-200 text-center whitespace-nowrap"
                    style={{ width: 90 }}
                  >
                    Status
                  </th>
                  <th
                    className="py-2 border-b border-slate-200 text-right whitespace-nowrap"
                    style={{ width: 110 }}
                  >
                    Last Updated
                  </th>
                  <th
                    className="py-2 border-b border-slate-200 text-center"
                    style={{ width: 60 }}
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-10 text-center">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-500 mx-auto mb-2" />
                      <span className="text-slate-400">Loading...</span>
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="py-10 text-center text-slate-400"
                    >
                      No products found
                    </td>
                  </tr>
                ) : (
                  pageRows.map((p) => (
                    <tr
                      key={p.id}
                      className="group hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td
                        className="py-2 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedProductIds.has(p.id)}
                          onChange={() => toggleProductSelection(p.id)}
                          className="rounded border-slate-600"
                        />
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Image Container */}
                          <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden border border-slate-100 relative">
                            {p.image_url_1 ? (
                              <img
                                src={p.image_url_1}
                                className="w-full h-full object-contain p-1"
                                alt=""
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display =
                                    "none";
                                  (
                                    e.target as HTMLImageElement
                                  ).nextElementSibling?.classList.remove(
                                    "hidden",
                                  );
                                }}
                              />
                            ) : null}

                            <div
                              className={`flex flex-col items-center justify-center text-center ${p.image_url_1 ? "hidden" : ""}`}
                            >
                              <ImageIcon className="w-4 h-4 text-slate-300 mb-0.5" />
                              <span className="text-[6px] text-slate-400 font-black leading-tight uppercase">
                                No
                                <br />
                                Image
                              </span>
                            </div>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div
                              className="font-bold text-slate-900 group-hover:text-indigo-400 transition-colors line-clamp-2 break-words"
                              title={p.product_name}
                              onClick={() => {
                                setSelectedProductIds(new Set([p.id]));
                                setShowDetailView(true);
                              }}
                            >
                              {p.product_name ||
                                p.product_code ||
                                "Unnamed Product"}
                            </div>
                            <span
                              className="text-[10px] text-blue-600 font-mono font-medium truncate block"
                              title={p.product_code}
                            >
                              MPN: {p.product_code}
                            </span>
                            
                          </div>
                        </div>
                        
                      </td>
                      <td className="py-2">
  <div
    className="text-xs text-slate-700 line-clamp-2"
    title={p.title_recommendation}
  >
    {p.title_recommendation || "—"}
  </div>
</td>
                      <td
                        className="py-2 text-slate-500 truncate"
                        title={p.brand_name}
                      >
                        {p.brand_name || "—"}
                      </td>
                      <td
                        className="py-2 text-slate-500 truncate"
                        title={p.category_3}
                      >
                        {p.category_3 || "—"}
                      </td>
                      <td className="py-2 text-center text-slate-600 font-medium">
                        {(p as any).attribute_count ?? "—"}
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-3 justify-center">
                          <div className="flex-1 max-w-[80px] h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                (p.completeness_score || 0) > 80
                                  ? "bg-emerald-500"
                                  : (p.completeness_score || 0) > 50
                                    ? "bg-amber-500"
                                    : "bg-red-500"
                              }`}
                              style={{ width: `${p.completeness_score || 0}%` }}
                            />
                          </div>
                          <span className="font-bold text-slate-700">
                            {p.completeness_score || 0}%
                          </span>
                        </div>
                      </td>
                      <td className="py-2 text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-bold ${
                            ((p as any).data_quality_score ?? 100) >= 90
                              ? "bg-emerald-100 text-emerald-700"
                              : ((p as any).data_quality_score ?? 100) >= 70
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {(p as any).data_quality_score ?? 100}%
                        </span>
                      </td>
                                           <td className="py-2 text-center">
                        {p.enrichment_status === "failed" && (p as any).failure_reason ? (
                          <div className="group relative inline-block">
                            {getStatusBadge("failed", true)}
                            {/* Tooltip on hover */}
                            <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity absolute z-50 left-1/2 -translate-x-1/2 mt-1 w-80 p-3 bg-slate-900 text-white text-[10px] rounded shadow-lg pointer-events-none">
                              <div className="font-bold mb-1 text-rose-300 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Failure Reason:
                              </div>
                              <div className="break-words leading-relaxed">
                                {(p as any).failure_reason}
                              </div>
                              {(p as any).failed_at && (
                                <div className="text-[9px] text-slate-400 mt-1.5 border-t border-slate-700 pt-1">
                                  Failed: {new Date((p as any).failed_at).toLocaleString()}
                                </div>
                              )}
                              {/* Tooltip arrow */}
                              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                            </div>
                          </div>
                        ) : (
                          getStatusBadge(p.enrichment_status || "pending", true)
                        )}
                      </td>
                      <td className="py-2 text-right text-slate-400">
                        {p.updated_at
                          ? new Date(p.updated_at).toLocaleDateString("en-US", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="py-2 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProductIds(new Set([p.id]));
                            setShowDetailView(true);
                          }}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-400 transition-colors"
                          title="View Attributes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {isDrawerOpen && selectedProduct && (
            <div className="fixed inset-0 z-50 flex justify-end">
              <div
                className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
                onClick={closeDrawer}
              />
              <div className="relative w-full max-w-2xl  bg-white border-l border-slate-200 shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300">
                <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between bg-white">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 leading-tight">
                      {selectedProduct.product_name ||
                        selectedProduct.product_code}
                    </h2>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                      <span className="font-mono  bg-slate-100 px-1.5 py-0.5 rounded  border border-slate-300">
                        {selectedProduct.product_code}
                      </span>
                      <span>{selectedProduct.brand_name}</span>
                    </div>
                  </div>
                  <button
                    onClick={closeDrawer}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <div className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-lg">
                    <div className="flex-1">
                      <p className="text-xs text-indigo-400 uppercase font-bold tracking-wider mb-1">
                        Data Completeness
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1  bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-500 h-full rounded-full"
                            style={{
                              width: `${selectedProduct.completeness_score || 0}%`,
                            }}
                          />
                        </div>
                        <span className="font-bold text-indigo-400">
                          {selectedProduct.completeness_score || 0}%
                        </span>
                      </div>
                    </div>
                    <div className="px-4 border-l border-slate-300">
                      <p className="text-xs text-indigo-400 uppercase font-bold tracking-wider mb-1">
                        Status
                      </p>
                      {getStatusBadge(
                        selectedProduct.enrichment_status || "pending",
                      )}
                    </div>
                  </div>
                  {attributesLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                      <Loader2 className="w-8 h-8 animate-spin mb-2 text-indigo-500" />
                      <p>Loading attributes...</p>
                    </div>
                  ) : attributes.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                      <Box className="w-10 h-10 mx-auto mb-3 text-slate-600" />
                      <p>No attributes found for this product.</p>
                    </div>
                  ) : (
                    <>
                      {selectedProduct.image_url_1 && (
                        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden aspect-video flex items-center justify-center p-4">
                          <img
                            src={selectedProduct.image_url_1}
                            alt={selectedProduct.product_name}
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
                          {attributes.map((attr: any) => (
                            <div
                              key={attr.id}
                              className="p-3 bg-white rounded border border-slate-200 hover:border-slate-300 transition-colors"
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-xs font-semibold text-slate-400 uppercase truncate">
                                  {attr.attribute_name}
                                </span>
                                {attr.has_conflict && (
                                  <AlertTriangle
                                    className="w-3 h-3 text-amber-500"
                                    title="Source Conflict"
                                  />
                                )}
                              </div>
                              <div className="text-sm text-slate-700 font-medium">
                                {typeof attr.values?.[0]?.value === "string"
                                  ? attr.values[0].value
                                  : "—"}
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
                            <thead className="bg-white border-b border-slate-200 text-xs text-slate-400 uppercase">
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
                            <tbody className="divide-y divide-slate-200">
                              {attributes.map((attr: any) => (
                                <tr key={attr.id} className="hover:bg-slate-50">
                                  <td className="px-4 py-2 font-medium text-slate-700">
                                    {attr.attribute_name}
                                  </td>
                                  <td className="px-4 py-2 text-slate-600 max-w-[200px] truncate">
                                    {typeof attr.values?.[0]?.value === "string"
                                      ? attr.values[0].value
                                      : "—"}
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                        attr.values?.[0]?.confidence > 0.8
                                          ? "bg-emerald-100 text-emerald-700"
                                          : "bg-amber-100 text-amber-700"
                                      }`}
                                    >
                                      {(
                                        (attr.values?.[0]?.confidence || 0) *
                                        100
                                      ).toFixed(0)}
                                      %
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 text-right font-mono text-xs text-slate-600">
                                    {attr.values?.[0]?.source_id?.slice(0, 8) ||
                                      "—"}
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
              </div>
            </div>
          )}
          <div className="px-6 py-2 border-t border-slate-100 flex items-center justify-end text-xs text-slate-500">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </>
      )}
    </div>
  );
}
function MetricPill({
  label,
  value,
  color = "text-slate-900",
  clickable = false,
  onClick,
}: {
  label: string;
  value: number;
  color?: string;
  clickable?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={clickable ? onClick : undefined}
      className={`bg-white border border-slate-200 rounded-lg px-3 py-1.5 flex items-center justify-between gap-3 ${
        clickable
          ? "cursor-pointer hover:border-amber-300 hover:bg-amber-50/50 transition-colors"
          : ""
      }`}
    >
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
        {label}
      </p>
      <p className={`text-sm font-black ${color}`}>{value.toLocaleString()}</p>
    </div>
  );
}
function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`pb-2 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 ${
        active
          ? "border-indigo-500 text-indigo-400"
          : "border-transparent text-slate-400 hover:text-slate-600"
      }`}
    >
      {label}
    </button>
  );
}
