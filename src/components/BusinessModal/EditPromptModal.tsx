
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { businessRulesService } from "../../services/businessRulesService";
import { notify } from "../../lib/notifications";
import { RulePrompt, RuleStatus } from "../../types/business-rules.types";
import BaseModal from "./BaseModal";

interface Props {
  prompt: RulePrompt;
  onClose: () => void;
  onSuccess: () => void;
}

const parseVariables = (text: string): string[] => {
  const regex = /\{\{(\w+)\}\}/g;
  const matches = text.match(regex);
  if (!matches) return [];
  return [...new Set(matches.map(v => v.replace(/{{|}}/g, '')))].sort();
};

export default function EditPromptModal({ prompt, onClose, onSuccess }: Props) {
  const [promptName, setPromptName] = useState(prompt.prompt_name);
  const [promptText, setPromptText] = useState(prompt.prompt_text);
  const [description, setDescription] = useState(prompt.description || "");
  const [priority, setPriority] = useState(prompt.priority);
  const [status, setStatus] = useState<RuleStatus>(prompt.status);
  const [variables, setVariables] = useState<string[]>(prompt.variables || []);
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ name: '', text: '' });

  useEffect(() => {
    setVariables(parseVariables(promptText));
  }, [promptText]);

  const validateForm = (): boolean => {
    const newErrors = { name: '', text: '' };
    let isValid = true;
    
    if (!promptName.trim()) {
      newErrors.name = "Prompt Name is required.";
      isValid = false;
    }
    if (!promptText.trim()) {
      newErrors.text = "Prompt Text cannot be empty.";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      await businessRulesService.updatePrompt(prompt.id, {
        prompt_name: promptName,
        prompt_text: promptText,
        description,
        priority,
        status,
        variables,
      });
      notify.success("Prompt updated successfully!");
      onSuccess(); 
    } catch (error: any) {
      console.error("Update prompt error:", error);
      notify.error("Failed to update prompt", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal isOpen={true} onClose={onClose} title={`Edit Prompt: ${prompt.prompt_name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="edit-prompt-name" className="block text-sm font-medium text-slate-700 mb-1">
            Prompt Name
          </label>
          <input
            id="edit-prompt-name"
            type="text"
            value={promptName}
            onChange={(e) => setPromptName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="edit-prompt-text" className="block text-sm font-medium text-slate-700 mb-1">
            Prompt Text
          </label>
          <textarea
            id="edit-prompt-text"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            rows={10}
            className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="You are an expert copywriter..."
          />
          {errors.text && <p className="text-sm text-red-500 mt-1">{errors.text}</p>}
          
          {variables.length > 0 && (
            <div className="mt-2">
              <span className="text-xs text-slate-500 mr-2">Detected Variables:</span>
              <div className="inline-flex flex-wrap gap-1">
                {variables.map(v => (
                  <code key={v} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                    {`{{${v}}}`}
                  </code>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="edit-prompt-description" className="block text-sm font-medium text-slate-700 mb-1">
            Description (Optional)
          </label>
          <input
            id="edit-prompt-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="edit-prompt-priority" className="block text-sm font-medium text-slate-700 mb-1">
              Priority
            </label>
            <input
              id="edit-prompt-priority"
              type="number"
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value, 10) || 1)}
              min="1"
              className="w-24 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="edit-prompt-status" className="block text-sm font-medium text-slate-700 mb-1">
              Status
            </label>
            <select
              id="edit-prompt-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as RuleStatus)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.values(RuleStatus).map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Changes
          </button>
        </div>
      </form>
    </BaseModal>
  );
}