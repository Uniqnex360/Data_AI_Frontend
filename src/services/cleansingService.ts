import api from "../lib/api.ts";
import { CleansingIssue } from "../types/database.types.ts";
export const cleansingService = {
  async getAllIssues(): Promise<CleansingIssue[]> {
    try {
      const { data } = await api.get<CleansingIssue[]>("/cleansing/issues");
      return data || [];
    } catch (error) {
      console.error("Service Error: Failed to fetch cleansing issues", error);
      return [];
    }
  },
  async runProjectCleaning(projectId: string): Promise<{ task_id: string }> {
  try {
    const response = await api.post(`/cleansing/projects/${projectId}/clean`);
    return response.data;
  } catch (error) {
    console.error('Failed to run project cleaning', error);
    throw new Error('Could not start cleaning process.');
  }
},

async getTaskStatus(taskId: string): Promise<{ status: "pending" | "running" | "completed" | "failed" }> {
  const response = await api.get(`/cleansing/tasks/${taskId}`);
  return response.data;
},
async getTaskLogs(taskId: string): Promise<{ logs: string[] }> {
  const response = await api.get(`/cleansing/tasks/${taskId}/logs`);
  return response.data;
},
async downloadCleanedProject(projectId: string): Promise<Blob> {
  const response = await api.get(`/cleansing/projects/${projectId}/download`, {
    responseType: 'blob',
  });
  return response.data;
},
  async resolveIssue(issueId: string): Promise<void> {
    try {
      await api.post(`/cleansing/resolve/${issueId}`);
    } catch (error) {
      console.error(`Service Error: Failed to resolve issue ${issueId}`, error);
      throw new Error("Could not update issue status.");
    }
  },
};
