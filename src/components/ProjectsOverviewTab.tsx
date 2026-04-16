import {  useMemo, useState } from "react";
import {
  Folder,
  ChevronDown,
} from "lucide-react";
import { ProjectOverview, ProjectStatus } from "../types/business-rules.types.ts";



interface Props {
  projects: ProjectOverview[];
  onOpenProject?: (id: string) => void;
}

function ProgressBar({
  value,
  total,
  color,
  failed,
}: {
  value: number;
  total: number;
  color: string;
  failed?: number;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="space-y-1">
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-xs text-slate-500 flex gap-2">
        <span className="font-semibold text-slate-700">
          {value} / {total}
        </span>
        {failed ? (
          <span className="text-red-500">· {failed} failed</span>
        ) : null}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  const styles = {
    active: "bg-blue-100 text-blue-700",
    completed: "bg-emerald-100 text-emerald-700",
    stalled: "bg-red-100 text-red-700",
    new: "bg-slate-100 text-slate-600",
  };

  const label =
    status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-bold ${styles[status]}`}
    >
      {label}
    </span>
  );
}

export default function ProjectsOverviewTab({
  projects,
  onOpenProject,
}: Props) {
  const [filter, setFilter] = useState<
    "all" | ProjectStatus
  >("all");

  const filtered = useMemo(() => {
    if (filter === "all") return projects;
    return projects.filter((p) => p.status === filter);
  }, [filter, projects]);

  const totalProjects = projects.length;
  const totalProducts = projects.reduce(
    (sum, p) => sum + p.totalProducts,
    0,
  );

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Folder className="w-5 h-5 text-slate-700" />
          <h3 className="text-lg font-bold text-slate-900">
            Projects Overview
          </h3>
          <span className="text-sm text-slate-500">
            {totalProjects} projects · {totalProducts} products
          </span>
        </div>

        <div className="flex items-center gap-2">
          {["all", "active", "completed", "stalled", "new"].map(
            (f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition ${
                  filter === f
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ),
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
            <tr>
              <th className="px-6 py-3 text-left">Project</th>
              <th className="px-6 py-3 text-left">Products</th>
              <th className="px-6 py-3 text-left">Aggregation</th>
              <th className="px-6 py-3 text-left">Enrichment</th>
              <th className="px-6 py-3 text-left">Cleaning</th>
              <th className="px-6 py-3 text-left">Overall</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Last Active</th>
              <th />
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filtered.map((p) => (
              <tr
                key={p.id}
                className="hover:bg-slate-50 transition"
              >
                <td className="px-6 py-4">
                  <div className="font-semibold text-slate-900">
                    {p.name}
                  </div>
                  {p.description && (
                    <div className="text-xs text-slate-500">
                      {p.description}
                    </div>
                  )}
                </td>

                <td className="px-6 py-4 font-bold text-slate-800">
                  {p.totalProducts}
                </td>

                <td className="px-6 py-4 w-52">
                  <ProgressBar
                    value={p.aggregated}
                    total={p.totalProducts}
                    color="bg-blue-500"
                    failed={p.aggregationFailed}
                  />
                </td>

                <td className="px-6 py-4 w-52">
                  <ProgressBar
                    value={p.enrichment}
                    total={p.totalProducts}
                    color="bg-orange-500"
                    failed={p.enrichmentFailed}
                  />
                </td>

                <td className="px-6 py-4 w-52">
                  <ProgressBar
                    value={p.cleaning}
                    total={p.totalProducts}
                    color="bg-emerald-500"
                  />
                </td>

                <td className="px-6 py-4">
                  <div className="font-bold text-slate-900">
                    {p.overallPct}%
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full mt-1 w-24">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${p.overallPct}%` }}
                    />
                  </div>
                </td>

                <td className="px-6 py-4">
                  <StatusBadge status={p.status} />
                </td>

                <td className="px-6 py-4 text-slate-500 text-xs">
                  {p.lastActive}
                </td>

                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() =>
                      onOpenProject?.(p.id)
                    }
                    className="text-slate-400 hover:text-slate-700"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-6 py-10 text-center text-slate-400"
                >
                  No projects found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}