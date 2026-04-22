import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { businessRulesService } from "../../services/businessRulesService";
import { notify } from "../../lib/notifications";
import { RuleCategory } from "../../types/business-rules.types";
import BaseModal from "./BaseModal";
interface Props {
  onClose: () => void;
  onSuccess: () => void;
  defaultOperationMode?: string;
  defaultUseCase?: string;
}
const USE_CASE_OPTIONS: Record<string, string[]> = {
  aggregation: [
    "Products with Category Assignments",
    "Products without Category Assignments",
  ],
  enrichment: [
    "Enrich product data from web sources",  
],
  cleaning: [
    "Data cleaning and Standardization",
  ],
  pdf_extraction: [
    "MPN/UPC based PDF Extraction",
    "Structured PDF Extraction (Given MPNs)",
    "Unstructured PDF Extraction (Given MPNs)",
    "Multi-PDF & Multi-MPN Data Extraction.",
    "Title & Description Based PDF Extraction",
  ],
};
export default function AddRuleModal({ 
  onClose, 
  onSuccess, 
  defaultOperationMode = "aggregation",
  defaultUseCase = ""
}: Props) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<RuleCategory>(RuleCategory.ENRICHMENT);
  const [description, setDescription] = useState("");
  const [operationMode, setOperationMode] = useState(defaultOperationMode);
  const [useCase, setUseCase] = useState(defaultUseCase);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const options = USE_CASE_OPTIONS[operationMode] || [];
    if (useCase && !options.includes(useCase)) {
      setUseCase(""); 
    }
  }, [operationMode]);
  useEffect(() => {
    const categoryMap: Record<string, RuleCategory> = {
      aggregation: RuleCategory.AGGREGATION,
      enrichment: RuleCategory.ENRICHMENT,
      cleaning: RuleCategory.STANDARDIZATION,
      pdf_extraction: RuleCategory.EXTRACTION,
    };
    setCategory(categoryMap[operationMode] || RuleCategory.ENRICHMENT);
  }, [operationMode]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Rule title is required.");
      return;
    }
    if (!useCase) {
      setError("Please select a use case.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await businessRulesService.createRule({ 
        title, 
        category, 
        description,
        operation_mode: operationMode,  
        use_case: useCase               
      });
      notify.success("Rule created successfully!");
      onSuccess();
    } catch (error: any) {
      let message = 'An error occurred';
      if (error.response?.status === 422 && Array.isArray(error.response?.data?.detail)) {
        const firstError = error.response.data.detail[0];
        if (firstError?.msg) {
          let msg = String(firstError.msg);
          if (msg.startsWith("Value error, ")) {
            msg = msg.substring("Value error, ".length);
          }
          message = msg;
        }
      } else if (typeof error.response?.data?.detail === 'string') {
        message = error.response.data.detail;
      } else if (error.message) {
        message = error.message;
      }
      console.error("Create rule error:", error);
      notify.error("Failed to create rule", message);
    } finally {
      setLoading(false);
    }
  };
  const useCaseOptions = USE_CASE_OPTIONS[operationMode] || USE_CASE_OPTIONS["aggregation"];

  return (
    <BaseModal isOpen={true} onClose={onClose} title="Create New Business Rule">
      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div>
          <label htmlFor="use-case" className="block text-sm font-medium text-slate-700 mb-1">
            Use Case <span className="text-red-500">*</span>
          </label>
          <select
            id="use-case"
            value={useCase}
            onChange={(e) => setUseCase(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            required
          >
            <option value="">Select Use Case</option>
            {useCaseOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="rule-title" className="block text-sm font-medium text-slate-700 mb-1">
            Rule Name
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
        </div>
       <div>
  <label htmlFor="scenario-type" className="block text-sm font-medium text-slate-700 mb-1">
    Scenario Type <span className="text-red-500">*</span>
  </label>
  <select
    id="scenario-type"
    value={operationMode}
    onChange={(e) => setOperationMode(e.target.value)}
    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
  >
    <option value="aggregation">Aggregation</option>
    <option value="enrichment">Enrichment</option>
    <option value="cleaning">Cleaning</option>
    <option value="pdf_extraction">PDF Extraction</option>
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
        {error && <p className="text-sm text-red-500">{error}</p>}
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
            disabled={loading || !title.trim() || !useCase}
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