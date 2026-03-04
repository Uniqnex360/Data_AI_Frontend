
import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Plus,
  Search,
  Filter,
  ChevronDown,
  Edit,
  Trash2,
  Copy,
  Play,
  MoreVertical,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { businessRulesService } from "../services/businessRulesService";
import { notify } from "../lib/notifications";
import {
  BusinessRule,
  RuleCategory,
  RuleStatus,
} from "../types/business-rules.types";
import AddRuleModal from './BusinessModal/AddRuleModal';
import DeleteConfirmModal from './BusinessModal/DeleteConfirmModal';
import ViewPromptModal from './BusinessModal/ViewPromptModal';

const CATEGORY_COLORS: Record<RuleCategory, string> = {
  enrichment: "bg-emerald-100 text-emerald-700 border-emerald-200",
  aggregation: "bg-indigo-100 text-indigo-700 border-indigo-200",
  validation: "bg-amber-100 text-amber-700 border-amber-200",
  cleansing: "bg-purple-100 text-purple-700 border-purple-200",
};

const STATUS_COLORS: Record<RuleStatus, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-slate-100 text-slate-700",
  draft: "bg-amber-100 text-amber-700",
};

export default function BusinessRulesTab() {
  const [rules, setRules] = useState<BusinessRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<RuleCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<RuleStatus | "all">("all");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [selectedRule, setSelectedRule] = useState<BusinessRule | null>(null);

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

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

      const data = await businessRulesService.getAllRules(params);
      setRules(data.rules);
      setCategoryCounts(data.category_counts);
    } catch (error) {
      console.error("Failed to load rules:", error);
      notify.error("Failed to load business rules");
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, statusFilter, searchQuery]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const handleDelete = async (rule: BusinessRule) => {
    try {
      await businessRulesService.deleteRule(rule.id);
      notify.success("Rule deleted successfully");
      setShowDeleteModal(false);
      setSelectedRule(null);
      await loadRules();
    } catch (error: any) {
      notify.error("Failed to delete rule", error.message);
    }
  };

  const handleDuplicate = async (rule: BusinessRule) => {
    try {
      await businessRulesService.duplicateRule(rule.id);
      notify.success("Rule duplicated successfully");
      await loadRules();
    } catch (error: any) {
      notify.error("Failed to duplicate rule", error.message);
    }
  };

  const handleStatusToggle = async (rule: BusinessRule) => {
    try {
      const newStatus =
        rule.status === "active" ? RuleStatus.INACTIVE : RuleStatus.ACTIVE;

      await businessRulesService.updateRule(rule.id, { status: newStatus });
      notify.success(
        `Rule ${newStatus === "active" ? "activated" : "deactivated"}`
      );
      await loadRules();
    } catch (error: any) {
      notify.error("Failed to update rule status", error.message);
    }
  };

  const getStatusIcon = (status: RuleStatus) => {
    switch (status) {
      case "active":
        return <CheckCircle className="w-3 h-3" />;
      case "inactive":
        return <AlertCircle className="w-3 h-3" />;
      case "draft":
        return <Clock className="w-3 h-3" />;
    }
  };

  const filteredRules = rules;

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
        <button
          onClick={() => setShowAddModal(true)}
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

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as any)}
          className="px-4 py-2 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Select Rule</option>
          <option value="enrichment">Enrichment</option>
          <option value="aggregation">Aggregation</option>
          <option value="validation">Validation</option>
          <option value="cleansing">Cleansing</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-4 py-2 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Select Prompt</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="draft">Draft</option>
        </select>

        <div className="ml-auto flex items-center gap-2 text-sm text-slate-600">
          <span className="font-semibold">{rules.length}</span>
          <span>rules</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : filteredRules.length === 0 ? (
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
        <div className="space-y-3">
          {filteredRules.map((rule) => (
            <div
              key={rule.id}
              className="bg-white border border-slate-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-semibold text-slate-900">
                        {rule.title}
                      </h4>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium border ${CATEGORY_COLORS[rule.category]}`}
                      >
                        {rule.category}
                      </span>
                      <span
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[rule.status]}`}
                      >
                        {getStatusIcon(rule.status)}
                        {rule.status}
                      </span>
                      {rule.is_system && (
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                          System
                        </span>
                      )}
                    </div>

                    {rule.description && (
                      <p className="text-sm text-slate-600 mb-3">
                        {rule.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>
                        Executed: <strong>{rule.execution_count}</strong> times
                      </span>
                      {rule.last_executed_at && (
                        <span>
                          Last run:{" "}
                          {new Date(rule.last_executed_at).toLocaleDateString()}
                        </span>
                      )}
                      <span>Priority: {rule.priority}</span>
                    </div>
                  </div>

                  <div className="relative">
                    <button
                      onClick={() =>
                        setOpenDropdown(
                          openDropdown === rule.id ? null : rule.id
                        )
                      }
                      className="p-2 hover:bg-slate-100 rounded-md transition-colors"
                    >
                      <MoreVertical className="w-4 h-4 text-slate-600" />
                    </button>

                    {openDropdown === rule.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setOpenDropdown(null)}
                        />
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-md shadow-lg z-20">
                          <button
                            onClick={() => {
                              setSelectedRule(rule);
                              setShowPromptModal(true);
                              setOpenDropdown(null);
                            }}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <Shield className="w-4 h-4" />
                            View Prompt
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRule(rule);
                              setShowEditModal(true);
                              setOpenDropdown(null);
                            }}
                            disabled={rule.is_system}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              handleDuplicate(rule);
                              setOpenDropdown(null);
                            }}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <Copy className="w-4 h-4" />
                            Duplicate
                          </button>
                          <button
                            onClick={() => {
                              handleStatusToggle(rule);
                              setOpenDropdown(null);
                            }}
                            disabled={rule.is_system}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                            {rule.status === "active" ? (
                              <>
                                <AlertCircle className="w-4 h-4" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4" />
                                Activate
                              </>
                            )}
                          </button>
                          <div className="border-t border-slate-200" />
                          <button
                            onClick={() => {
                              setSelectedRule(rule);
                              setShowDeleteModal(true);
                              setOpenDropdown(null);
                            }}
                            disabled={rule.is_system}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-4 pb-4">
                <div className="relative">
                  <div className="bg-slate-50 rounded-md p-3 border border-slate-200 max-h-32 overflow-hidden">
                    <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap">
                      {rule.prompt.substring(0, 300)}
                      {rule.prompt.length > 300 && "..."}
                    </pre>
                  </div>
                  {rule.prompt.length > 300 && (
                    <button
                      onClick={() => {
                        setSelectedRule(rule);
                        setShowPromptModal(true);
                      }}
                      className="absolute bottom-2 right-2 px-2 py-1 bg-white border border-slate-300 rounded text-xs text-blue-600 hover:bg-blue-50"
                    >
                      View Full Prompt
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <AddRuleModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadRules();
          }}
        />
      )}

      {showEditModal && selectedRule && (
        <EditRuleModal
          rule={selectedRule}
          onClose={() => {
            setShowEditModal(false);
            setSelectedRule(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedRule(null);
            loadRules();
          }}
        />
      )}

      {showDeleteModal && selectedRule && (
        <DeleteConfirmModal
          rule={selectedRule}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedRule(null);
          }}
          onConfirm={() => handleDelete(selectedRule)}
        />
      )}

      {showPromptModal && selectedRule && (
        <ViewPromptModal
          rule={selectedRule}
          onClose={() => {
            setShowPromptModal(false);
            setSelectedRule(null);
          }}
        />
      )}
    </div>
  );
}