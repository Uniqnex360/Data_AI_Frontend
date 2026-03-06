import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Plus,
  Search,
  ChevronDown,
  ChevronUp,
  Loader2,
  Edit,
  Archive,
  X,
} from "lucide-react";
import { businessRulesService } from "../services/businessRulesService";
import { notify } from "../lib/notifications";
import {
  BusinessRule,
  RuleCategory,
  RuleStatus,
  RulePrompt,
} from "../types/business-rules.types";
import EditRuleModal from "./BusinessModal/EditRuleModal";
import EditPromptModal from "./BusinessModal/EditPromptModal";
import AddRuleModal from "./BusinessModal/AddRuleModal.tsx";
import AddPromptModal from "./BusinessModal/AddPromptModal.tsx";
import StatusConfirmModal from "./BusinessModal/StatusConfirmModal";
const CATEGORY_COLORS: Record<RuleCategory, string> = {
  enrichment: "bg-emerald-100 text-emerald-700 border-emerald-200",
  aggregation: "bg-indigo-100 text-indigo-700 border-indigo-200",
  standardization: "bg-amber-100 text-amber-700 border-amber-200",
  extraction: "bg-purple-100 text-purple-700 border-purple-200",
};
export default function BusinessRulesTab() {
  const [rules, setRules] = useState<BusinessRule[]>([]);
  const [allRules, setAllRules] = useState<BusinessRule[]>([]);
  const [uniquePromptNames, setUniquePromptNames] = useState<string[]>([]);
  const [promptNameFilter, setPromptNameFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<RuleCategory | "all">(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState<RuleStatus | "all">("all");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusChangeTarget, setStatusChangeTarget] = useState<{
    type: "rule" | "prompt";
    item: BusinessRule | RulePrompt;
    newStatus: RuleStatus;
  } | null>(null);
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [showEditRuleModal, setShowEditRuleModal] = useState(false);
  const [showAddPromptModal, setShowAddPromptModal] = useState(false);
  const [showEditPromptModal, setShowEditPromptModal] = useState(false);
  const [selectedRule, setSelectedRule] = useState<BusinessRule | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<RulePrompt | null>(null);
  const filterInputStyle =
    "h-10 px-3 py-2 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50";
  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (categoryFilter !== "all") {
        params.category = categoryFilter;
      }
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      const data = await businessRulesService.getAllRules({
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
      });
      const allPrompts = data.rules.flatMap((rule) => rule.prompts);
      const promptNames = [
        ...new Set(allPrompts.map((p) => p.prompt_name)),
      ].sort();
      setUniquePromptNames(promptNames);
      setAllRules(data.rules);
    } catch (error) {
      console.error("Failed to load rules:", error);
      notify.error("Failed to load business rules");
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, statusFilter, searchQuery]);
  useEffect(() => {
    let filteredRules = [...allRules];
    if (promptNameFilter) {
      filteredRules = filteredRules
        .map((rule) => ({
          ...rule,
          prompts: rule.prompts.filter(
            (p) => p.prompt_name === promptNameFilter,
          ),
        }))
        .filter((rule) => rule.prompts.length > 0);
    }
    setRules(filteredRules);
  }, [allRules, promptNameFilter]);
  useEffect(() => {
    loadRules();
  }, [loadRules]);
  const toggleRule = (ruleId: string) => {
    setExpandedRules((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(ruleId)) {
        newSet.delete(ruleId);
      } else {
        newSet.add(ruleId);
      }
      return newSet;
    });
  };
  const resetFilters = useCallback(() => {
    setSearchQuery("");
    setCategoryFilter("all");
    setPromptNameFilter("");
  }, []);
  const handleUpdateRuleStatus = async (
    rule: BusinessRule,
    status: RuleStatus,
  ) => {
    try {
      await businessRulesService.updateRuleStatus(rule.id, status);
      notify.success(`Rule status updated to ${status}`);
      setShowStatusModal(false);
      setStatusChangeTarget(null);
      await loadRules();
    } catch (error: any) {
      notify.error("Failed to update rule status", error.message);
    }
  };
  const handleUpdatePromptStatus = async (
    prompt: RulePrompt,
    status: RuleStatus,
  ) => {
    try {
      await businessRulesService.updatePromptStatus(prompt.id, status);
      notify.success(`Prompt status updated to ${status}`);
      setShowStatusModal(false);
      setStatusChangeTarget(null);
      await loadRules();
    } catch (error: any) {
      notify.error("Failed to update prompt status", error.message);
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-900 mb-1">
            Business Rules / Prompts
          </h3>
          <p className="text-sm text-slate-600">
            Hard-coded LLM prompts that drive aggregation and enrichment
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className={filterInputStyle}
          >
            <option value="all">Select Rule</option>
            <option value="enrichment">Enrichment</option>
            <option value="aggregation">Aggregation</option>
            <option value="standardization">Standarization</option>
            <option value="extraction">Extraction</option>
          </select>
          <select
            value={promptNameFilter}
            onChange={(e) => setPromptNameFilter(e.target.value)}
            disabled={uniquePromptNames.length === 0}
            className={filterInputStyle}
          >
            <option value="">Select Prompt</option>
            {uniquePromptNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          {(searchQuery || categoryFilter !== "all" || promptNameFilter) && (
            <button
              onClick={resetFilters}
              className={`${filterInputStyle} flex items-center gap-2 `}
            >
              <X className="w-4 h-4" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
        <button
          onClick={() => setShowAddRuleModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Rule
        </button>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search rules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : rules.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
          <Shield className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">No rules found</p>
          <p className="text-sm text-slate-500 mt-1">
            {searchQuery
              ? `No rules match "${searchQuery}"`
              : "Click 'Add Rule' to create your first business rule"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => {
            const isExpanded = expandedRules.has(rule.id);
            return (
              <div
                key={rule.id}
                className="bg-white border border-slate-200 rounded-lg overflow-hidden"
              >
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() => toggleRule(rule.id)}
                        className="p-1 hover:bg-slate-200 rounded transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-slate-600" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-600" />
                        )}
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-lg font-semibold text-slate-900">
                            {rule.title}
                          </h4>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium border ${CATEGORY_COLORS[rule.category]}`}
                          >
                            {rule.category}
                          </span>
                          {rule.is_system && (
                            <span className="px-2 py-1 bg-slate-200 text-slate-600 rounded-full text-xs font-medium">
                              System
                            </span>
                          )}
                        </div>
                        {rule.description && (
                          <p className="text-sm text-slate-600">
                            {rule.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedRule(rule);
                          setShowEditRuleModal(true);
                        }}
                        disabled={rule.is_system}
                        className="p-2 text-slate-600 hover:bg-slate-200 rounded-md transition-colors disabled:opacity-50"
                        title="Edit Rule"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedRule(rule);
                          setShowAddPromptModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Prompt</span>
                      </button>
                    </div>
                  </div>
                </div>
                {isExpanded && (
                  <div className="p-4 space-y-3">
                    {rule.prompts.length === 0 ? (
                      <div className="text-center py-8 bg-slate-50 rounded-md border border-dashed border-slate-300">
                        <p className="text-slate-500 text-sm">
                          No prompts added yet
                        </p>
                        <button
                          onClick={() => {
                            setSelectedRule(rule);
                            setShowAddPromptModal(true);
                          }}
                          className="mt-2 text-blue-600 hover:underline text-sm"
                        >
                          Add your first prompt
                        </button>
                      </div>
                    ) : (
                      rule.prompts.map((prompt, index) => (
                        <div
                          key={prompt.id}
                          className="bg-white border border-slate-200 rounded-md p-4"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h5 className="font-medium text-slate-900">
                                {prompt.prompt_name}
                              </h5>
                              {prompt.description && (
                                <p className="text-sm text-slate-600 mt-1">
                                  {prompt.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedPrompt(prompt);
                                  setShowEditPromptModal(true);
                                }}
                                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                                title="Edit Prompt"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setStatusChangeTarget({
                                    type: "prompt",
                                    item: prompt,
                                    newStatus: RuleStatus.INACTIVE,
                                  });
                                  setShowStatusModal(true);
                                }}
                                disabled={prompt.status === RuleStatus.INACTIVE}
                                className="p-1.5 text-slate-600 hover:bg-amber-50 hover:text-amber-700 rounded transition-colors disabled:opacity-50"
                                title={
                                  prompt.status === RuleStatus.INACTIVE
                                    ? "Prompt is already inactive"
                                    : "Deactivate Prompt"
                                }
                              >
                                <Archive className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="bg-slate-100 border border-slate-200 text-slate-800 rounded-md p-3 mt-3 max-h-48 overflow-y-auto">
                            <pre className="text-xs font-mono whitespace-pre-wrap">
                              {prompt.prompt_text}
                            </pre>
                          </div>
                          {prompt.variables && prompt.variables.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {prompt.variables.map((variable) => (
                                <code
                                  key={variable}
                                  className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs"
                                >
                                  {`{{${variable}}}`}
                                </code>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {showAddRuleModal && (
        <AddRuleModal
          onClose={() => setShowAddRuleModal(false)}
          onSuccess={() => {
            setShowAddRuleModal(false);
            loadRules();
          }}
        />
      )}
      {showEditRuleModal && selectedRule && (
        <EditRuleModal
          rule={selectedRule}
          onClose={() => {
            setShowEditRuleModal(false);
            setSelectedRule(null);
          }}
          onSuccess={() => {
            setShowEditRuleModal(false);
            setSelectedRule(null);
            loadRules();
          }}
        />
      )}
      {showAddPromptModal && selectedRule && (
        <AddPromptModal
          rule={selectedRule}
          onClose={() => {
            setShowAddPromptModal(false);
            setSelectedRule(null);
          }}
          onSuccess={() => {
            setShowAddPromptModal(false);
            setSelectedRule(null);
            loadRules();
          }}
        />
      )}
      {showEditPromptModal && selectedPrompt && (
        <EditPromptModal
          prompt={selectedPrompt}
          onClose={() => {
            setShowEditPromptModal(false);
            setSelectedPrompt(null);
          }}
          onSuccess={() => {
            setShowEditPromptModal(false);
            setSelectedPrompt(null);
            loadRules();
          }}
        />
      )}
      {showStatusModal && statusChangeTarget && (
        <StatusConfirmModal
          target={statusChangeTarget}
          newStatus={statusChangeTarget.newStatus}
          onClose={() => {
            setShowStatusModal(false);
            setStatusChangeTarget(null);
          }}
          onConfirm={async () => {
            if (statusChangeTarget.type === "rule") {
              await handleUpdateRuleStatus(
                statusChangeTarget.item as BusinessRule,
                statusChangeTarget.newStatus,
              );
            } else {
              await handleUpdatePromptStatus(
                statusChangeTarget.item as RulePrompt,
                statusChangeTarget.newStatus,
              );
            }
          }}
        />
      )}
    </div>
  );
}
