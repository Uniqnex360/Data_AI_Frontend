import { useState, useEffect } from 'react';
import { FileSearch, Filter } from 'lucide-react';
import type { AuditTrail } from '../types/database.types';
import { auditService } from '../services/auditService';

export default function AuditTrailTab() {
  const [auditLogs, setAuditLogs] = useState<AuditTrail[]>([]);
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAuditTrail();
  }, []);

  const loadAuditTrail = async () => {
    setLoading(true);
    try {
     const data=await auditService.getAuditLogs()

      setAuditLogs(data || []);
    } catch (error) {
      console.error('Failed to load audit trail:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = stageFilter === 'all'
    ? auditLogs
    : auditLogs.filter(log => log.stage === stageFilter);

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'extraction':
        return 'bg-blue-100 text-blue-700';
      case 'aggregation':
        return 'bg-purple-100 text-purple-700';
      case 'cleansing':
        return 'bg-amber-100 text-amber-700';
      case 'standardization':
        return 'bg-green-100 text-green-700';
      case 'enrichment':
        return 'bg-pink-100 text-pink-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const stages = ['all', 'extraction', 'aggregation', 'cleansing', 'standardization', 'enrichment'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Audit Trail</h3>
          <p className="text-sm text-slate-600 mt-1">
            Complete lineage tracking for all processing decisions
          </p>
        </div>
        <button
          onClick={loadAuditTrail}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <Filter className="w-5 h-5 text-slate-600" />
        <span className="text-sm font-medium text-slate-700">Filter by stage:</span>
        <div className="flex gap-2">
          {stages.map(stage => (
            <button
              key={stage}
              onClick={() => setStageFilter(stage)}
              className={`
                px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                ${stageFilter === stage
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                }
              `}
            >
              {stage.charAt(0).toUpperCase() + stage.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
            <FileSearch className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600">No audit logs found</p>
            <p className="text-sm text-slate-500 mt-1">Process some data to see audit trail</p>
          </div>
        ) : (
          filteredLogs.map(log => (
            <div
              key={log.id}
              className="p-4 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStageColor(log.stage)}`}>
                      {log.stage}
                    </span>
                    <span className="text-sm font-medium text-slate-900">
                      {log.attribute_name}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-2">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Selected Value</p>
                      <p className="text-sm text-slate-900 font-mono bg-slate-50 px-2 py-1 rounded">
                        {log.selected_value || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Source</p>
                      <p className="text-sm text-slate-600 font-mono">
                        {log.source_used.slice(0, 16)}{log.source_used.length > 16 ? '...' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="mb-2">
                    <p className="text-xs text-slate-500 mb-1">Reason</p>
                    <p className="text-sm text-slate-700">{log.reason}</p>
                  </div>

                  <p className="text-xs text-slate-500">
                    {new Date(log.logged_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
