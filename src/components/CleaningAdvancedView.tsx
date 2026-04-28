import { Search, Check, X, Loader2, Download, Filter, Columns, MoreVertical } from "lucide-react";
import { Product } from "../types/business-rules.types";
import { getStatusBadge } from "../utils/projectStatusColorizer.tsx";

interface Props {
  products: Product[];
  availableAttributes: string[];
  onBack: () => void;
  onBulkUpdate: (attrs: Record<string, string>) => void;
  isUpdating: boolean;
}

export function CleaningAdvancedView({ products, availableAttributes, onBack, onBulkUpdate, isUpdating }: Props) {
  const [selectedAttrs, setSelectedAttrs] = useState<string[]>([]);
  const [bulkValues, setBulkAttributeValues] = useState<Record<string, string>>({});

      const displayColumns = availableAttributes.slice(0, 5);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* HEADER */}
      <div className="px-8 py-5 flex items-center justify-between bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
          <button onClick={onBack} className="hover:text-indigo-600 transition-colors">Project Details</button>
          <span className="text-slate-300">/</span>
          <span className="text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md font-bold">Advanced Cleaning</span>
        </div>
        <button onClick={onBack} className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-rose-50 hover:text-rose-600 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* BULK UPDATE WINDOW */}
      <div className="m-8 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden shrink-0">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h4 className="text-sm font-black uppercase tracking-widest text-slate-600">Bulk Update Attributes</h4>
          <div className="flex gap-2">
             <button onClick={onBulkUpdate} disabled={isUpdating} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2">
               {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Update Selected
             </button>
          </div>
        </div>
        <div className="p-6 grid grid-cols-4 gap-6 max-h-48 overflow-y-auto">
          {availableAttributes.map(attr => (
            <div key={attr} className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase truncate block">{attr}</label>
              <input 
                type="text" 
                placeholder="Enter value..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                onChange={(e) => setBulkAttributeValues(prev => ({...prev, [attr]: e.target.value}))}
              />
            </div>
          ))}
        </div>
      </div>

      {/* DATA GRID */}
      <div className="flex-1 overflow-hidden px-8 pb-8 flex flex-col">
        <div className="flex-1 overflow-auto bg-white border border-slate-200 rounded-2xl shadow-sm">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="sticky top-0 bg-slate-50 z-20 border-b border-slate-200">
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="p-4 w-20 sticky left-0 bg-slate-50 z-30 shadow-[1px_0_0_0_#e2e8f0]">Image</th>
                <th className="p-4 w-64 sticky left-20 bg-slate-50 z-30 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.05)]">Product Name</th>
                {displayColumns.map((col, idx) => (
                  <th key={col} className="p-4 w-48 border-l border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-400">Attribute {idx + 1}</span>
                      <span className="text-slate-700 truncate">{col}</span>
                    </div>
                  </th>
                ))}
                <th className="p-4 w-32 border-l border-slate-100">Status</th>
                <th className="p-4 w-16 text-center border-l border-slate-100">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => (
                <tr key={p.id} className="group hover:bg-slate-50 transition-colors">
                  <td className="p-4 sticky left-0 bg-white group-hover:bg-slate-50 z-10 shadow-[1px_0_0_0_#e2e8f0]">
                    <img src={p.image_url_1 || ''} className="w-12 h-12 object-contain" />
                  </td>
                  <td className="p-4 sticky left-20 bg-white group-hover:bg-slate-50 z-10 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.05)]">
                    <span className="font-bold text-slate-800 text-sm line-clamp-2 leading-snug">{p.product_name}</span>
                  </td>
                  {displayColumns.map((col) => (
                    <td key={col} className="p-4 text-sm text-slate-600 border-l border-slate-50">
                      {p.dynamic_attributes?.find(a => a.name === col)?.value || '—'}
                    </td>
                  ))}
                  <td className="p-4 border-l border-slate-50">
                    {getStatusBadge(p.enrichment_status || "pending", true)}
                  </td>
                  <td className="p-4 text-center border-l border-slate-50">
                    <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><MoreVertical className="w-4 h-4" /></button>
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