import { useState, useEffect } from 'react';
import { GripVertical, ArrowUp, ArrowDown, Settings, TrendingUp } from 'lucide-react';
import { sourcePriorityService } from '../services/sourcePriorityService';
import { extractionService } from '../services/extractionService';
import type { SourcePriority, Source } from '../types/database.types';

interface Props {
  projectId?: string;
}

interface SourceWithPriority extends Source {
  priority?: SourcePriority;
  metrics?: {
    avgConfidence: number;
    completeness: number;
    totalAttributes: number;
  };z
}

export default function SourcePriorityTab({ projectId }: Props) {
  const [sources, setSources] = useState<SourceWithPriority[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [attributePriorities, setAttributePriorities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (projectId) {
      loadSources();
    }
  }, [projectId]);

  const loadSources = async () => {
    if (!projectId) return;

    setLoading(true);
    try {
      const allSources = await extractionService.getAllSources();
      const priorities = await sourcePriorityService.getProjectPriorities(projectId);

      const sourcesWithData = await Promise.all(
        allSources.map(async (source) => {
          const priority = priorities.find(p => p.source_id === source.id);
          const metrics = await sourcePriorityService.calculateSourceMetrics(source.id);

          return {
            ...source,
            priority,
            metrics
          };
        })
      );

      sourcesWithData.sort((a, b) => {
        const rankA = a.priority?.priority_rank ?? 999;
        const rankB = b.priority?.priority_rank ?? 999;
        return rankA - rankB;
      });

      setSources(sourcesWithData);
    } catch (error) {
      console.error('Failed to load sources:', error);
    } finally {
      setLoading(false);
    }
  };

  const moveSource = async (index: number, direction: 'up' | 'down') => {
    if (!projectId) return;

    const newSources = [...sources];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newSources.length) return;

    [newSources[index], newSources[targetIndex]] = [newSources[targetIndex], newSources[index]];

    const rankings = newSources.map((source, idx) => ({
      sourceId: source.id,
      rank: idx + 1
    }));

    await sourcePriorityService.updatePriorityRanks(projectId, rankings);
    setSources(newSources);
  };

  const toggleAutoSelect = async (sourceId: string, enabled: boolean) => {
    const source = sources.find(s => s.id === sourceId);
    if (!source?.priority) return;

    await sourcePriorityService.updatePriority(source.priority.id, {
      auto_select_enabled: enabled
    });

    await loadSources();
  };

  const updateReliability = async (sourceId: string, score: number) => {
    if (!projectId) return;

    await sourcePriorityService.updateReliabilityScore(sourceId, projectId, score);
    await loadSources();
  };

  const selectSourceForAttributes = (sourceId: string) => {
    const source = sources.find(s => s.id === sourceId);
    if (source?.priority) {
      setSelectedSource(sourceId);
      setAttributePriorities(source.priority.attribute_priorities as Record<string, number> || {});
    }
  };

  const saveAttributePriority = async (attributeName: string, priority: number) => {
    if (!selectedSource) return;

    const source = sources.find(s => s.id === selectedSource);
    if (!source?.priority) return;

    await sourcePriorityService.setAttributePriority(source.priority.id, attributeName, priority);

    setAttributePriorities({
      ...attributePriorities,
      [attributeName]: priority
    });
  };

  if (!projectId) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-slate-600">Select a project to configure source priorities</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-slate-900 mb-1">Source Priority & Auto-Selection</h3>
        <p className="text-sm text-slate-600">
          Configure source ranking and attribute-level priorities
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900">Priority Hierarchy</p>
            <p className="text-xs text-blue-700 mt-1">
              Sources at the top have higher priority. During aggregation, higher priority sources are preferred for conflict resolution.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h4 className="font-semibold text-slate-900 mb-4">Source Rankings</h4>
          <div className="space-y-2">
            {sources.map((source, index) => (
              <div
                key={source.id}
                className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="flex flex-col gap-1 pt-1">
                    <button
                      onClick={() => moveSource(index, 'up')}
                      disabled={index === 0}
                      className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <GripVertical className="w-4 h-4 text-slate-400" />
                    <button
                      onClick={() => moveSource(index, 'down')}
                      disabled={index === sources.length - 1}
                      className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-slate-900">#{index + 1}</span>
                        <span className="font-medium text-slate-900">{source.source_url}</span>
                      </div>
                      <button
                        onClick={() => selectSourceForAttributes(source.id)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="Configure attribute priorities"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-2">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Reliability</p>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={source.priority?.reliability_score || 0.5}
                          onChange={(e) => updateReliability(source.id, parseFloat(e.target.value))}
                          className="w-full"
                        />
                        <p className="text-xs text-slate-600 text-center">
                          {Math.round((source.priority?.reliability_score || 0.5) * 100)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Completeness</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full"
                              style={{ width: `${(source.metrics?.completeness || 0) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-600">
                            {Math.round((source.metrics?.completeness || 0) * 100)}%
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Avg Confidence</p>
                        <p className="text-sm font-medium text-slate-900">
                          {Math.round((source.metrics?.avgConfidence || 0) * 100)}%
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        {source.metrics?.totalAttributes || 0} attributes
                      </span>
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={source.priority?.auto_select_enabled ?? true}
                          onChange={(e) => toggleAutoSelect(source.id, e.target.checked)}
                          className="rounded text-blue-600"
                        />
                        Auto-select
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-slate-900 mb-4">Attribute-Level Priorities</h4>
          {selectedSource ? (
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <p className="text-sm text-slate-600 mb-4">
                Configure which source to prefer for specific attributes
              </p>

              <div className="space-y-3">
                {['title', 'description', 'price', 'dimensions', 'weight', 'images', 'specifications'].map(attr => (
                  <div key={attr} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <span className="text-sm font-medium text-slate-700 capitalize">{attr}</span>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={attributePriorities[attr] || 5}
                      onChange={(e) => saveAttributePriority(attr, parseInt(e.target.value))}
                      className="w-16 px-2 py-1 border border-slate-300 rounded text-sm"
                    />
                  </div>
                ))}
              </div>

              <p className="text-xs text-slate-500 mt-4">
                Higher numbers = higher priority for this attribute
              </p>
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
              <Settings className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">Select a source to configure attribute priorities</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
