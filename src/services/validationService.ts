import api from "../lib/api.ts";


export const validationService = {
  async getQueueItems(projectId: string, status?: string): Promise<ValidationQueue[]> {
    try {
      const { data } = await api.get('/hitl/pending', {
        params: { project_id: projectId, status }
      });
      return data || [];
    } catch (error) {
      console.log(`Failed to get queue items, ${projectId}`);
      throw new Error("Failed to get queue items!");
    }
  },

  async updateStatus(queueId: string, status: string, notes?: string): Promise<void> {
    try {
      const action = status === 'approved' ? 'approve' : "reject";
      await api.post(`/hitl/${action}`, null, {
        params: { queue_id: queueId, notes }
      });
    } catch (error) {
      console.log(`Failed to update status of ${queueId}`, error);
      throw new Error("Failed to update status of queue");
    }
  },

  async getQueueStats(projectId: string) {
    try {
      const { data } = await api.get(`/hitl/stats/${projectId}`);
      return data;
    } catch (error) {
      console.error(`Failed to get the queue status of ${projectId}`, error);
      throw new Error("Failed to get the queue status!");
    }
  }
};