
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { businessRulesService } from "../../services/businessRulesService";
import { notify } from "../../lib/notifications";
import { BusinessRule, RuleStatus, RuleCategory } from '../../types/business-rules.types';
import BaseModal from "./BaseModal";

interface Props {
  rule: BusinessRule;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditRuleModal({ rule, onClose, onSuccess }: Props) {
  const [title, setTitle] = useState(rule.title);
  const [description, setDescription] = useState(rule.description || "");
  const [category,setCategory]=useState<RuleCategory>(rule.category)
  const [status, setStatus] = useState<RuleStatus>(rule.status);
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
      await businessRulesService.updateRule(rule.id, { title, description, status});
      notify.success("Rule updated successfully!");
      onSuccess();
    } catch (error: any) {
      console.error("Update rule error:", error);
      notify.error("Failed to update rule", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal isOpen={true} onClose={onClose} title={`Edit Rule: ${rule.title}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="edit-rule-title" className="block text-sm font-medium text-slate-700 mb-1">Rule Title</label>
          <input id="edit-rule-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
        </div>

        <div>
          <label htmlFor="edit-rule-description" className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
          <textarea id="edit-rule-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label htmlFor="edit-rule-category" className="block text-sm font-medium text-slate-700 mb-1">Category</label>
          <select id='edit-rule-category' value={category}
          onChange={(e)=>setCategory(e.target.value as RuleCategory)}
          className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            {Object.values(RuleCategory).map((cat)=>(
                <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase()+cat.slice(1)}
                </option>
            ))}
          </select>
        </div>
        

        {/* <div>
          <label htmlFor="edit-rule-status" className="block text-sm font-medium text-slate-700 mb-1">Status</label>
          <select id="edit-rule-status" value={status} onChange={(e) => setStatus(e.target.value as RuleStatus)} className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            {Object.values(RuleStatus).map((s) => (<option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>))}
          </select>
        </div> */}

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={loading || !title.trim()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Changes
          </button>
        </div>
      </form>
    </BaseModal>
  );
}