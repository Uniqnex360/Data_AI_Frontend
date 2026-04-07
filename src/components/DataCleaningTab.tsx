import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  Loader2,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  X,
  Play,
  Search,
} from "lucide-react";
import { productService } from "../services/productService";
import { projectService } from "../services/projectService";
import { notify } from "../lib/notifications";
import { Product, Project } from "../types/business-rules.types.ts";
import { cleansingService } from "../services/cleansingService";
import { getStatusBadge } from "../utils/projectStatusColorizer";
import { useProjectFilters } from "../hooks/useProjectFilters.ts";

// ─── Types ────────────────────────────────────────────────────────────────────
type SortDir = "asc" | "desc" | null;
interface ColSort {
  attr: string;
  dir: SortDir;
}
interface ColFilter {
  attr: string;
  value: string;
}

// ─── Status pill ──────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  validated:  "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  draft:      "bg-amber-50  text-amber-700  ring-1 ring-amber-200",
  pending:    "bg-amber-50  text-amber-700  ring-1 ring-amber-200",
  completed:  "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  failed:     "bg-red-50    text-red-700    ring-1 ring-red-200",
  processing: "bg-blue-50   text-blue-700   ring-1 ring-blue-200",
};

// ─── Fixed column widths ──────────────────────────────────────────────────────
const COL_CHECKBOX  = 40;
const COL_STATUS    = 110;
const COL_ENTITY    = 180;  // MPN / product code
const COL_NAME      = 220;
const COL_BRAND     = 140;
const COL_CATEGORY  = 160;
const COL_ATTR      = 260;  // each attribute column — wide enough for value + UOM stacked
const COL_ACTION    = 90;

const FIXED_WIDTH = COL_CHECKBOX + COL_STATUS + COL_ENTITY + COL_NAME + COL_BRAND + COL_CATEGORY;

