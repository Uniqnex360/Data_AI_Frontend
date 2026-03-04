import React, { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { businessRulesService } from '../../services/businessRulesService';
import { RuleStatus, RuleCategory } from '../../types/database.types';
import { notify } from '../../lib/notifications';

interface AddRuleModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddRuleModal({ onClose, onSuccess }: AddRuleModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    category: "enrichment" as RuleCategory,
    description: "",
    prompt: "",
    priority: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await businessRulesService.createRule({
        ...formData,
        status: RuleStatus.DRAFT,
      });
      notify.success("Business rule created successfully");
      onSuccess();
    } catch (error: any) {
      notify.error("Failed to create rule", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h3 className="text-lg font-bold text-slate-900">Add New Business Rule</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Rule Title</label>
              <input
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g., SEO Title Generator"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Category</label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as RuleCategory })}
              >
                <option value="enrichment">Enrichment</option>
                <option value="aggregation">Aggregation</option>
                <option value="validation">Validation</option>
                <option value="cleansing">Cleansing</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Description</label>
            <input
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="What does this rule do?"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">LLM Prompt</label>
            <textarea
              required
              rows={8}
              className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Enter the system instructions for the LLM..."
              value={formData.prompt}
              onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Rule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}