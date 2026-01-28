import { useState, useEffect } from 'react';
import { Send, Plus, Download, ExternalLink } from 'lucide-react';
import { publishingService } from '../services/publishingService';
import { goldenRecordService } from '../services/goldenRecordService';
import type { PublishTarget } from '../types/database.types';

interface Props {
  projectId?: string;
}

export default function PublishingTab({ projectId }: Props) {
  const [targets, setTargets] = useState<PublishTarget[]>([]);
  const [showAddTarget, setShowAddTarget] = useState(false);
  const [publishableCount, setPublishableCount] = useState(0);
  const [formData, setFormData] = useState({
    target_type: 'shopify' as const,
    target_name: ''
  });

  useEffect(() => {
    if (projectId) {
      loadTargets();
      loadPublishableRecords();
    }
  }, [projectId]);

  const loadTargets = async () => {
    if (!projectId) return;

    try {
      const data = await publishingService.getTargets(projectId);
      setTargets(data);
    } catch (error) {
      console.error('Failed to load targets:', error);
    }
  };

  const loadPublishableRecords = async () => {
    try {
      const data = await goldenRecordService.getPublishableRecords();
      setPublishableCount(data.length);
    } catch (error) {
      console.error('Failed to load publishable records:', error);
    }
  };

  const handleCreateTarget = async () => {
    if (!projectId) return;

    try {
      await publishingService.createTarget({
        project_id: projectId,
        target_type: formData.target_type,
        target_name: formData.target_name,
        connection_config: {},
        field_mapping: {},
        active: true
      });

      setShowAddTarget(false);
      await loadTargets();
    } catch (error) {
      console.error('Failed to create target:', error);
    }
  };

  const handleExportCSV = async () => {
    if (!projectId) return;

    try {
      const csv = await publishingService.exportToCSV(projectId);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'catalog-export.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export CSV:', error);
    }
  };

  if (!projectId) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-slate-600">Select a project to configure publishing</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-slate-900">Publishing & Export</h3>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => setShowAddTarget(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Target
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900 font-medium">
          {publishableCount} products ready to publish
        </p>
      </div>

      {showAddTarget && (
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-slate-900 mb-4">Add Publishing Target</h4>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <select
              value={formData.target_type}
              onChange={(e) => setFormData({ ...formData, target_type: e.target.value as any })}
              className="px-3 py-2 border border-slate-300 rounded-md"
            >
              <option value="shopify">Shopify</option>
              <option value="bigcommerce">BigCommerce</option>
              <option value="magento">Magento</option>
              <option value="pim">PIM System</option>
              <option value="marketplace">Marketplace</option>
            </select>
            <input
              type="text"
              value={formData.target_name}
              onChange={(e) => setFormData({ ...formData, target_name: e.target.value })}
              placeholder="Target Name"
              className="px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreateTarget}
              disabled={!formData.target_name}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Create Target
            </button>
            <button
              onClick={() => setShowAddTarget(false)}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {targets.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
            <ExternalLink className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600">No publishing targets configured</p>
          </div>
        ) : (
          targets.map(target => (
            <div key={target.id} className="bg-white border border-slate-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-slate-900">{target.target_name}</h4>
                  <p className="text-sm text-slate-600">{target.target_type}</p>
                </div>
                <button
                  disabled={publishableCount === 0}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  Publish ({publishableCount})
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
