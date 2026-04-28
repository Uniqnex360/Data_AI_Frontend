
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { businessRulesService } from "../../services/businessRulesService";
import { notify } from "../../lib/notifications";
import { BusinessRule, RuleCategory, RuleStatus } from "../../types/business-rules.types";
import BaseModal from "./BaseModal";

interface Props {
  rule: BusinessRule;
  onClose: () => void;
  onSuccess: () => void;
}

const STAGES_BY_CATEGORY: Record<RuleCategory, { value: string; label: string }[]> = {
  aggregation: [
     { value: "discovery_query", label: "Discovery Query - Build search query" }, 
    { value: "discovery_filter", label: "Discovery Filter - Select best URLs" },
    { value: "extraction", label: "Extraction - Extract from web/PDF" },
    { value: "combine", label: "Combine - Unify & Standardize" },
    { value: "enrichment", label: "Enrichment - Marketing content" },
  ],
  enrichment: [
    { value: "validation", label: "Validation - Compare with Excel" },
    { value: "enrichment", label: "Enrichment - Marketing content" },
  ],
  standardization: [
    { value: "cleaning", label: "Cleaning - Standardize attributes" }, 
    { value: "standardization", label: "Standardization - Clean data" },
    { value: "validation", label: "Validation - Validate cleaned data" },
  ],
  
   extraction: [
    { value: "pdf_identification", label: "PDF Identification - Find products in PDF" },
    { value: "pdf_blind_extraction", label: "PDF Blind Extraction - Extract without MPN" },
    { value: "pdf_extraction", label: "PDF Extraction - Extract with MPN" },
    { value: "pdf_structured", label: "PDF Structured - From tables" },
    { value: "pdf_unstructured", label: "PDF Unstructured - From free text" },
    { value: "extraction", label: "Extraction - Extract from web" },
    { value: "combine", label: "Combine - Unify & Standardize" },
  ],  
};
const STAGES_BY_USE_CASE: Record<string, { value: string; label: string }[]> = {
  "Title & Description Based PDF Extraction": [
    { value: "pdf_identification", label: "PDF Identification - Find products in PDF" },
    { value: "pdf_blind_extraction", label: "PDF Blind Extraction - Extract without MPN" },
  ],
  "Structured PDF Extraction (Given MPNs)": [
    { value: "pdf_structured", label: "PDF Structured - From tables" },
  ],
  "Unstructured PDF Extraction (Given MPNs)": [
    { value: "pdf_unstructured", label: "PDF Unstructured - From free text" },
  ],
  "Multi-PDF & Multi-MPN Data Extraction.": [
    { value: "pdf_extraction", label: "PDF Extraction - Multi-PDF extraction" },
  ],
  "MPN/UPC based PDF Extraction": [
    { value: "pdf_extraction", label: "PDF Extraction - Extract with MPN" },
  ],
  
  
  "Products with Category Assignments": [
    { value: "discovery_query", label: "Discovery Query - Build search query" },
    { value: "discovery_filter", label: "Discovery Filter - Select best URLs" },
    { value: "extraction", label: "Extraction - Extract from web/PDF" },
    { value: "combine", label: "Combine - Unify & Standardize" },
    { value: "enrichment", label: "Enrichment - Marketing content" },
  ],
  "Products without Category Assignments": [
    { value: "discovery_query", label: "Discovery Query - Build search query" },
    { value: "discovery_filter", label: "Discovery Filter - Select best URLs" },
    { value: "extraction", label: "Extraction - Extract from web/PDF" },
    { value: "combine", label: "Combine - Unify & Standardize" },
    { value: "enrichment", label: "Enrichment - Marketing content" },
  ],
  
  
  "With Categories with attribute (back filling)": [
    { value: "validation", label: "Validation - Compare with Excel" },
    { value: "enrichment", label: "Enrichment - Marketing content" },
  ],
  "With Categories with attribute (back filling) and existing attribute validation": [
    { value: "validation", label: "Validation - Compare with Excel" },
    { value: "enrichment", label: "Enrichment - Marketing content" },
  ],
  
  "Data cleaning and Standardization": [
    { value: "attribute_mapping", label: "Attribute Mapping - Global name standardization" },
    { value: "cleaning", label: "Cleaning - Standardize attribute values" },
  ],
};
export default function AddPromptModal({ rule, onClose, onSuccess }: Props) {
  const [promptName, setPromptName] = useState("");
  const [stage, setStage] = useState("");
  const [promptText, setPromptText] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const stageOptions = rule.use_case 
    ? STAGES_BY_USE_CASE[rule.use_case] || []
    : STAGES_BY_CATEGORY[rule.category] || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!promptName.trim()) {
      setError("Prompt name is required");
      return;
    }
    if (!stage) {
      setError("Please select a stage");
      return;
    }
    if (!promptText.trim()) {
      setError("Prompt text is required");
      return;
    }
    
    setError("");
    setLoading(true);
    
    try {
      await businessRulesService.createPrompt(rule.id, {
        prompt_name: promptName.trim(),
        prompt_text: promptText.trim(),
        description: description.trim() || undefined,
        stage: stage, 
        priority: 100,
        variables: [],
        status:RuleStatus.ACTIVE,
      });
      
      notify.success("Prompt added successfully");
      onSuccess();
    } catch (error: any) {
      console.error("Failed to create prompt:", error);
      notify.error("Failed to create prompt");
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal isOpen={true} onClose={onClose} title={`Add Prompt to "${rule.title}"`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
          <p className="text-sm text-slate-600">
            <span className="font-medium">Category:</span> {rule.category}
            {rule.operation_mode && (
              <> • <span className="font-medium">Mode:</span> {rule.operation_mode}</>
            )}
            {rule.use_case && (
              <> • <span className="font-medium">Use Case:</span> {rule.use_case}</>
            )}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Pipeline Stage <span className="text-red-500">*</span>
          </label>
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            required
          >
            <option value="">Select Stage</option>
            {stageOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-1">
            Which part of the pipeline should use this prompt
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Prompt Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={promptName}
            onChange={(e) => setPromptName(e.target.value)}
            placeholder="e.g., Main Extraction Prompt"
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Prompt Text <span className="text-red-500">*</span>
          </label>
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="Enter your prompt template..."
            rows={10}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this prompt does"
            rows={2}
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
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Add Prompt
          </button>
        </div>
      </form>
    </BaseModal>
  );
}