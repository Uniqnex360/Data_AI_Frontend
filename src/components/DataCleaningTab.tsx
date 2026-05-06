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
import { CleaningProductsOverview } from "./CleaningProductsOverview.tsx";
import { Pagination } from "./Pagination.tsx";
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
      title={PRODUCT_STATUS_LABEL[s] ?? s}
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
    </span>
  );
}

const COL_CHECKBOX = 36;
const COL_STATUS = 60;
const COL_NAME = 240;
const COL_THUMB = 48;
const COL_BRAND = 100;
const COL_CATEGORY = 100;
const COL_ATTR = 140;
const COL_ACTION = 90;

const LEFT_CHECKBOX = 0;
const LEFT_STATUS = COL_CHECKBOX;
const LEFT_NAME = LEFT_STATUS + COL_STATUS;
const LEFT_MPN = LEFT_NAME + COL_NAME;
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
  return null;
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
      className="relative border-r border-slate-200 bg-slate-50 text-left text-[11px] font-semibold  text-slate-500 select-none"
    >
      <div ref={ref} className="flex items-center gap-1 px-2 py-2">
        <span className="truncate flex-1 text-[10px]" title={attr}>
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [viewMode, setViewMode] = useState<
    "projects" | "progress" | "advanced"
  >("projects");

  const [selectedDetailProduct, setSelectedDetailProduct] =
    useState<Product | null>(null);
  const [total, setTotal] = useState(0);
  const [allProductsSelected, setAllProductsSelected] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(
    new Set(),
  );
  const [projectStats, setProjectStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    processing: 0,
    failed: 0,
  });
  const [statsLoading, setStatsLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(
    new Set(),
  );

  const [projectSwitching, setProjectSwitching] = useState(false);

  const [downloading, setDownloading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [editingAttributes, setEditingAttributes] = useState<
    Record<
      string,
      Record<string, { value: string; uom: string; values?: string[] }>
    >
  >({});
  const [savingAttributes, setSavingAttributes] = useState<
    Record<string, boolean>
  >({});
  const [filteredStats, setFilteredStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    processing: 0,
    failed: 0,
  });
  const [selectedLLM, setSelectedLLM] = useState<string>("openai");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [brandFilter, setBrandFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [projectsPage, setProjectsPage] = useState(1);
  const PROJECTS_PER_PAGE = 10;
  const filteredProjects = projects;

  const [colSorts, setColSorts] = useState<ColSort[]>([]);
  const [colFilters, setColFilters] = useState<ColFilter[]>([]);
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
  useEffect(() => {
    loadProjects();
    loadProjectFilters();
  }, [loadProjectFilters]);
  useEffect(() => {
    if (selectedProjectId) loadProducts();
  }, [selectedProjectId, page, pageSize]);
  const loadProjects = async () => {
    setProjectsLoading(true);
    try {
      const data = await projectService.getAllProjects();
      setProjects(data.filter((p: Project) => p.operation_mode === "cleaning"));
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
        {
          brand: brandFilter || undefined,
          category: categoryFilter || undefined,
          search: searchTerm || undefined,
          enrichment_status: statusFilter || undefined,
        },
      );
      if (Array.isArray(result)) {
        setProducts(result);
        setTotal(result.total ?? 0);
      } else {
        setProducts(Array.isArray(result.products) ? result.products : []);
        setTotal(result.total ?? 0);
      }
    } catch {
      notify.error("Failed to load products");
      setProducts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };
  const paginatedProjects = useMemo(() => {
    const start = (projectsPage - 1) * PROJECTS_PER_PAGE;
    return filteredProjects.slice(start, start + PROJECTS_PER_PAGE);
  }, [filteredProjects, projectsPage]);

  const projectsTotalPages = Math.max(
    1,
    Math.ceil(filteredProjects.length / PROJECTS_PER_PAGE),
  );
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
  const handleBrandChange = async (brand: string) => {
    setBrandFilter(brand);
    setPage(1);
    setSelectedProductIds(new Set());
    setAllProductsSelected(false);
    if (selectedProjectId) {
      await loadProjectFilters(
        selectedProjectId,
        brand || undefined,
        categoryFilter || undefined,
      );
    }
  };
  const handleCategoryChange = async (category: string) => {
    setCategoryFilter(category);
    setPage(1);
    setColSorts([]);
    setColFilters([]);
    setSelectedProductIds(new Set());
    setAllProductsSelected(false);
    if (selectedProjectId) {
      await loadProjectFilters(
        selectedProjectId,
        brandFilter || undefined,
        category || undefined,
      );
      await loadProjectAttributes(selectedProjectId, category || undefined);
    }
  };
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
  const filteredSortedProducts = useMemo(() => {
    let list = [...products];
    if (statusFilter)
      list = list.filter((p) => p.enrichment_status === statusFilter);
    if (brandFilter) list = list.filter((p) => p.brand_name === brandFilter);
    if (categoryFilter)
      list = list.filter(
        (p) =>
          p.category_3 === categoryFilter ||
          p.category_2 === categoryFilter ||
          p.category_1 === categoryFilter,
      );
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(
        (p) =>
          (p.product_name || "").toLowerCase().includes(q) ||
          (p.product_code || "").toLowerCase().includes(q) ||
          (p.brand_name || "").toLowerCase().includes(q) ||
          (p.category_3 || "").toLowerCase().includes(q),
      );
    }
    if (selectedBulkAttributes.length > 0) {
      list = list.filter((product) => {
        const productAttrs = (product as any).attribute_names || [];
        return selectedBulkAttributes.every((attr) =>
          productAttrs.includes(attr),
        );
      });
    }
    for (const { attr, value } of colFilters) {
      const v = value.toLowerCase();
      list = list.filter((p) => {
        const a = (p as any).attributes_dict?.[attr];
        return (a?.value ?? "").toLowerCase().includes(v);
      });
    }
    for (const { attr, dir } of [...colSorts].reverse()) {
      list.sort((a, b) => {
        const va = (a as any).attributes_dict?.[attr]?.value ?? "";
        const vb = (b as any).attributes_dict?.[attr]?.value ?? "";
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

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId),
    [projects, selectedProjectId],
  );

  const handleProjectClick = (id: string) => {
    setSelectedProjectId(id);
    setViewMode("progress");
  };
  const enterAdvancedMode = () => {
    setViewMode("advanced");
  };
  const loadProjectStats = useCallback(
    async (projectId: string, useFilters = false) => {
      if (!projectId) return;
      setStatsLoading(true);
      try {
        const filters = useFilters
          ? {
              brand: brandFilter || undefined,
              category: categoryFilter || undefined,
              search: searchTerm || undefined,
              enrichment_status: statusFilter || undefined,
              bulk_attributes:
                selectedBulkAttributes.length > 0
                  ? selectedBulkAttributes
                  : undefined,
            }
          : undefined;
        const stats = await productService.getProjectProductStats(
          projectId,
          filters,
        );
        if (useFilters) {
          setFilteredStats(stats);
        } else {
          setProjectStats(stats);
        }
      } catch (error) {
        console.error("Failed to load project stats:", error);
      } finally {
        setStatsLoading(false);
      }
    },
    [
      brandFilter,
      categoryFilter,
      searchTerm,
      statusFilter,
      selectedBulkAttributes,
    ],
  );
  const hasActiveFilters = useMemo(() => {
    return !!(
      statusFilter ||
      brandFilter ||
      categoryFilter ||
      searchTerm ||
      colFilters.length > 0 ||
      selectedBulkAttributes.length > 0
    );
  }, [
    statusFilter,
    brandFilter,
    categoryFilter,
    searchTerm,
    colFilters,
    selectedBulkAttributes,
  ]);
  const projectStatusSummary = useMemo(() => {
    if (hasActiveFilters) {
      return filteredStats;
    }
    return projectStats;
  }, [hasActiveFilters, filteredStats, projectStats]);
  useEffect(() => {
    if (selectedProjectId) {
      if (hasActiveFilters) {
        loadProjectStats(selectedProjectId, true);
      } else {
        loadProjectStats(selectedProjectId, false);
      }
    }
  }, [selectedProjectId, hasActiveFilters, loadProjectStats]);
  useEffect(() => {
    if (selectedProjectId) {
      setPage(1);
      loadProducts();
    }
  }, [
    selectedProjectId,
    statusFilter,
    brandFilter,
    categoryFilter,
    searchTerm,
  ]);
  const isCurrentPageFullySelected =
    filteredSortedProducts.length > 0 &&
    filteredSortedProducts.every((p) => selectedProductIds.has(p.id));
  const toggleProduct = (id: string) => {
    setAllProductsSelected(false);
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (allProductsSelected) {
      setAllProductsSelected(false);
      setSelectedProductIds(new Set());
      return;
    }
    if (isCurrentPageFullySelected) {
      setSelectedProductIds((prev) => {
        const next = new Set(prev);
        filteredSortedProducts.forEach((p) => next.delete(p.id));
        return next;
      });
    } else {
      setSelectedProductIds(new Set(filteredSortedProducts.map((p) => p.id)));
    }
  };
  const getAttrValues = (product: Product, attrName: string): string[] => {
    const editedEntry = editingAttributes[product.id]?.[attrName];
    if (editedEntry?.values) return editedEntry.values;
    if (typeof editedEntry?.value === "string") {
      const s = editedEntry.value.trim();
      if (!s) return [];
      return s.includes("|")
        ? s
            .split("|")
            .map((v) => v.trim())
            .filter(Boolean)
        : [s];
    }
    const dynAttr = (product as any).attributes_dict?.[attrName];
    if (!dynAttr?.value) return [];
    if (Array.isArray(dynAttr.value))
      return dynAttr.value.filter(Boolean).map(String);
    if (typeof dynAttr.value === "string") {
      return dynAttr.value.includes("|")
        ? dynAttr.value
            .split("|")
            .map((v) => v.trim())
            .filter(Boolean)
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
                (product as any).attributes_dict?.[attrName]?.unit ??
                (product as any).attributes_dict?.[attrName]?.uom ??
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
      const attributes: Record<string, string> = {};
      for (const [key, val] of Object.entries(changes)) {
        attributes[key] = val.values ? val.values.join(" | ") : val.value;
        if (val.uom) {
          attributes[key] = `${attributes[key]} ${val.uom}`;
        }
      }
      await cleansingService.updateProductAttributes(productId, attributes);
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
          [],
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
  const handleDownloadSelected = async () => {
    if (!allProductsSelected && selectedProductIds.size === 0) {
      notify.info("No products selected");
      return;
    }
    setDownloading(true);
    try {
      const blob = await cleansingService.downloadSelected({
        project_ids: allProductsSelected ? selectedProjectId : undefined,
        product_ids: allProductsSelected ? [] : Array.from(selectedProductIds),
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
        product_ids: allProductsSelected ? [] : Array.from(selectedProductIds),
        project_id: allProductsSelected ? selectedProjectId : undefined,
        attributes: attrs,
      });
      notify.success("Bulk update completed");
      await loadProducts();
      setBulkAttributeValues({});
      setSelectedBulkAttributes([]);
    } catch (e: any) {
      notify.error("Bulk update failed", e.message);
    } finally {
      setBulkUpdating(false);
    }
  };
  const handleReset = () => {
    setSelectedProjectId("");
    setViewMode("projects");
    setSelectedProductIds(new Set());
    setAllProductsSelected(false);
    setPage(1);
    setTotal(0);
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
  const pageSizeOptions = useMemo(() => {
    if (!total) return [pageSize];
    return Array.from(
      new Set([
        pageSize,
        Math.max(1, Math.ceil(total / 4)),
        Math.max(1, Math.ceil(total / 2)),
        total,
      ]),
    ).sort((a, b) => a - b);
  }, [total, pageSize]);
  const canDownload =
    allProductsSelected ||
    (selectedProductIds.size > 0 &&
      products.some(
        (p) =>
          selectedProductIds.has(p.id) && p.enrichment_status !== "pending",
      ));
  const canClean =
    !cleaning && (allProductsSelected || selectedProductIds.size > 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const filteredBulkAttributes = useMemo(() => {
    if (!bulkSearch.trim()) return availableAttributes;
    const q = bulkSearch.toLowerCase().trim();
    return availableAttributes.filter((a) => a.toLowerCase().includes(q));
  }, [availableAttributes, bulkSearch]);

  return (
    <div className="p-4 bg-slate-50 min-h-screen font-sans">
      <div className="mb-4 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">
            Cleansing &amp; Standardization
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Select a project, then clean and standardise product attributes
          </p>
        </div>
        {selectedProjectId && (
          <div className="flex items-center gap-2">
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
            {viewMode === "progress" && (
              <button
                onClick={() => setViewMode("advanced")}
                className="h-9 px-3 border border-slate-200 rounded-lg bg-white text-sm text-slate-600 hover:bg-slate-50"
              >
                Advanced Edit
              </button>
            )}
          </div>
        )}
      </div>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-3">
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3 items-end">
            <div>
              <label className="block text-sm text-slate-700 mb-2">
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
            <div>
              <label className="block text-sm text-slate-700 mb-2">
                Project
              </label>
              <select
                value={selectedProjectId}
                onChange={async (e) => {
                  const id = e.target.value;
                  setProjectSwitching(true);
                  setSelectedProjectId(id);
                  setViewMode(id ? "progress" : "projects");
                  setPage(1);
                  setAllProductsSelected(false);
                  setSelectedProductIds(new Set());
                  setColSorts([]);
                  setColFilters([]);
                  try {
                    await loadProjectFilters(
                      id || undefined,
                      brandFilter || undefined,
                      categoryFilter || undefined,
                    );
                    await loadProjectAttributes(id);
                  } finally {
                    setProjectSwitching(false);
                  }
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
            <div>
              <label className="block text-sm text-slate-700 mb-2">
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
            <div>
              <label className="block text-sm text-slate-700 mb-2">Brand</label>
              <select
                value={brandFilter}
                onChange={(e) => handleBrandChange(e.target.value)}
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
            <div>
              <label className="block text-sm text-slate-700 mb-2">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => handleCategoryChange(e.target.value)}
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
            <div className="md:col-span-2 xl:col-span-1">
              <label className="block text-sm text-slate-700 mb-2">
                Search
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search products or MPN..."
                    className="h-10 w-full pl-9 pr-3 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={handleReset}
                    className="h-10 px-3 border border-slate-200 rounded-lg bg-white text-sm text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1.5 shrink-0"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
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
      {viewMode === "advanced" && (
        <div className="mb-3">
          <button
            onClick={() => setViewMode("progress")}
            className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            ← Back to Products
          </button>
        </div>
      )}
      {viewMode === "advanced" &&
        selectedProjectId &&
        availableAttributes.length > 0 && (
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
                  Clear
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
              <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-3 bg-white">
                <div className="flex flex-wrap gap-2">
                  {filteredBulkAttributes.length === 0 ? (
                    <p className="text-sm text-slate-500 py-2">
                      No attributes found
                    </p>
                  ) : (
                    filteredBulkAttributes.map((attr) => {
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
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                          title={attr}
                        >
                          {active && <Check className="w-4 h-4 shrink-0" />}
                          <span className="truncate max-w-[260px]">{attr}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
              {selectedBulkAttributes.length > 0 && (
                <div className="mt-5 pt-5 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Set values for selected attributes (
                    {selectedBulkAttributes.length} selected)
                  </p>
                  <div className="mt-3 max-h-64 overflow-y-auto bg-white rounded-lg p-3 border border-slate-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 pr-1">
                      {selectedBulkAttributes.map((attr) => (
                        <div key={attr} className="space-y-1">
                          <label
                            className="text-sm font-medium text-slate-800 truncate block"
                            title={attr}
                          >
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
                            className="h-10 w-full px-3 border border-slate-200 rounded-lg text-sm focus:border-blue-300 focus:ring-1 focus:ring-blue-300 outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      {viewMode === "projects" && !selectedProjectId ? (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={
                  filteredProjects.length > 0 &&
                  selectedProjectIds.size === filteredProjects.length
                }
                onChange={() => {
                  if (selectedProjectIds.size === filteredProjects.length) {
                    setSelectedProjectIds(new Set());
                  } else {
                    setSelectedProjectIds(
                      new Set(filteredProjects.map((p) => p.id)),
                    );
                  }
                }}
                className="rounded border-slate-300"
              />
              <span className="text-xs text-slate-500">Select All</span>
            </div>
            <div className="flex items-center justify-end gap-4 text-xs text-slate-500">
              <span className="text-sm font-semibold text-slate-900">
                {filteredProjects.length} Projects
              </span>
              {selectedProjectIds.size > 0 && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                  {selectedProjectIds.size} selected
                </span>
              )}
              <div className="flex items-center">
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
            style={{ maxHeight: "calc(100vh - 250px)" }}
          >
            <table className="w-full">
              <thead className="sticky top-0 z-30 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-[13px] font-semibold text-slate-500 bg-white border-b border-slate-200">
                    Project Name
                  </th>
                  <th className="px-4 py-3 text-left text-[13px] font-semibold text-slate-500 bg-white border-b border-slate-200">
                    Use Case
                  </th>
                  <th className="px-4 py-3 text-center text-[13px] font-semibold text-slate-500 bg-white border-b border-slate-200">
                    Products
                  </th>
                  <th className="px-4 py-3 text-center text-[13px] font-semibold text-slate-500 bg-white border-b border-slate-200">
                    CNS Products
                  </th>
                  <th className="px-4 py-3 text-center text-[13px] font-semibold text-slate-500 bg-white border-b border-slate-200">
                    Failed Products
                  </th>
                  <th className="px-4 py-3 text-center text-[13px] font-semibold text-slate-500 bg-white border-b border-slate-200">
                    Completeness
                  </th>
                  <th className="px-4 py-3 text-center text-[13px] font-semibold text-slate-500 bg-white border-b border-slate-200">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-[13px] font-semibold text-slate-500 bg-white border-b border-slate-200">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {projectsLoading ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                      <p className="text-slate-500 text-sm">
                        Loading projects...
                      </p>
                    </td>
                  </tr>
                ) : paginatedProjects.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      No cleaning projects found
                    </td>
                  </tr>
                ) : (
                  paginatedProjects.map((project) => {
                    const totalProducts = project.product_count ?? 0;
                    const cnsProducts = project.cleaned_count ?? 0;
                    const failedProducts = project.failed_count ?? 0;
                    return (
                      <tr
                        key={project.id}
                        className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                          selectedProjectIds.has(project.id)?'bg-blue-50/50':""
                        }`}
                        onClick={async () => {
                          setProjectSwitching(true);
                          setSelectedProjectId(project.id);
                          setViewMode("progress");
                          setPage(1);
                          setAllProductsSelected(false);
                          setSelectedProductIds(new Set());
                          try {
                            await loadProjectFilters(project.id);
                            await loadProjectAttributes(project.id);
                          } finally {
                            setProjectSwitching(false);
                          }
                        }}
                      >
                        <td
                          className="px-4 py-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedProjectIds.has(project.id)}
                            onChange={() => {
                              setSelectedProjectIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(project.id)) {
                                  next.delete(project.id);
                                } else {
                                  next.add(project.id);
                                }
                                return next;
                              });
                            }}
                            className="rounded border-slate-300"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`font-semibold text-sm ${
                              selectedProjectId === project.id
                                ? "text-blue-600 underline"
                                : "text-slate-900"
                            }`}
                          >
                            {project.name}
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
                            {totalProducts}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-full">
                            {cnsProducts}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-1 text-sm font-medium rounded-full ${failedProducts > 0 ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700"}`}
                          >
                            {failedProducts}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  (totalProducts > 0
                                    ? Math.round(
                                        (cnsProducts / totalProducts) * 100,
                                      )
                                    : 0) > 80
                                    ? "bg-green-500"
                                    : (totalProducts > 0
                                          ? Math.round(
                                              (cnsProducts / totalProducts) *
                                                100,
                                            )
                                          : 0) > 50
                                      ? "bg-amber-500"
                                      : "bg-red-400"
                                }`}
                                style={{
                                  width: `${totalProducts > 0 ? Math.round((cnsProducts / totalProducts) * 100) : 0}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs text-slate-600 font-medium min-w-[35px]">
                              {totalProducts > 0
                                ? Math.round(
                                    (cnsProducts / totalProducts) * 100,
                                  )
                                : 0}
                              %
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {getStatusBadge(project.source_status || "NA", true)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs text-blue-600 font-medium hover:underline">
                            View Products
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end text-xs text-slate-500">
            <Pagination
              page={projectsPage}
              totalPages={projectsTotalPages}
              onPageChange={setProjectsPage}
            />
          </div>
        </div>
      ) : viewMode === "progress" ? (
        <CleaningProductsOverview
          project={selectedProject!}
          products={filteredSortedProducts}
          loading={loading}
          total={total}
          page={page}
          pageSize={pageSize}
          totalPages={totalPages}
          onBack={() => {
            setViewMode("projects");
            handleReset();
          }}
          onPageChange={(p) => {
            setPage(p);
            setAllProductsSelected(false);
            setSelectedProductIds(new Set());
          }}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
          onProductClick={(product) => {
            setSelectedProductIds(new Set([product.id]));
            setAllProductsSelected(false);
            setViewMode("advanced");
          }}
          onAdvancedEdit={() => {
            if (selectedProductIds.size === 0 && !allProductsSelected) {
              notify.info("Select products first or click a product to edit");
              return;
            }
            setViewMode("advanced");
          }}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedProductIds={selectedProductIds}
          allProductsSelected={allProductsSelected}
          onToggleProduct={toggleProduct}
          onToggleAll={toggleAll}
          onSelectAllAcrossPages={() => setAllProductsSelected(true)}
        />
      ) : loading || projectSwitching ? (
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
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-white text-sm">
            <div className="flex items-center gap-3">
              <span className="text-slate-700 font-medium">
                {allProductsSelected
                  ? `All ${total} products selected`
                  : selectedProductIds.size > 0
                    ? `${selectedProductIds.size} product(s) selected`
                    : ""}
              </span>
              {!allProductsSelected &&
                selectedProductIds.size > 0 &&
                total > filteredSortedProducts.length && (
                  <button
                    onClick={() => setAllProductsSelected(true)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Select all {total} products across all pages
                  </button>
                )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">
                MPN: {selectedDetailProduct?.product_code}
              </span>
            </div>
          </div>
          <div
            className="overflow-auto relative"
            style={{ maxHeight: "calc(100vh - 280px)" }}
          >
            <table
              className="border-separate border-spacing-0"
              style={{
                tableLayout: "fixed",
                width:
                  COL_CHECKBOX +
                  COL_STATUS +
                  COL_THUMB +
                  COL_NAME +
                  COL_BRAND +
                  COL_CATEGORY +
                  COL_ACTION +
                  availableAttributes.length * COL_ATTR,
              }}
            >
              <thead className="sticky top-0 z-40">
                <tr className="text-left text-[13px] font-semibold text-slate-500 bg-slate-50">
                  {/* Checkbox - sticky */}
                  <th
                    style={{
                      width: COL_CHECKBOX,
                      minWidth: COL_CHECKBOX,
                      left: LEFT_CHECKBOX,
                      position: "sticky",
                      zIndex: 50,
                    }}
                    className="px-3 py-3 border-b border-r border-slate-200 bg-slate-50 text-center"
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

                  {/* Status - sticky */}
                  <th
                    style={{
                      width: COL_STATUS,
                      minWidth: COL_STATUS,
                      left: LEFT_STATUS,
                      position: "sticky",
                      zIndex: 50,
                    }}
                    className="px-3 py-3 border-b border-r border-slate-200 bg-slate-50 text-center"
                  >
                    Status
                  </th>

                  <th
                    style={{
                      width: COL_THUMB,
                      minWidth: COL_THUMB,
                      left: LEFT_STATUS + COL_STATUS,
                      position: "sticky",
                      zIndex: 50,
                    }}
                    className="px-3 py-3 border-b border-r border-slate-200 bg-slate-50 text-center"
                  >
                    Image
                  </th>

                  <th
                    style={{
                      width: COL_NAME,
                      minWidth: COL_NAME,
                      left: LEFT_NAME,
                      position: "sticky",
                      zIndex: 50,
                    }}
                    className="px-3 py-3 border-b border-r border-slate-200 bg-slate-50"
                  >
                    Product Name
                  </th>

                  {/* Brand - sticky */}
                  <th
                    style={{
                      width: COL_BRAND,
                      minWidth: COL_BRAND,
                      left: LEFT_MPN,

                      position: "sticky",
                      zIndex: 50,
                    }}
                    className="px-3 py-3 border-b border-r border-slate-200 bg-slate-50"
                  >
                    Brand
                  </th>

                  {/* Category - sticky */}
                  <th
                    style={{
                      width: COL_CATEGORY,
                      minWidth: COL_CATEGORY,
                      left: LEFT_MPN + COL_BRAND,

                      position: "sticky",
                      zIndex: 50,
                    }}
                    className="px-3 py-3 border-b border-r border-slate-200 bg-slate-50"
                  >
                    Category
                  </th>

                  {/* Dynamic Attributes */}
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

                  {/* Action - sticky right */}
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
                {filteredSortedProducts
                  .filter(
                    (p) => allProductsSelected || selectedProductIds.has(p.id),
                  )
                  .map((product) => (
                    <tr
                      key={product.id}
                      className="border-b border-slate-100 hover:bg-slate-50/70 align-top group"
                    >
                      {/* Checkbox */}
                      <td
                        style={{
                          width: COL_CHECKBOX,
                          position: "sticky",
                          left: LEFT_CHECKBOX,
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

                      {/* Status */}
                      <td
                        style={{
                          width: COL_STATUS,
                          position: "sticky",
                          left: LEFT_STATUS,
                          zIndex: 20,
                        }}
                        className="px-3 py-4 border-r border-slate-100 bg-white group-hover:bg-slate-50/70"
                      >
                        <div className="flex justify-center">
                          <StatusPill status={product.enrichment_status} />
                        </div>
                      </td>

                      {/* Image */}
                      <td
                        style={{
                          width: COL_THUMB,
                          position: "sticky",
                          left: LEFT_STATUS + COL_STATUS,
                          zIndex: 20,
                        }}
                        className="px-3 py-4 border-r border-slate-100 bg-white group-hover:bg-slate-50/70"
                      >
                        <div className="flex justify-center">
                          <ProductThumbnail
                            src={(product as any).image_url_1}
                            alt={product.product_name}
                          />
                        </div>
                      </td>

                      <td
                        style={{
                          width: COL_NAME,
                          position: "sticky",
                          left: LEFT_NAME,
                          zIndex: 20,
                        }}
                        className="px-3 py-4 border-r border-slate-100 bg-white group-hover:bg-slate-50/70"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span
                            className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2"
                            title={product.product_name}
                          >
                            {product.product_name}
                          </span>
                          <span
                            className="text-[10px] text-blue-600 font-mono font-medium truncate"
                            title={product.product_code}
                          >
                            MPN: {product.product_code}
                          </span>
                        </div>
                      </td>

                      {/* Brand */}
                      <td
                        style={{
                          width: COL_BRAND,
                          position: "sticky",
                          left: LEFT_MPN,

                          zIndex: 20,
                        }}
                        className="px-3 py-4 border-r border-slate-100 bg-white group-hover:bg-slate-50/70"
                      >
                        <span className="text-sm text-slate-600">
                          {product.brand_name}
                        </span>
                      </td>

                      {/* Category */}
                      <td
                        style={{
                          width: COL_CATEGORY,
                          position: "sticky",
                          left: LEFT_MPN + COL_BRAND,

                          zIndex: 20,
                        }}
                        className="px-3 py-4 border-r border-slate-200 bg-white group-hover:bg-slate-50/70"
                      >
                        <span className="text-sm text-slate-600">
                          {product.category_3}
                        </span>
                      </td>

                      {/* Dynamic Attributes - Keep existing code unchanged */}
                      {availableAttributes.map((attr) => {
                        const dynAttr = (product as any).attributes_dict?.[
                          attr
                        ];
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
                            className={`border-r border-slate-100 align-top ${conflict ? "bg-amber-50/30" : ""}`}
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

                      {/* Action - sticky right */}
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
                                <Loader2 className="w-4 h-4 animate-spin" />{" "}
                                Cleaning
                              </>
                            ) : product.enrichment_status === "completed" ? (
                              "Re-clean"
                            ) : (
                              "Clean"
                            )}
                          </button>
                          {Object.keys(editingAttributes[product.id] || {})
                            .length > 0 && (
                            <button
                              onClick={() => handleSaveAttributes(product.id)}
                              disabled={savingAttributes[product.id]}
                              className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 text-sm font-medium disabled:opacity-40 hover:underline"
                            >
                              {savingAttributes[product.id] ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />{" "}
                                  Saving
                                </>
                              ) : (
                                <>
                                  <Check className="w-4 h-4" /> Save
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
        </div>
      )}
    </div>
  );
}
