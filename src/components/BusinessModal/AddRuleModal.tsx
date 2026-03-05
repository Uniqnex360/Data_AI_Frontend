
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { businessRulesService } from "../../services/businessRulesService";
import { notify } from "../../lib/notifications";
import { RuleCategory } from "../../types/business-rules.types";
import BaseModal from "./BaseModal";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddRuleModal({ onClose, onSuccess }: Props) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<RuleCategory>(RuleCategory.ENRICHMENT);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Rule title is required.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await businessRulesService.createRule({ title, category, description });
      notify.success("Rule created successfully!");
      onSuccess();
    } catch (error: any) {
      let message='An error occured'
      if (error.response?.status === 422 && Array.isArray(error.response?.data?.detail)) {
      const firstError = error.response.data.detail[0];
     if (firstError?.msg) {
      let msg = String(firstError.msg);
      if (msg.startsWith("Value error, ")) {
        msg = msg.substring("Value error, ".length);
      }
      message = msg;
    }
    else if (typeof error.response?.data?.detail=='string')
    {
      message=error.response.data.detail;
    }
    else if(error.message)
    {
      message=error.message

    }
  } 
      console.error("Create rule error:", error);
      notify.error("Failed to create rule",message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal isOpen={true} onClose={onClose} title="Create New Business Rule">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="rule-title" className="block text-sm font-medium text-slate-700 mb-1">
            Rule Title
          </label>
          <input
            id="rule-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Enrich missing descriptions"
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
        </div>

        <div>
          <label htmlFor="rule-category" className="block text-sm font-medium text-slate-700 mb-1">
            Category
          </label>
          <select
            id="rule-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as RuleCategory)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {Object.values(RuleCategory).map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="rule-description" className="block text-sm font-medium text-slate-700 mb-1">
            Description (Optional)
          </label>
          <textarea
            id="rule-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the purpose of this rule"
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
            disabled={loading || !title.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Rule
          </button>
        </div>
      </form>
    </BaseModal>
  );
}