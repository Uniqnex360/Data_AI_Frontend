import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Filter,
  Layers,
  Loader2,
  Package,
  RefreshCw,
  Sparkles,
  Tag,
  XCircle,
} from "lucide-react";
import { dashboardService, type DateField } from "../services/dashboardService";
import ProjectsOverviewTab from "./ProjectsOverviewTab.tsx";
import {
  DashboardStats,
  Product,
  ProjectOverview,
} from "../types/business-rules.types.ts";
import { productService } from "../services/productService";
import { ChevronRight } from "lucide-react";
import { useAuth } from "../context/AuthContext.tsx";
import { ProgressCard, StatCard } from "../utils/dashboardHelper.tsx";

interface Props {
  projectId?: string;
  onNavigate?: (tab: "aggregation" | "sources", filterStatus?: string) => void;
}

type Preset = "today" | "week" | "month" | "custom";
type Period = "day" | "week" | "month";
type DashboardMode = "aggregation" | "cleaning" | "enrichment" | "attributes";

const toYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

const endOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

const startOfWeek = (d: Date) => {
  const date = startOfDay(d);
  const day = date.getDay();
  const diff = (day + 6) % 7;
  date.setDate(date.getDate() - diff);
  return date;
};

const endOfWeek = (d: Date) => {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  return endOfDay(e);
};

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) =>
  endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));


const parseYMD = (s: string) => {
  const [yy, mm, dd] = s.split("-").map(Number);
  return new Date(yy, (mm || 1) - 1, dd || 1);
};

const diffDaysInclusive = (startYmd: string, endYmd: string) => {
  const s = startOfDay(parseYMD(startYmd)).getTime();
  const e = startOfDay(parseYMD(endYmd)).getTime();
  const days = Math.round((e - s) / (24 * 3600 * 1000)) + 1;
  return Math.max(1, days);
};

const shiftRangeBack = (startYmd: string, endYmd: string) => {
  const days = diffDaysInclusive(startYmd, endYmd);
  const start = parseYMD(startYmd);
  const end = parseYMD(endYmd);
  const prevStart = new Date(start);
  const prevEnd = new Date(end);
  prevStart.setDate(prevStart.getDate() - days);
  prevEnd.setDate(prevEnd.getDate() - days);
  return { start: toYMD(prevStart), end: toYMD(prevEnd) };
};

