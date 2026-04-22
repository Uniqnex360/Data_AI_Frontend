import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  Image as ImageIcon,
  Loader2,
  Play,
  Search,
  X,
  XCircle,
} from "lucide-react";
import { productService } from "../services/productService";
import { projectService } from "../services/projectService";
import { notify } from "../lib/notifications";
import { Product, Project } from "../types/business-rules.types.ts";
import { cleansingService } from "../services/cleansingService";
import { getStatusBadge } from "../utils/projectStatusColorizer";
import { useProjectFilters } from "../hooks/useProjectFilters.ts";

type SortDir = "asc" | "desc" | null;
interface ColSort {
  attr: string;
  dir: SortDir;
}
interface ColFilter {
  attr: string;
  value: string;
}

const PRODUCT_STATUS_ICON = (status?: string) => {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    case "failed":
      return <XCircle className="w-4 h-4 text-red-600" />;
    case "processing":
      return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
    case "pending":
    default:
      return <Clock className="w-4 h-4 text-amber-600" />;
  }
};

const PRODUCT_STATUS_LABEL: Record<string, string> = {
  completed: "Completed",
  pending: "Pending",
  failed: "Failed",
  processing: "Processing",
};

function StatusPill({ status }: { status?: string }) {
  const s = status || "pending";
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${
        s === "completed"
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : s === "failed"
            ? "bg-red-50 text-red-700 border-red-200"
            : s === "processing"
              ? "bg-blue-50 text-blue-700 border-blue-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
      }`}
    >
      {PRODUCT_STATUS_ICON(s)}
      {PRODUCT_STATUS_LABEL[s] ?? s}
    </span>
  );
}

const COL_CHECKBOX = 44;
const COL_STATUS = 140;
const COL_THUMB = 56;
const COL_MPN = 140;
const COL_NAME = 360;
const COL_BRAND = 160;
const COL_CATEGORY = 180;
const COL_ATTR = 200;
const COL_ACTION = 110;

const LEFT_STATUS = COL_CHECKBOX;
const LEFT_THUMB = LEFT_STATUS + COL_STATUS;
const LEFT_MPN = LEFT_THUMB + COL_THUMB;

const getProjectSourceStatus = (project?: Project) =>
  project?.source_status || "Yet to Start";

function ProductThumbnail({ src, alt }: { src?: string | null; alt?: string }) {
  if (!src) {
    return (
      <div className="w-11 h-11 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
        <ImageIcon className="w-4 h-4 text-slate-400" />
      </div>
    );
  }
  return (
    <div className="w-11 h-11 rounded-lg border border-slate-200 bg-white overflow-hidden flex items-center justify-center shrink-0">
      <img
        src={src}
        alt={alt || "Product image"}
        className="w-full h-full object-cover"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    </div>
  );
}

function AttributeValueTags({
  values,
  onRemove,
}: {
  values: string[];
  onRemove: (value: string) => void;
}) {
  if (!values.length) {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs border bg-amber-50 text-amber-700 border-amber-200 w-fit mt-2">
        <AlertCircle className="w-4 h-4" />
        Missing
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {values.map((value) => (
        <span
          key={value}
          title={value}
          className="relative inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs border bg-emerald-50 text-emerald-700 border-emerald-200 max-w-full pr-6"
        >
          <Check className="w-4 h-4" />
          <span className="truncate max-w-[200px]">{value}</span>
          <button
            type="button"
            onClick={() => onRemove(value)}
            title="Remove value"
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-white border border-emerald-200 shadow-sm flex items-center justify-center text-emerald-700 hover:text-emerald-900 hover:border-emerald-300"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
    </div>
  );
}

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
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const SortIcon =
    sort === "asc" ? ArrowUp : sort === "desc" ? ArrowDown : ArrowUpDown;

  return (
    <th
      style={{ width: COL_ATTR, minWidth: COL_ATTR, zIndex: 40 }}
      className="relative border-r border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 select-none"
    >
      <div ref={ref} className="flex items-center gap-1 px-2 py-2">
        <span className="truncate flex-1" title={attr}>
          {attr}
        </span>
        <button
          onClick={onSort}
          className={`p-1 rounded-md hover:bg-slate-200 transition-colors ${
            sort ? "text-blue-600" : "text-slate-400"
          }`}
          title="Sort"
        >
          <SortIcon className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setOpen(!open)}
          className={`p-1 rounded-md hover:bg-slate-200 transition-colors ${
            filter ? "text-blue-600" : "text-slate-400"
          }`}
          title="Filter"
        >
          <Filter className="w-3.5 h-3.5" />
        </button>

        {open && (
          <div className="absolute top-full left-0 z-50 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-3">
            <div className="mb-2">
              <p className="text-xs font-semibold text-slate-700">
                Filter {attr}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Enter a value to filter this column
              </p>
            </div>
            <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-slate-50">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                autoFocus
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                placeholder="Type filter value..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onFilter(draft);
                    setOpen(false);
                  }
                  if (e.key === "Escape") setOpen(false);
                }}
              />
              {draft && (
                <button
                  onClick={() => {
                    setDraft("");
                    onFilter("");
                  }}
                  className="p-1 rounded hover:bg-slate-200 transition-colors"
                  title="Clear"
                >
                  <X className="w-3.5 h-3.5 text-slate-500 hover:text-slate-700" />
                </button>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  setDraft("");
                  onFilter("");
                  setOpen(false);
                }}
                className="flex-1 py-2 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50"
              >
                Clear
              </button>
              <button
                onClick={() => {
                  onFilter(draft);
                  setOpen(false);
                }}
                className="flex-1 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>
      {filter && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
      )}
    </th>
  );
}

export default function DataCleaningTab() {
  // ── Pagination ────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);

  // ── Selection ─────────────────────────────────────────────────────────────
  const [allProductsSelected, setAllProductsSelected] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(
    new Set(),
  );

  // ── Projects / Products ───────────────────────────────────────────────────
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  // ── Actions ───────────────────────────────────────────────────────────────
  const [downloading, setDownloading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // ── Attribute editing ─────────────────────────────────────────────────────
  const [editingAttributes, setEditingAttributes] = useState<
    Record<string, Record<string, { value: string; uom: string; values?: string[] }>>
  >({});
  const [savingAttributes, setSavingAttributes] = useState<
    Record<string, boolean>
  >({});

  // ── Filters / sorts ───────────────────────────────────────────────────────
  const [selectedLLM, setSelectedLLM] = useState<string>("openai");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [brandFilter, setBrandFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [colSorts, setColSorts] = useState<ColSort[]>([]);
  const [colFilters, setColFilters] = useState<ColFilter[]>([]);

  // ── Bulk attributes ───────────────────────────────────────────────────────
  const [availableAttributes, setAvailableAttributes] = useState<string[]>([]);
  const [selectedBulkAttributes, setSelectedBulkAttributes] = useState<
    string[]
  >([]);
  const [bulkAttributeValues, setBulkAttributeValues] = useState<
    Record<string, string>
  >({});
  const [bulkSearch, setBulkSearch] = useState("");

  const { availableBrands, availableCategories, loadProjectFilters } =
    useProjectFilters();

  const llmOptions = [
    { value: "openai", label: "Datavio Algo-1" },
    { value: "gemini", label: "Datavio Algo-2" },
    { value: "claude", label: "Datavio Algo-3" },
  ];

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    loadProjects();
    loadProjectFilters();
  }, [loadProjectFilters]);

  useEffect(() => {
    if (selectedProjectId) loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, page, pageSize]);

  // ── Data loaders ──────────────────────────────────────────────────────────
  const loadProjects = async () => {
    setProjectsLoading(true);
    try {
      const data = await projectService.getAllProjects();
      setProjects(
        data.filter((p: Project) => p.operation_mode === "cleaning"),
      );
    } catch {
      notify.error("Failed to load projects");
    } finally {
      setProjectsLoading(false);
    }
  };

  const loadProducts = async () => {
  if (!selectedProjectId) return;
  setLoading(true);
  try {
    const skip = (page - 1) * pageSize;
    const result = await productService.getProductsByProject(
      selectedProjectId,
      undefined,
      skip,
      pageSize,
    );

    // ✅ Safety: handle both array and paginated object responses
    if (Array.isArray(result)) {
      setProducts(result);
      setTotal(result.length);
    } else {
      setProducts(Array.isArray(result.products) ? result.products : []);
      setTotal(result.total ?? 0);
    }
  } catch {
    notify.error("Failed to load products");
    setProducts([]); // ✅ prevent "not iterable" crash
    setTotal(0);
  } finally {
    setLoading(false);
  }
};

  const loadProjectAttributes = useCallback(
    async (projectId: string, category?: string) => {
      if (!projectId) {
        setAvailableAttributes([]);
        return;
      }
      try {
        const attrs = await productService.getProjectAttributes(
          projectId,
          category,
        );
        setAvailableAttributes(attrs);
        setColSorts([]);
        setColFilters([]);
      } catch {
        setAvailableAttributes([]);
      }
    },
    [],
  );

  // ── Sort / filter helpers ─────────────────────────────────────────────────
  const toggleSort = (attr: string) => {
    setColSorts((prev) => {
      const existing = prev.find((s) => s.attr === attr);
      if (!existing) return [...prev, { attr, dir: "asc" }];
      if (existing.dir === "asc")
        return prev.map((s) => (s.attr === attr ? { attr, dir: "desc" } : s));
      return prev.filter((s) => s.attr !== attr);
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

  // ── Derived lists ─────────────────────────────────────────────────────────
  const filteredSortedProducts = useMemo(() => {
    let list = [...products];

    if (statusFilter)
      list = list.filter((p) => p.enrichment_status === statusFilter);
    if (brandFilter) list = list.filter((p) => p.brand_name === brandFilter);
    if (categoryFilter)
      list = list.filter((p) => p.category_1 === categoryFilter);

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(
        (p) =>
          (p.product_name || "").toLowerCase().includes(q) ||
          (p.product_code || "").toLowerCase().includes(q) ||
          (p.brand_name || "").toLowerCase().includes(q) ||
          (p.category_1 || "").toLowerCase().includes(q),
      );
    }

    if (selectedBulkAttributes.length > 0) {
      list = list.filter((product) => {
        const productAttrs = (product.dynamic_attributes || []).map(
          (a) => a.name,
        );
        return selectedBulkAttributes.every((attr) =>
          productAttrs.includes(attr),
        );
      });
    }

    for (const { attr, value } of colFilters) {
      const v = value.toLowerCase();
      list = list.filter((p) => {
        const a = (p.dynamic_attributes || []).find((x) => x.name === attr);
        return (a?.value ?? "").toLowerCase().includes(v);
      });
    }

    for (const { attr, dir } of [...colSorts].reverse()) {
      list.sort((a, b) => {
        const va =
          (a.dynamic_attributes || []).find((x) => x.name === attr)?.value ??
          "";
        const vb =
          (b.dynamic_attributes || []).find((x) => x.name === attr)?.value ??
          "";
        const cmp = String(va).localeCompare(String(vb), undefined, {
          numeric: true,
        });
        return dir === "asc" ? cmp : -cmp;
      });
    }

    return list;
  }, [
    products,
    statusFilter,
    brandFilter,
    categoryFilter,
    searchTerm,
    selectedBulkAttributes,
    colFilters,
    colSorts,
  ]);

  const projectStatusSummary = useMemo(
    () => ({
      total: filteredSortedProducts.length,
      completed: filteredSortedProducts.filter(
        (p) => p.enrichment_status === "completed",
      ).length,
      pending: filteredSortedProducts.filter(
        (p) => p.enrichment_status === "pending",
      ).length,
      processing: filteredSortedProducts.filter(
        (p) => p.enrichment_status === "processing",
      ).length,
      failed: filteredSortedProducts.filter(
        (p) => p.enrichment_status === "failed",
      ).length,
    }),
    [filteredSortedProducts],
  );

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId),
    [projects, selectedProjectId],
  );

  // ── Selection helpers ─────────────────────────────────────────────────────

  const isCurrentPageFullySelected =
    filteredSortedProducts.length > 0 &&
    filteredSortedProducts.every((p) => selectedProductIds.has(p.id));

  const toggleProduct = (id: string) => {
    // deselect all-products mode when user manually toggles
    setAllProductsSelected(false);
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /**
   * Header checkbox behaviour:
   *  • If allProductsSelected → clear everything
   *  • If current page fully selected → clear current page
   *  • Otherwise → select current page
   */
  const toggleAll = () => {
    if (allProductsSelected) {
      setAllProductsSelected(false);
      setSelectedProductIds(new Set());
      return;
    }

    if (isCurrentPageFullySelected) {
      // Deselect current page only
      setSelectedProductIds((prev) => {
        const next = new Set(prev);
        filteredSortedProducts.forEach((p) => next.delete(p.id));
        return next;
      });
    } else {
      // Select all on current page
      setSelectedProductIds(
        new Set(filteredSortedProducts.map((p) => p.id)),
      );
    }
  };

  // ── Attribute helpers ─────────────────────────────────────────────────────
  const getAttrValues = (product: Product, attrName: string): string[] => {
    const editedEntry = editingAttributes[product.id]?.[attrName];

    if (editedEntry?.values) return editedEntry.values;

    if (typeof editedEntry?.value === "string") {
      const s = editedEntry.value.trim();
      if (!s) return [];
      return s.includes("|")
        ? s.split("|").map((v) => v.trim()).filter(Boolean)
        : [s];
    }

    const dynAttr = (product.dynamic_attributes || []).find(
      (a) => a.name === attrName,
    );
    if (!dynAttr?.value) return [];
    if (Array.isArray(dynAttr.value))
      return dynAttr.value.filter(Boolean).map(String);
    if (typeof dynAttr.value === "string") {
      return dynAttr.value.includes("|")
        ? dynAttr.value.split("|").map((v) => v.trim()).filter(Boolean)
        : [dynAttr.value];
    }
    return [String(dynAttr.value)];
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
          ...prev[productId]?.[attrName],
          value:
            field === "value"
              ? newValue
              : (prev[productId]?.[attrName]?.value ?? ""),
          uom:
            field === "uom"
              ? newValue
              : (prev[productId]?.[attrName]?.uom ?? ""),
          values: prev[productId]?.[attrName]?.values,
        },
      },
    }));
  };

  const handleRemoveAttributeValue = (
    product: Product,
    attrName: string,
    valueToRemove: string,
  ) => {
    notify.confirm({
      message: `Remove "${valueToRemove}"?`,
      description: `This will remove the value from ${attrName}.`,
      confirmLabel: "Remove",
      cancelLabel: "Cancel",
      onConfirm: () => {
        const currentValues = getAttrValues(product, attrName);
        const updatedValues = currentValues.filter((v) => v !== valueToRemove);
        setEditingAttributes((prev) => ({
          ...prev,
          [product.id]: {
            ...(prev[product.id] || {}),
            [attrName]: {
              value: updatedValues.join(" | "),
              uom:
                prev[product.id]?.[attrName]?.uom ??
                (product.dynamic_attributes || []).find(
                  (a) => a.name === attrName,
                )?.unit ??
                (product.dynamic_attributes || []).find(
                  (a) => a.name === attrName,
                )?.uom ??
                "",
              values: updatedValues,
            },
          },
        }));
        notify.success(
          "Value removed",
          `"${valueToRemove}" removed from ${attrName}`,
        );
      },
    });
  };

  const handleSaveAttributes = async (productId: string) => {
    const changes = editingAttributes[productId];
    if (!changes || Object.keys(changes).length === 0) return;

    setSavingAttributes((prev) => ({ ...prev, [productId]: true }));
    try {
      await cleansingService.updateProductAttributes(
        productId,
        Object.fromEntries(
          Object.entries(changes).map(([k, v]) => [
            k,
            { value: v.values ? v.values.join(" | ") : v.value, uom: v.uom },
          ]),
        ),
      );
      notify.success("Attributes updated");
      await loadProducts();
      setEditingAttributes((prev) => {
        const s = { ...prev };
        delete s[productId];
        return s;
      });
    } catch {
      notify.error("Failed to update attributes");
    } finally {
      setSavingAttributes((prev) => {
        const s = { ...prev };
        delete s[productId];
        return s;
      });
    }
  };

  // ── Cleaning ──────────────────────────────────────────────────────────────
  const pollCleaning = (taskId: string, productIds: string[]) => {
    const iv = setInterval(async () => {
      try {
        const status = await cleansingService.getTaskStatus(taskId);
        if (status.status === "completed") {
          clearInterval(iv);
          await loadProducts();
          await loadProjects();
          notify.success("Cleaning completed");
          setCleaning(false);
        } else if (status.status === "failed") {
          clearInterval(iv);
          setProducts((prev) =>
            prev.map((p) =>
              productIds.includes(p.id)
                ? { ...p, enrichment_status: "failed" }
                : p,
            ),
          );
          await loadProjects();
          notify.error("Cleaning failed");
          setCleaning(false);
        }
      } catch {
        clearInterval(iv);
        setCleaning(false);
      }
    }, 2500);
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
      notify.success("Cleaning started");
      pollCleaning(result.task_id, [productId]);
    } catch (e: any) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, enrichment_status: "pending" } : p,
        ),
      );
      notify.error("Cleaning failed", e.message);
      setCleaning(false);
    }
  };

  const handleCleanSelected = async () => {
    // ✅ FIX: allow action when allProductsSelected even if selectedProductIds is empty
    if (!allProductsSelected && selectedProductIds.size === 0) {
      notify.info("No products selected");
      return;
    }

    setCleaning(true);
    try {
      let result;
      if (allProductsSelected) {
        result = await cleansingService.runCleaning(
          selectedProjectId,
          selectedLLM,
          [],    // empty → backend cleans all by project_id
          true,  // allProducts flag
        );
        notify.success("Cleaning started", `Cleaning all ${total} products`);
      } else {
        const ids = Array.from(selectedProductIds);
        setProducts((prev) =>
          prev.map((p) =>
            ids.includes(p.id) ? { ...p, enrichment_status: "processing" } : p,
          ),
        );
        result = await cleansingService.runCleaning(
          selectedProjectId,
          selectedLLM,
          ids,
        );
        notify.success("Cleaning started", `Cleaning ${ids.length} product(s)`);
      }

      pollCleaning(result.task_id, Array.from(selectedProductIds));
      setSelectedProductIds(new Set());
      setAllProductsSelected(false);
    } catch (e: any) {
      notify.error("Batch cleaning failed", e.message);
      setCleaning(false);
    }
  };

  // ── Download ──────────────────────────────────────────────────────────────
  const handleDownloadSelected = async () => {
    setDownloading(true);
    try {
      const blob = await cleansingService.downloadSelected({
        project_ids: allProductsSelected ? [selectedProjectId] : [],
        product_ids: allProductsSelected
          ? []
          : Array.from(selectedProductIds),
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
    } catch {
      notify.error("Failed to download export");
    } finally {
      setDownloading(false);
    }
  };

  // ── Bulk update ───────────────────────────────────────────────────────────
  const handleBulkUpdate = async () => {
    if (!allProductsSelected && selectedProductIds.size === 0) {
      notify.info("No products selected");
      return;
    }
    const attrs = Object.fromEntries(
      selectedBulkAttributes
        .map((a) => [a, (bulkAttributeValues[a] || "").trim()])
        .filter(([, v]) => v),
    );
    if (Object.keys(attrs).length === 0) {
      notify.info("Enter at least one value");
      return;
    }
    setBulkUpdating(true);
    try {
      await cleansingService.bulkUpdateProductAttributes({
        product_ids: allProductsSelected
          ? []
          : Array.from(selectedProductIds),
        project_id: allProductsSelected ? selectedProjectId : undefined,
        attributes: attrs,
      });
      notify.success("Bulk update completed");
      await loadProducts();
      setBulkAttributeValues({});
      setSelectedBulkAttributes([]);
      setSelectedProductIds(new Set());
      setAllProductsSelected(false);
    } catch (e: any) {
      notify.error("Bulk update failed", e.message);
    } finally {
      setBulkUpdating(false);
    }
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setSelectedProjectId("");
    setSelectedProductIds(new Set());
    setAllProductsSelected(false); // ✅ FIX: reset this too
    setPage(1);                    // ✅ FIX: reset page
    setTotal(0);                   // ✅ FIX: reset total
    setStatusFilter("");
    setBrandFilter("");
    setCategoryFilter("");
    setSearchTerm("");
    setColSorts([]);
    setColFilters([]);
    setAvailableAttributes([]);
    setProducts([]);
    setSelectedBulkAttributes([]);
    setBulkAttributeValues({});
    setEditingAttributes({});
    setBulkSearch("");
    loadProjectFilters();
  };

  // ── Derived flags ─────────────────────────────────────────────────────────
  const hasActiveFilters =
    !!statusFilter ||
    !!brandFilter ||
    !!categoryFilter ||
    !!searchTerm ||
    colFilters.length > 0;

  const canDownload =
    allProductsSelected ||
    (selectedProductIds.size > 0 &&
      products.some(
        (p) =>
          selectedProductIds.has(p.id) && p.enrichment_status !== "pending",
      ));

  // ✅ FIX: Clean button should be enabled when allProductsSelected too
  const canClean =
    !cleaning &&
    (allProductsSelected || selectedProductIds.size > 0);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const filteredBulkAttributes = useMemo(() => {
    if (!bulkSearch.trim()) return availableAttributes;
    const q = bulkSearch.toLowerCase().trim();
    return availableAttributes.filter((a) => a.toLowerCase().includes(q));
  }, [availableAttributes, bulkSearch]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 bg-slate-50 min-h-screen font-sans">
      {/* ── Page header ── */}
      <div className="mb-4 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">
            Data Cleaning &amp; Validation
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Select a project, then clean and standardise product attributes
          </p>
        </div>

        {selectedProjectId && (
          <div className="flex items-center gap-2">
            {/* ✅ FIX: use canClean instead of raw disabled condition */}
            <button
              onClick={handleCleanSelected}
              disabled={!canClean}
              className="h-10 flex items-center gap-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 text-sm font-medium transition-colors"
            >
              {cleaning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {allProductsSelected
                ? `Clean All (${total})`
                : `Clean (${selectedProductIds.size})`}
            </button>
            <button
              onClick={handleDownloadSelected}
              disabled={downloading || !canDownload}
              className="h-10 flex items-center gap-2 px-4 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-40 text-sm font-medium transition-colors"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Download
            </button>
          </div>
        )}
      </div>

      {/* ── Filters bar ── */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-3">
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3 items-end">
            {/* Algorithm */}
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1 uppercase tracking-wide">
                Algorithm
              </label>
              <select
                value={selectedLLM}
                onChange={(e) => setSelectedLLM(e.target.value)}
                className="h-10 w-full px-3 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {llmOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Project */}
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1 uppercase tracking-wide">
                Project
              </label>
              <select
                value={selectedProjectId}
                onChange={async (e) => {
                  const id = e.target.value;
                  setSelectedProjectId(id);
                  setPage(1);
                  setAllProductsSelected(false);   // ✅ reset on project change
                  setSelectedProductIds(new Set()); // ✅ reset on project change
                  setColSorts([]);
                  setColFilters([]);
                  await loadProjectFilters(id || undefined);
                  await loadProjectAttributes(id);
                }}
                className="h-10 w-full px-3 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1 uppercase tracking-wide">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 w-full px-3 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* Brand */}
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1 uppercase tracking-wide">
                Brand
              </label>
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                disabled={availableBrands.length === 0}
                className="h-10 w-full px-3 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
              >
                <option value="">All Brands</option>
                {availableBrands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1 uppercase tracking-wide">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={async (e) => {
                  const cat = e.target.value;
                  setCategoryFilter(cat);
                  setColSorts([]);
                  setColFilters([]);
                  await loadProjectAttributes(
                    selectedProjectId,
                    cat || undefined,
                  );
                }}
                disabled={availableCategories.length === 0}
                className="h-10 w-full px-3 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
              >
                <option value="">All Categories</option>
                {availableCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="md:col-span-2 xl:col-span-1">
              <label className="block text-[11px] font-medium text-slate-500 mb-1 uppercase tracking-wide">
                Search
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products or MPN..."
                  className="h-10 w-full pl-9 pr-3 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
              <button
                onClick={handleReset}
                className="h-9 px-3 border border-slate-200 rounded-lg bg-white text-sm text-slate-600 hover:bg-slate-50 inline-flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Clear filters
              </button>
              <div className="flex flex-wrap gap-2">
                {colFilters.map(({ attr, value }) => (
                  <span
                    key={attr}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200"
                  >
                    <Filter className="w-3 h-3" />
                    {attr}:{" "}
                    <strong className="font-semibold">{value}</strong>
                    <button
                      onClick={() => setColFilter(attr, "")}
                      className="ml-0.5 hover:text-blue-900"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
                {colSorts.map(({ attr, dir }) => (
                  <span
                    key={attr}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-violet-50 text-violet-700 text-xs rounded-full border border-violet-200"
                  >
                    {dir === "asc" ? (
                      <ArrowUp className="w-3 h-3" />
                    ) : (
                      <ArrowDown className="w-3 h-3" />
                    )}
                    {attr}
                    <button
                      onClick={() =>
                        setColSorts((p) =>
                          p.filter((s) => s.attr !== attr),
                        )
                      }
                      className="ml-0.5 hover:text-violet-900"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Project summary bar */}
        {selectedProject && (
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-semibold text-slate-900">
                {selectedProject.name}
              </span>
              {getStatusBadge(getProjectSourceStatus(selectedProject))}
            </div>
            <div className="flex items-center gap-3 flex-wrap text-sm">
              <span className="inline-flex items-center gap-2 text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-medium text-slate-700">
                  {projectStatusSummary.completed}
                </span>
                <span className="text-slate-500">Completed</span>
              </span>
              <span className="text-slate-300">|</span>
              <span className="inline-flex items-center gap-2 text-slate-600">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="font-medium text-slate-700">
                  {projectStatusSummary.pending}
                </span>
                <span className="text-slate-500">Pending</span>
              </span>
              <span className="text-slate-300">|</span>
              <span className="inline-flex items-center gap-2 text-slate-600">
                <XCircle className="w-4 h-4 text-red-600" />
                <span className="font-medium text-slate-700">
                  {projectStatusSummary.failed}
                </span>
                <span className="text-slate-500">Failed</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Bulk attributes panel ── */}
      {selectedProjectId && availableAttributes.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl mb-3 overflow-hidden">
          <div className="p-4 flex items-center justify-between gap-3 flex-wrap border-b border-slate-100">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Bulk Update Attributes
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Select attributes and values to apply to selected products
              </p>
              {selectedBulkAttributes.length > 0 && (
                <div className="mt-2">
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full border border-blue-200">
                    Showing {filteredSortedProducts.length} products on this
                    page with selected attributes
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedBulkAttributes([]);
                  setBulkAttributeValues({});
                }}
                disabled={selectedBulkAttributes.length === 0}
                className="h-9 px-3 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 inline-flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Clear All
              </button>
              <button
                onClick={handleBulkUpdate}
                disabled={
                  bulkUpdating ||
                  (!allProductsSelected && selectedProductIds.size === 0) ||
                  selectedBulkAttributes.length === 0
                }
                className="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40 inline-flex items-center gap-2"
              >
                {bulkUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating…
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {allProductsSelected
                      ? `Update All (${total})`
                      : `Update ${selectedProductIds.size} selected`}
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="p-4">
            <div className="relative mb-3 max-w-2xl">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={bulkSearch}
                onChange={(e) => setBulkSearch(e.target.value)}
                placeholder="Search attributes..."
                className="w-full h-10 pl-9 pr-3 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {filteredBulkAttributes.map((attr) => {
                const active = selectedBulkAttributes.includes(attr);
                return (
                  <button
                    key={attr}
                    type="button"
                    onClick={() => {
                      if (active) {
                        setSelectedBulkAttributes((p) =>
                          p.filter((a) => a !== attr),
                        );
                        setBulkAttributeValues((p) => {
                          const n = { ...p };
                          delete n[attr];
                          return n;
                        });
                      } else {
                        setSelectedBulkAttributes((p) => [...p, attr]);
                      }
                    }}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                      active
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                    title={attr}
                  >
                    {active && <Check className="w-4 h-4" />}
                    <span className="truncate max-w-[260px]">{attr}</span>
                  </button>
                );
              })}
            </div>

            {selectedBulkAttributes.length > 0 && (
              <div className="mt-5 pt-5 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Set values for selected attributes
                </p>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {selectedBulkAttributes.map((attr) => (
                    <div key={attr} className="space-y-1">
                      <label className="text-sm font-medium text-slate-800">
                        {attr}
                      </label>
                      <input
                        value={bulkAttributeValues[attr] || ""}
                        onChange={(e) =>
                          setBulkAttributeValues((p) => ({
                            ...p,
                            [attr]: e.target.value,
                          }))
                        }
                        placeholder="Enter value"
                        className="h-10 w-full px-3 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Main content area ── */}
      {!selectedProjectId ? (
        /* Project list */
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h4 className="text-base font-semibold text-slate-900 mb-1">
            Cleaning Projects
          </h4>
          <p className="text-sm text-slate-500 mb-4">
            Select a project to view and clean products
          </p>
          {projectsLoading ? (
            <div className="py-10 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" />
            </div>
          ) : projects.length === 0 ? (
            <div className="py-10 text-center">
              <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">
                No cleaning projects found
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={async () => {
                    setSelectedProjectId(project.id);
                    setPage(1);
                    setAllProductsSelected(false);
                    setSelectedProductIds(new Set());
                    await loadProjectFilters(project.id);
                    await loadProjectAttributes(project.id);
                  }}
                  className="w-full p-3 border border-slate-200 rounded-lg text-left hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900">
                      {project.name}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                      {project.product_count ?? 0} products
                    </span>
                    {project.use_case && (
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded-full">
                        {project.use_case}
                      </span>
                    )}
                    {project.source_status &&
                      getStatusBadge(project.source_status)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : filteredSortedProducts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500">No products found</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">

          {/* ── Table header bar ── */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-white text-sm">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={allProductsSelected || isCurrentPageFullySelected}
                onChange={toggleAll}
                className="rounded border-slate-300 text-blue-600"
              />
              <span className="text-slate-700 font-medium">
                {filteredSortedProducts.length} products on this page
              </span>
              {(selectedProductIds.size > 0 || allProductsSelected) && (
                <span className="text-blue-600 font-medium">
                  •{" "}
                  {allProductsSelected
                    ? `All ${total} selected`
                    : `${selectedProductIds.size} selected`}
                </span>
              )}
            </div>
            <span className="text-slate-500">Total {total} products</span>
          </div>

          {/* ✅ "Select all N products" banner — shown when current page is
               fully selected but the user hasn't yet selected across all pages */}
          {isCurrentPageFullySelected && !allProductsSelected && total > pageSize && (
            <div className="px-4 py-2.5 bg-blue-50 border-b border-blue-100 flex items-center justify-center gap-2 text-sm text-blue-700">
              <span>
                All{" "}
                <strong>{filteredSortedProducts.length}</strong> products on
                this page are selected.
              </span>
              <button
                onClick={() => setAllProductsSelected(true)}
                className="font-semibold underline hover:text-blue-900 transition-colors"
              >
                Select all {total} products in this project
              </button>
            </div>
          )}

          {/* ✅ "All N selected" confirmation banner */}
          {allProductsSelected && (
            <div className="px-4 py-2.5 bg-blue-50 border-b border-blue-100 flex items-center justify-center gap-2 text-sm text-blue-700">
              <span>
                All <strong>{total}</strong> products in this project are
                selected.
              </span>
              <button
                onClick={() => {
                  setAllProductsSelected(false);
                  setSelectedProductIds(new Set());
                }}
                className="font-semibold underline hover:text-blue-900 transition-colors"
              >
                Clear selection
              </button>
            </div>
          )}

          {/* ── Scrollable table ── */}
          <div
            className="overflow-auto relative"
            style={{ maxHeight: "calc(100vh - 280px)" }}
          >
            <table
              className="border-collapse"
              style={{
                tableLayout: "fixed",
                width:
                  COL_CHECKBOX +
                  COL_STATUS +
                  COL_THUMB +
                  COL_MPN +
                  COL_NAME +
                  COL_BRAND +
                  COL_CATEGORY +
                  COL_ACTION +
                  availableAttributes.length * COL_ATTR,
              }}
            >
              <thead className="sticky top-0 z-40">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-50">
                  <th
                    style={{
                      width: COL_CHECKBOX,
                      minWidth: COL_CHECKBOX,
                      left: 0,
                      position: "sticky",
                      zIndex: 50,
                    }}
                    className="px-3 py-3 border-b border-r border-slate-200 bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={
                        allProductsSelected || isCurrentPageFullySelected
                      }
                      onChange={toggleAll}
                      className="rounded border-slate-300 text-blue-600"
                    />
                  </th>
                  <th
                    style={{
                      width: COL_STATUS,
                      minWidth: COL_STATUS,
                      left: LEFT_STATUS,
                      position: "sticky",
                      zIndex: 50,
                    }}
                    className="px-3 py-3 border-b border-r border-slate-200 bg-slate-50"
                  >
                    Status
                  </th>
                  <th
                    style={{
                      width: COL_THUMB,
                      minWidth: COL_THUMB,
                      left: LEFT_THUMB,
                      position: "sticky",
                      zIndex: 50,
                    }}
                    className="px-3 py-3 border-b border-r border-slate-200 bg-slate-50"
                  >
                    Image
                  </th>
                  <th
                    style={{
                      width: COL_MPN,
                      minWidth: COL_MPN,
                      left: LEFT_MPN,
                      position: "sticky",
                      zIndex: 50,
                    }}
                    className="px-3 py-3 border-b border-r border-slate-200 bg-slate-50"
                  >
                    MPN
                  </th>
                  <th
                    style={{ width: COL_NAME, minWidth: COL_NAME, zIndex: 40 }}
                    className="px-3 py-3 border-b border-r border-slate-200 bg-slate-50"
                  >
                    Product Name
                  </th>
                  <th
                    style={{
                      width: COL_BRAND,
                      minWidth: COL_BRAND,
                      zIndex: 40,
                    }}
                    className="px-3 py-3 border-b border-r border-slate-200 bg-slate-50"
                  >
                    Brand
                  </th>
                  <th
                    style={{
                      width: COL_CATEGORY,
                      minWidth: COL_CATEGORY,
                      zIndex: 40,
                    }}
                    className="px-3 py-3 border-b border-r border-slate-200 bg-slate-50"
                  >
                    Category
                  </th>

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

                  <th
                    style={{
                      width: COL_ACTION,
                      minWidth: COL_ACTION,
                      right: 0,
                      position: "sticky",
                      zIndex: 50,
                    }}
                    className="px-3 py-3 border-b border-l border-slate-200 bg-slate-50 text-center"
                  >
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredSortedProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-slate-100 hover:bg-slate-50/70 align-top group"
                  >
                    <td
                      style={{
                        width: COL_CHECKBOX,
                        position: "sticky",
                        left: 0,
                        zIndex: 20,
                      }}
                      className="px-3 py-4 border-r border-slate-100 bg-white group-hover:bg-slate-50/70"
                    >
                      <input
                        type="checkbox"
                        checked={
                          allProductsSelected ||
                          selectedProductIds.has(product.id)
                        }
                        onChange={() => toggleProduct(product.id)}
                        className="rounded border-slate-300 text-blue-600"
                      />
                    </td>
                    <td
                      style={{
                        width: COL_STATUS,
                        position: "sticky",
                        left: LEFT_STATUS,
                        zIndex: 20,
                      }}
                      className="px-3 py-4 border-r border-slate-100 bg-white group-hover:bg-slate-50/70"
                    >
                      <StatusPill status={product.enrichment_status} />
                    </td>
                    <td
                      style={{
                        width: COL_THUMB,
                        position: "sticky",
                        left: LEFT_THUMB,
                        zIndex: 20,
                      }}
                      className="px-3 py-4 border-r border-slate-100 bg-white group-hover:bg-slate-50/70"
                    >
                      <ProductThumbnail
                        src={(product as any).image_url_1}
                        alt={product.product_name}
                      />
                    </td>
                    <td
                      style={{
                        width: COL_MPN,
                        position: "sticky",
                        left: LEFT_MPN,
                        zIndex: 20,
                      }}
                      className="px-3 py-4 border-r border-slate-100 bg-white group-hover:bg-slate-50/70"
                    >
                      <span
                        className="text-sm font-mono text-slate-700 truncate block"
                        title={product.product_code}
                      >
                        {product.product_code}
                      </span>
                    </td>
                    <td
                      style={{ width: COL_NAME }}
                      className="px-3 py-4 border-r border-slate-100 bg-white group-hover:bg-slate-50/70"
                    >
                      <span
                        className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2"
                        title={product.product_name}
                      >
                        {product.product_name}
                      </span>
                    </td>
                    <td
                      style={{ width: COL_BRAND }}
                      className="px-3 py-4 border-r border-slate-100 bg-white group-hover:bg-slate-50/70"
                    >
                      <span className="text-sm text-slate-600">
                        {product.brand_name}
                      </span>
                    </td>
                    <td
                      style={{ width: COL_CATEGORY }}
                      className="px-3 py-4 border-r border-slate-200 bg-white group-hover:bg-slate-50/70"
                    >
                      <span className="text-sm text-slate-600">
                        {product.category_1}
                      </span>
                    </td>

                    {availableAttributes.map((attr) => {
                      const dynAttr = (
                        product.dynamic_attributes || []
                      ).find((a) => a.name === attr);
                      const edited = editingAttributes[product.id]?.[attr];
                      const currentValues = getAttrValues(product, attr);
                      const curVal =
                        edited?.value ?? (dynAttr?.value as any) ?? "";
                      const curUom =
                        edited?.uom ??
                        (dynAttr as any)?.unit ??
                        (dynAttr as any)?.uom ??
                        "";
                      const conflict = product.validation_conflicts?.[attr];

                      return (
                        <td
                          key={attr}
                          style={{ width: COL_ATTR, minWidth: COL_ATTR }}
                          className={`border-r border-slate-100 align-top ${
                            conflict ? "bg-amber-50/30" : ""
                          }`}
                        >
                          <div className="px-2 py-3">
                            <div className="flex items-start gap-2">
                              <input
                                type="text"
                                value={curVal}
                                onChange={(e) =>
                                  handleAttributeChange(
                                    product.id,
                                    attr,
                                    "value",
                                    e.target.value,
                                  )
                                }
                                disabled={savingAttributes[product.id]}
                                placeholder="—"
                                className="w-full bg-transparent border-0 p-0 text-sm font-semibold text-slate-900 outline-none focus:ring-0 placeholder:text-slate-300 disabled:opacity-40"
                              />
                              {conflict && (
                                <AlertCircle
                                  className="w-4 h-4 text-amber-500 shrink-0 mt-0.5"
                                  title="AI suggested correction"
                                />
                              )}
                            </div>
                            <AttributeValueTags
                              values={currentValues}
                              onRemove={(value) =>
                                handleRemoveAttributeValue(
                                  product,
                                  attr,
                                  value,
                                )
                              }
                            />
                            <input
                              type="text"
                              value={curUom}
                              onChange={(e) =>
                                handleAttributeChange(
                                  product.id,
                                  attr,
                                  "uom",
                                  e.target.value,
                                )
                              }
                              placeholder="unit (e.g. kg, V)"
                              className="mt-3 h-9 w-full px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-600 outline-none placeholder:text-slate-300 focus:bg-white focus:border-blue-300 transition-colors"
                            />
                          </div>
                        </td>
                      );
                    })}

                    <td
                      style={{
                        width: COL_ACTION,
                        position: "sticky",
                        right: 0,
                        zIndex: 20,
                      }}
                      className="px-3 py-4 border-l border-slate-200 bg-white group-hover:bg-slate-50/70 text-center"
                    >
                      <div className="flex flex-col gap-2 items-center">
                        <button
                          onClick={() => handleCleanProduct(product.id)}
                          disabled={
                            cleaning ||
                            product.enrichment_status === "processing"
                          }
                          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-40 hover:underline"
                        >
                          {product.enrichment_status === "processing" ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Cleaning
                            </>
                          ) : product.enrichment_status === "completed" ? (
                            "Re-clean"
                          ) : (
                            "Clean"
                          )}
                        </button>

                        {Object.keys(
                          editingAttributes[product.id] || {},
                        ).length > 0 && (
                          <button
                            onClick={() => handleSaveAttributes(product.id)}
                            disabled={savingAttributes[product.id]}
                            className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 text-sm font-medium disabled:opacity-40 hover:underline"
                          >
                            {savingAttributes[product.id] ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving
                              </>
                            ) : (
                              <>
                                <Check className="w-4 h-4" />
                                Save
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Pagination bar ── */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-white text-sm">
            <div className="flex items-center gap-3">
              <span className="text-slate-500">
                Showing{" "}
                {total === 0 ? 0 : (page - 1) * pageSize + 1}–
                {Math.min(page * pageSize, total)} of {total}
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                  setAllProductsSelected(false);
                  setSelectedProductIds(new Set());
                }}
                className="h-9 px-2 border border-slate-200 rounded-lg bg-white text-sm"
              >
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1));
                  setAllProductsSelected(false);
                  setSelectedProductIds(new Set());
                }}
                disabled={page === 1 || loading}
                className="h-9 px-3 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-slate-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => {
                  setPage((p) => Math.min(totalPages, p + 1));
                  setAllProductsSelected(false);
                  setSelectedProductIds(new Set());
                }}
                disabled={page >= totalPages || loading}
                className="h-9 px-3 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}