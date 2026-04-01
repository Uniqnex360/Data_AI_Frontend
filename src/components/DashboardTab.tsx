import { useState, useEffect } from "react";
import {
  Package,
  Activity,
  CheckCircle2,
  Clock,
  AlertCircle,
  Layers,
  Sparkles,
  Filter,
  ShieldCheck,
  Tag,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { dashboardService } from "../services/dashboardService";
import { aggregationService } from "../services/aggregationService";
import type { Product } from "../types/database.types";
import { DashboardStats, CategoryStat } from "../types/database.types";
import { ArrowRight, XCircle } from "lucide-react";
interface Props {
  projectId?: string;
  onNavigate?: (tab: "aggregation" | "sources", filterStatus?: string) => void;
}
export default function DashboardTab({ projectId, onNavigate }: Props) {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [globalStats, setGlobalStats] = useState<DashboardStats | null>(null);
  const [problemProducts, setProblemProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadData();
  }, [projectId]);
  const loadData = async () => {
    setLoading(true);
    try {
      const data = projectId
        ? await dashboardService.getProjectMetrics(projectId)
        : await dashboardService.getGlobalMetrics();
      setGlobalStats(data);
            const total = data.totalProducts || 0;
      const aggregationCompleted = data.aggregatedProducts || 0;
      const cleaningCompleted = data.cleanedProducts || 0;
      const standardizedProducts = data.standardizedProducts || 0;
      const enrichedProducts = data.enrichedProducts || 0;
      const failed = data.failedProducts || 0;

      const transformedMetrics = [
        { metric_type: "total_products", metric_value: total },
        { metric_type: "aggregated", metric_value: aggregationCompleted },
        { metric_type: "cleaned", metric_value: cleaningCompleted },
        { metric_type: "standardized", metric_value: standardizedProducts },
        { metric_type: "enriched", metric_value: enrichedProducts },
        { metric_type: "failed", metric_value: failed },
        { metric_type: "pending", metric_value: data.pendingProducts || 0 },
        {
          metric_type: "catalog_health",
          metric_value: data.catalogHealth || 0,
        },
      ];
      setMetrics(transformedMetrics);
      if (projectId) {
        const failedRes = await aggregationService.getProductsByProject(
          projectId,
          0,
          5,
          "failed",
        );
        let combinedList = failedRes.products;

        if (combinedList.length < 5) {
          const remainingSlots = 5 - combinedList.length;
          const pendingRes = await aggregationService.getProductsByProject(
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
    } catch (error) {
      console.error("Failed to load dashboard data", error);
    } finally {
      setLoading(false);
    }
  };
  console.log("problemProducts", problemProducts);
  const getMetricValue = (type: string): number => {
    return metrics.find((m) => m.metric_type === type)?.metric_value || 0;
  };
  const getProjectStatus = () => {
    const total = getMetricValue("total_products");
    const enriched = getMetricValue("enriched");
    const failed = getMetricValue("failed");
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
  };
  const statusObj = getProjectStatus();
  if (loading)
    return (
      <div className="flex items-center justify-center py-12 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading Dashboard...
      </div>
    );
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-xl font-bold text-slate-900">
              {projectId
                ? `Project: ${globalStats?.name || "Overview"}`
                : "Global Overview"}
            </h3>
            {projectId && (
              <span
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${statusObj.color}`}
              >
                <statusObj.icon className="w-3.5 h-3.5" /> {statusObj.label}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600">
            Real-time pipeline tracking and health metrics
          </p>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <div
          onClick={() => onNavigate?.("aggregation", "all")}
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Inventory
            </p>
            <Package className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-3xl font-black text-slate-900">
            {getMetricValue("total_products")}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Products Ingested</p>
        </div>
        <div
          onClick={() => onNavigate?.("aggregation", "completed")}
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Enriched
            </p>
            <CheckCircle2 className="w-5 h-5 text-green-500 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-3xl font-black text-slate-900">
            {getMetricValue("enriched")}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Ready for Export</p>
        </div>
        <div
          onClick={() => onNavigate?.("aggregation", "failed")}
          className="bg-white border border-red-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-red-50 rounded-bl-full -mr-8 -mt-8 transition-all group-hover:bg-red-100"></div>
          <div className="flex items-center justify-between mb-3 relative z-10">
            <p className="text-xs font-bold text-red-600 uppercase tracking-wider">
              Failed / Issues
            </p>
            <AlertTriangle className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-3xl font-black text-red-700 relative z-10">
            {getMetricValue("failed")}
          </p>
          <p className="text-[10px] text-red-400 mt-1 relative z-10">
            Action Required
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Catalog Health
            </p>
            <Activity className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-3xl font-black text-slate-900">
            {getMetricValue("catalog_health")}%
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Data Completeness</p>
        </div>
      </div>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" /> Data Processing
              Pipeline
            </h4>
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  label: "Aggregated",
                  type: "aggregated",
                  icon: Sparkles,
                  color: "blue",
                },
                {
                  label: "Cleaned",
                  type: "cleaned",
                  icon: Filter,
                  color: "indigo",
                },
               
                {
                  label: "Enriched",
                  type: "enriched",
                  icon: CheckCircle2,
                  color: "green",
                },
              ].map((step, idx) => {
                const val = getMetricValue(step.type);
                const total = getMetricValue("total_products");
                const percent = total > 0 ? (val / total) * 100 : 0;
                return (
                  <div
                    key={idx}
                    className="bg-slate-50 rounded-lg p-3 border border-slate-100 relative overflow-hidden"
                  >
                    <div
                      className={`absolute bottom-0 left-0 h-1 bg-${step.color}-500 transition-all duration-1000`}
                      style={{ width: `${percent}%` }}
                    />
                    <div className="flex items-center gap-2 mb-2">
                      <step.icon className={`w-4 h-4 text-${step.color}-600`} />
                      <span className="text-xs font-bold text-slate-700">
                        {step.label}
                      </span>
                    </div>
                    <span className="text-xl font-bold text-slate-900">
  {val} <span className="text-xs text-slate-900">{val > 1 ? "products" : "product"}</span>
</span>
                    <p className="text-[10px] text-slate-500">
                      {Math.round(percent)}% Complete
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h5 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" /> Not Run / Failed
                Details
              </h5>
              {getMetricValue("failed") > 0 && (
                <button
                  onClick={() => onNavigate?.("aggregation", "failed")}
                  className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline"
                >
                  View All Issues <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200">
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
                                <XCircle className="w-3.5 h-3.5" /> AI
                                Aggregation Failed
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
                              className={`text-xs font-bold underline decoration-dotted underline-offset-2 ${
                                isFailed
                                  ? "text-blue-600 hover:text-blue-800"
                                  : "text-blue-600 hover:text-blue-800"
                              }`}
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
                        {getMetricValue("failed") === 0 &&
                        getMetricValue("pending") === 0 ? (
                          <span className="flex items-center justify-center gap-2 text-green-600">
                            <CheckCircle2 className="w-4 h-4" /> System healthy.
                            All products processed.
                          </span>
                        ) : (
                          "Loading details..."
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="col-span-4 bg-white border border-slate-200 rounded-xl p-6 shadow-sm h-fit">
          <h4 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Tag className="w-4 h-4 text-orange-600" /> Category Distribution
          </h4>
          <div className="space-y-3">
            {globalStats?.categoryDistribution &&
            globalStats.categoryDistribution.length > 0 ? (
              globalStats.categoryDistribution.map(
                (cat: CategoryStat, i: number) => (
                  <div key={i} className="group">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span
                        className="font-medium text-slate-700 "
                        title={cat.category_name}
                      >
                        {cat.category_name || "Uncategorized"}
                      </span>
                      <span className="font-bold text-slate-900">
                        {cat.count}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-400 group-hover:bg-orange-500 transition-colors"
                        style={{
                          width: `${(cat.count / getMetricValue("total_products")) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ),
              )
            ) : (
              <div className="text-center py-8 text-slate-400 italic text-xs border-2 border-dashed border-slate-100 rounded-lg">
                No category data available yet.
                <br />
                Run aggregation to classify products.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