const timeAgo = (iso: string) => {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

function PillButton({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-semibold transition-colors ${
        active ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-50"
      }`}
      type="button"
    >
      {children}
    </button>
  );
}


export default function DashboardTab({ projectId, onNavigate }: Props) {
  const [loading, setLoading] = useState(true);
  const [projectsOverview, setProjectsOverview] = useState<ProjectOverview[]>(
    [],
  );
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("week");
  const [preset, setPreset] = useState<Preset>("month");

  const [startDate, setStartDate] = useState<string>(
    toYMD(startOfMonth(new Date())),
  );
  const { user: loggedInUser } = useAuth();
  const isAdmin = loggedInUser?.role === "admin";

  const [selectedUserId, setSelectedUserId] = useState<string>(() => {
    return localStorage.getItem("impersonated_user_id") || "all";
  });
  const [availableUsers, setAvailableUsers] = useState<
    { id: string; full_name: string }[]
  >([]);

  const [taxonomies, setTaxonomies] = useState<
    { taxonomy: string; count: number }[]
  >([]);
  const [viewAllType, setViewAllType] = useState<
    "brands" | "categories" | null
  >(null);
  const [listSearch, setListSearch] = useState("");
  const [selectedTaxonomy, setSelectedTaxonomy] = useState<string>("");
  const OVERVIEW_PAGE_SIZE = 20;
const [projectsOverviewPage, setProjectsOverviewPage] = useState(1);
const [projectsOverviewTotalPages, setProjectsOverviewTotalPages] = useState(1);
  const [taxonomyMetrics, setTaxonomyMetrics] = useState<any>(null);
  const [activeMode, setActiveMode] = useState<DashboardMode>("aggregation");
  const [showAllBrands, setShowAllBrands] = useState(false);
  const [brandSearch, setBrandSearch] = useState("");
  const [endDate, setEndDate] = useState<string>(toYMD(new Date()));
  const [attributeSummary, setAttributeSummary] = useState<any[]>([]);
  const [draftStartDate, setDraftStartDate] = useState(startDate);
const [draftEndDate, setDraftEndDate] = useState(endDate);
const [dateError, setDateError] = useState<string | null>(null);

  const [dateField, setDateField] = useState<DateField>("updated_at");
  const [totalProjectCount, setTotalProjectCount] = useState(0);

  const [globalStats, setGlobalStats] = useState<DashboardStats | null>(null);
  const [metrics, setMetrics] = useState<any[]>([]);

  const [timelineStats, setTimelineStats] = useState<any[]>([]);
  const [brandFlowStats, setBrandFlowStats] = useState<any[]>([]);
  const [categoryFlowStats, setCategoryFlowStats] = useState<any[]>([]);

  const [problemProducts, setProblemProducts] = useState<Product[]>([]);

  const [needsAttention, setNeedsAttention] = useState<{
    uncategorized: number;
    invalidAttributes: number;
    pendingAggregation: number;
    failedJobs: number;
  } | null>(null);

  const [recentActivity, setRecentActivity] = useState<
    Array<{ type: string; title: string; subtitle?: string; ts: string }>
  >([]);

  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const [prevStats, setPrevStats] = useState<DashboardStats | null>(null);

  const todayYMD = useMemo(() => toYMD(new Date()), []);
  const loadProjectsOverview = async (page = 1): Promise<void> => {
  setProjectsLoading(true);
  try {
    const data = await dashboardService.getProjectsOverview({
      page,
      page_size: OVERVIEW_PAGE_SIZE,
    });

    const projects = Array.isArray(data?.projects) ? data.projects : [];
    const total = Number.isFinite(data?.total) ? data.total : 0;

    setProjectsOverview(projects);
    setTotalProjectCount(total);
    setProjectsOverviewTotalPages(
      Math.max(1, Math.ceil(total / OVERVIEW_PAGE_SIZE)),
    );
  } catch (error) {
    console.error("Failed to load projects overview:", error);
    setProjectsOverview([]);
    setTotalProjectCount(0);
    setProjectsOverviewTotalPages(1);
  } finally {
    setProjectsLoading(false);
  }
};
const hasPendingDateChange =
  draftStartDate !== startDate || draftEndDate !== endDate;

const handleApplyDates = () => {
  if (!draftStartDate || !draftEndDate) {
    setDateError("Please select both start and end dates.");
    return;
  }
  if (draftStartDate > draftEndDate) {
    setDateError("Start date cannot be after end date.");
    return;
  }
  if (draftEndDate > todayYMD) {
    setDateError("End date cannot be in the future.");
    return;
  }

  setDateError(null);
  setStartDate(draftStartDate);
  setEndDate(draftEndDate);

  const payload = {
    start_date: draftStartDate,
    end_date: draftEndDate,
    date_field: dateField, // "updated_at" or "created_at"
  };
  localStorage.setItem("dashboard_date_filter", JSON.stringify(payload));
  window.dispatchEvent(new Event("dashboard-date-changed"));
};
  useEffect(() => {
    if (isAdmin) {
      dashboardService
        .getUsersList()
        .then(setAvailableUsers)
        .catch((err) => console.error("Failed to fetch users", err));
    }
  }, [isAdmin]);
  const rangeParams = useMemo(
    () => ({
      start_date: startDate,
      end_date: endDate,
      date_field: dateField,
      mode: activeMode,
      user_id: selectedUserId === "all" ? undefined : selectedUserId,
    }),
    [startDate, endDate, dateField, activeMode, selectedUserId],
  );
 useEffect(() => {
  if (!projectId) {
    loadProjectsOverview(projectsOverviewPage);
  }
}, [projectId, selectedUserId, projectsOverviewPage]);
  const handleProjectsOverviewPageChange = (page: number): void => {
  if (!Number.isFinite(page) || page < 1 || page > projectsOverviewTotalPages) {
    return;
  }
  setProjectsOverviewPage(page);
};
  useEffect(() => {
    if (activeMode === "attributes") {
      const fetchTaxonomies = async () => {
        const data = await dashboardService.getTaxonomiesList(projectId);
        setTaxonomies(data);
        if (data.length > 0 && !selectedTaxonomy) {
          setSelectedTaxonomy(data[0].taxonomy);
        }
      };
      fetchTaxonomies();
    }
  }, [activeMode, projectId]);

 useEffect(() => {
  const now = new Date();
  const today = toYMD(now);

  setDateError(null); 

  if (preset === "today") {
    
    setDraftStartDate(today);
    setDraftEndDate(today);
  } else if (preset === "week") {
    
    setDraftStartDate(toYMD(startOfWeek(now)));
    setDraftEndDate(today);
  } else if (preset === "month") {
    
    setDraftStartDate(toYMD(startOfMonth(now)));
    setDraftEndDate(today);
  }
  
}, [preset]);
  useEffect(() => {
    if (activeMode === "attributes" && selectedTaxonomy) {
      const fetchTaxonomyDetails = async () => {
        try {
          const metrics = await dashboardService.getTaxonomyAttributeMetrics(
            selectedTaxonomy,
            projectId,
          );
          setTaxonomyMetrics(metrics);

          const details = await dashboardService.getAttributeSummary({
            project_id: projectId,
            taxonomy: selectedTaxonomy,
            ...rangeParams,
          });
          setAttributeSummary(details);
        } catch (error) {
          console.error("Failed to load taxonomy details", error);
        }
      };
      fetchTaxonomyDetails();
    } 
  }, [selectedTaxonomy, activeMode, projectId, rangeParams]);
  useEffect(() => {
  if (!draftStartDate || !draftEndDate) return;
  if (draftStartDate > draftEndDate) {
    setDraftEndDate(draftStartDate);
  }
}, [draftStartDate, draftEndDate]);

  useEffect(() => {
    if(activeMode==='attributes')return
    loadData();
  }, [
    projectId,
    selectedPeriod,
    rangeParams.start_date,
    rangeParams.end_date,
    rangeParams.date_field,
    rangeParams.user_id,
    activeMode,
  ]);

  const getMetricValue = (type: string): number =>
    metrics.find((m) => m.metric_type === type)?.metric_value || 0;

  const loadData = async () => {
    setLoading(true);
    try {
      const data = projectId
        ? await dashboardService.getProjectMetrics(projectId, rangeParams)
        : await dashboardService.getGlobalMetrics(rangeParams);
      setGlobalStats(data);

      if (activeMode !== "attributes") {
      setAttributeSummary([]);
    }

      const prev = shiftRangeBack(startDate, endDate);
      const prevData = projectId
        ? await dashboardService.getProjectMetrics(projectId, {
            ...rangeParams,
            start_date: prev.start,
            end_date: prev.end,
          })
        : await dashboardService.getGlobalMetrics({
            ...rangeParams,
            start_date: prev.start,
            end_date: prev.end,
          });

      setPrevStats(prevData);

      const timeline = await dashboardService.getTimeline({
        projectId,
        period: selectedPeriod,
        ...rangeParams,
      } as any);
      setTimelineStats(timeline);

      const brandFlow = await dashboardService.getBrandFlow({
        projectId,
        ...rangeParams,
      } as any);
      setBrandFlowStats(brandFlow);

      const categoryFlow = await dashboardService.getCategoryFlow({
        projectId,
        ...rangeParams,
      } as any);
      setCategoryFlowStats(categoryFlow);

      const na = await dashboardService.getNeedsAttention({
        projectId,
        ...rangeParams,
      } as any);
      setNeedsAttention(na);

      const ra = await dashboardService.getRecentActivity({
        projectId,
        ...rangeParams,
        limit: 10,
      } as any);
      setRecentActivity(ra);

      if (projectId) {
        const failedRes = await productService.getProductsByProject(
          projectId,
          0,
          5,
          "failed",
        );
        let combinedList = failedRes.products;

        if (combinedList.length < 5) {
          const remainingSlots = 5 - combinedList.length;
          const pendingRes = await productService.getProductsByProject(
            projectId,
            0,
            remainingSlots,
            "pending",
          );
          combinedList = [...combinedList, ...pendingRes.products];
        }

        setProblemProducts(combinedList);
      } else {
        setProblemProducts([]);
      }

      setMetrics([
        {
          metric_type: "total_products",
          metric_value: data.totalProducts || 0,
        },
        {
          metric_type: "aggregated",
          metric_value: (data as any).aggregatedProducts || 0,
        },
        {
          metric_type: "cleaned",
          metric_value: (data as any).cleanedProducts || 0,
        },
        {
          metric_type: "enriched",
          metric_value: (data as any).enrichedProducts || 0,
        },
        {
          metric_type: "failed",
          metric_value: (data as any).failedProducts || 0,
        },
        {
          metric_type: "pending",
          metric_value: (data as any).pendingProducts || 0,
        },
        {
          metric_type: "catalog_health",
          metric_value: (data as any).catalogHealth || 0,
        },
      ]);

      setLastRefreshedAt(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const total = getMetricValue("total_products");
  const processed = getMetricValue("aggregated");
  const enriched = getMetricValue("enriched");
  const cleaned = getMetricValue("cleaned");
  const pending = getMetricValue("pending");
  const failed = getMetricValue("failed");
  const avgCompleteness = getMetricValue("catalog_health");

  const totalDelta =
    (globalStats?.totalProducts ?? 0) - (prevStats?.totalProducts ?? 0);
  const processedPct = prevStats?.aggregatedProducts
    ? (((globalStats?.aggregatedProducts ?? 0) -
        (prevStats?.aggregatedProducts ?? 0)) /
        (prevStats?.aggregatedProducts || 1)) *
      100
    : 0;
  const enrichedPct = prevStats?.enrichedProducts
    ? (((globalStats?.enrichedProducts ?? 0) -
        (prevStats?.enrichedProducts ?? 0)) /
        (prevStats?.enrichedProducts || 1)) *
      100
    : 0;
  const cleanedPct = prevStats?.cleanedProducts
    ? (((globalStats?.cleanedProducts ?? 0) -
        (prevStats?.cleanedProducts ?? 0)) /
        (prevStats?.cleanedProducts || 1)) *
      100
    : 0;

  const enrichmentRatePct = total > 0 ? (enriched / total) * 100 : 0;
  const uncategorized = needsAttention?.uncategorized ?? 0;
  const categoryCoveragePct =
    total > 0 ? ((total - uncategorized) / total) * 100 : 0;

  const invalidAttributes = needsAttention?.invalidAttributes ?? 0;
  const attrValidityPct =
    total > 0 ? ((total - invalidAttributes) / total) * 100 : 100;

  const activityAgg = processed;
  const activityEnrich = enriched;
  const activityClean = cleaned;

  const statusObj = useMemo(() => {
    if (!projectId) return null;
    if (total === 0)
      return {
        label: "Yet to Start",
        color: "bg-slate-100 text-slate-600",
        icon: AlertCircle,
      };
    if (enriched + failed >= total)
      return {
        label: "Completed",
        color: "bg-green-100 text-green-700",
        icon: CheckCircle2,
      };
    return {
      label: "In Progress",
      color: "bg-blue-100 text-blue-700",
      icon: Clock,
    };
  }, [projectId, total, enriched, failed]);
  useEffect(() => {
    const handleImpersonationChange = () => {
      const storedId = localStorage.getItem("impersonated_user_id") || "all";
      setSelectedUserId(storedId);
    };

    window.addEventListener("impersonation-changed", handleImpersonationChange);
    window.addEventListener("storage", handleImpersonationChange);

    return () => {
      window.removeEventListener(
        "impersonation-changed",
        handleImpersonationChange,
      );
      window.removeEventListener("storage", handleImpersonationChange);
    };
  }, []);
  const ActivityIcon = ({ type }: { type: string }) => {
    const t = (type || "").toLowerCase();
    if (t.includes("completed"))
      return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    if (t.includes("failed"))
      return <XCircle className="w-4 h-4 text-red-600" />;
    if (t.includes("clean"))
      return <Filter className="w-4 h-4 text-teal-600" />;
    if (t.includes("enrich"))
      return <Sparkles className="w-4 h-4 text-amber-600" />;
    return <Activity className="w-4 h-4 text-slate-600" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading Dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-2xl font-bold text-slate-900">Dashboard</h3>
            {projectId && statusObj && (
              <span
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${statusObj.color}`}
              >
                <statusObj.icon className="w-3.5 h-3.5" />
                {statusObj.label}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600">
            Product intelligence overview — projects, brands, categories &
            pipeline health
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          
          <div className="inline-flex rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <PillButton
              active={preset === "today"}
              onClick={() => setPreset("today")}
            >
              Today
            </PillButton>
            <PillButton
              active={preset === "week"}
              onClick={() => setPreset("week")}
            >
              This Week
            </PillButton>
            <PillButton
              active={preset === "month"}
              onClick={() => setPreset("month")}
            >
              This Month
            </PillButton>
            <PillButton
              active={preset === "custom"}
              onClick={() => setPreset("custom")}
            >
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                Custom
              </span>
            </PillButton>
          </div>

         <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-3 py-2 shadow-sm">
  <input
    type="date"
    value={draftStartDate}
    max={todayYMD}
    onChange={(e) => {
      setPreset("custom");
      setDraftStartDate(e.target.value);
      setDateError(null); 
    }}
    className="text-sm outline-none bg-transparent"
  />
  <span className="text-slate-400 text-sm">to</span>
  <input
    type="date"
    value={draftEndDate}
    max={todayYMD}
    onChange={(e) => {
      setPreset("custom");
      setDraftEndDate(e.target.value);
      setDateError(null); 
    }}
    className="text-sm outline-none bg-transparent"
  />
</div>

{dateError && (
  <div className="text-xs text-red-600 font-medium mt-1">
    {dateError}
  </div>
)}

          <select
            value={dateField}
            onChange={(e) => setDateField(e.target.value as DateField)}
            className="h-10 px-3 border border-slate-200 rounded-2xl bg-white text-sm font-semibold shadow-sm"
            title="Filter by"
          >
            <option value="updated_at">Activity</option>
            <option value="created_at">Ingestion</option>
          </select>

          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
            title="Refresh"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Live · {lastRefreshedAt ? "just now" : "—"}
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </button>
          <button
  type="button"
  onClick={handleApplyDates}
  disabled={!hasPendingDateChange}
  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold shadow-sm
    ${hasPendingDateChange
      ? "bg-blue-600 text-white hover:bg-blue-700"
      : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}
>
  Apply
</button>
        </div>
      </div>
      <div className="bg-white border-b border-slate-200">
        <div className="flex items-center gap-2 px-6 overflow-x-auto">
          {[
            { id: "aggregation", label: "Aggregation", icon: Layers },
            { id: "cleaning", label: "Cleansing", icon: Filter },
            { id: "enrichment", label: "Enrichment", icon: Sparkles },
            { id: "attributes", label: "Attributes", icon: Activity },
          ].map((tab) => {
            const isActive = activeMode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveMode(tab.id as DashboardMode)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
                type="button"
              >
                <tab.icon
                  className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-400"}`}
                />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      {activeMode !== "attributes" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
            <StatCard
              title="Total Products"
              value={total}
              icon={<Package className="w-5 h-5" />}
              iconBg="bg-blue-50 border border-blue-100"
              iconColor="text-blue-600"
              footerLeft={
                <span className="text-emerald-600 font-semibold">
                  {totalDelta >= 0 ? `↗ +${totalDelta}` : `↘ ${totalDelta}`}
                </span>
              }
              footerRight={
                projectId
                  ? "Custom Range"
                  : `${globalStats?.totalProjects ?? 0} projects`
              }
              onClick={() => onNavigate?.("aggregation", "all")}
            />

            {activeMode === "aggregation" && (
              <StatCard
                title="Aggregated"
                value={processed}
                icon={<Activity className="w-5 h-5" />}
                iconBg="bg-emerald-50 border border-emerald-100"
                iconColor="text-emerald-600"
                footerLeft={
                  <span className="text-emerald-600 font-semibold">
                    {processedPct >= 0
                      ? `↗ +${Math.round(processedPct)}%`
                      : `↘ ${Math.round(processedPct)}%`}
                  </span>
                }
                footerRight="Custom Range"
                onClick={() => onNavigate?.("aggregation", "completed")}
              />
            )}

            {activeMode === "enrichment" && (
              <StatCard
                title="Enriched"
                value={enriched}
                icon={<Sparkles className="w-5 h-5" />}
                iconBg="bg-amber-50 border border-amber-100"
                iconColor="text-amber-600"
                footerLeft={
                  <span className="text-emerald-600 font-semibold">
                    {enrichedPct >= 0
                      ? `↗ +${Math.round(enrichedPct)}%`
                      : `↘ ${Math.round(enrichedPct)}%`}
                  </span>
                }
                footerRight="Custom Range"
                onClick={() => onNavigate?.("aggregation", "completed")}
              />
            )}

            {activeMode === "cleaning" && (
              <StatCard
                title="Cleansed"
                value={cleaned}
                icon={<Filter className="w-5 h-5" />}
                iconBg="bg-teal-50 border border-teal-100"
                iconColor="text-teal-600"
                footerLeft={
                  <span className="text-emerald-600 font-semibold">
                    {cleanedPct >= 0
                      ? `↗ +${Math.round(cleanedPct)}%`
                      : `↘ ${Math.round(cleanedPct)}%`}
                  </span>
                }
                footerRight="Custom Range"
              />
            )}

            <StatCard
              title="Pending"
              value={pending}
              icon={<Clock className="w-5 h-5" />}
              iconBg="bg-yellow-50 border border-yellow-100"
              iconColor="text-yellow-600"
              footerLeft={
                <span className="text-emerald-600 font-semibold">
                  ↗ {needsAttention?.pendingAggregation ?? pending} active
                </span>
              }
              footerRight="across all stages"
              onClick={() => onNavigate?.("aggregation", "pending")}
            />

            <StatCard
              title="Failed Jobs"
              value={failed}
              icon={<AlertTriangle className="w-5 h-5" />}
              iconBg="bg-red-50 border border-red-100"
              iconColor="text-red-600"
              footerLeft={
                <span
                  className={`${failed > 0 ? "text-red-600" : "text-slate-500"} font-semibold`}
                >
                  {failed > 0 ? "↘ -5%" : "0%"}
                </span>
              }
              footerRight="need attention"
              onClick={() => onNavigate?.("aggregation", "failed")}
            />

            <StatCard
              title="Total Brands"
              value={globalStats?.totalBrands ?? 0}
              icon={<Tag className="w-5 h-5" />}
              iconBg="bg-purple-50 border border-purple-100"
              iconColor="text-purple-600"
              footerRight="unique brands"
            />
            <StatCard
              title="Total Categories"
              value={globalStats?.totalCategories ?? 0}
              icon={<Layers className="w-5 h-5" />}
              iconBg="bg-cyan-50 border border-cyan-100"
              iconColor="text-cyan-600"
              footerRight="unique categories"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {activeMode === "enrichment" && (
              <ProgressCard
                title="Enrichment Rate"
                valuePct={enrichmentRatePct}
                subtitle={`${enriched} of ${total} products enriched`}
                barClass="bg-orange-500"
                icon={<Sparkles className="w-5 h-5 text-orange-600" />}
              />
            )}

            <ProgressCard
              title="Avg Completeness"
              valuePct={avgCompleteness}
              subtitle="across top 10 brands"
              barClass="bg-blue-600"
              icon={<Activity className="w-5 h-5 text-blue-600" />}
            />
            <ProgressCard
              title="Category Coverage"
              valuePct={categoryCoveragePct}
              subtitle={`${uncategorized} products still uncategorised`}
              barClass="bg-emerald-500"
              icon={<Layers className="w-5 h-5 text-emerald-600" />}
            />
          </div>
        </>
      )}
      {activeMode === "attributes" && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2 block">
              Select Category Taxonomy
            </label>
            <div className="relative">
              <select
                value={selectedTaxonomy}
                onChange={(e) => setSelectedTaxonomy(e.target.value)}
                className="w-full h-12 pl-4 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold appearance-none focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {taxonomies.map((t) => (
                  <option key={t.taxonomy} value={t.taxonomy}>
                    {t.taxonomy} ({t.count} products)
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <Filter className="w-4 h-4" />
              </div>
            </div>
          </div>

          {taxonomyMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">
                    Total Attributes
                  </p>
                  <p className="text-3xl font-black text-slate-900 mt-1">
                    {taxonomyMetrics.totalAttributes}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                  <Layers className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">
                    Total Products
                  </p>
                  <p className="text-3xl font-black text-slate-900 mt-1">
                    {taxonomyMetrics.totalProducts}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                  <Package className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">
                    Avg Unique Values
                  </p>
                  <p className="text-3xl font-black text-slate-900 mt-1">
                    {taxonomyMetrics.avgUniqueValues}
                  </p>
                </div>
                <div className="w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center text-cyan-600">
                  <Activity className="w-6 h-6" />
                </div>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-bold text-slate-900">
                Extracted Attribute Summary
              </h4>
              <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">
                {attributeSummary.length} Attributes Found
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {attributeSummary.map((attr) => (
                <div
                  key={attr.attribute_name}
                  className="p-5 bg-slate-50 border border-slate-100 rounded-2xl hover:border-blue-200 transition-colors group"
                >
                  <p className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">
                    {attr.attribute_name}
                  </p>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900">
                      {attr.unique_values}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Unique Values
                    </span>
                  </div>
                  {attr.uoms?.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1">
                      {attr.uoms.map((uom: string) => (
                        <span
                          key={uom}
                          className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-500 uppercase"
                        >
                          {uom}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeMode !== "attributes" && (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-4 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[500px]">
              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h4 className="text-base font-bold text-slate-900">Brands</h4>
                <button
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  onClick={() => setViewAllType("brands")}
                >
                  View all <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                {brandFlowStats.map((row: any, idx: number) => (
                  <button
                    key={idx}
                    className="w-full group flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {row.brand}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full">
                          {row.count}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-semibold">
                        <span className="text-blue-600">
                          {row.complete}%{" "}
                          <span className="text-slate-400 font-medium">
                            complete
                          </span>
                        </span>
                        <span className="text-fuchsia-600">
                          {row.quality}%{" "}
                          <span className="text-slate-400 font-medium">
                            quality
                          </span>
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-400 transition-colors" />
                  </button>
                ))}

                {brandFlowStats.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center p-10 text-slate-400">
                    <Tag className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-sm italic">No brand data available</p>
                  </div>
                )}
              </div>
            </div>

            <div className="xl:col-span-4 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[500px]">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h4 className="text-base font-bold text-slate-900">
                  Categories
                </h4>
                <button
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  onClick={() => setViewAllType("categories")}
                >
                  View all <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                {categoryFlowStats.map((row: any, idx: number) => {
                  const displayName = row.category.split(">").pop().trim();

                  return (
                    <button
                      key={idx}
                      className="w-full group flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 transition-colors text-left"
                      title={row.category} 
                    >
                      <div className="space-y-1 min-w-0 flex-1 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 truncate uppercase text-[13px] tracking-tight">
                            {displayName}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full flex-shrink-0">
                            {row.count}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-semibold">
                          <span className="text-blue-600">
                            {row.complete}%{" "}
                            <span className="text-slate-400 font-medium">
                              complete
                            </span>
                          </span>
                          <span className="text-fuchsia-600">
                            {row.quality}%{" "}
                            <span className="text-slate-400 font-medium">
                              quality
                            </span>
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-400 transition-colors flex-shrink-0" />
                    </button>
                  );
                })}

                {categoryFlowStats.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center p-10 text-slate-400">
                    <Layers className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-sm italic">No category data available</p>
                  </div>
                )}
              </div>
            </div>

            <div className="xl:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    Custom Range
                  </div>
                  <div className="text-lg font-black text-slate-900 mt-0.5">
                    Activity
                  </div>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500" /> Agg
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />{" "}
                    Enrich
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />{" "}
                    Clean
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-7 gap-2 text-[11px] text-slate-400">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <div key={d} className="text-center">
                    {d}
                  </div>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-7 gap-2 items-end h-24">
                {(() => {
                  const rows = timelineStats.slice(-7);
                  const max = Math.max(
                    1,
                    ...rows.map((r: any) => Number(r.totalProducts || 0)),
                  );

                  const padded =
                    rows.length < 7
                      ? new Array(7 - rows.length).fill(null).concat(rows)
                      : rows;

                  return padded.map((r: any, i: number) => {
                    const v = r ? Number(r.totalProducts || 0) : 0;
                    const h = Math.round((v / max) * 100);
                    return (
                      <div key={i} className="flex flex-col justify-end h-full">
                        <div
                          className="w-full rounded-md bg-slate-200"
                          style={{ height: `${Math.max(6, h)}%` }}
                          title={r?.period ? `${r.period}: ${v}` : ""}
                        />
                      </div>
                    );
                  });
                })()}
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-2xl font-black text-blue-600">
                    {activityAgg}
                  </div>
                  <div className="text-xs text-slate-500">Aggregated</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-orange-600">
                    {activityEnrich}
                  </div>
                  <div className="text-xs text-slate-500">Enriched</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-emerald-600">
                    {activityClean}
                  </div>
                  <div className="text-xs text-slate-500">Cleansed</div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" /> Timeline Overview
              </h4>
              <div className="flex items-center gap-2">
                {(["day", "week", "month"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setSelectedPeriod(p)}
                    className={`px-3 py-1 rounded-md text-xs font-bold ${
                      selectedPeriod === p
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold">
                  <tr>
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Aggregated</th>
                    <th className="px-4 py-3">Moved to Enrichment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {timelineStats.length > 0 ? (
                    timelineStats.map((row: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-4 py-3">{row.period}</td>
                        <td className="px-4 py-3">{row.totalProducts}</td>
                        <td className="px-4 py-3">{row.aggregatedProducts}</td>
                        <td className="px-4 py-3">{row.movedToEnrichment}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-center text-slate-400"
                      >
                        No timeline data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
           {!projectId &&
        (projectsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <ProjectsOverviewTab
            projects={projectsOverview}
            totalCount={totalProjectCount}
            page={projectsOverviewPage}
            totalPages={projectsOverviewTotalPages}
            onPageChange={handleProjectsOverviewPageChange}
            onOpenProject={(id) => onNavigate?.("aggregation", "all")}
          />
        ))}
        </>
      )}
      {activeMode !== "attributes" && (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-8" />

            <div className="xl:col-span-4 space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-slate-700" /> Recent
                  Activity
                </h4>

                {recentActivity.length === 0 ? (
                  <div className="text-xs text-slate-400 italic border border-dashed border-slate-200 rounded-xl p-6 text-center">
                    No recent activity available.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.slice(0, 6).map((a, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200"
                      >
                        <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                          <ActivityIcon type={a.type} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-semibold text-slate-900 truncate">
                              {a.title}
                            </div>
                            <div className="text-xs text-slate-500 whitespace-nowrap">
                              {timeAgo(a.ts)}
                            </div>
                          </div>
                          {a.subtitle && (
                            <div className="text-xs text-slate-500 mt-1 line-clamp-2">
                              {a.subtitle}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" /> Needs
                  Attention
                </h4>

                <div className="space-y-2">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-colors"
                  >
                    <span className="text-sm font-semibold text-amber-700">
                      {uncategorized} uncategorised products
                    </span>
                    <ArrowRight className="w-4 h-4 text-amber-700" />
                  </button>

                  <button
                    type="button"
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-red-50 border border-red-100 hover:bg-red-100 transition-colors"
                  >
                    <span className="text-sm font-semibold text-red-700">
                      {invalidAttributes} invalid attribute values
                    </span>
                    <ArrowRight className="w-4 h-4 text-red-700" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate?.("aggregation", "pending")}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors"
                  >
                    <span className="text-sm font-semibold text-blue-700">
                      {needsAttention?.pendingAggregation ?? pending} pending
                      aggregation
                    </span>
                    <ArrowRight className="w-4 h-4 text-blue-700" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      {projectId && activeMode !== "attributes" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h5 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" /> Not Run / Failed
              Details
            </h5>
            {failed > 0 && (
              <button
                onClick={() => onNavigate?.("aggregation", "failed")}
                className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline"
              >
                View All Issues <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase">
                <tr>
                  <th className="px-4 py-3">Product Code / SKU</th>
                  <th className="px-4 py-3">Issue Type</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {problemProducts.length > 0 ? (
                  problemProducts.map((p) => {
                    const isFailed = p.enrichment_status === "failed";
                    return (
                      <tr
                        key={p.id}
                        className={
                          isFailed
                            ? "hover:bg-red-50/30 transition-colors"
                            : "hover:bg-amber-50/30 transition-colors"
                        }
                      >
                        <td className="px-4 py-3 font-mono font-medium text-slate-900">
                          {p.product_code}
                        </td>
                        <td className="px-4 py-3">
                          {isFailed ? (
                            <span className="flex items-center gap-1.5 text-red-600 font-bold text-[11px] uppercase tracking-wide">
                              <XCircle className="w-3.5 h-3.5" /> AI Aggregation
                              Failed
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-amber-600 font-bold text-[11px] uppercase tracking-wide">
                              <Clock className="w-3.5 h-3.5" /> Not Run /
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() =>
                              onNavigate?.(
                                "aggregation",
                                isFailed ? "failed" : "pending",
                              )
                            }
                            className="text-xs font-bold underline decoration-dotted underline-offset-2 text-blue-600 hover:text-blue-800"
                          >
                            {isFailed ? "Investigate" : "Run Now"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      Loading details...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {viewAllType && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-3xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-3xl font-black text-slate-900">
                  All {viewAllType === "brands" ? "Brands" : "Categories"}
                </h3>
                <p className="text-sm text-slate-500 font-bold uppercase tracking-wider mt-1">
                  Total{" "}
                  {viewAllType === "brands"
                    ? brandFlowStats.length
                    : categoryFlowStats.length}{" "}
                  Items found
                </p>
              </div>
              <button
                onClick={() => {
                  setViewAllType(null);
                  setListSearch("");
                }}
                className="p-3 hover:bg-white hover:shadow-xl rounded-2xl transition-all group border border-transparent hover:border-slate-100"
              >
                <XCircle className="w-9 h-9 text-slate-300 group-hover:text-red-500 transition-colors" />
              </button>
            </div>

            <div className="p-6 bg-white">
              <div className="relative">
                <Filter className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder={`Search ${viewAllType}...`}
                  className="w-full pl-14 pr-6 py-5 bg-slate-100 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-3xl outline-none font-bold text-slate-700 transition-all text-lg shadow-inner"
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white">
              <div className="grid grid-cols-1 gap-3">
                {(viewAllType === "brands" ? brandFlowStats : categoryFlowStats)
                  .filter((item) => {
                    const name =
                      viewAllType === "brands" ? item.brand : item.category;
                    return name
                      .toLowerCase()
                      .includes(listSearch.toLowerCase());
                  })
                  .map((row: any, idx: number) => {
                    const name =
                      viewAllType === "brands" ? row.brand : row.category;
                    
                    const displayName =
                      viewAllType === "categories"
                        ? name.split(">").pop().trim()
                        : name;
                    const subName = viewAllType === "categories" ? name : null;

                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-5 rounded-3xl hover:bg-slate-50 transition-all border border-slate-50 hover:border-blue-100 group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-black text-slate-900 text-lg truncate uppercase tracking-tight">
                              {displayName}
                            </span>
                            <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-black rounded-full border border-blue-100">
                              {row.count}
                            </span>
                          </div>
                          {subName && (
                            <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                              {subName}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-8 ml-4">
                          <div className="text-right">
                            <p className="text-[10px] font-black text-slate-300 uppercase">
                              Completeness
                            </p>
                            <p className="text-lg font-black text-blue-600">
                              {row.complete}%
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black text-slate-300 uppercase">
                              Quality
                            </p>
                            <p className="text-lg font-black text-fuchsia-600">
                              {row.quality}%
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
