import React from "react";
import {
  ArrowLeft, Box, List, Loader2, Play, RefreshCw, X,
  AlertTriangle, GitMerge, CheckCircle
} from "lucide-react";
import { ProductAttributesViewProps } from "../types/business-rules.types.ts";
import { getStatusBadge } from "../utils/projectStatusColorizer.tsx";
import { formatValue } from "../utils/valueParser.tsx";

export function ProductAttributesView({
  isOpen,
  product,
  attributes,
  loading,
  project,
  onClose,
  onAggregate,
  onBack,
}: ProductAttributesViewProps) {
  if (!isOpen || !product) return null;

  const isPdfExtraction = project?.operation_mode === "pdf_extraction";

  return (
   <div className="absolute inset-0 z-50 bg-slate-50 overflow-auto">

      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{product.product_name}</h2>
                <div className="flex items-center gap-3 mt-1 text-sm text-slate-600">
                  <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    {product.product_code}
                  </span>
                  <span>{product.brand_name}</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 max-w-6xl mx-auto">
        {/* Summary Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">Data Completeness</p>
              <div className="flex items-center gap-4">
                <div className="flex-1 max-w-md">
                  <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{ width: `${product.completeness_score || 0}%` }}
                    />
                  </div>
                </div>
                <span className="text-lg font-bold text-slate-900">{product.completeness_score || 0}%</span>
              </div>
            </div>
            <div className="px-6 border-l border-slate-200">
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">Status</p>
              {getStatusBadge(product.enrichment_status || "pending")}
            </div>
            {!isPdfExtraction && (
              <div className="px-6 border-l border-slate-200">
                <button
                  onClick={() => onAggregate(product.id)}
                  disabled={product.enrichment_status === "processing"}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {product.enrichment_status === "processing" ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                  ) : product.enrichment_status === "pending" ? (
                    <><Play className="w-4 h-4" /> Start Aggregation</>
                  ) : (
                    <><RefreshCw className="w-4 h-4" /> Re-Aggregate</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-slate-200">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-blue-500" />
            <p className="text-slate-500">Loading attributes...</p>
          </div>
        ) : product.enrichment_status === "processing" ? (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 flex items-center gap-4">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            <div>
              <p className="font-semibold text-blue-900">Aggregation In Progress</p>
              <p className="text-sm text-blue-700">Please wait while the aggregation is being processed</p>
            </div>
          </div>
        ) : attributes.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <GitMerge className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-600 mb-4">No attributes found for this product.</p>
            {!isPdfExtraction && (
              <button
                onClick={() => onAggregate(product.id)}
                className="text-blue-600 hover:underline text-sm font-medium"
              >
                Run Aggregation Now
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Product Image */}
            {product.image_url_1 && (
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <img
                  src={product.image_url_1}
                  alt={product.product_name}
                  className="max-h-64 mx-auto object-contain"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              </div>
            )}

            {/* Specifications Grid */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Box className="w-4 h-4" /> Specifications
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {attributes.map((attr) => (
                  <div key={attr.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-semibold text-slate-500 uppercase truncate">
                        {attr.attribute_name}
                      </span>
                      {attr.has_conflict && (
                        <AlertTriangle className="w-4 h-4 text-amber-500" title="Source Conflict" />
                      )}
                    </div>
                    <div className="text-sm text-slate-900 font-medium">
                      {formatValue(attr.values[0]?.value)}
                    </div>
                    {attr.values[0]?.confidence && (
                      <div className="mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          attr.values[0].confidence > 0.8
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {(attr.values[0].confidence * 100).toFixed(0)}% confidence
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Technical Data Source Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide p-6 pb-4 flex items-center gap-2">
                <List className="w-4 h-4" /> Technical Data Source
              </h3>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-y border-slate-200 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold">Attribute</th>
                    <th className="px-6 py-3 text-left font-semibold">Value</th>
                    <th className="px-6 py-3 text-right font-semibold">Confidence</th>
                    <th className="px-6 py-3 text-right font-semibold">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attributes.map((attr) => (
                    <tr key={attr.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium text-slate-700">{attr.attribute_name}</td>
                      <td className="px-6 py-3 text-slate-600 max-w-[300px] truncate">
                        {formatValue(attr.values[0]?.value)}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          (attr.values[0]?.confidence || 0) > 0.8
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {((attr.values[0]?.confidence || 0) * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-xs text-slate-400">
                        {attr.values[0]?.source_id?.slice(0, 8) || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}