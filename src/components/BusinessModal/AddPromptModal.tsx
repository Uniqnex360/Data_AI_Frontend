import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { businessRulesService } from "../../services/businessRulesService";
import { notify } from "../../lib/notifications";
import type { BusinessRule } from "../../types/business-rules.types";
import { RuleStatus } from "../../types/business-rules.types";
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
  return [...new Set(matches.map((v) => v.replace(/{{|}}/g, "")))];
};

export default function AddPromptModal({ rule, onClose, onSuccess }: Props) {
  const [promptName, setPromptName] = useState("");
  const [promptText, setPromptText] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState(1);
  const [variables, setVariables] = useState<string[]>([]);
  const [enabled, setEnabled] = useState(true); // NEW: toggle
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
        prompt_name: promptName.trim(),
        prompt_text: promptText.trim(),
        description: description.trim() || undefined,
        priority,
        variables,
        status: enabled ? RuleStatus.ACTIVE : RuleStatus.INACTIVE, // NEW
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
    <BaseModal isOpen={true} onClose={onClose} title="Add New Prompt">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="prompt-name"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Prompt Name
          </label>
          <input
            id="prompt-name"
            type="text"
            value={promptName}
            onChange={(e) => setPromptName(e.target.value)}
            required
            className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. Feature Extraction Prompt"
          />
        </div>

        <div>
          <label
            htmlFor="prompt-description"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Description
          </label>
          <input
            id="prompt-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Brief description of what this prompt does"
          />
        </div>

        <div>
          <label
            htmlFor="prompt-text"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Prompt Content
          </label>
          <textarea
            id="prompt-text"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            required
            rows={10}
            className="w-full px-4 py-3 border border-slate-200 rounded-2xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter the LLM prompt content..."
          />

          {variables.length > 0 && (
            <div className="mt-3">
              <span className="text-xs text-slate-500 mr-2">
                Detected Variables:
              </span>
              <div className="inline-flex flex-wrap gap-2 mt-1">
                {variables.map((v) => (
                  <code
                    key={v}
                    className="px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs"
                  >
                    {`{{${v}}}`}
                  </code>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Enable Prompt toggle (like screenshot) */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Enable Prompt
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Activate this prompt immediately
            </p>
          </div>

          <button
            type="button"
            onClick={() => setEnabled((v) => !v)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
              enabled ? "bg-blue-600" : "bg-slate-300"
            }`}
            aria-pressed={enabled}
            aria-label="Enable prompt"
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-4 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 bg-white text-slate-700 rounded-2xl hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading || !promptName.trim() || !promptText.trim()}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 disabled:opacity-50 font-semibold"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Prompt
          </button>
        </div>
      </form>
    </BaseModal>
  );
}