import api from "../lib/api.ts";
import { ProjectOverview } from "../types/business-rules.types";
import {
  BrandAttributesParams,
  BrandFlowParams,
  CategoryParams,
  DashboardStats,
  DateRangeParams,
  TimelineParams,
} from "../types/business-rules.types.ts";

export const dashboardService = {
  async getGlobalMetrics(params?: DateRangeParams): Promise<DashboardStats> {
    try {
      const { data } = await api.get<DashboardStats>("/dashboard/metrics", {
        params,
      });
      return data;
    } catch (error) {
      console.error("Failed to fetch dashboard metrics", error);
      return {
        totalProducts: 0,
        activeProjects: 0,
        totalProjects: 0,
        publishedProducts: 0,
        catalogHealth: 0,
      };
    }
  },
    async getTaxonomiesList(projectId?: string): Promise<{ taxonomy: string; count: number }[]> {
    try {
      const { data } = await api.get("/dashboard/taxonomies-list", { 
        params: { project_id: projectId } 
      });
      return data || [];
    } catch (error) {
      console.error("Failed to fetch taxonomies list:", error);
      return [];
    }
  },

  async getTaxonomyAttributeMetrics(taxonomy: string, projectId?: string) {
    try {
      const { data } = await api.get("/dashboard/taxonomy-attribute-metrics", { 
        params: { taxonomy, project_id: projectId } 
      });
      return data;
    } catch (error) {
      console.error("Failed to fetch taxonomy attribute metrics:", error);
      return {
        totalProducts: 0,
        totalAttributes: 0,
        avgUniqueValues: 0,
        avgDensity: 0
      };
    }
  },
  async getNeedsAttention(params?: { projectId?: string } & DateRangeParams) {
    const { data } = await api.get("/dashboard/needs-attention", { params });
    return data;
  },

  async getRecentActivity(
    params?: { projectId?: string; limit?: number } & DateRangeParams,
  ) {
    const { data } = await api.get("/dashboard/recent-activity", { params });
    return data;
  },
  async getProjectMetrics(projectId: string, params?: DateRangeParams) {
    try {
      const { data } = await api.get(`/dashboard/metrics/${projectId}`, {
        params,
      });
      return data;
    } catch (error) {
      console.error("Failed to fetch project metrics", error);
      return {
        totalProducts: 0,
        activeProjects: 0,
        totalProjects: 0,
        publishedProducts: 0,
        catalogHealth: 0,
      };
    }
  },

  async getTimeline(params: TimelineParams & DateRangeParams) {
    const { data } = await api.get("/dashboard/timeline", { params });
    return data;
  },
async getAttributeSummary(params?: {
  project_id?: string;
   taxonomy?: string;
  start_date?: string;
  end_date?: string;
}): Promise<any[]> {
  try {
    const { data } = await api.get("/dashboard/attribute-summary", { params });
    return data || [];
  } catch (error: any) {
    console.error("Error fetching attribute summary:", error);
    throw (
      error?.response?.data ||
      error?.message ||
      "Failed to fetch attribute summary"
    );
  }
},
  async getBrandFlow(params: any, limit?: number) {
  const { data } = await api.get("/dashboard/brand-flow", { params: { ...params, limit } });
  return data;
},

  async getBrandAttributes(params: BrandAttributesParams & DateRangeParams) {
    const { data } = await api.get("/dashboard/brand-attributes", { params });
    return data;
  },

  async getCategoryDistribution(params: CategoryParams & DateRangeParams) {
    const { data } = await api.get("/dashboard/category-distribution", {
      params,
    });
    return data;
  },

  async getCategoryFlow(params: CategoryParams & DateRangeParams) {
    const { data } = await api.get("/dashboard/category-flow", { params });
    return data;
  },
async getProjectsOverview(params?: {
  page?: number;
  page_size?: number;
  status?: string;
  search?: string;
}): Promise<{ projects: ProjectOverview[]; total: number; page: number; page_size: number }> {
  const { data } = await api.get("/dashboard/projects-overview", { params });
  return data;
},
  async getCategoryAttributes(params: CategoryParams & DateRangeParams) {
    const { data } = await api.get("/dashboard/category-attributes", {
      params,
    });
    return data;
  },
};