// ─── Header cell with sort + filter ──────────────────────────────────────────
function AttrHeader({
  attr,
  sort,
  filter,
  onSort,
  onFilter,
}: {
  attr: string;
  sort: SortDir;
  filter: string;
  onSort: () => void;
  onFilter: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(filter);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const SortIcon = sort === "asc" ? ArrowUp : sort === "desc" ? ArrowDown : ArrowUpDown;

  return (
    <th
      style={{ width: COL_ATTR, minWidth: COL_ATTR }}
      className="relative border-r border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 select-none"
    >
      <div ref={ref} className="flex items-center gap-1 px-3 py-3">
        <span className="truncate flex-1" title={attr}>{attr}</span>

        {/* Sort toggle */}
        <button
          onClick={onSort}
          className={`p-0.5 rounded hover:bg-slate-200 transition-colors ${sort ? "text-blue-600" : "text-slate-400"}`}
          title="Sort"
        >
          <SortIcon className="w-3 h-3" />
        </button>

        {/* Filter popover */}
        <button
          onClick={() => setOpen(!open)}
          className={`p-0.5 rounded hover:bg-slate-200 transition-colors ${filter ? "text-blue-600" : "text-slate-400"}`}
          title="Filter"
        >
          <Filter className="w-3 h-3" />
        </button>

        {open && (
          <div className="absolute top-full left-0 z-50 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-xl p-2">
            <div className="flex items-center gap-1 border border-slate-200 rounded px-2">
              <Search className="w-3 h-3 text-slate-400 shrink-0" />
              <input
                autoFocus
                className="flex-1 py-1.5 text-xs outline-none"
                placeholder="Filter value…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { onFilter(draft); setOpen(false); }
                  if (e.key === "Escape") setOpen(false);
                }}
              />
              {draft && (
                <button onClick={() => { setDraft(""); onFilter(""); }}>
                  <X className="w-3 h-3 text-slate-400 hover:text-slate-600" />
                </button>
              )}
            </div>
            <button
              onClick={() => { onFilter(draft); setOpen(false); }}
              className="mt-2 w-full py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {/* Active filter indicator bar */}
      {filter && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
      )}
    </th>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function DataCleaningTab() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [editingAttributes, setEditingAttributes] = useState<
    Record<string, Record<string, { value: string; uom: string }>>
  >({});
  const [savingAttributes, setSavingAttributes] = useState<Record<string, boolean>>({});
  const [selectedLLM, setSelectedLLM] = useState<string>("openai");

  // Filtering / sorting state
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [brandFilter, setBrandFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [colSorts, setColSorts] = useState<ColSort[]>([]);
  const [colFilters, setColFilters] = useState<ColFilter[]>([]);

  // Attributes ordered by category
  const [availableAttributes, setAvailableAttributes] = useState<string[]>([]);

  // Bulk update
  const [selectedBulkAttributes, setSelectedBulkAttributes] = useState<string[]>([]);
  const [bulkAttributeValues, setBulkAttributeValues] = useState<Record<string, string>>({});
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // (scroll sync handled natively by single table container)

  const { availableBrands, availableCategories, loadProjectFilters } = useProjectFilters();

  const llmOptions = [
    { value: "openai",  label: "Datavio Algo-1" },
    { value: "gemini",  label: "Datavio Algo-2" },
    { value: "claude",  label: "Datavio Algo-3" },
  ];

  useEffect(() => { loadProjects(); loadProjectFilters(); }, [loadProjectFilters]);
  useEffect(() => { if (selectedProjectId) loadProducts(); }, [selectedProjectId]);

  // Single table container handles all scrolling naturally

  // ── Data loaders ────────────────────────────────────────────────────────────
  const loadProjects = async () => {
    setProjectsLoading(true);
    try {
      const data = await projectService.getAllProjects();
      setProjects(data.filter((p: Project) => p.operation_mode === "cleaning"));
    } catch { notify.error("Failed to load projects"); }
    finally { setProjectsLoading(false); }
  };

  const loadProducts = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const data = await productService.getProductsByProject(selectedProjectId);
      setProducts(data);
    } catch { notify.error("Failed to load products"); }
    finally { setLoading(false); }
  };

  const loadProjectAttributes = useCallback(async (projectId: string, category?: string) => {
    if (!projectId) { setAvailableAttributes([]); return; }
    try {
      const attrs = await productService.getProjectAttributes(projectId, category);
      setAvailableAttributes(attrs);
      // Reset col sorts/filters when attribute set changes
      setColSorts([]);
      setColFilters([]);
    } catch { setAvailableAttributes([]); }
  }, []);

  // ── Sorting & filtering helpers ─────────────────────────────────────────────
  const toggleSort = (attr: string) => {
    setColSorts((prev) => {
      const existing = prev.find((s) => s.attr === attr);
      if (!existing)         return [...prev, { attr, dir: "asc" }];
      if (existing.dir === "asc")  return prev.map((s) => s.attr === attr ? { attr, dir: "desc" } : s);
      return prev.filter((s) => s.attr !== attr); // remove
    });
  };

  const setColFilter = (attr: string, value: string) => {
    setColFilters((prev) => {
      const without = prev.filter((f) => f.attr !== attr);
      return value ? [...without, { attr, value }] : without;
    });
  };

  const getSort = (attr: string): SortDir =>
    colSorts.find((s) => s.attr === attr)?.dir ?? null;

  const getFilter = (attr: string): string =>
    colFilters.find((f) => f.attr === attr)?.value ?? "";

  // ── Derived products ────────────────────────────────────────────────────────
  const filteredSortedProducts = (() => {
    let list = [...products];

    // Fixed filters
    if (statusFilter) list = list.filter((p) => p.enrichment_status === statusFilter);
    if (brandFilter)  list = list.filter((p) => p.brand_name === brandFilter);
    if (categoryFilter) list = list.filter((p) => p.category_1 === categoryFilter);

    // Column attribute filters
    for (const { attr, value } of colFilters) {
      const v = value.toLowerCase();
      list = list.filter((p) => {
        const a = (p.dynamic_attributes || []).find((x) => x.name === attr);
        return (a?.value ?? "").toLowerCase().includes(v);
      });
    }

    // Multi-column sorts (applied in reverse priority order)
    for (const { attr, dir } of [...colSorts].reverse()) {
      list.sort((a, b) => {
        const va = (a.dynamic_attributes || []).find((x) => x.name === attr)?.value ?? "";
        const vb = (b.dynamic_attributes || []).find((x) => x.name === attr)?.value ?? "";
        const cmp = va.localeCompare(vb, undefined, { numeric: true });
        return dir === "asc" ? cmp : -cmp;
      });
    }

    return list;
  })();

  // ── Selection helpers ───────────────────────────────────────────────────────
  const toggleProduct = (id: string) =>
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelectedProductIds(
      selectedProductIds.size === filteredSortedProducts.length && filteredSortedProducts.length > 0
        ? new Set()
        : new Set(filteredSortedProducts.map((p) => p.id))
    );

  // ── Attribute edit ──────────────────────────────────────────────────────────
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
          value: field === "value" ? newValue : (prev[productId]?.[attrName]?.value ?? ""),
          uom:   field === "uom"   ? newValue : (prev[productId]?.[attrName]?.uom   ?? ""),
        },
      },
    }));
  };

  const handleSaveAttributes = async (productId: string) => {
    const changes = editingAttributes[productId];
    if (!changes || Object.keys(changes).length === 0) return;
    setSavingAttributes((prev) => ({ ...prev, [productId]: true }));
    try {
      await cleansingService.updateProductAttributes(productId,
        Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, { value: v.value, uom: v.uom }])),
      );
      notify.success("Attributes updated");
      await loadProducts();
      setEditingAttributes((prev) => { const s = { ...prev }; delete s[productId]; return s; });
    } catch { notify.error("Failed to update attributes"); }
    finally { setSavingAttributes((prev) => { const s = { ...prev }; delete s[productId]; return s; }); }
  };

  // ── Cleaning ────────────────────────────────────────────────────────────────
  const pollCleaning = (taskId: string, productIds: string[]) => {
    const iv = setInterval(async () => {
      try {
        const status = await cleansingService.getTaskStatus(taskId);
        if (status.status === "completed") {
          clearInterval(iv);
          await loadProducts();
          notify.success("Cleaning completed");
          setCleaning(false);
        } else if (status.status === "failed") {
          clearInterval(iv);
          setProducts((prev) =>
            prev.map((p) => productIds.includes(p.id) ? { ...p, enrichment_status: "failed" } : p)
          );
          notify.error("Cleaning failed");
          setCleaning(false);
        }
      } catch { clearInterval(iv); setCleaning(false); }
    }, 2500);
  };

  const handleCleanProduct = async (productId: string) => {
    setCleaning(true);
    setProducts((prev) => prev.map((p) => p.id === productId ? { ...p, enrichment_status: "processing" } : p));
    try {
      const result = await cleansingService.runCleaning(selectedProjectId, selectedLLM, [productId]);
      notify.success("Cleaning started");
      pollCleaning(result.task_id, [productId]);
    } catch (e: any) {
      setProducts((prev) => prev.map((p) => p.id === productId ? { ...p, enrichment_status: "pending" } : p));
      notify.error("Cleaning failed", e.message);
      setCleaning(false);
    }
  };

  const handleCleanSelected = async () => {
    if (selectedProductIds.size === 0) { notify.info("No products selected"); return; }
    const ids = Array.from(selectedProductIds);
    setCleaning(true);
    setProducts((prev) => prev.map((p) => ids.includes(p.id) ? { ...p, enrichment_status: "processing" } : p));
    try {
      const result = await cleansingService.runCleaning(selectedProjectId, selectedLLM, ids);
      notify.success("Cleaning started", `Cleaning ${ids.length} product(s)`);
      pollCleaning(result.task_id, ids);
      setSelectedProductIds(new Set());
    } catch (e: any) {
      setProducts((prev) => prev.map((p) => ids.includes(p.id) ? { ...p, enrichment_status: "pending" } : p));
      notify.error("Batch cleaning failed", e.message);
      setCleaning(false);
    }
  };

  const handleDownloadSelected = async () => {
    setDownloading(true);
    try {
      const blob = await cleansingService.downloadSelected({
        project_ids: [],
        product_ids: Array.from(selectedProductIds),
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cleaning_export.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      notify.success("Download started");
    } catch { notify.error("Failed to download export"); }
    finally { setDownloading(false); }
  };

  const handleBulkUpdate = async () => {
    if (selectedProductIds.size === 0) { notify.info("No products selected"); return; }
    const attrs = Object.fromEntries(
      selectedBulkAttributes.map((a) => [a, (bulkAttributeValues[a] || "").trim()]).filter(([, v]) => v)
    );
    if (Object.keys(attrs).length === 0) { notify.info("Enter at least one value"); return; }
    setBulkUpdating(true);
    try {
      await cleansingService.bulkUpdateProductAttributes({ product_ids: Array.from(selectedProductIds), attributes: attrs });
      notify.success("Bulk update completed");
      await loadProducts();
      setBulkAttributeValues({});
      setSelectedBulkAttributes([]);
      setSelectedProductIds(new Set());
    } catch (e: any) { notify.error("Bulk update failed", e.message); }
    finally { setBulkUpdating(false); }
  };

  const handleReset = () => {
    setSelectedProjectId(""); setSelectedProductIds(new Set());
    setStatusFilter(""); setBrandFilter(""); setCategoryFilter("");
    setColSorts([]); setColFilters([]);
    setAvailableAttributes([]); setProducts([]);
    setSelectedBulkAttributes({}); setBulkAttributeValues({});
    setEditingAttributes({});
    loadProjectFilters();
  };

  const hasActiveFilters = !!statusFilter || !!brandFilter || !!categoryFilter || colFilters.length > 0;
  const canDownload = selectedProductIds.size > 0 && products.some(
    (p) => selectedProductIds.has(p.id) && p.enrichment_status !== "pending"
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-1 bg-slate-50 min-h-screen font-sans">

      {/* ── Page header ── */}
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-slate-900">Data Cleaning & Validation</h3>
        <p className="text-sm text-slate-500 mt-0.5">Select a project, then clean and standardise product attributes</p>
      </div>

      {/* ── Toolbar ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 mb-3">
        <div className="flex items-end gap-3 flex-wrap">
          {/* LLM */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1 uppercase tracking-wide">Algorithm</label>
            <select
              value={selectedLLM}
              onChange={(e) => setSelectedLLM(e.target.value)}
              className="h-9 px-3 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {llmOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Project */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1 uppercase tracking-wide">Project</label>
            <select
              value={selectedProjectId}
              onChange={async (e) => {
                const id = e.target.value;
                setSelectedProjectId(id);
                setColSorts([]); setColFilters([]);
                await loadProjectFilters(id || undefined);
                await loadProjectAttributes(id);
              }}
              className="h-9 px-3 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Projects</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1 uppercase tracking-wide">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {/* Brand */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1 uppercase tracking-wide">Brand</label>
            <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}
              disabled={availableBrands.length === 0}
              className="h-9 px-3 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40">
              <option value="">All Brands</option>
              {availableBrands.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {/* Category — triggers attribute reload */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1 uppercase tracking-wide">Category</label>
            <select value={categoryFilter}
              onChange={async (e) => {
                const cat = e.target.value;
                setCategoryFilter(cat);
                setColSorts([]); setColFilters([]);
                await loadProjectAttributes(selectedProjectId, cat || undefined);
              }}
              disabled={availableCategories.length === 0}
              className="h-9 px-3 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40">
              <option value="">All Categories</option>
              {availableCategories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {hasActiveFilters && (
            <button onClick={handleReset}
              className="h-9 px-3 border border-slate-200 rounded-lg bg-white text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> Clear filters
            </button>
          )}

          {/* Right-side actions */}
          {selectedProjectId && (
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={handleCleanSelected}
                disabled={cleaning || selectedProductIds.size === 0}
                className="h-9 flex items-center gap-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 text-sm font-medium transition-colors">
                {cleaning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Clean ({selectedProductIds.size})
              </button>
              <button
                onClick={handleDownloadSelected}
                disabled={downloading || !canDownload}
                className="h-9 flex items-center gap-2 px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40 text-sm font-medium transition-colors">
                {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                Download
              </button>
            </div>
          )}
        </div>

        {/* Active filter chips */}
        {colFilters.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-slate-100">
            {colFilters.map(({ attr, value }) => (
              <span key={attr}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200">
                <Filter className="w-2.5 h-2.5" />
                {attr}: <strong>{value}</strong>
                <button onClick={() => setColFilter(attr, "")} className="ml-0.5 hover:text-blue-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {colSorts.map(({ attr, dir }) => (
              <span key={attr}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 text-violet-700 text-xs rounded-full border border-violet-200">
                {dir === "asc" ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                {attr}
                <button onClick={() => setColSorts((p) => p.filter((s) => s.attr !== attr))} className="ml-0.5 hover:text-violet-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Bulk attribute update panel ── */}
      {selectedProjectId && availableAttributes.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-3 mb-3">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Bulk Update Attributes</p>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="border border-slate-200 rounded-lg bg-slate-50 p-2 max-h-40 overflow-y-auto flex flex-wrap gap-2 min-w-[300px] flex-1">
              {availableAttributes.map((attr) => {
                const checked = selectedBulkAttributes.includes(attr);
                return (
                  <label key={attr} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedBulkAttributes((p) => [...p, attr]);
                        else {
                          setSelectedBulkAttributes((p) => p.filter((a) => a !== attr));
                          setBulkAttributeValues((p) => { const n = { ...p }; delete n[attr]; return n; });
                        }
                      }}
                      className="rounded border-slate-300 text-blue-600" />
                    <span className="text-xs text-slate-700">{attr}</span>
                    {checked && (
                      <input type="text" value={bulkAttributeValues[attr] || ""}
                        onChange={(e) => setBulkAttributeValues((p) => ({ ...p, [attr]: e.target.value }))}
                        placeholder="value"
                        className="ml-1 h-6 w-24 px-2 border border-slate-300 rounded text-xs" />
                    )}
                  </label>
                );
              })}
            </div>
            <button onClick={handleBulkUpdate}
              disabled={bulkUpdating || selectedProductIds.size === 0 || selectedBulkAttributes.length === 0}
              className="h-9 px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40 text-sm font-medium">
              {bulkUpdating ? "Updating…" : `Update ${selectedProductIds.size} selected`}
            </button>
          </div>
        </div>
      )}

      {/* ── Main table ── */}
      {!selectedProjectId ? (
        // Project picker
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h4 className="text-base font-semibold text-slate-900 mb-1">Cleaning Projects</h4>
          <p className="text-sm text-slate-500 mb-4">Select a project to view and clean products</p>
          {projectsLoading ? (
            <div className="py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" /></div>
          ) : projects.length === 0 ? (
            <div className="py-10 text-center">
              <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No cleaning projects found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map((project) => (
                <button key={project.id} type="button"
                  onClick={async () => {
                    setSelectedProjectId(project.id);
                    await loadProjectFilters(project.id);
                    await loadProjectAttributes(project.id);
                  }}
                  className="w-full p-3 border border-slate-200 rounded-lg text-left hover:border-blue-300 hover:bg-blue-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900">{project.name}</span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                        {project.product_count ?? 0} products
                      </span>
                      {project.use_case && (
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded-full">{project.use_case}</span>
                      )}
                      {project.source_status && getStatusBadge(project.source_status)}
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
      ) : filteredSortedProducts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500">No products found</p>
        </div>
      ) : (
        /* ── Spreadsheet container ── */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">

          {/* Selection summary bar */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
            <input type="checkbox"
              checked={selectedProductIds.size === filteredSortedProducts.length && filteredSortedProducts.length > 0}
              onChange={toggleAll}
              className="rounded border-slate-300 text-blue-600" />
            <span>
              {selectedProductIds.size > 0
                ? `${selectedProductIds.size} of ${filteredSortedProducts.length} selected`
                : `${filteredSortedProducts.length} rows`}
            </span>
            {colFilters.length > 0 && (
              <span className="text-blue-600">{colFilters.length} filter{colFilters.length > 1 ? "s" : ""} active</span>
            )}
          </div>

          {/* ── Single unified scrollable table with sticky left columns ── */}
          <div
            className="overflow-auto"
            style={{ maxHeight: "calc(100vh - 260px)" }}
          >
            <table className="border-collapse" style={{ tableLayout: "fixed", width: FIXED_WIDTH + COL_ACTION + availableAttributes.length * COL_ATTR }}>
              {/* ── THEAD: sticky to top ── */}
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-50">

                  {/* Fixed sticky headers */}
                  <th style={{ width: COL_CHECKBOX, minWidth: COL_CHECKBOX, left: 0, position: "sticky", zIndex: 20 }}
                    className="px-3 py-3 border-b border-r border-slate-200 bg-slate-50">
                    <input type="checkbox"
                      checked={selectedProductIds.size === filteredSortedProducts.length && filteredSortedProducts.length > 0}
                      onChange={toggleAll}
                      className="rounded border-slate-300 text-blue-600" />
                  </th>
                  <th style={{ width: COL_STATUS, minWidth: COL_STATUS, left: COL_CHECKBOX, position: "sticky", zIndex: 20 }}
                    className="px-3 py-3 border-b border-r border-slate-200 bg-slate-50">Status</th>
                  <th style={{ width: COL_ENTITY, minWidth: COL_ENTITY, left: COL_CHECKBOX + COL_STATUS, position: "sticky", zIndex: 20 }}
                    className="px-3 py-3 border-b border-r border-slate-200 bg-slate-50">Entity</th>
                  <th style={{ width: COL_NAME, minWidth: COL_NAME, left: COL_CHECKBOX + COL_STATUS + COL_ENTITY, position: "sticky", zIndex: 20 }}
                    className="px-3 py-3 border-b border-r border-slate-200 bg-slate-50">Name (Product)</th>
                  <th style={{ width: COL_BRAND, minWidth: COL_BRAND, left: COL_CHECKBOX + COL_STATUS + COL_ENTITY + COL_NAME, position: "sticky", zIndex: 20 }}
                    className="px-3 py-3 border-b border-r border-slate-200 bg-slate-50">Brand</th>
                  <th style={{ width: COL_CATEGORY, minWidth: COL_CATEGORY, left: COL_CHECKBOX + COL_STATUS + COL_ENTITY + COL_NAME + COL_BRAND, position: "sticky", zIndex: 20 }}
                    className="px-3 py-3 border-b border-r border-slate-200 bg-slate-50">Category</th>

                  {/* Scrollable attribute headers */}
                  {availableAttributes.map((attr) => (
                    <AttrHeader
                      key={attr}
                      attr={attr}
                      sort={getSort(attr)}
                      filter={getFilter(attr)}
                      onSort={() => toggleSort(attr)}
                      onFilter={(v) => setColFilter(attr, v)}
                    />
                  ))}

                  {/* Action — sticky right */}
                  <th style={{ width: COL_ACTION, minWidth: COL_ACTION, right: 0, position: "sticky", zIndex: 20 }}
                    className="px-3 py-3 border-b border-l border-slate-200 bg-slate-50 text-center">Action</th>
                </tr>
              </thead>

              {/* ── TBODY: every row has the same column structure ── */}
              <tbody>
                {filteredSortedProducts.map((product) => (
                  <tr key={product.id} className="border-b border-slate-100 hover:bg-slate-50/70 align-middle group">

                    {/* Sticky left: checkbox */}
                    <td style={{ width: COL_CHECKBOX, position: "sticky", left: 0, zIndex: 10 }}
                      className="px-3 py-2 border-r border-slate-100 bg-white group-hover:bg-slate-50/70">
                      <input type="checkbox"
                        checked={selectedProductIds.has(product.id)}
                        onChange={() => toggleProduct(product.id)}
                        className="rounded border-slate-300 text-blue-600" />
                    </td>

                    {/* Sticky left: status */}
                    <td style={{ width: COL_STATUS, position: "sticky", left: COL_CHECKBOX, zIndex: 10 }}
                      className="px-3 py-2 border-r border-slate-100 bg-white group-hover:bg-slate-50/70">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_STYLES[product.enrichment_status] || "bg-slate-100 text-slate-600"}`}>
                        {product.enrichment_status}
                      </span>
                    </td>

                    {/* Sticky left: entity/MPN */}
                    <td style={{ width: COL_ENTITY, position: "sticky", left: COL_CHECKBOX + COL_STATUS, zIndex: 10 }}
                      className="px-3 py-2 border-r border-slate-100 bg-white group-hover:bg-slate-50/70">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded bg-amber-400 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                          {(product.product_code || "?")[0].toUpperCase()}
                        </span>
                        <span className="text-xs font-mono text-slate-700 truncate" title={product.product_code}>
                          {product.product_code}
                        </span>
                      </div>
                    </td>

                    {/* Sticky left: name */}
                    <td style={{ width: COL_NAME, position: "sticky", left: COL_CHECKBOX + COL_STATUS + COL_ENTITY, zIndex: 10 }}
                      className="px-3 py-2 border-r border-slate-100 bg-white group-hover:bg-slate-50/70">
                      <span className="text-xs text-slate-800 leading-snug line-clamp-2" title={product.product_name}>
                        {product.product_name}
                      </span>
                    </td>

                    {/* Sticky left: brand */}
                    <td style={{ width: COL_BRAND, position: "sticky", left: COL_CHECKBOX + COL_STATUS + COL_ENTITY + COL_NAME, zIndex: 10 }}
                      className="px-3 py-2 border-r border-slate-100 bg-white group-hover:bg-slate-50/70">
                      <span className="text-xs text-slate-600">{product.brand_name}</span>
                    </td>

                    {/* Sticky left: category */}
                    <td style={{ width: COL_CATEGORY, position: "sticky", left: COL_CHECKBOX + COL_STATUS + COL_ENTITY + COL_NAME + COL_BRAND, zIndex: 10 }}
                      className="px-3 py-2 border-r border-slate-200 bg-white group-hover:bg-slate-50/70">
                      <span className="text-xs text-slate-600">{product.category_1}</span>
                    </td>

                    {/* Scrollable attribute cells — same row, same height */}
                    {availableAttributes.map((attr) => {
                      const dynAttr = (product.dynamic_attributes || []).find((a) => a.name === attr);
                      const edited  = editingAttributes[product.id]?.[attr];
                      const curVal  = edited?.value ?? dynAttr?.value ?? "";
                      const curUom  = edited?.uom   ?? dynAttr?.unit  ?? dynAttr?.uom ?? "";
                      const conflict = product.validation_conflicts?.[attr];

                      return (
                        <td
                          key={attr}
                          style={{ width: COL_ATTR, minWidth: COL_ATTR }}
                          className={`border-r border-slate-100 p-0 align-middle ${conflict ? "bg-amber-50/40" : ""}`}
                        >
                          <div className="flex flex-col px-2 py-1.5 gap-1">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={curVal}
                                onChange={(e) => handleAttributeChange(product.id, attr, "value", e.target.value)}
                                disabled={savingAttributes[product.id]}
                                placeholder="—"
                                className="flex-1 h-7 px-2 text-xs rounded border border-slate-200 bg-white outline-none placeholder-slate-300 disabled:opacity-40 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors"
                              />
                              {conflict && (
                                <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" title="AI suggested correction" />
                              )}
                            </div>
                            <input
                              type="text"
                              value={curUom}
                              onChange={(e) => handleAttributeChange(product.id, attr, "uom", e.target.value)}
                              placeholder="unit (e.g. kg, V)"
                              className="h-6 px-2 text-[11px] rounded border border-slate-200 bg-slate-50 text-slate-400 outline-none placeholder-slate-300 focus:border-blue-300 focus:bg-white transition-colors w-full"
                            />
                          </div>
                        </td>
                      );
                    })}

                    {/* Sticky right: action */}
                    <td style={{ width: COL_ACTION, position: "sticky", right: 0, zIndex: 10 }}
                      className="px-3 py-2 border-l border-slate-200 bg-white group-hover:bg-slate-50/70 text-center">
                      <div className="flex flex-col gap-1 items-center">
                        <button
                          onClick={() => handleCleanProduct(product.id)}
                          disabled={cleaning || product.enrichment_status === "processing"}
                          className="text-blue-600 hover:text-blue-700 text-xs font-medium disabled:opacity-40 hover:underline"
                        >
                          {product.enrichment_status === "processing"
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : product.enrichment_status === "completed" ? "Re-clean" : "Clean"}
                        </button>
                        {Object.keys(editingAttributes[product.id] || {}).length > 0 && (
                          <button
                            onClick={() => handleSaveAttributes(product.id)}
                            disabled={savingAttributes[product.id]}
                            className="text-emerald-600 hover:text-emerald-700 text-xs font-medium disabled:opacity-40 hover:underline inline-flex items-center gap-0.5"
                          >
                            {savingAttributes[product.id]
                              ? <><Loader2 className="w-3 h-3 animate-spin" />Saving</>
                              : "Save"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}