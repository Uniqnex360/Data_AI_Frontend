import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { productService } from "../services/productService.ts";
import { businessRulesService } from "../services/businessRulesService.ts";
import { notify } from "../lib/notifications.ts";

interface Props {
  prompt?: any | null;
  onClose: () => void;
  onSuccess: () => void;
}

const STAGES = [
  { value: "discovery_query", label: "URL Discovery Query" },
  { value: "discovery_filter", label: "URL Discovery Filter" },
  { value: "extraction", label: "Extraction" },
  { value: "combine", label: "Combine & Unification" },
  { value: "enrichment", label: "Marketing Enrichment" },
  { value: "validation", label: "Validation" },
];

export default function BrandPromptModal({ prompt, onClose, onSuccess }: Props) {
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchBrand, setSearchBrand] = useState("");
const [showDropdown, setShowDropdown] = useState(false);

  const [form, setForm] = useState({
    brand_id: prompt?.brand_id || "",
    brand_name: prompt?.brand_name || "",
    stage: prompt?.stage || "extraction",
    prompt_name: prompt?.prompt_name || "",
    prompt_text: prompt?.prompt_text || "",
    description: prompt?.description || "",
    variables: prompt?.variables?.join(", ") || "",
    status: prompt?.status || "active",
  });

  useEffect(() => {
    loadBrands();
  }, []);

  const loadBrands = async () => {
    setLoading(true);
    try {
      const data = await productService.getBrands?.() || [];
      setBrands(data);
    } catch (error) {
      console.error("Failed to load brands:", error);
      notify.error("Failed to load brands");
    } finally {
      setLoading(false);
    }
  };

  const filteredBrands = brands.filter((b: any) =>
    b.name?.toLowerCase().includes(searchBrand.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!form.brand_id || !form.prompt_name || !form.prompt_text) {
      notify.error("Please fill all required fields");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        brand_id: form.brand_id,
        stage: form.stage,
        prompt_name: form.prompt_name,
        prompt_text: form.prompt_text,
        description: form.description || undefined,
        variables: form.variables
          ? form.variables.split(",").map((v: string) => v.trim()).filter(Boolean)
          : undefined,
        status: form.status,
      };

      if (prompt?.id) {
        await businessRulesService.updateBrandPrompt(prompt.id, payload);
        notify.success("Brand prompt updated");
      } else {
        await businessRulesService.createBrandPrompt(payload);
        notify.success("Brand prompt created");
      }

      onSuccess();
    } catch (error: any) {
      notify.error("Failed to save", error?.message || "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">
            {prompt ? "Edit Brand Prompt" : "Add Brand Prompt"}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Brand Selection */}
          {/* Brand Selection */}
{/* Brand Selection */}
<div>
  <label className="block text-sm font-medium text-slate-700 mb-1">
    Brand *
  </label>
  <div className="relative">
    <input
      type="text"
      value={searchBrand}
      onChange={(e) => {
        setSearchBrand(e.target.value);
        setShowDropdown(true);
      }}
      onFocus={() => {
        setShowDropdown(true);
        if (!form.brand_id) {
          setSearchBrand("");
        }
      }}
      onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
      placeholder="Search brands..."
      className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm"
    />

    {showDropdown && (
      <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
        {filteredBrands.map((brand: any) => (
          <button
            key={brand.id}
            type="button"
            onClick={() => {
              setForm({
                ...form,
                brand_id: brand.id,
                brand_name: brand.name,
              });
              setSearchBrand(brand.name);
              setShowDropdown(false);
            }}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${
              form.brand_id === brand.id ? "bg-blue-50 text-blue-700" : ""
            }`}
          >
            {brand.name}
          </button>
        ))}

        {filteredBrands.length === 0 && (
          <div className="px-3 py-2 text-sm text-slate-500">
            No brands found
          </div>
        )}
      </div>
    )}
  </div>
  {form.brand_name && (
    <p className="mt-1 text-xs text-green-600">Selected: {form.brand_name}</p>
  )}
</div>

          {/* Stage */}
          {/* <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Stage *
            </label>
            <select
              value={form.stage}
              onChange={(e) => setForm({ ...form, stage: e.target.value })}
              className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm"
            >
              {STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div> */}

          {/* Prompt Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Prompt Name *
            </label>
            <input
              type="text"
              value={form.prompt_name}
              onChange={(e) =>
                setForm({ ...form, prompt_name: e.target.value })
              }
              className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          {/* Prompt Text */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Prompt Text *
            </label>
            <textarea
              value={form.prompt_text}
              onChange={(e) =>
                setForm({ ...form, prompt_text: e.target.value })
              }
              rows={8}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
            />
          </div>

          {/* Variables */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Variables
            </label>
            <input
              type="text"
              value={form.variables}
              onChange={(e) =>
                setForm({ ...form, variables: e.target.value })
              }
              placeholder="brand, mpn, title"
              className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          {/* Priority */}
          

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value })
              }
              className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {prompt ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}