import { FileText, ChevronLeft, Eye } from "lucide-react";
import { Product } from "../types/business-rules.types";
import { getStatusBadge } from "../utils/projectStatusColorizer";

interface Props {
  projectName: string;
  products: Product[];
  onBack: () => void;
  onEnterAdvanced: (category?: string) => void;
  onInspectProduct: (product: Product) => void;
}
const sessionActive = true
export function CleaningProductList({ projectName, products, onBack, onEnterAdvanced, onInspectProduct }: Props) {
  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h3 className="text-lg font-bold text-slate-900">{projectName}</h3>
            <p className="text-xs text-slate-500">Project Progress Overview</p>
          </div>
        </div>
        <button 
          onClick={() => onEnterAdvanced()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-indigo-700 transition-all"
        >
          Bulk Edit & Inspect
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex-1">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-200">
            <tr>
              <th className="p-4 w-20">Image</th>
              <th className="p-4">Product Name / MPN</th>
              <th className="p-4 text-center">Total Attrs</th>
              <th className="p-4 text-center">Processed</th>
              <th className="p-4 text-center">Completeness</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map(p => {
              const totalAttrs = (p as any).attribute_count || (p as any).total_attributes || 0;
              const processedAttrs = totalAttrs;
              return (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
                      {p.image_url_1 ? <img src={p.image_url_1} className="w-full h-full object-contain" /> : <FileText className="w-4 h-4 text-slate-400" />}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 text-sm line-clamp-1">{p.product_name}</span>
                      <span className="text-[10px] font-mono text-indigo-500">MPN: {p.product_code}</span>
                    </div>
                  </td>
                  <td className="p-4 text-center font-bold text-slate-600">{totalAttrs}</td>
                  <td className="p-4 text-center font-bold text-emerald-600">{processedAttrs}</td>
                  <td className="p-4 text-center">
                    <span className={`text-xs font-black ${(p.completeness_score || 0) > 80 ? 'text-emerald-600' : 'text-orange-500'}`}>
                      {p.completeness_score}%
                    </span>
                  </td>
                  <td className="p-4">{getStatusBadge(p.enrichment_status || 'pending', true)}</td>
                  <td className="p-4 text-center">
                    <button onClick={() => onInspectProduct(p)} className="p-2 hover:bg-indigo-50 text-indigo-500 rounded-lg">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}