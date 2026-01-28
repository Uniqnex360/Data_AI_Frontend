import { useState, useEffect } from 'react';
import { Shield, Plus, CheckCircle, XCircle } from 'lucide-react';
import { businessRulesService } from '../services/businessRulesService';
import type { BusinessRule } from '../types/database.types';

export default function BusinessRulesTab() {
  const [rules, setRules] = useState<BusinessRule[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      const data = await businessRulesService.getRules();
      setRules(data);
    } catch (error) {
      console.error('Failed to load rules:', error);
    }
  };

  const getRuleTypeColor = (type: string) => {
    switch (type) {
      case 'validation':
        return 'bg-blue-100 text-blue-700';
      case 'enum':
        return 'bg-purple-100 text-purple-700';
      case 'range':
        return 'bg-green-100 text-green-700';
      case 'format':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Business Rules</h3>
          <p className="text-sm text-slate-600 mt-1">
            Configure validation rules for product attributes
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
                placeholder="e.g., price_positive"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Attribute Name
              </label>
              <input
                type="text"
                placeholder="e.g., price"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Rule Type
              </label>
              <select className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="validation">Validation</option>
                <option value="enum">Enum</option>
                <option value="range">Range</option>
                <option value="format">Format</option>
              </select>
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

      <div className="space-y-3">
        {rules.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
            <Shield className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600">No business rules configured</p>
            <p className="text-sm text-slate-500 mt-1">Add rules to validate product data</p>
          </div>
        ) : (
          rules.map(rule => (
            <div
              key={rule.id}
              className="p-4 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium text-slate-900">{rule.rule_id}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRuleTypeColor(rule.rule_type)}`}>
                      {rule.rule_type}
                    </span>
                    {rule.active ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mb-2">
                    Attribute: <span className="font-mono text-blue-600">{rule.attribute_name}</span>
                  </p>
                  <div className="mt-2 p-2 bg-slate-50 rounded text-xs font-mono text-slate-700">
                    {JSON.stringify(rule.rule_config, null, 2)}
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
