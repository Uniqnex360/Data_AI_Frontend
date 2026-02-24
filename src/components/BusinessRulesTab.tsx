import { useState } from 'react';
import { Shield, Plus } from 'lucide-react';

type PromptSection = {
  id: string;
  title: string;
  category: 'enrichment' | 'aggregation';
  description: string;
  prompt: string;
};

const PROMPT_SECTIONS: PromptSection[] = [
  {
    id: 'enrich_product',
    title: 'Enrich Product',
    category: 'enrichment',
    description:
      'Generates SEO title, bullets, tags and use cases from brand, category and standardized attributes.',
    prompt: `You are an expert e-commerce copywriter. Generate ONLY valid JSON. No explanations.

Brand: {{brand}}
Category: {{category}}
Confirmed specs (use ONLY these):
{{standardized_attributes_json}}

Generate exactly this JSON structure:

{
  "seo_title": "string (max 80 chars)",
  "bullets": ["5 bullet points", "each under 100 chars"],
  "tags": ["5-8 keywords"],
  "use_cases": ["2-4 use cases"],
  "confidence": 0.95
}

Do it now.`
  },
  {
    id: 'unify_attributes',
    title: 'Unify Attribute Names',
    category: 'aggregation',
    description:
      'Groups raw attribute names from multiple sources under one canonical snake_case attribute.',
    prompt: `You are a semantic attribute harmonization engine.
Raw attribute names from multiple sources:
{{attributes_array}}

Task:
- Identify which attributes mean the same thing
- Group them under ONE canonical attribute in snake_case
- Do NOT invent new attributes
- Return only valid JSON

Example output:
{
  "canonical_attributes": {
    "screen_size": {
      "synonyms": ["Display Size", "Screen Size", "Diagonal", "Size"],
      "confidence": 0.99
    },
    "ip_rating": {
      "synonyms": ["Water Rating", "Waterproof Rating", "Ingress Protection"],
      "confidence": 0.97
    }
  }
}`
  },
  {
    id: 'aggregate_per_canonical',
    title: 'Aggregate Values per Canonical Attribute',
    category: 'aggregation',
    description:
      'Aggregates raw values for one canonical attribute and flags whether there is a real conflict.',
    prompt: `Aggregate values for canonical attribute '{{canonical}}'.
Raw values: {{values_json}}

Rules:
- Keep all raw values
- Preserve source
- conflict = True only if values differ meaningfully (e.g. 12 vs 13)
- "12 inch" vs "12\\"" → conflict = False

Return ONLY JSON:
{
  "{{canonical}}": {
    "values": [...],
    "conflict": true | false
  }
}`
  },
  {
    id: 'standardize_with_llm',
    title: 'Standardize Attribute Value',
    category: 'aggregation',
    description:
      'Converts multiple raw values for one attribute into a single standardized value and unit.',
    prompt: `Standardize attribute: {{attribute_name}}
Values: {{values_json}}

Rules:
- Convert units where appropriate (e.g. inches → cm)
- Enforce enums where applicable
- Pick one "truth" value
- Do not add extra fields

Output ONLY JSON:
{
  "standard_value": ...,
  "unit": "string or null",
  "derived_from": [ ...original values used... ]
}`
  },
  {
    id: 'build_golden_record',
    title: 'Build Golden Record',
    category: 'aggregation',
    description:
      'Creates the final golden product record from identifiers and standardized attributes.',
    prompt: `Create a product Golden Record and return the result as JSON.

INPUT DATA:
SKU/MPN: {{mpn}}
Brand: {{brand}}

STANDARDIZED ATTRIBUTES:
{{standardized_attributes_json}}

YOUR TASK:
1. Copy the SKU and brand from above.
2. Include ALL standardized attributes.
3. Set ready_for_publish based on:
   - Has brand: {{has_brand}}
   - At least 4 technical specs: {{tech_spec_count}} found.
4. Assign confidence 0.0–1.0 based on data completeness.

Return ONLY this JSON structure (no markdown, no extra text):
{
  "sku": "the SKU value",
  "brand": "the brand value",
  "attributes": {
    "attribute_name": "value",
    "...": "..."
  },
  "ready_for_publish": true or false,
  "confidence": 0.0 to 1.0
}

CRITICAL:
- The response must be valid JSON only.
- Do NOT add keys like "identifiers" or "standardized_attributes".`
  }
];

function getCategoryColor(category: PromptSection['category']) {
  switch (category) {
    case 'enrichment':
      return 'bg-emerald-100 text-emerald-700';
    case 'aggregation':
      return 'bg-indigo-100 text-indigo-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export default function BusinessRulesTab() {
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Business Rules / Prompts</h3>
          <p className="text-sm text-slate-600 mt-1">
            Hard‑coded LLM prompts that drive aggregation and enrichment.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Rule 
        </button>
      </div>

      {/* (Optional) Add Rule form – currently just UI, not wired up */}
      {showAddForm && (
        <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
          <h4 className="font-semibold text-slate-900 mb-4">Add New Rule</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Rule ID
              </label>
              <input
                type="text"
                placeholder="e.g., enrich_product_v2"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Category
              </label>
              <input
                type="text"
                placeholder="e.g., enrichment / aggregation"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Create Rule
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Static prompt sections */}
      <div className="space-y-3">
        {PROMPT_SECTIONS.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
            <Shield className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600">No prompts configured</p>
            <p className="text-sm text-slate-500 mt-1">
              Hard‑code prompts into PROMPT_SECTIONS in BusinessRulesTab.tsx.
            </p>
          </div>
        ) : (
          PROMPT_SECTIONS.map((section) => (
            <div
              key={section.id}
              className="p-4 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium text-slate-900">
                      {section.title}
                    </h4>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(
                        section.category
                      )}`}
                    >
                      {section.category}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">
                    {section.description}
                  </p>
                  <div className="mt-2 p-3 bg-slate-50 rounded text-xs font-mono text-slate-800 overflow-x-auto max-h-72 overflow-y-auto">
                    <pre className="whitespace-pre-wrap">
                      {section.prompt}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}