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
//   async runProjectCleaning(projectId: string,llm_provider:string): Promise<{ task_id: string }> {
//   try {
//     const response = await api.post(`/cleansing/projects/${projectId}/clean`,{llm_provider:llm_provider});
//     return response.data;
//   } catch (error) {
//     console.error('Failed to run project cleaning', error);
//     throw new Error('Could not start cleaning process.');
//   }
// },
async bulkUpdateProductAttributes(payload: {
  product_ids: string[];
  attribute_name: string;
  attribute_value: string;
}): Promise<any> {
  try {
    const { data } = await api.put("/cleansing/products/bulk-attributes", payload);
    return data;
  } catch (error) {
    console.error("Failed to bulk update attributes:", error);
    throw new Error("Failed to bulk update attributes");
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
// async cleanSingleProduct(productId: string, llmProvider: string): Promise<{ task_id: string }> {
//   try {
//     const response = await api.post(`/cleansing/products/${productId}/clean`, {
//       llm_provider: llmProvider
//     });
//     return response.data;
//   } catch (error) {
//     console.error('Failed to clean product', error);
//     throw new Error('Could not start cleaning process.');
//   }
// },
async runCleaning(projectId: string, llmProvider: string, productIds?: string[]) {
  try {
    const response = await api.post("/cleansing/run", {
    project_id: projectId,
    llm_provider: llmProvider,
    product_ids: productIds || []
  });
  return response.data;
  } catch (error) {
     console.error("Failed to clean", error);
    throw new Error("Failed to clean attributes");
  }
  
},
async updateProductAttributes(productId: string, attributes: Record<string, string>): Promise<any> {
  try {
    const { data } = await api.put(`/cleansing/products/${productId}/attributes`, {
      attributes: attributes
    });
    return data;
  } catch (error) {
    console.error("Failed to update product attributes:", error);
    throw new Error("Failed to update attributes");
  }
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
