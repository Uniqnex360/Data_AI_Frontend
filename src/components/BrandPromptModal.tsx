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

export default function BrandPromptModal({
  prompt,
  onClose,
  onSuccess,
}: Props) {
  const [brands, setBrands] = useState<any[]>([]);
  const [showAddBrandForm, setShowAddBrandForm] = useState(false);
const [newBrandName, setNewBrandName] = useState("");
const [creatingBrand, setCreatingBrand] = useState(false);
const [showBrandDropdown, setShowBrandDropdown] = useState(false);
const [brandError, setBrandError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchBrand, setSearchBrand] = useState("");

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
      const data = (await productService.getBrands?.()) || [];
      setBrands(data);
    } catch (error) {
      console.error("Failed to load brands:", error);
      notify.error("Failed to load brands");
    } finally {
      setLoading(false);
    }
  };

  const filteredBrands = brands.filter((b: any) =>
    b.name?.toLowerCase().includes(searchBrand.toLowerCase()),
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
          ? form.variables
              .split(",")
              .map((v: string) => v.trim())
              .filter(Boolean)
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
const handleCreateBrand = async () => {
  const name = newBrandName.trim();
  if (!name) return;
  
  setCreatingBrand(true);
  setBrandError("");
  
  try {
    const newBrand = await businessRulesService.createBrand?.(name) || 
                     await productService.createBrand?.(name);
    
    setForm({
      ...form,
      brand_id: newBrand.id,
      brand_name: newBrand.name,
    });
    setSearchBrand(newBrand.name);
    setShowAddBrandForm(false);
    setShowBrandDropdown(false);
    
    // Refresh brands list
    loadBrands();
    notify.success("Brand created");
  } catch (error: any) {
   const message = error?.detail || error?.response?.data?.detail || error?.message || "Failed to create brand";
   console.log('MESSAGE',message)
   setBrandError(message);
  } finally {
    setCreatingBrand(false);
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
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">
            {prompt ? "Edit Brand Prompt" : "Add Brand Prompt"}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Brand Selection */}
<div>
  <label className="block text-sm font-medium text-slate-700 mb-1">Brand *</label>
  <div className="relative">
    <input
      type="text"
      value={searchBrand}
      onChange={(e) => {
        setSearchBrand(e.target.value);
        setShowBrandDropdown(true);
        setShowAddBrandForm(false);
      }}
      onFocus={() => {
        setShowBrandDropdown(true);
        if (!form.brand_id) setSearchBrand("");
      }}
      onBlur={() => setTimeout(() => {
        if (!showAddBrandForm) setShowBrandDropdown(false);
      }, 200)}
      placeholder="Search brands..."
      className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm"
    />

    {showBrandDropdown && (
      <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
        {!showAddBrandForm ? (
          <>
          <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setShowAddBrandForm(true);
                setNewBrandName(searchBrand);
                setCreatingBrand(false);
                setBrandError("");
              }}
              className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 border-t font-medium"
            >
              + Add New Brand
            </button>
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
                  setShowBrandDropdown(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${
                  form.brand_id === brand.id ? "bg-blue-50 text-blue-700" : ""
                }`}
              >
                {brand.name}
              </button>
            ))}
            {filteredBrands.length === 0 && searchBrand && (
              <div className="px-3 py-2 text-sm text-slate-500">
                No brands found
              </div>
            )}
            
          </>
        ) : (
          <div className="p-3">
            <input
              type="text"
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              placeholder="Enter brand name"
              className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm mb-2"
              autoFocus
              onKeyDown={async (e) => {
                if (e.key === 'Enter') await handleCreateBrand();
                if (e.key === 'Escape') setShowAddBrandForm(false);
              }}
            />
            {brandError && (
              <p className="text-xs text-red-500 mb-2">{brandError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCreateBrand}
                disabled={creatingBrand || !newBrandName.trim()}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {creatingBrand ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                onClick={() => setShowAddBrandForm (false)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    )}
  </div>
  {form.brand_name && (
    <p className="mt-1 text-xs text-green-600">Selected: {form.brand_name}</p>
  )}
</div>

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

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Variables
            </label>
            <input
              type="text"
              value={form.variables}
              onChange={(e) => setForm({ ...form, variables: e.target.value })}
              placeholder="brand, mpn, title"
              className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

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
