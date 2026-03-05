
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { businessRulesService } from "../../services/businessRulesService";
import { notify } from "../../lib/notifications";
import type { BusinessRule } from "../../types/business-rules.types";
import BaseModal from "./BaseModal";

interface Props {
  rule: BusinessRule;
  onClose: () => void;
  onSuccess: () => void;
}

const parseVariables = (text: string): string[] => {
  const regex = /\{\{(\w+)\}\}/g;
  const matches = text.match(regex);
  if (!matches) return [];
  return [...new Set(matches.map(v => v.replace(/{{|}}/g, '')))];
};

export default function AddPromptModal({ rule, onClose, onSuccess }: Props) {
  const [promptName, setPromptName] = useState("");
  const [promptText, setPromptText] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState(1);
  const [variables, setVariables] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const detectedVariables = parseVariables(promptText);
    setVariables(detectedVariables);
  }, [promptText]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptName.trim() || !promptText.trim()) {
      setError("Prompt Name and Prompt Text are required.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await businessRulesService.createPrompt(rule.id, {
        prompt_name: promptName,
        prompt_text: promptText,
        description,
        priority,
        variables,
      });
      notify.success("Prompt created successfully!");
      onSuccess();
    } catch (error: any) {
      console.error("Create prompt error:", error);
      notify.error("Failed to create prompt", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal isOpen={true} onClose={onClose} title={`Add Prompt to "${rule.title}"`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="prompt-name" className="block text-sm font-medium text-slate-700 mb-1">Prompt Name</label>
          <input id="prompt-name" type="text" value={promptName} onChange={(e) => setPromptName(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., Generate Short Description"/>
        </div>

        <div>
          <label htmlFor="prompt-text" className="block text-sm font-medium text-slate-700 mb-1">Prompt</label>
          <textarea id="prompt-text" value={promptText} onChange={(e) => setPromptText(e.target.value)} required rows={8} className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="You are a product copywriter... Use the following context: {{product_context}}"/>
          {variables.length > 0 && (
            <div className="mt-2">
              <span className="text-xs text-slate-500 mr-2">Detected Variables:</span>
              <div className="inline-flex flex-wrap gap-1">
                {variables.map(v => <code key={v} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{`{{${v}}}`}</code>)}
              </div>
            </div>
          )}
        </div>

        {/* <div>
          <label htmlFor="prompt-description" className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
          <input id="prompt-description" type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div> */}

        {/* <div>
          <label htmlFor="prompt-priority" className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
          <input id="prompt-priority" type="number" value={priority} onChange={(e) => setPriority(parseInt(e.target.value, 10))} min="1" className="w-24 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div> */}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={loading || !promptName.trim() || !promptText.trim()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Add Prompt
          </button>
        </div>
      </form>
    </BaseModal>
  );
}