import { useState, useEffect, useCallback, useMemo } from "react";
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

const CATEGORY_BADGE: Record<RuleCategory, string> = {
  enrichment: "enrichment",
  aggregation: "aggregation",
  standardization: "standardization",
  extraction: "extraction",
};

function StatCard({
  value,
  label,
}: {
  value: number | string;
  label: string;
}) {
  return (
    <div className="px-6 py-3 bg-white border border-slate-200 rounded-2xl flex items-center gap-6 shadow-sm">
      <div className="text-center">
        <div className="text-lg font-bold text-blue-600 leading-none">
          {value}
        </div>
        <div className="text-xs text-slate-500 mt-1">{label}</div>
      </div>
    </div>
  );
}

export default function BusinessRulesTab() {
  const [rules, setRules] = useState<BusinessRule[]>([]);
  const [allRules, setAllRules] = useState<BusinessRule[]>([]);
  const [enabled, setEnabled] = useState(true); 
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

  const inputBase =
    "h-12 px-4 border border-slate-200 rounded-2xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const data = await businessRulesService.getAllRules({
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
      });

      const allPrompts = data.rules.flatMap((rule) => rule.prompts);
      const promptNames = [...new Set(allPrompts.map((p) => p.prompt_name))].sort();

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
          prompts: rule.prompts.filter((p) => p.prompt_name === promptNameFilter),
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
      const next = new Set(prev);
      next.has(ruleId) ? next.delete(ruleId) : next.add(ruleId);
      return next;
    });
  };

  const resetFilters = useCallback(() => {
    setSearchQuery("");
    setCategoryFilter("all");
    setPromptNameFilter("");
    
  }, []);

  const handleUpdateRuleStatus = async (rule: BusinessRule, status: RuleStatus) => {
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

  
  const stats = useMemo(() => {
    const prompts = rules.flatMap((r) => r.prompts || []);
    const active = prompts.filter((p) => p.status === RuleStatus.ACTIVE).length;
    const total = prompts.length;
    const scenarios = rules.length;
    return { active, total, scenarios };
  }, [rules]);

  const hasActiveFilters =
    !!searchQuery.trim() || categoryFilter !== "all" || !!promptNameFilter;

  return (
    <div className="space-y-6">
      {/* Top header row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-2xl font-bold text-slate-900">
            Business Rules / Prompts
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Configure LLM prompts that drive aggregation and enrichment pipelines
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Stats block like screenshot */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-3 flex items-center gap-8">
            <div className="text-center">
              <div className="text-xl font-bold text-blue-600 leading-none">
                {stats.active}
              </div>
              <div className="text-xs text-slate-500 mt-1">Active</div>
            </div>
            <div className="w-px h-10 bg-slate-200" />
            <div className="text-center">
              <div className="text-xl font-bold text-slate-900 leading-none">
                {stats.total}
              </div>
              <div className="text-xs text-slate-500 mt-1">Total</div>
            </div>
            <div className="w-px h-10 bg-slate-200" />
            <div className="text-center">
              <div className="text-xl font-bold text-slate-900 leading-none">
                {stats.scenarios}
              </div>
              <div className="text-xs text-slate-500 mt-1">Scenarios</div>
            </div>
          </div>

          <button
            onClick={() => setShowAddRuleModal(true)}
            className="h-12 px-6 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-colors inline-flex items-center gap-2 font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Rule
          </button>
        </div>
      </div>

      {/* Filter row like screenshot */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px_280px_auto] gap-3 items-center">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search rules or prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-11 ${inputBase}`}
            />
          </div>

          {/* Scenario / category */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className={inputBase}
          >
            <option value="all">All Scenarios</option>
            <option value="enrichment">Enrichment</option>
            <option value="aggregation">Aggregation</option>
            <option value="extraction">Extraction</option>
            <option value="standardization">Standardization</option>
          </select>

          {/* Prompts */}
          <select
            value={promptNameFilter}
            onChange={(e) => setPromptNameFilter(e.target.value)}
            disabled={uniquePromptNames.length === 0}
            className={inputBase}
          >
            <option value="">All Prompts</option>
            {uniquePromptNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          {hasActiveFilters ? (
            <button
              onClick={resetFilters}
              className="h-12 px-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold inline-flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Reset
            </button>
          ) : (
            <div />
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16 bg-white border border-slate-200 rounded-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : rules.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-700 font-semibold">No rules found</p>
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
            const activePromptCount = rule.prompts.filter(
              (p) => p.status === RuleStatus.ACTIVE,
            ).length;

            return (
              <div
                key={rule.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm"
              >
                {/* Rule header row */}
                <div className="px-5 py-4 border-b border-slate-100">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => toggleRule(rule.id)}
                        className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center hover:bg-blue-100"
                        aria-label="Toggle"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h4 className="text-sm font-extrabold tracking-wide text-slate-900 uppercase">
                            {rule.title}
                          </h4>

                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold border ${CATEGORY_COLORS[rule.category]}`}
                          >
                            {CATEGORY_BADGE[rule.category]}
                          </span>

                          {rule.is_system && (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              System
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-500 mt-1">
                          {activePromptCount} of {rule.prompts.length} prompts active
                        </div>

                        {rule.description && (
                          <div className="text-sm text-slate-600 mt-2 line-clamp-2">
                            {rule.description}
                          </div>
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
                        className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-50"
                        title="Edit Rule"
                      >
                        <Edit className="w-4 h-4 mx-auto" />
                      </button>

                      <button
                        onClick={() => {
                          setSelectedRule(rule);
                          setShowAddPromptModal(true);
                        }}
                        className="h-10 px-4 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-semibold inline-flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Prompt
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-5 py-4 space-y-4">
                    {rule.prompts.length === 0 ? (
                      <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                        <p className="text-slate-500 text-sm">
                          No prompts added yet
                        </p>
                        <button
                          onClick={() => {
                            setSelectedRule(rule);
                            setShowAddPromptModal(true);
                          }}
                          className="mt-2 text-blue-600 hover:underline text-sm font-semibold"
                        >
                          Add your first prompt
                        </button>
                      </div>
                    ) : (
                      rule.prompts.map((prompt, idx) => {
                        const enabled = prompt.status === RuleStatus.ACTIVE;

                        return (
                          <div
                            key={prompt.id}
                            className="border border-slate-200 rounded-2xl p-5"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-4 min-w-0">
                                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-semibold text-sm shrink-0">
                                  {idx + 1}
                                </div>

                                <div className="min-w-0">
                                  <div className="text-base font-semibold text-slate-900">
                                    {prompt.prompt_name}
                                  </div>
                                  {prompt.description && (
                                    <div className="text-sm text-slate-500 mt-1">
                                      {prompt.description}
                                    </div>
                                  )}

                                  {/* Prompt text preview */}
                                  <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
                                    <pre className="text-xs text-slate-700 font-mono whitespace-pre-wrap line-clamp-4">
                                      {prompt.prompt_text}
                                    </pre>
                                  </div>

                                  {/* Variables */}
                                  {prompt.variables && prompt.variables.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      {prompt.variables.map((variable) => (
                                        <code
                                          key={variable}
                                          className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs"
                                        >
                                          {`{{${variable}}}`}
                                        </code>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Right controls: Enabled toggle + edit + archive */}
                              <div className="flex flex-col items-end gap-3 shrink-0">
                                <div className="flex items-center gap-3">
                                  <span
                                    className={`text-xs font-semibold ${
                                      enabled ? "text-blue-600" : "text-slate-400"
                                    }`}
                                  >
                                    {enabled ? "Enabled" : "Disabled"}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setStatusChangeTarget({
                                        type: "prompt",
                                        item: prompt,
                                        newStatus: enabled
                                          ? RuleStatus.INACTIVE
                                          : RuleStatus.ACTIVE,
                                      });
                                      setShowStatusModal(true);
                                    }}
                                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                                      enabled ? "bg-blue-600" : "bg-slate-300"
                                    }`}
                                    title={enabled ? "Disable prompt" : "Enable prompt"}
                                  >
                                    <span
                                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                                        enabled ? "translate-x-6" : "translate-x-1"
                                      }`}
                                    />
                                  </button>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      setSelectedPrompt(prompt);
                                      setShowEditPromptModal(true);
                                    }}
                                    className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                                    title="Edit Prompt"
                                  >
                                    <Edit className="w-4 h-4 mx-auto" />
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
                                    className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-amber-50 hover:text-amber-700 text-slate-700 disabled:opacity-50"
                                    title={
                                      prompt.status === RuleStatus.INACTIVE
                                        ? "Prompt is already inactive"
                                        : "Deactivate Prompt"
                                    }
                                  >
                                    <Archive className="w-4 h-4 mx-auto" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modals (unchanged) */}
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