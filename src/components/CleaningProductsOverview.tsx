import React from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileText,
  ImageIcon,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { Product, Project } from "../types/business-rules.types";
import { getStatusBadge } from "../utils/projectStatusColorizer";

interface CleaningProductsOverviewProps {
  project: Project;
  products: Product[];
  loading: boolean;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  onBack: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onProductClick: (product: Product) => void;
  onAdvancedEdit: () => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedProductIds: Set<string>;
  allProductsSelected: boolean;
  onToggleProduct: (id: string) => void;
  onToggleAll: () => void;
  onSelectAllAcrossPages: () => void;
}

export function CleaningProductsOverview({
  project,
  products,
  loading,
  total,
  page,
  pageSize,
  totalPages,
  onBack,
  onPageChange,
  onPageSizeChange,
  onProductClick,
  onAdvancedEdit,
  searchTerm,
  onSearchChange,
  selectedProductIds,
  allProductsSelected,
  onToggleProduct,
  onToggleAll,
  onSelectAllAcrossPages,
}: CleaningProductsOverviewProps) {
  const getProcessedCount = (product: Product): number => {
  return product.attribute_count || 0;
};

  
const getTotalAttributes = (product: Product): number => {
  return product.attribute_count || 0;
};

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </button>
          <span className="text-slate-300">|</span>
          <span className="text-sm font-semibold text-slate-900">
            {project.name}
          </span>
          <span className="text-xs text-slate-500">{total} products</span>
        </div>
        <button
          onClick={onAdvancedEdit}
          className="h-9 px-3 border border-slate-200 rounded-lg bg-white text-sm text-slate-600 hover:bg-slate-50"
        >
          Advanced Edit
        </button>
      </div>

      <div className="px-4 py-3 border-b border-slate-100">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm"
          />
          {searchTerm && (
            <button onClick={()=>onSearchChange('')}
           className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-3.5 h-3.5"/>
           </button>

          )}
        </div>
      </div>
      {products.length > 0 &&
        products.every((p) => selectedProductIds.has(p.id)) &&
        !allProductsSelected && (
          <div className="px-4 py-2.5 bg-blue-50 border-b border-blue-100 flex items-center justify-center gap-2 text-sm text-blue-700">
            <span>
              All <strong>{products.length}</strong> products on this page
              selected.
            </span>
            <button
              onClick={onSelectAllAcrossPages}
              className="font-semibold underline hover:text-blue-900"
            >
              Select all {total} products
            </button>
          </div>
        )}

      {/* "All Selected" Banner */}
      {allProductsSelected && (
        <div className="px-4 py-2.5 bg-blue-50 border-b border-blue-100 flex items-center justify-center gap-2 text-sm text-blue-700">
          <span>
            All <strong>{total}</strong> products selected.
          </span>
          <button
            onClick={onToggleAll}
            className="font-semibold underline hover:text-blue-900"
          >
            Clear selection
          </button>
        </div>
      )}
      {/* Table */}
      <div
        className="overflow-auto"
        style={{ maxHeight: "calc(100vh - 350px)" }}
      >
        <table className="w-full">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr className="text-left text-[13px] font-bold text-slate-500">
              <th className="px-4 py-3 border-b border-slate-200 w-12 text-center">
                <input
                  type="checkbox"
                  checked={
                    allProductsSelected ||
                    (products.length > 0 &&
                      products.every((p) => selectedProductIds.has(p.id)))
                  }
                  onChange={onToggleAll}
                  className="rounded border-slate-300"
                />
              </th>

              <th className="px-4 py-3 border-b border-slate-200 w-16">
                Image
              </th>
              <th className="px-4 py-3 border-b border-slate-200">
                Product Name & MPN
              </th>
              <th className="px-4 py-3 border-b border-slate-200">Brand</th>
              <th className="px-4 py-3 border-b border-slate-200 text-center">
                No. of Attributes
              </th>
              <th className="px-4 py-3 border-b border-slate-200 text-center">
                 Cleaned
              </th>
              <th className="px-4 py-3 border-b border-slate-200 text-center">
                Completeness
              </th>
              <th className="px-4 py-3 border-b border-slate-200 text-center">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={9} className="p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" />
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-500">
                  No products found
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr
                  key={product.id}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => onProductClick(product)}
                >
                  <td
                    className="px-4 py-3 text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={
                        allProductsSelected ||
                        selectedProductIds.has(product.id)
                      }
                      onChange={() => onToggleProduct(product.id)}
                      className="rounded border-slate-300"
                    />
                  </td>
                  <td className="px-4 py-3">
                    {product.image_url_1 ? (
                      <img
                        src={product.image_url_1}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover bg-slate-100"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-slate-400" />
                      </div>
                    )}
                  </td>
                 <td className="px-4 py-3">
  <div className="flex flex-col gap-0.5">
    <span className="text-sm font-medium text-slate-900 line-clamp-2" title={product.product_name}>
      {product.product_name || "Unnamed Product"}
    </span>
    <span className="text-[10px] text-blue-600 font-mono font-medium truncate" title={product.product_code}>
      MPN: {product.product_code}
    </span>
  </div>
</td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {product.brand_name || "—"}
                  </td>
                  
                  <td className="px-4 py-3 text-center text-sm">
                    {getTotalAttributes(product)}
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    {getProcessedCount(product)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            (product.completeness_score || 0) > 80
                              ? "bg-emerald-500"
                              : (product.completeness_score || 0) > 50
                                ? "bg-amber-500"
                                : "bg-red-500"
                          }`}
                          style={{
                            width: `${product.completeness_score || 0}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium">
                        {product.completeness_score || 0}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {getStatusBadge(
                      product.enrichment_status || "pending",
                      true,
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
        <span className="text-sm text-slate-500">
          Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}{" "}
          of {total}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40"
          >
            <ChevronLeft className="w-3 h-3" /> Prev
          </button>
          <span className="text-sm">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40"
          >
            Next <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
