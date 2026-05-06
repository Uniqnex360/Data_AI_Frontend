import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Edit3,
  Filter,
  Loader2,
  TrendingUp,
} from "lucide-react";
import { cleansingService } from "../services/cleansingService";
import { projectService } from "../services/projectService";

interface QualityRow {
  project_id: string;
  project_name: string;
  brand_name: string;
  algorithm_used: string;
  total_products: number;
  avg_quality_score: number;
  total_manual_edits: number;
  min_quality: number;
  max_quality: number;
}

interface EditLog {
  id: string;
  product_id: string;
  product_name: string;
  brand_name: string;
  mpn: string;
  attribute_name: string;
  old_value: string;
  new_value: string;
  algorithm_used: string;
  edit_source: string;
  created_at: string;
}

export default function ReportingTab() {
  const [qualityData, setQualityData] = useState<QualityRow[]>([]);
  const [editLogs, setEditLogs] = useState<EditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);

  const [logLoading, setLogLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedAlgorithm, setSelectedAlgorithm] = useState("");
  const [projects, setProjects] = useState<any[]>([]);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  useEffect(() => {
    loadProjects();
    loadQualityReport();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await projectService.getAllProjects({
        operation_mode: "cleaning",
      });
      setProjects(data || []);
    } catch (e) {
      console.error("Failed to load projects", e);
    }
  };

  const loadQualityReport = async () => {
    setLoading(true);
    try {
      const data = await cleansingService.getDataQualityReport({
        project_id: selectedProject || undefined,
        brand_name: selectedBrand || undefined,
        algorithm: selectedAlgorithm || undefined,
      });
      setQualityData(data || []);
    } catch (e) {
      console.error("Failed to load quality report", e);
    } finally {
      setLoading(false);
    }
  };
  const loadBrands = async () => {
    try {
      const data = await cleansingService.getEditLogs({ limit: 500 });
      const brands = [
        ...new Set(data.map((l: EditLog) => l.brand_name).filter(Boolean)),
      ];
      setAvailableBrands(brands.sort());
    } catch (e) {
      console.error("Failed to load brands", e);
    }
  };

  useEffect(() => {
    loadBrands();
  }, []);
  const loadEditLogs = async (projectId: string) => {
    setLogLoading(true);
    try {
      const data = await cleansingService.getEditLogs({
        project_id: projectId,
        algorithm: selectedAlgorithm || undefined,
        brand_name: selectedBrand || undefined,
        limit: 50,
      });
      setEditLogs(data || []);
    } catch (e) {
      console.error("Failed to load edit logs", e);
    } finally {
      setLogLoading(false);
    }
  };
  useEffect(() => {
    if (expandedProject) {
      loadEditLogs(expandedProject);
    }
  }, [selectedAlgorithm, selectedBrand, expandedProject]);
  const stats = useMemo(() => {
    const total = qualityData.reduce((sum, r) => sum + r.total_products, 0);
    const avgScore = qualityData.length > 0
      ? qualityData.reduce(
        (sum, r) => sum + r.avg_quality_score * r.total_products,
        0,
      ) / total
      : 0;
    const totalEdits = qualityData.reduce(
      (sum, r) => sum + r.total_manual_edits,
      0,
    );
    const aiEdits = editLogs.filter(
      (l) => l.edit_source === "ai_cleaning",
    ).length;
    const manualEdits = editLogs.filter(
      (l) => l.edit_source === "manual",
    ).length;
    const worstProject = qualityData.length > 0
      ? [...qualityData].sort(
        (a, b) => a.avg_quality_score - b.avg_quality_score,
      )[0]
      : null;

    return { total, avgScore, totalEdits, aiEdits, manualEdits, worstProject };
  }, [qualityData, editLogs]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-600";
    if (score >= 70) return "text-amber-600";
    return "text-red-600";
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return "bg-emerald-100 text-emerald-700";
    if (score >= 70) return "bg-amber-100 text-amber-700";
    return "bg-red-100 text-red-700";
  };
  const attributeEditCounts = useMemo(() => {
    return editLogs.reduce((acc: Record<string, number>, log) => {
      acc[log.attribute_name] = (acc[log.attribute_name] || 0) + 1;
      return acc;
    }, {});
  }, [editLogs]);
  const getBarColor = (score: number) => {
    if (score >= 90) return "bg-emerald-500";
    if (score >= 70) return "bg-amber-500";
    return "bg-red-500";
  };

  const uniqueAlgorithms = useMemo(() => {
    return [
      ...new Set(qualityData.map((r) => r.algorithm_used).filter(Boolean)),
    ];
  }, [qualityData]);

  const uniqueBrands = useMemo(() => {
    return [...new Set(qualityData.map((r) => r.brand_name).filter(Boolean))];
  }, [qualityData]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-slate-900">
          Reporting & Data Quality
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Monitor data quality scores, manual edits, and cleaning performance
          across projects
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Avg Quality Score
            </span>
            <Activity className="w-5 h-5 text-blue-500" />
          </div>
          <div
            className={`text-3xl font-bold ${getScoreColor(stats.avgScore)}`}
          >
            {stats.avgScore.toFixed(1)}%
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Across {stats.total} products
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Total Manual Edits
            </span>
            <Edit3 className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-3xl font-bold text-slate-900">
            {stats.totalEdits}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Distinct attributes modified
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              AI vs Manual
            </span>
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="text-lg font-bold text-emerald-600">
                {stats.aiEdits}
              </div>
              <div className="text-xs text-slate-400">AI Cleaned</div>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="text-center">
              <div className="text-lg font-bold text-amber-600">
                {stats.manualEdits}
              </div>
              <div className="text-xs text-slate-400">Manual</div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Lowest Quality
            </span>
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          {stats.worstProject
            ? (
              <>
                <div className="text-lg font-bold text-red-600 truncate">
                  {stats.worstProject.project_name}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {stats.worstProject.avg_quality_score}% quality
                </div>
              </>
            )
            : <div className="text-lg text-slate-400">—</div>}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 flex-wrap">
        <select
          value={selectedProject}
          onChange={(e) => {
            const val = e.target.value;
            setSelectedProject(val);
            setLoading(true);
            cleansingService
              .getDataQualityReport({
                project_id: val || undefined,
                brand_name: selectedBrand || undefined,
                algorithm: selectedAlgorithm || undefined,
              })
              .then((data) => setQualityData(data || []))
              .finally(() => setLoading(false));
          }}
          className="h-10 px-3 border border-slate-300 rounded-lg text-sm bg-white"
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          value={selectedAlgorithm}
          onChange={(e) => {
            const val = e.target.value;
            setSelectedAlgorithm(val);
            setLoading(true);
            cleansingService
              .getDataQualityReport({
                project_id: selectedProject || undefined,
                brand_name: selectedBrand || undefined,
                algorithm: val || undefined,
              })
              .then((data) => setQualityData(data || []))
              .finally(() => setLoading(false));
          }}
          className="h-10 px-3 border border-slate-300 rounded-lg text-sm bg-white"
        >
          <option value="">All Algorithms</option>
          <option value="openai">Datavio Algo-1</option>
          <option value="gemini">Datavio Algo-2</option>
          <option value="claude">Datavio Algo-3</option>
        </select>

        <select
          value={selectedBrand}
          onChange={(e) => {
            const val = e.target.value;
            setSelectedBrand(val);
            setLoading(true);
            cleansingService
              .getDataQualityReport({
                project_id: selectedProject || undefined,
                brand_name: val || undefined,
                algorithm: selectedAlgorithm || undefined,
              })
              .then((data) => setQualityData(data || []))
              .finally(() => setLoading(false));
          }}
          className="h-10 px-3 border border-slate-300 rounded-lg text-sm bg-white"
        >
          <option value="">All Brands</option>
          {availableBrands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        {selectedProject || selectedAlgorithm || selectedBrand
          ? (
            <button
              onClick={() => {
                setSelectedProject("");
                setSelectedAlgorithm("");
                setSelectedBrand("");
              }}
              className="h-10 px-3 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
            >
              Clear
            </button>
          )
          : null}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h4 className="font-semibold text-slate-900">Quality by Project</h4>
        </div>
        <div className="p-5">
          {loading
            ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            )
            : qualityData.length === 0
            ? <p className="text-center py-8 text-slate-500">No data found</p>
            : (
              <div className="space-y-4">
                {qualityData.map((row, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (expandedProject === row.project_id) {
                              setExpandedProject(null);
                            } else {
                              setExpandedProject(row.project_id);
                              loadEditLogs(row.project_id);
                            }
                          }}
                          className="p-1 hover:bg-slate-100 rounded"
                        >
                          {expandedProject === row.project_id
                            ? <ChevronUp className="w-4 h-4 text-slate-500" />
                            : 
                            <ChevronDown className="w-4 h-4 text-slate-500" />}
                        </button>
                        <span className="font-medium text-slate-800">
                          {row.project_name}
                        </span>
                        {row.brand_name && (
                          <span className="text-xs text-slate-400">
                            • {row.brand_name}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            getScoreBg(row.avg_quality_score)
                          }`}
                        >
                          {row.avg_quality_score}%
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>{row.total_products} products</span>
                        <span>{row.total_manual_edits} edits</span>
                        <span className="px-2 py-0.5 bg-slate-100 rounded-full">
                          {row.algorithm_used || "unknown"}
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          getBarColor(row.avg_quality_score)
                        }`}
                        style={{ width: `${row.avg_quality_score}%` }}
                      />
                    </div>

                    {expandedProject === row.project_id && (
                      <div className="mt-3 ml-6 bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <h5 className="text-sm font-semibold text-slate-700 mb-3">
                          Recent Edit History
                        </h5>
                        {logLoading
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : editLogs.length === 0
                          ? (
                            <p className="text-xs text-slate-500">
                              No edits found
                            </p>
                          )
                          : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-slate-500 border-b border-slate-200">
                                    <th className="text-left py-2 pr-4">
                                      Product
                                    </th>
                                    <th className="text-left py-2 pr-4">
                                      Attribute
                                    </th>
                                    <th className="text-center py-2 pr-4">
                                      Edits
                                    </th>
                                    <th className="text-left py-2 pr-4">
                                      Old Value
                                    </th>
                                    <th className="text-left py-2 pr-4">
                                      New Value
                                    </th>
                                    <th className="text-left py-2 pr-4">
                                      Type
                                    </th>
                                    <th className="text-left py-2 pr-4">
                                      Algorithm
                                    </th>
                                    <th className="text-left py-2">Date</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {editLogs.map((log) => (
                                    <tr
                                      key={log.id}
                                      className="border-b border-slate-100 hover:bg-white"
                                    >
                                      <td className="py-2 pr-4">
                                        <div className="font-medium text-slate-800">
                                          {log.product_name}
                                        </div>
                                        <div className="text-slate-400">
                                          {log.mpn}
                                        </div>
                                      </td>
                                      <td className="py-2 pr-4 font-medium">
                                        {log.attribute_name}
                                      </td>
                                      <td className="py-2 pr-4 text-center">
                                        <span className="px-2 py-0.5 bg-slate-100 rounded-full text-xs font-medium">
                                          {attributeEditCounts[
                                            log.attribute_name
                                          ] || 1}
                                        </span>
                                      </td>
                                      <td className="py-2 pr-4 text-slate-500 line-through">
                                        {log.old_value || "—"}
                                      </td>
                                      <td className="py-2 pr-4 text-slate-800">
                                        {log.new_value || "—"}
                                        {log.old_value &&
                                          log.new_value &&
                                          log.old_value !== log.new_value && (
                                          <TrendingUp className="w-3 h-3 inline ml-1 text-blue-500" />
                                        )}
                                      </td>
                                      <td className="py-2 pr-4">
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-xs ${
                                            log.edit_source === "ai_cleaning"
                                              ? "bg-blue-50 text-blue-600"
                                              : "bg-amber-50 text-amber-600"
                                          }`}
                                        >
                                          {log.edit_source === "ai_cleaning"
                                            ? "AI"
                                            : "Manual"}
                                        </span>
                                      </td>
                                      <td className="py-2 pr-4 text-slate-500">
                                        {log.algorithm_used || "—"}
                                      </td>
                                      <td className="py-2 text-slate-400 whitespace-nowrap">
                                        {log.created_at
                                          ? new Date(
                                            log.created_at,
                                          ).toLocaleDateString()
                                          : ""}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
