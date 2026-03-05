
import { useState } from "react";
import { X, Copy, Check, Download } from "lucide-react";
import { notify } from '../../lib/notifications';
import { BusinessRule } from '../../types/business-rules.types';

interface ViewPromptModalProps {
  rule: BusinessRule;
  onClose: () => void;
}

export default function ViewPromptModal({
  rule,
  onClose,
}: ViewPromptModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rule.prompt);
      setCopied(true);
      notify.success("Prompt copied to clipboard!");

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      notify.error("Failed to copy to clipboard");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([rule.prompt], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    notify.success("Prompt downloaded!");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-4xl bg-white rounded-lg shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{rule.title}</h2>
            
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {rule.description && (
          <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
            <p className="text-sm text-blue-900">{rule.description}</p>
          </div>
        )}

        {rule.variables && rule.variables.length > 0 && (
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-200">
            <p className="text-xs font-semibold text-slate-600 uppercase mb-2">
              Template Variables
            </p>
            <div className="flex flex-wrap gap-2">
              {rule.variables.map((variable) => (
                <code
                  key={variable}
                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                >
                  {`{{${variable}}}`}
                </code>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          <div className="relative">
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap">
              {rule.prompt}
            </pre>

            <div className="absolute top-2 right-2 flex gap-2">
              <button
                onClick={handleCopy}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-md transition-colors"
                title="Copy to clipboard"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={handleDownload}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-md transition-colors"
                title="Download as file"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-slate-600 text-xs">Characters</p>
              <p className="font-semibold text-slate-900">
                {rule.prompt.length.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-slate-600 text-xs">Lines</p>
              <p className="font-semibold text-slate-900">
                {rule.prompt.split("\n").length}
              </p>
            </div>
            <div>
              <p className="text-slate-600 text-xs">Words</p>
              <p className="font-semibold text-slate-900">
                {rule.prompt.split(/\s+/).length}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Executed {rule.execution_count} times
            {rule.last_executed_at && (
              <span className="ml-2">
                • Last run:{" "}
                {new Date(rule.last_executed_at).toLocaleDateString()}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}