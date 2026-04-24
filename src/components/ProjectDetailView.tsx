import React from "react";
import { ChevronLeft } from "lucide-react";
import type { Project } from "../types/business-rules.types";
import type { Product } from "../types/database.types";

interface Props {
  project: Project;
  products: Product[];
  loading: boolean;
  onBack: () => void;
  children: React.ReactNode; 
}

export default function ProjectDetailView({
  project,
  products,
  loading,
  onBack,
  children,
}: Props) {
  return (
    <div className="space-y-6">
      
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Projects
      </button>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">{project.name}</h2>

        <div className="grid grid-cols-5 gap-6">
          <StatCard label="Total Products" value={project.product_count ?? 0} />
          <StatCard label="Aggregated" value={project.aggregated_count ?? 0} />
          <StatCard label="Moved to Enrichment" value={project.enrichment_count ?? 0} />
          <StatCard label="In Progress" value={project.in_progress_count ?? 0} />
          <StatCard label="Failed" value={project.failed_count ?? 0} />
        </div>

        {/* Completeness */}
        <div className="mt-6">
          <p className="text-sm text-slate-500 mb-2">Total Completeness</p>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-slate-200 h-3 rounded-full overflow-hidden">
              <div
                className="bg-green-500 h-full"
                style={{
                  width: `${project.completeness_score ?? 0}%`,
                }}
              />
            </div>
            <span className="font-semibold">
              {project.completeness_score ?? 0}%
            </span>
          </div>
        </div>
      </div>

      {/* ✅ Products Section */}
      <div className="bg-white border border-slate-200 rounded-lg">
        {children}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-slate-50 rounded-lg p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  );
}