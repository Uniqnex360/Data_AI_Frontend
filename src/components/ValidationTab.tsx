import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Flag, Eye } from 'lucide-react';
import { validationService } from '../services/validationService';
import type { ValidationQueue } from '../types/database.types';

interface Props {
  projectId?: string;
}

export default function ValidationTab({ projectId }: Props) {
  const [queueItems, setQueueItems] = useState<ValidationQueue[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('pending');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (projectId) {
      loadQueue();
      loadStats();
    }
  }, [projectId, selectedStatus]);

  const loadQueue = async () => {
    if (!projectId) return;

    try {
      const data = await validationService.getQueueItems(projectId, selectedStatus === 'all' ? undefined : selectedStatus);
      setQueueItems(data);
    } catch (error) {
      console.error('Failed to load validation queue:', error);
    }
  };

  const loadStats = async () => {
    if (!projectId) return;

    try {
      const data = await validationService.getQueueStats(projectId);
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleApprove = async (queueId: string) => {
    try {
      await validationService.updateStatus(queueId, 'approved');
      await loadQueue();
      await loadStats();
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  };

  if (!projectId) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-slate-600">Select a project to view validation queue</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-slate-900">Validation & Review</h3>

      {stats && (
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-sm text-slate-600 font-medium mb-1">Total</p>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-600 font-medium mb-1">Pending</p>
            <p className="text-2xl font-bold text-amber-900">{stats.pending}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-600 font-medium mb-1">Approved</p>
            <p className="text-2xl font-bold text-green-900">{stats.approved}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600 font-medium mb-1">Rejected</p>
            <p className="text-2xl font-bold text-red-900">{stats.rejected}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-600 font-medium mb-1">In Review</p>
            <p className="text-2xl font-bold text-blue-900">{stats.in_review}</p>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {['all', 'pending', 'approved', 'rejected'].map(status => (
          <button
            key={status}
            onClick={() => setSelectedStatus(status)}
            className={`
              px-3 py-1.5 rounded-md text-sm font-medium
              ${selectedStatus === status
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }
            `}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {queueItems.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
            <Eye className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600">No items in {selectedStatus} status</p>
          </div>
        ) : (
          queueItems.map(item => (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-sm">Product: {item.product_id.slice(0, 8)}</p>
                  <p className="text-sm text-slate-600">Status: {item.status}</p>
                </div>
                {item.status === 'pending' && (
                  <button
                    onClick={() => handleApprove(item.id)}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                  >
                    Approve
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
