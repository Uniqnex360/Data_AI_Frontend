import { ChevronLeft, Loader2 } from "lucide-react";

export function CleaningProductProgress({ projectName, products, loading, onBack, onEnterAdvanced, onSelectProduct }: any) {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">{projectName}</h3>
            <p className="text-xs text-slate-500 font-medium">Product attribute standardization progress</p>
          </div>
        </div>
        <button 
          onClick={onEnterAdvanced}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
        >
          Enter Advanced Cleaning
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-200">
            <tr>
              <th className="p-4 w-20">Image</th>
              <th className="p-4">Product Identity</th>
              <th className="p-4 text-center">Total Attributes</th>
              <th className="p-4 text-center">Processed</th>
              <th className="p-4 text-center">Completeness</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="py-20 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" /></td></tr>
            ) : products.map((p: any) => {
              const totalAttrs = p.dynamic_attributes?.length || 0;
              const processed = p.dynamic_attributes?.filter((a: any) => !!a.value).length || 0;
              return (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4"><ProductThumbnail src={p.image_url_1} /></td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 text-sm line-clamp-1">{p.product_name}</span>
                      <span className="text-[10px] font-mono text-indigo-500 font-bold uppercase tracking-tight">MPN: {p.product_code}</span>
                    </div>
                  </td>
                  <td className="p-4 text-center font-bold text-slate-600 text-sm">{totalAttrs}</td>
                  <td className="p-4 text-center font-bold text-emerald-600 text-sm">{processed}</td>
                  <td className="p-4 text-center font-black text-slate-900 text-sm">{p.completeness_score}%</td>
                  <td className="p-4"><StatusPill status={p.enrichment_status} /></td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => onSelectProduct(p)}
                      className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors"
                      title="Inspect Attributes"
                    >
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