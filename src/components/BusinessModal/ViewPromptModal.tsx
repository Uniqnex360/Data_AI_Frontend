import { X, Copy, Check } from "lucide-react";
import { useState } from "react";
import { BusinessRule } from '../../types/database.types';

export default function ViewPromptModal({ rule, onClose }: { rule: BusinessRule; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(rule.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{rule.title}</h3>
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mt-0.5">{rule.category}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
          <div className="relative group">
            <pre className="p-4 bg-white border border-slate-200 rounded-lg font-mono text-sm text-slate-700 whitespace-pre-wrap min-h-[400px]">
              {rule.prompt}
            </pre>
            <button
              onClick={copyToClipboard}
              className="absolute top-3 right-3 p-2 bg-white border border-slate-200 rounded-md shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2 text-xs font-medium"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              {copied ? "Copied" : "Copy Prompt"}
            </button>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors text-sm font-medium">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}