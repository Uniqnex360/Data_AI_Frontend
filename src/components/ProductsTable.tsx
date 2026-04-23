import { ChevronLeft } from "lucide-react";
import type { Product, Project } from "../types/database.types";

interface ProductsTableProps {
  project: Project;
  products: Product[];
  onBack: () => void;
  onProductClick: (product: Product) => void;
  children?: React.ReactNode; // reuse existing buttons
}

export default function ProductsTable({
  project,
  products,
  onBack,
  onProductClick,
  children,
}: ProductsTableProps) {
  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Projects
      </button>

      <div className="bg-white border border-slate-200 rounded-lg">
        {children}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs text-slate-600">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs text-slate-600">
                  Brand
                </th>
                <th className="px-4 py-3 text-left text-xs text-slate-600">
                  Completeness
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {products.map((product) => (
                <tr
                  key={product.id}
                  onClick={() => onProductClick(product)}
                  className="hover:bg-slate-50 cursor-pointer"
                >
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    {product.product_name || product.product_code}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {product.brand_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {product.completeness_score || 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}