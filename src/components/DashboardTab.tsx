import { useState, useEffect } from 'react';
import { TrendingUp, Package, Activity, BarChart3 } from 'lucide-react';
import { dashboardService } from '../services/dashboardService';
import type { DashboardMetric } from '../types/database.types';

interface Props {
  projectId?: string;
}

export default function DashboardTab({ projectId }: Props) {
  const [metrics, setMetrics] = useState<DashboardMetric[]>([]);
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, [projectId]);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      if (projectId) {
        const data = await dashboardService.getProjectMetrics(projectId);
        setMetrics(data);
      }
      const global = await dashboardService.getGlobalMetrics();
      setGlobalStats(global);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMetricValue = (type: string): number => {
    return metrics.find(m => m.metric_type === type)?.metric_value || 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-600">Loading metrics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-slate-900 mb-1">Dashboard</h3>
        <p className="text-sm text-slate-600">
          Platform-wide metrics and project health overview
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-blue-600 font-medium">Total Projects</p>
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-900">{globalStats?.totalProjects || 0}</p>
          <p className="text-xs text-blue-600 mt-1">
            {globalStats?.activeProjects || 0} active
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-green-600 font-medium">Total Products</p>
            <Package className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-900">{globalStats?.totalProducts || 0}</p>
          <p className="text-xs text-green-600 mt-1">
            {globalStats?.publishedProducts || 0} published
          </p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-purple-600 font-medium">Catalog Health</p>
            <Activity className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-purple-900">
            {projectId ? `${getMetricValue('catalog_health')}%` : 'N/A'}
          </p>
          <p className="text-xs text-purple-600 mt-1">Overall quality score</p>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-orange-600 font-medium">Time Saved</p>
            <TrendingUp className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-orange-900">85%</p>
          <p className="text-xs text-orange-600 mt-1">vs manual processing</p>
        </div>
      </div>

      {projectId && metrics.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-slate-900 mb-4">Processing Pipeline Status</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
              <span className="text-sm font-medium text-slate-700">Products Ingested</span>
              <span className="text-lg font-bold text-slate-900">{getMetricValue('total_products')}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
              <span className="text-sm font-medium text-blue-700">Validation Approved</span>
              <span className="text-lg font-bold text-blue-900">{getMetricValue('validation_approved')}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded">
              <span className="text-sm font-medium text-green-700">Ready for Publish</span>
              <span className="text-lg font-bold text-green-900">{getMetricValue('ready_for_publish')}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded">
              <span className="text-sm font-medium text-purple-700">Published</span>
              <span className="text-lg font-bold text-purple-900">{getMetricValue('published')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
