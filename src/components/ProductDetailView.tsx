import { useEffect, useState, useMemo, useCallback } from "react";
import {
  X,
  Download,
  Search,
  Filter,
  Columns,
  Box,
  Loader2,
  ChevronRight as BreadcrumbSeparator,
  CheckCircle2,
  Lock,
  RefreshCw,
  AlertCircle,
  FileDown,
} from "lucide-react";
import { aggregationService } from "../services/aggregationService";
import { extractionService } from "../services/extractionService";
import { getStatusBadge } from "../utils/projectStatusColorizer";
import { Product, Source } from "../types/database.types";
import { notify } from "../lib/notifications";

interface Props {
  projectId: string;
  projectName: string;
  products: Product[];
  onBack: () => void;
  onNavigateToOverview?: () => void;
}

export function ProductDetailView({
  projectId,
  projectName,
  products,
  onBack,
  onNavigateToOverview,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [attrMap, setAttrMap] = useState<
    Record<string, Record<string, string>>
  >({});
  const [projectSource, setProjectSource] = useState<Source | null>(null);
  const [attrUomMap, setAttrUomMap] = useState<Record<string, Record<string, string>>>({});

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [completenessFilter, setCompletenessFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const parseValue = (str: string) => {
    if (!str) return "—";
    try {
      const jsonStr = str.replace(/'/g, '"').replace(/None/g, "null");
      const parsed = JSON.parse(jsonStr);
      return parsed.value || "—";
    } catch (e) {
      return "—";
    }
  };

  const viewLabel = useMemo(() => {
    if (products.length === 1)
      return (
        products[0].product_name || products[0].product_code || "Product Detail"
      );
    return "Products View";
  }, [products]);

  const loadViewData = useCallback(async () => {
  setLoading(true);
  try {
    const sources = await extractionService.getSourcesByProject(projectId);
    if (sources && sources.length > 0) {
      setProjectSource(sources[0]);
    }

    const attrResults = await Promise.all(
      products.map((p) => aggregationService.getAggregatedAttributes(p.id)),
    );

    const newMap: Record<string, Record<string, string>> = {};
    const newUomMap: Record<string, Record<string, string>> = {};
    
    products.forEach((p, index) => {
      const productAttrs: Record<string, string> = {};
      const productUoms: Record<string, string> = {};
      
      attrResults[index].forEach((a) => {
  productAttrs[a.attribute_name] = parseValue(a.values[0]?.value);
  
  const dynAttr = (p.dynamic_attributes || []).find(
    (d: any) => d.name === a.attribute_name
  );
  if (dynAttr?.uom) {
    productUoms[a.attribute_name] = dynAttr.uom;
  }
});
      
      newMap[p.id] = productAttrs;
      newUomMap[p.id] = productUoms;
    });

    setAttrMap(newMap);
    setAttrUomMap(newUomMap);
  } catch (err) {
    console.error("Failed to load view data", err);
  } finally {
    setLoading(false);
  }
}, [projectId, products]);

  useEffect(() => {
    loadViewData();
  }, [loadViewData]);

  const handleExport = async () => {
    if (filteredProducts.length === 0) return;
    setExporting(true);
    try {
      const productIds = filteredProducts.map((p) => p.id);
      const blob = await aggregationService.exportSelectedItems([], productIds);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectName}_Export.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      notify.success("Export successful");
    } catch (error) {
      notify.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadInput = async () => {
    if (!projectSource) {
      notify.error("No input source found");
      return;
    }
    try {
      await extractionService.download(projectSource.id, "input");
    } catch (e) {
      notify.error("Failed to download input");
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !search ||
        p.product_name?.toLowerCase().includes(search.toLowerCase()) ||
        p.product_code?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || p.enrichment_status === statusFilter;
      const matchesBrand =
        brandFilter === "all" || p.brand_name === brandFilter;
      const matchesCategory =
        categoryFilter === "all" || p.category_3 === categoryFilter;
      const score = p.completeness_score || 0;
      const matchesComp =
        completenessFilter === "all" ||
        (completenessFilter === "high" && score > 80) ||
        (completenessFilter === "mid" && score >= 50 && score <= 80) ||
        (completenessFilter === "low" && score < 50);
      return (
        matchesSearch &&
        matchesStatus &&
        matchesBrand &&
        matchesCategory &&
        matchesComp
      );
    });
  }, [
    products,
    search,
    statusFilter,
    brandFilter,
    categoryFilter,
    completenessFilter,
  ]);

  const dynamicColumns = useMemo(() => {
    const keys = new Set<string>();
    Object.values(attrMap).forEach((obj) =>
      Object.keys(obj).forEach((k) => keys.add(k)),
    );
    return Array.from(keys);
  }, [attrMap]);

  const uniqueBrands = useMemo(
    () => [...new Set(products.map((p) => p.brand_name).filter(Boolean))],
    [products],
  );
  const uniqueCategories = useMemo(
    () => [...new Set(products.map((p) => p.category_3).filter(Boolean))],
    [products],
  );

  const stats = useMemo(
    () => ({
      total: products.length,
      aggregated: products.filter((p) => p.enrichment_status === "completed")
        .length,
      enrichment: products.filter((p) => p.workflow_stage === "enrichment")
        .length,
      progress: products.filter((p) => p.enrichment_status === "processing")
        .length,
      failed: products.filter((p) => p.enrichment_status === "failed").length,
    }),
    [products],
  );

  return (
<div className="flex flex-col min-h-screen bg-slate-50 text-slate-900">

      <div className="px-8 py-5 flex items-center justify-between bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
          <button
            onClick={onNavigateToOverview || onBack}
            className="hover:text-indigo-600 transition-colors"
          >
            Projects
          </button>
          <BreadcrumbSeparator className="w-4 h-4" />
          <button
            onClick={onBack}
            className="hover:text-indigo-600 transition-colors"
          >
            {projectName}
          </button>
          <BreadcrumbSeparator className="w-4 h-4" />
          <span
            className="hover:text-indigo-600 transition-colors"
            title={viewLabel}
          >
            {viewLabel}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadInput}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            <FileDown className="w-4 h-4" /> Download Input
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Export
          </button>
          <button
            onClick={onBack}
            className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-rose-50 hover:text-rose-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="px-8 py-6 grid grid-cols-5 gap-4 shrink-0">
        <StatCard
          label="Total Products"
          value={stats.total}
          icon={<Box className="w-4 h-4 text-slate-400" />}
        />
        <StatCard
          label="Aggregated"
          value={stats.aggregated}
          color="text-emerald-600"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
        />
        <StatCard
          label="Enrichment"
          value={stats.enrichment}
          color="text-orange-600"
          icon={<Lock className="w-4 h-4 text-orange-500" />}
        />
        <StatCard
          label="In Progress"
          value={stats.progress}
          color="text-blue-600"
          icon={<RefreshCw className="w-4 h-4 text-blue-500" />}
        />
        <StatCard
          label="Failed"
          value={stats.failed}
          color="text-rose-600"
          icon={<AlertCircle className="w-4 h-4 text-rose-500" />}
        />
      </div>

      <div className="px-8 flex items-center justify-between mb-4 gap-4 shrink-0">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 outline-none"
          >
            <option value="all">All Brands</option>
            {uniqueBrands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 outline-none"
          >
            <option value="all">All Categories</option>
            {uniqueCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 outline-none"
          >
            <option value="all">All Status</option>
            <option value="completed">Aggregated</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={completenessFilter}
            onChange={(e) => setCompletenessFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 outline-none"
          >
            <option value="all">All Completeness</option>
            <option value="high">High (&gt;80%)</option>
            <option value="mid">Mid (50% - 80%)</option>
            <option value="low">Low (&lt;50%)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600">
            <Filter className="w-3.5 h-3.5" /> Filters
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600">
            <Columns className="w-3.5 h-3.5" /> Columns
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-8 pb-8 flex flex-col">
        <div className="flex-1 overflow-auto bg-white border border-slate-200 rounded-2xl shadow-sm">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="sticky top-0 bg-slate-50 z-20 border-b border-slate-200">
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="p-4 w-12 bg-slate-50 sticky left-0 z-30 shadow-[1px_0_0_0_#e2e8f0]">
                  <input
                    type="checkbox"
                    checked
                    readOnly
                    className="rounded border-slate-300"
                  />
                </th>
                <th className="p-4 w-20 bg-slate-50 sticky left-12 z-30 shadow-[1px_0_0_0_#e2e8f0]">
                  Image
                </th>
                <th className="p-4 w-72 bg-slate-50 sticky left-[112px] z-30 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.05)]">
                  Product Name
                </th>
                {dynamicColumns.map((col, idx) => (
                  <th key={col} className="p-4 w-48 border-l border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-400 font-bold">
                        Attribute {idx + 1}
                      </span>
                      <span className="text-slate-700 truncate" title={col}>
                        {col}
                      </span>
                    </div>
                  </th>
                ))}
                <th className="p-4 w-36 text-center border-l border-slate-100">
                  Completeness
                </th>
                <th className="p-4 w-32 border-l border-slate-100 text-center">
                  Status
                </th>
                <th className="p-4 w-16 text-center border-l border-slate-100">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={100}
                    className="py-32 text-center text-slate-400 font-medium"
                  >
                    Syncing dynamic data...
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr
                    key={p.id}
                    className="group hover:bg-slate-50 transition-colors"
                  >
                    <td className="p-4 sticky left-0 bg-white group-hover:bg-slate-50 z-10 shadow-[1px_0_0_0_#e2e8f0]">
                      <input
                        type="checkbox"
                        checked
                        readOnly
                        className="rounded border-slate-300"
                      />
                    </td>
                    <td className="p-4 sticky left-12 bg-white group-hover:bg-slate-50 z-10 shadow-[1px_0_0_0_#e2e8f0]">
                      <div className="w-12 h-12 bg-slate-50 rounded-lg p-1 border border-slate-100">
                        <img
                          src={p.image_url_1 || ""}
                          alt=""
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </td>
                    <td className="p-4 sticky left-[112px] bg-white group-hover:bg-slate-50 z-10 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.05)]">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-slate-800 text-sm line-clamp-2 leading-snug">
                          {p.product_name}
                        </span>
                        <span className="text-[10px] text-indigo-500 font-mono font-bold">
                          MPN: {p.product_code}
                        </span>
                      </div>
                    </td>
                    {dynamicColumns.map((col) => (
  <td key={col} className="p-4 text-sm text-slate-600 border-l border-slate-50 font-medium">
    {attrMap[p.id]?.[col] || "—"}
    {attrUomMap[p.id]?.[col] && (
      <span className="text-xs text-slate-400 ml-1">{attrUomMap[p.id][col]}</span>
    )}
  </td>
))}
                    <td className="p-4 border-l border-slate-50">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-xs font-black text-slate-700">
                          {p.completeness_score || 0}%
                        </span>
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500"
                            style={{ width: `${p.completeness_score || 0}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-4 border-l border-slate-50 text-center">
                      {getStatusBadge(p.enrichment_status || "pending", true)}
                    </td>
                    <td className="p-4 text-center border-l border-slate-100">
                      <button
                        onClick={() => {
                          /* add handleAggregate(p.id) here */
                        }}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-wider rounded-md hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100"
                      >
                        Aggregate
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: any) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
      <div className="flex justify-between items-start">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          {label}
        </span>
        <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
          {icon}
        </div>
      </div>
      <span className="text-3xl font-black text-slate-900 mt-4">
        {value.toLocaleString()}
      </span>
    </div>
  );
}
