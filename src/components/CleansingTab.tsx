import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
import { cleansingService } from '../services/cleansingService';
import type { CleansingIssue } from '../types/database.types';

export default function CleansingTab() {
  const [issues, setIssues] = useState<CleansingIssue[]>([]);
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved');

  useEffect(() => {
    loadIssues();
  }, []);

  const loadIssues = async () => {
    try {
      const data = await cleansingService.getAllIssues();
      setIssues(data);
    } catch (error) {
      console.error('Failed to load issues:', error);
    }
  };

  const handleResolve = async (issueId: string) => {
    try {
      await cleansingService.resolveIssue(issueId);
      await loadIssues();
    } catch (error) {
      console.error('Failed to resolve issue:', error);
    }
  };

  const filteredIssues = issues.filter(issue => {
    if (filter === 'resolved') return issue.resolved;
    if (filter === 'unresolved') return !issue.resolved;
    return true;
  });

  const getIssueColor = (type: string) => {
    switch (type) {
      case 'invalid':
        return 'text-red-600 bg-red-100';
      case 'duplicate':
        return 'text-amber-600 bg-amber-100';
      case 'missing':
        return 'text-slate-600 bg-slate-100';
      case 'inconsistent':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-slate-600 bg-slate-100';
    }
  };

  const stats = {
    total: issues.length,
    resolved: issues.filter(i => i.resolved).length,
    unresolved: issues.filter(i => !i.resolved).length
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium mb-1">Total Issues</p>
          <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-600 font-medium mb-1">Unresolved</p>
          <p className="text-2xl font-bold text-amber-900">{stats.unresolved}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium mb-1">Resolved</p>
          <p className="text-2xl font-bold text-green-900">{stats.resolved}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Data Quality Issues</h3>
        <div className="flex gap-2">
          {(['all', 'unresolved', 'resolved'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`
                px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                ${filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                }
              `}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredIssues.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
            <Sparkles className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600">
              {filter === 'unresolved' ? 'No unresolved issues' : 'No issues found'}
            </p>
          </div>
        ) : (
          filteredIssues.map(issue => (
            <div
              key={issue.id}
              className="p-4 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getIssueColor(issue.issue_type)}`}>
                      {issue.issue_type}
                    </span>
                    <span className="text-sm font-medium text-slate-900">
                      {issue.attribute_name}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{issue.details}</p>
                  <p className="text-xs text-slate-500">
                    Detected: {new Date(issue.detected_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {issue.resolved ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">Resolved</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleResolve(issue.id)}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
