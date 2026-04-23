import React from "react";
import { X } from "lucide-react";
import { FiltersBarProps } from "../types/business-rules.types.ts";

export function FiltersBar({
  selectedLLM,
  llmOptions,
  selectedUseCase,
  useCases,
  selectedProjectId,
  filteredProjects,
  projectStatusFilter,
  categoryFilter,
  availableCategories,
  brandFilter,
  availableBrands,
  onLLMChange,
  onUseCaseChange,
  onProjectChange,
  onProjectStatusChange,
  onCategoryChange,
  onBrandChange,
  onReset,
  showReset,
}: FiltersBarProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 flex-1">
          {/* LLM Provider */}
          <div>
            <label className="block text-sm text-slate-700 mb-2">LLM Provider</label>
            <select
              value={selectedLLM}
              onChange={(e) => onLLMChange(e.target.value)}
              className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm"
            >
              {llmOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Use Case */}
          <div>
            <label className="block text-sm text-slate-700 mb-2">Use Case</label>
            <select
              value={selectedUseCase}
              onChange={(e) => onUseCaseChange(e.target.value)}
              className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm"
            >
              <option value="">All Use Case</option>
              {useCases.map((useCase) => (
                <option key={useCase} value={useCase}>
                  {useCase}
                </option>
              ))}
            </select>
          </div>

          {/* Project */}
          <div>
            <label className="block text-sm text-slate-700 mb-2">Project</label>
            <select
              value={selectedProjectId}
              onChange={(e) => onProjectChange(e.target.value)}
              className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm"
            >
              <option value="">All Project</option>
              {filteredProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm text-slate-700 mb-2">Status</label>
            <select
              value={projectStatusFilter}
              onChange={(e) => onProjectStatusChange(e.target.value)}
              className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm"
            >
              <option value="">All Status</option>
              <option value="Yet to Start">Yet to Start</option>
              <option value="Partially Completed">Partially Completed</option>
              <option value="Completed">Completed</option>
              <option value="Failed">Failed</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm text-slate-700 mb-2">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => onCategoryChange(e.target.value)}
              disabled={availableCategories.length === 0}
              className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm disabled:opacity-50"
            >
              <option value="">All Category</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Brand */}
          <div>
            <label className="block text-sm text-slate-700 mb-2">Brand</label>
            <select
              value={brandFilter}
              onChange={(e) => onBrandChange(e.target.value)}
              disabled={availableBrands.length === 0}
              className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm disabled:opacity-50"
            >
              <option value="">All Brand</option>
              {availableBrands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </div>
        </div>

        {showReset && (
          <button
            onClick={onReset}
            className="h-10 px-4 border border-slate-300 rounded-lg bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Reset Filters
          </button>
        )}
      </div>
    </div>
  );
}