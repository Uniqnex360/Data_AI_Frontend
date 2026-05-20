import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { businessRulesService } from "../services/businessRulesService.ts";
import { productService } from "../services/productService.ts";
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
export default function CategoryPromptModal({
  prompt,
  onClose,
  onSuccess,
}: Props) {
  const [categories, setCategories] = useState<any[]>([]);
  const [selectionMode, setSelectionMode] = useState<"category" | "taxonomy">(
    "category",
  );
  const [availableTaxonomies, setAvailableTaxonomies] = useState<string[]>([]);
  const [selectedTaxonomy, setSelectedTaxonomy] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchCategory, setSearchCategory] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [industries, setIndustries] = useState<any[]>([]);
  const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedIndustryId, setSelectedIndustryId] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [form, setForm] = useState({
    category_id: prompt?.category_id || "",
    category_name: prompt?.category_name || "",
    prompt_name: prompt?.prompt_name || "",
    prompt_text: prompt?.prompt_text || "",
    description: prompt?.description || "",
    variables: prompt?.variables?.join(", ") || "",
    status: prompt?.status || "active",
    selected_taxonomy: prompt?.selected_taxonomy || "",
  });
  const loadIndustries = async () => {
    setLoading(true);
    try {
      const data = (await productService.getIndustries?.()) || [];
      setIndustries(data);
    } catch (error) {
      console.error("Failed to load industries:", error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadCategories();
    loadIndustries();
  }, []);
  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    setCreatingCategory(true);
    try {
      const newCat = await productService.createCategory({
        name,
        level: 1,
        full_path: name,
      });
      setForm({ ...form, category_id: newCat.id, category_name: newCat.name });
      setSearchCategory(newCat.name);
      setShowAddCategoryForm(false);
      setShowDropdown(false);
      loadCategories();
      notify.success("Category created");
    } catch (e: any) {
      notify.error(e?.detail || "Failed to create category");
    } finally {
      setCreatingCategory(false);
    }
  };
  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = (await productService.getCategories?.()) || [];
      setCategories(data);
    } catch (error) {
      console.error("Failed to load categories:", error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
  if (prompt) {
    // Determine which mode this prompt uses
    const hasTaxonomy = !!prompt.selected_taxonomy;
    const hasCategory = !!prompt.category_id;
    
    if (hasTaxonomy) {
      // Taxonomy mode - ignore category
      setSelectionMode("taxonomy");
      setForm({
        category_id: "",
        category_name: "",
        selected_taxonomy: prompt.selected_taxonomy || "",
        prompt_name: prompt.prompt_name || "",
        prompt_text: prompt.prompt_text || "",
        description: prompt.description || "",
        variables: prompt.variables?.join(", ") || "",
        status: prompt.status || "active",
      });
      setSearchCategory("");
    } else if (hasCategory) {
      // Category mode - ignore taxonomy
      setSelectionMode("category");
      setForm({
        category_id: prompt.category_id || "",
        category_name: prompt.category_name || "",
        selected_taxonomy: "",
        prompt_name: prompt.prompt_name || "",
        prompt_text: prompt.prompt_text || "",
        description: prompt.description || "",
        variables: prompt.variables?.join(", ") || "",
        status: prompt.status || "active",
      });
      setSearchCategory(prompt.category_name || "");
    } else {
      // Neither selected (unlikely, but safe default)
      setSelectionMode("category");
      setForm({
        category_id: "",
        category_name: "",
        selected_taxonomy: "",
        prompt_name: prompt.prompt_name || "",
        prompt_text: prompt.prompt_text || "",
        description: prompt.description || "",
        variables: prompt.variables?.join(", ") || "",
        status: prompt.status || "active",
      });
      setSearchCategory("");
    }
  }
}, [prompt]);
  useEffect(() => {
    const fetchTaxonomies = async () => {
      const taxonomies = await productService.getAllTaxonomies();
      setAvailableTaxonomies(taxonomies);
    };
    fetchTaxonomies();
  }, []);
  const filteredCategories = categories.filter((c: any) =>
    c.name?.toLowerCase().includes(searchCategory.toLowerCase()),
  );
  const handleSubmit = async () => {
    if (selectionMode === "category" && !form.category_id) {
      notify.error("Please select a category");
      return;
    }
    if (selectionMode === "taxonomy" && !form.selected_taxonomy) {
      notify.error("Please select a taxonomy");
      return;
    }
    if (!form.prompt_name || !form.prompt_text) {
      notify.error("Please fill all required fields");
      return;
    }

    setSaving(true);
    try {
      const payload =
        selectionMode === "category"
          ? {
              // ✅ Category mode — send category_id, no taxonomy
              category_id: form.category_id,
              selected_taxonomy: undefined,
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
            }
          : {
              // ✅ Taxonomy mode — send ONLY selected_taxonomy, let backend resolve category_id
              category_id: undefined,
              selected_taxonomy: form.selected_taxonomy,
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
        await businessRulesService.updateCategoryPrompt(prompt.id, payload);
        notify.success("Category prompt updated");
      } else {
        await businessRulesService.createCategoryPrompt(payload);
        notify.success("Category prompt created");
      }
      onSuccess();
    } catch (error: any) {
      notify.error("Failed to save", error.message);
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
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">
            {prompt ? "Edit Category Prompt" : "Add Category Prompt"}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Switch between Category and Taxonomy */}
          <div className="flex items-center gap-4 mb-4 p-2 bg-slate-50 rounded-lg">
            <button
              type="button"
              onClick={() => setSelectionMode("category")}
              className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                selectionMode === "category"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              Select Category
            </button>
            <button
              type="button"
              onClick={() => setSelectionMode("taxonomy")}
              className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                selectionMode === "taxonomy"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              Use Custom Taxonomy
            </button>
          </div>

          {selectionMode === "category" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Select Category *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchCategory}
                  onChange={(e) => {
                    setSearchCategory(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => {
                    setShowDropdown(true);
                    if (!form.category_id) {
                      setSearchCategory("");
                    }
                  }}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  placeholder="Search categories..."
                  className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm"
                />
                {showDropdown && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {filteredCategories.map((cat: any) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setForm({
                            ...form,
                            category_id: cat.id,
                            category_name: cat.name,
                            selected_taxonomy: "",
                          });
                          setSearchCategory(cat.name);
                          setShowDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${
                          form.category_id === cat.id
                            ? "bg-blue-50 text-blue-700"
                            : ""
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                    {filteredCategories.length === 0 && (
                      <div className="px-3 py-2 text-sm text-slate-500">
                        No categories found
                      </div>
                    )}
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setShowAddCategoryForm(true);
                        setNewCategoryName(searchCategory);
                        setSelectedIndustryId(industries[0]?.id || "");
                        setCreatingCategory(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 border-t font-medium"
                    >
                      + Add New Category
                    </button>
                  </div>
                )}
                {showAddCategoryForm && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg p-3">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Category name"
                      className="w-full h-10 px-3 border rounded-lg text-sm mb-2"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCreateCategory}
                        disabled={creatingCategory || !newCategoryName.trim()}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                      >
                        {creatingCategory ? "Creating..." : "Create"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddCategoryForm(false)}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {form.category_name && (
                <p className="mt-1 text-xs text-green-600">
                  Selected: {form.category_name}
                </p>
              )}
            </div>
          )}

          {/* Taxonomy Selection (shown only when selectionMode === "taxonomy") */}
          {selectionMode === "taxonomy" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Custom Taxonomy
              </label>
              <select
                value={form.selected_taxonomy}
                onChange={(e) => {
                  setForm({
                    ...form,
                    selected_taxonomy: e.target.value,
                    category_id: "",
                    category_name: "",
                  });
                }}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="">-- Select a taxonomy (optional) --</option>
                {availableTaxonomies.map((tax) => (
                  <option key={tax} value={tax}>
                    {tax}
                  </option>
                ))}
              </select>
              {form.selected_taxonomy && (
                <p className="text-xs text-blue-600 mt-1">
                  This prompt will use: {form.selected_taxonomy}
                </p>
              )}
            </div>
          )}
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
              placeholder="e.g., Plumbing URL Discovery"
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
              placeholder="Brief description of this prompt"
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
              placeholder="Enter the LLM prompt template..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
            />
          </div>
          {/* Variables */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Variables{" "}
              <span className="text-slate-400 font-normal">
                (comma-separated)
              </span>
            </label>
            <input
              type="text"
              value={form.variables}
              onChange={(e) => setForm({ ...form, variables: e.target.value })}
              placeholder="brand, mpn, title, taxonomy"
              className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          {/* Status */}
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
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {prompt ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
