import React from "react";
import {
  ArrowLeft, CheckCircle, Clock, AlertTriangle, Loader2,
  FileText, Globe, RefreshCw, ChevronLeft, ChevronRight, Play
} from "lucide-react";
import { ProjectProductsViewProps } from "../types/business-rules.types.ts";
import { getProductStatusBadge, getStatusBadge } from "../utils/projectStatusColorizer.tsx";

const ITEMS_PER_PAGE = 10;

export function ProjectProductsView({
  project,
  products,
  loading,
  expandedStats,
  statusFilter,
  selectedProductIds,
  isExpandedProjectSelected,
  aggregatingProjects,
  extractingPdf,
  currentPage,
  totalPages,
  paginatedProducts,
  filteredExpandedProducts,
  startIndex,
  onClose,
  onToggleStatusFilter,
  onSelectAllProducts,
  onToggleProductSelection,
  onViewAttributes,
  onAggregateAll,
  onExtractAll,
  onAggregate,
  onExtractFreshMpn,
  onExtractFromPdf,
  onBlindExtract,
  onPageChange,
  selectedProductId,
}: ProjectProductsViewProps) {
  return (
   <div 
      className="absolute inset-0 z-40 bg-slate-50 overflow-auto"
      style={{ top: 0 }}  // ✅ Explicitly set top to 0
    >
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{project.name}</h2>
                <div className="flex items-center gap-3 mt-1">
                  {getStatusBadge(project.source_status || "NA")}
                  <span className="text-sm text-slate-500">
                    {project.product_count ?? 0} total products
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {project.operation_mode === "pdf_extraction" ? (
                <button
                  onClick={onExtractAll}
                  disabled={loading || expandedStats.pending === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  Extract All Pending
                </button>
              ) : (
                !(statusFilter.size === 1 && statusFilter.has("completed")) && (
                  <button
                    onClick={onAggregateAll}
                    disabled={loading || aggregatingProjects.has(project.id) || expandedStats.pending === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                  >
                    {loading || aggregatingProjects.has(project.id) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    Aggregate All
                  </button>
                )
              )}
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggleStatusFilter("completed")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
                  statusFilter.has("completed")
                    ? "bg-emerald-100 border-emerald-300"
                    : "bg-white border-slate-200 hover:bg-slate-50"
                }`}
              >
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-slate-700">{expandedStats.success}</span>
                <span className="text-xs text-slate-500">Completed</span>
              </button>
              <button
                onClick={() => onToggleStatusFilter("failed")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
                  statusFilter.has("failed")
                    ? "bg-rose-100 border-rose-300"
                    : "bg-white border-slate-200 hover:bg-slate-50"
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span className="text-sm font-medium text-slate-700">{expandedStats.failed}</span>
                <span className="text-xs text-slate-500">Failed</span>
              </button>
              <button
                onClick={() => onToggleStatusFilter("pending")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
                  statusFilter.has("pending")
                    ? "bg-amber-100 border-amber-300"
                    : "bg-white border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-slate-700">{expandedStats.pending}</span>
                <span className="text-xs text-slate-500">Pending</span>
              </button>
            </div>

            <div className="flex-1 max-w-md">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{ width: `${(expandedStats.success / (products.length || 1)) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500">
                  {Math.round((expandedStats.success / (products.length || 1)) * 100)}% Complete
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="px-6 py-4">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="w-12 px-4 py-3">
                      {!isExpandedProjectSelected && (
                        <input
                          type="checkbox"
                          checked={paginatedProducts.length > 0 && paginatedProducts.every((p) => selectedProductIds.has(p.id))}
                          onChange={(e) => onSelectAllProducts(e.target.checked)}
                          className="rounded border-slate-300"
                        />
                      )}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Product Info</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Import Source</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Completeness</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                        No products found
                      </td>
                    </tr>
                  ) : (
                    paginatedProducts.map((product) => (
                      <tr
                        key={product.id}
                        className={`hover:bg-slate-50 cursor-pointer ${
                          selectedProductId === product.id ? "bg-blue-50" : ""
                        }`}
                      >
                        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                          {!isExpandedProjectSelected && (
                            <input
                              type="checkbox"
                              checked={selectedProductIds.has(product.id)}
                              onChange={(e) => onToggleProductSelection(product.id, e.target.checked)}
                              className="rounded border-slate-300"
                            />
                          )}
                        </td>
                        <td className="px-4 py-4" onClick={() => onViewAttributes(product.id)}>
                          <div className="font-semibold text-slate-900 text-sm hover:text-blue-600">
                            {product.product_name || product.product_code || "N/A"}
                          </div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">
                            {product.product_code || product.sku || "No SKU"}
                          </div>
                          {product.brand_name && (
                            <div className="text-xs text-slate-400 mt-0.5">{product.brand_name}</div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <span className="text-xs truncate max-w-[150px]" title={product.source_url || "Unknown source"}>
                              {product.source_url
                                ? product.source_url.startsWith("multi_pdf_batch_")
                                  ? `Multi-PDF Batch ${product.source_url.slice(-8)}`
                                  : product.source_url.startsWith("multi_pdf_")
                                    ? `Multi-PDF Import`
                                    : product.source_url.replace(/^Manual_\d+_/, "")
                                : "Manual Entry"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden max-w-[100px]">
                              <div
                                className={`h-full rounded-full ${
                                  (product.completeness_score || 0) > 80
                                    ? "bg-green-500"
                                    : (product.completeness_score || 0) > 50
                                      ? "bg-amber-500"
                                      : "bg-red-400"
                                }`}
                                style={{ width: `${product.completeness_score || 10}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-600">{product.completeness_score || 10}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {getProductStatusBadge(product.enrichment_status || "pending")}
                        </td>
                        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                          {project.operation_mode === "pdf_extraction" ? (
                            <>
                              {product.source_url?.startsWith("blind_pdf") && product.completeness_score === 0 && (
                                <button
                                  onClick={() => onBlindExtract(product.id)}
                                  disabled={extractingPdf.has(product.id)}
                                  className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                                >
                                  {extractingPdf.has(product.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : "Extract"}
                                </button>
                              )}
                              {(product.source_url?.endsWith(".pdf") || product.source_url?.startsWith("multi_pdf")) &&
                                product.completeness_score === 0 && (
                                <button
                                  onClick={() => onExtractFromPdf(product.id, product.product_code)}
                                  disabled={extractingPdf.has(product.id) || product.enrichment_status === "processing"}
                                  className="text-purple-600 hover:text-purple-700 text-sm font-medium disabled:opacity-50"
                                >
                                  {extractingPdf.has(product.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : "Extract PDF"}
                                </button>
                              )}
                              {product.source_url === "web_search_pending" && product.completeness_score === 0 && (
                                <button
                                  onClick={() => onExtractFreshMpn(product.id, product.product_code)}
                                  disabled={extractingPdf.has(product.id)}
                                  className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                                >
                                  {extractingPdf.has(product.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : "Extract"}
                                </button>
                              )}
                              {product.enrichment_status === "failed" && product.completeness_score === 0 && (
                                <button
                                  onClick={() =>
                                    product.source_url === "web_search_pending"
                                      ? onExtractFreshMpn(product.id, product.product_code)
                                      : onExtractFromPdf(product.id, product.product_code)
                                  }
                                  className="text-amber-600 hover:text-amber-700 text-sm font-medium"
                                >
                                  <RefreshCw className="w-4 h-4 inline mr-1" />
                                  Retry
                                </button>
                              )}
                              {product.completeness_score > 0 && product.enrichment_status === "completed" && (
                                <div className="flex items-center gap-1 text-green-600">
                                  <CheckCircle className="w-4 h-4" />
                                  <span className="text-xs">Extracted</span>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              {product.enrichment_status !== "processing" && (
                                <button
                                  onClick={() => onAggregate(product.id)}
                                  disabled={loading || aggregatingProjects.has(project.id)}
                                  className="text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50"
                                >
                                  {product.enrichment_status === "completed" ? "Re-run" : "Run"}
                                </button>
                              )}
                              {product.enrichment_status === "processing" && (
                                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {filteredExpandedProducts.length > 0 && (
                <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Showing {startIndex + 1} - {Math.min(startIndex + ITEMS_PER_PAGE, filteredExpandedProducts.length)} of {filteredExpandedProducts.length} products
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 hover:bg-slate-200 rounded disabled:opacity-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-slate-600">Page {currentPage} / {totalPages || 1}</span>
                    <button
                      onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages || totalPages === 0}
                      className="p-1.5 hover:bg-slate-200 rounded disabled:opacity-50"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}