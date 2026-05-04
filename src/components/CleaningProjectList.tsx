export function CleaningProjectList({ projects, loading, onSelect }: any) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
         <h3 className="font-bold text-slate-800">Cleaning Projects ({projects.length})</h3>
      </div>
      <table className="w-full text-left">
        <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-200">
          <tr>
            <th className="px-4 py-3">Project Name</th>
            <th className="px-4 py-3 text-center">Total Products</th>
            <th className="px-4 py-3 text-center">Cleansed</th>
            <th className="px-4 py-3 text-center">Completeness</th>
            <th className="px-4 py-3 text-center">Status</th>
            <th className="px-4 py-3 text-center">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {projects.map((p: any) => (
            <tr key={p.id} onClick={() => onSelect(p.id)} className="hover:bg-slate-50 cursor-pointer transition-colors group">
              <td className="px-4 py-4 font-bold text-slate-900 text-sm">{p.name}</td>
              <td className="px-4 py-4 text-center text-slate-600 text-sm">{p.product_count || 0}</td>
              <td className="px-4 py-4 text-center text-emerald-600 font-bold text-sm">{p.cleaned_count || 0}</td>
              <td className="px-4 py-4">
                 <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-bold text-slate-500">{p.completeness_score}%</span>
                    <div className="w-20 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{width: `${p.completeness_score}%`}} />
                    </div>
                 </div>
              </td>
              <td className="px-4 py-4 text-center">{getStatusBadge(p.source_status || 'Yet to Start', true)}</td>
              <td className="px-4 py-4 text-center text-blue-600 text-xs font-bold group-hover:underline">View Progress</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}