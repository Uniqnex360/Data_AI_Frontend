import api from "../lib/api.ts";
import { AggregationJob } from "../types/business-rules.types.ts";
import {
  ProjectWithStats,
  AggregationResponse,
  ProductAggregationResponse,
} from "../types/database.types";

export const aggregationService = {
  async getProjectsWithAggregationStats(): Promise<ProjectWithStats[]> {
    try {
      const { data } = await api.get<ProjectWithStats[]>(
        "/aggregation/projects/stats",
      );
      return data;
    } catch (error) {
      console.error("Failed to fetch projects with stats:", error);
      return [];
    }
  },
 async getJobProgress(jobId: string): Promise<any> {
  try {
    const { data } = await api.get(`/aggregation/job/${jobId}/progress`);
    return data;
  } catch (error) {
    console.error("Failed to get job progress:", error);
    return {
      status: "not_found",
      progress_percentage: 0,
      total_products: 0,
      successful: 0,
      failed: 0,
      current_product: null
    };
  }
},
  async getAllProducts(): Promise<Product[]> {
    try {
      const { data } = await api.get<Product[]>("/products/");
      if (Array.isArray(data)) {
        return data;
      }
      return data.products || [];
    } catch (error) {
      console.error("Failed to fetch products:", error);
      return [];
    }
  },
  async getAggregatedAttributes(
    productId: string,
  ): Promise<AggregatedAttribute[]> {
    try {
      const { data } = await api.get<AggregatedAttribute[]>(
        `/aggregation/attributes/${productId}`,
      );
      return data;
    } catch (error) {
      console.error("Failed to fetch attributes:", error);
      return [];
    }
  },
  async aggregateProject(
    projectId: string,
    llmProvider: string,
    missingLLM?:string
  ): Promise<AggregationResponse> {
    try {
      const { data } = await api.post<AggregationResponse>(
        `/aggregation/project/${projectId}`,
        { llm_provider: llmProvider, missing_llm_provider: missingLLM || null },
      );
      return data;
    } catch (error) {
      console.error("Failed to aggregate project:", error);
      throw new Error("Project aggregation failed");
    }
  },
  async exportSelectedItems(
  projectIds: string[],
  productIds: string[],
): Promise<{ blob: Blob; filename?: string }> {
  try {
    const response = await api.post(
      "/aggregation/export/batch",
      { project_ids: projectIds, product_ids: productIds },
      { responseType: "blob" }
    );

    const disposition = response.headers["content-disposition"] || "";
    const match = disposition.match(/filename\*=UTF-8''(.+)/);
    const filename = match ? decodeURIComponent(match[1]) : undefined;

    return { blob: response.data, filename };
  } catch (error) {
    console.error("Failed to export selected items:", error);
    throw new Error("Export failed");
  }
},
  async aggregateProduct(productId: string, llmProvider: string, missingLlmProvider?: string): Promise<ProductAggregationResponse> {
    try {
      const { data } = await api.post<ProductAggregationResponse>(
        `/aggregation/run/${productId}`,
        { llm_provider: llmProvider,missing_llm_provider: missingLlmProvider || llmProvider }
      );
      return data;
    } catch (error:any) {
      console.error("Failed to aggregate product:", error);
      if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw error
    }
  },
  async getProjectAggregationStatus(
    projectId: string,
  ): Promise<AggregationJob> {
    try {
      const { data } = await api.get<AggregationJob>(
        `/aggregation/project/${projectId}/status`,
      );
      return data;
    } catch (error) {
      console.error("Failed to get aggregation status:", error);
      return {
        id: "",
        project_id: projectId,
        status: "pending",
        total_products: 0,
        successful: 0,
        failed: 0,
        progress_percent: 0,
      };
    }
  },
  async cancelProjectAggregation(
    projectId: string,
  ): Promise<{ status: string; message: string }> {
    const { data } = await api.post<{ status: string; message: string }>(
      `/aggregation/project/${projectId}/cancel`,
    );
    return data;
  },

  async cleanupOldJobs(days: number = 7): Promise<{ deleted_count: number }> {
    const { data } = await api.delete<{ deleted_count: number }>(
      "/aggregation/jobs/cleanup",
      {
        params: { days },
      },
    );
    return data;
  },
  async getProductsWithMovement(projectId:string):Promise<{
    aggregation_products:Product[],
    enrichment_products:Product[],
    completed_products:Array<{
      id:string,
      product_code:string,
      product_name:string,
      completeness_score:number,
      workflow_stage:string,
      moved_to:string
    }>
    last_updated:string
  }>{
    try {
      const { data } = await api.get(`/aggregation/project/${projectId}/products-with-movement`);
      return data
    } catch (error) {
      throw new Error(error)
    }
  },
  async aggregateProductData(
    productId: string,
  ): Promise<ProductAggregationResponse> {
    return this.aggregateProduct(productId);
  },
};
