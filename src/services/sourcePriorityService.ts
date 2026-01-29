import { SourcePriority } from '../types/database.types';
import api from '../lib/api';
export const sourcePriorityService = {
  async getProjectPriorities(projectId: string): Promise<SourcePriority[]> {
    try {
      const { data } = await api.get(`/sources/priorities/${projectId}/`);
      return data || [];
    } catch (error) {
      console.error(`Failed to fetch project priorities: ${projectId}`, error);
      return [];
    }
  },
  async calculateSourceMetrics(sourceId: string) {
    try {
      const { data } = await api.get(`/sources/${sourceId}/metrics/`);
      return data;
    } catch (error) {
      console.error("Metrics fetch failed", error);
      return { avgConfidence: 0, completeness: 0, totalAttributes: 0 };
    }
  },
  async updatePriority(priorityId: string, updates: Partial<SourcePriority>) {
    await api.patch(`/sources/priorities/${priorityId}/`, updates);
  },
  async updatePriorityRanks(projectId: string, rankings: any[]) {
    await api.post(`/sources/priorities/${projectId}/rank/`, { rankings });
  },
  async setAttributePriority(priorityId: string, attributeName: string, priority: number) {
    await api.post(`/sources/priorities/${priorityId}/attribute/`, {
      attribute_name: attributeName,
      priority_score: priority
    });
  }
};