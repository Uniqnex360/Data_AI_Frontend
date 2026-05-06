import api from "../lib/api.ts";
export const cleansingService = {
  async getAllIssues(): Promise<[]> {
    try {
      const { data } = await api.get<[]>("/cleansing/issues");
      return data || [];
    } catch (error) {
      console.error("Service Error: Failed to fetch cleansing issues", error);
      return [];
    }
  },
  async downloadSelected(payload: {
    project_ids?: string;
    product_ids?: string[];
  }): Promise<Blob> {
    const response = await api.post("/cleansing/download-selected", payload, {
      responseType: "blob",
    });
    return response.data;
  },
  async bulkUpdateProductAttributes(payload: {
    product_ids: string[];
    project_id?: string;
    attributes: Record<string, string>;
    llm_provider?: string;
  }): Promise<any> {
    try {
      const { data } = await api.put(
        "/cleansing/products/bulk-attributes",
        payload,
      );
      return data;
    } catch (error) {
      console.error("Failed to bulk update attributes:", error);
      throw new Error("Failed to bulk update attributes");
    }
  },
  async getTaskStatus(
    taskId: string,
  ): Promise<{ status: "pending" | "running" | "completed" | "failed" }> {
    const response = await api.get(`/cleansing/tasks/${taskId}`);
    return response.data;
  },
  async getTaskLogs(taskId: string): Promise<{ logs: string[] }> {
    const response = await api.get(`/cleansing/tasks/${taskId}/logs`);
    return response.data;
  },
  async downloadCleanedProject(projectId: string): Promise<Blob> {
    const response = await api.get(
      `/cleansing/projects/${projectId}/download`,
      {
        responseType: "blob",
      },
    );
    return response.data;
  },
  async runCleaning(
    projectId: string,
    llmProvider: string,
    productIds?: string[],
  ) {
    try {
      const response = await api.post("/cleansing/run", {
        project_id: projectId,
        llm_provider: llmProvider,
        product_ids: productIds || [],
      });
      return response.data;
    } catch (error) {
      console.error("Failed to clean", error);
      throw new Error("Failed to clean attributes");
    }
  },
  async updateProductAttributes(
    productId: string,
    attributes: Record<string, string>,
  ): Promise<any> {
    try {
      const { data } = await api.put(
        `/cleansing/products/${productId}/attributes`,
        {
          attributes: attributes,
        },
      );
      return data;
    } catch (error) {
      console.error("Failed to update product attributes:", error);
      throw new Error("Failed to update attributes");
    }
  },
  async getDataQualityReport(params?: {
  project_id?: string;
  brand_name?: string;
  algorithm?: string;
}): Promise<any[]> {
  try {
    const { data } = await api.get("/reporting/data-quality", { params });
    return data || [];
  } catch (error: any) {
    console.error("Error fetching data quality report:", error);
    throw error?.response?.data || error?.message || "Failed to fetch data quality report";
  }
},

async getEditLogs(params?: {
  project_id?: string;
  product_id?: string;
  brand_name?: string;
  algorithm?: string;
  edit_source?: string;
  limit?: number;
  offset?: number;
}): Promise<any[]> {
  try {
    const { data } = await api.get("/reporting/edit-logs", { params });
    return data || [];
  } catch (error: any) {
    console.error("Error fetching edit logs:", error);
    throw error?.response?.data || error?.message || "Failed to fetch edit logs";
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
