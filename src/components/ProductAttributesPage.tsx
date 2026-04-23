import { ChevronLeft, Loader2 } from "lucide-react";
import type { Product } from "../types/database.types";
import type { AggregatedAttribute } from "../types/business-rules.types";

interface ProductAttributesPageProps {
  product: Product;
  attributes: AggregatedAttribute[];
  attributesLoading: boolean;
  onBack: () => void;
}

export default function ProductAttributesPage({
  product,
  attributes,
  attributesLoading,
  onBack,
}: ProductAttributesPageProps) {
  return (
    <div className="bg-white min-h-screen p-6 space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Products
      </button>

      <div>
        <h2 className="text-xl font-bold text-slate-900">
          {product.product_name}
        </h2>
        <p className="text-sm text-slate-600">{product.product_code}</p>
      </div>

      {attributesLoading ? (
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading attributes...
        </div>
      ) : attributes.length === 0 ? (
        <div className="text-slate-500">No attributes found.</div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {attributes.map((attr) => (
            <div
              key={attr.id}
              className="p-4 bg-slate-50 border border-slate-200 rounded"
            >
              <div className="text-xs text-slate-500 uppercase">
                {attr.attribute_name}
              </div>
              <div className="text-sm font-medium text-slate-900">
                {attr.values?.[0]?.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}