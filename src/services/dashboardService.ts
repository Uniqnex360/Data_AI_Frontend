import api from "../lib/api.ts";
import { BrandAttributesParams, BrandFlowParams, CategoryParams, DashboardStats, TimelineParams } from "../types/business-rules.types.ts";

type DateRangeParams = {
  start_date?: string; // "YYYY-MM-DD" or ISO
  end_date?: string;
  date_field?: "created_at" | "updated_at";
};

export const dashboardService = {
  async getGlobalMetrics(params?: DateRangeParams): Promise<DashboardStats> {
    try {
      const { data } = await api.get<DashboardStats>("/dashboard/metrics", { params });
      return data;
    } catch (error) {
      console.error("Failed to fetch dashboard metrics", error);
      return { totalProducts: 0, activeProjects: 0, totalProjects: 0, publishedProducts: 0, catalogHealth: 0 };
    }
  },
  async getNeedsAttention(params?: { projectId?: string } & DateRangeParams) {
  const { data } = await api.get("/dashboard/needs-attention", { params });
  return data;
},

async getRecentActivity(params?: { projectId?: string; limit?: number } & DateRangeParams) {
  const { data } = await api.get("/dashboard/recent-activity", { params });
  return data;
},
  async getProjectMetrics(projectId: string, params?: DateRangeParams) {
    try {
      const { data } = await api.get(`/dashboard/metrics/${projectId}`, { params });
      return data;
    } catch (error) {
      console.error("Failed to fetch project metrics", error);
      return { totalProducts: 0, activeProjects: 0, totalProjects: 0, publishedProducts: 0, catalogHealth: 0 };
    }
  },

  async getTimeline(params: TimelineParams & DateRangeParams) {
    const { data } = await api.get("/dashboard/timeline", { params });
    return data;
  },

  async getBrandFlow(params: BrandFlowParams & DateRangeParams) {
    const { data } = await api.get("/dashboard/brand-flow", { params });
    return data;
  },

  async getBrandAttributes(params: BrandAttributesParams & DateRangeParams) {
    const { data } = await api.get("/dashboard/brand-attributes", { params });
    return data;
  },

  async getCategoryDistribution(params: CategoryParams   & DateRangeParams) {
    const { data } = await api.get("/dashboard/category-distribution", { params });
    return data;
  },

  async getCategoryFlow(params: CategoryParams & DateRangeParams) {
    const { data } = await api.get("/dashboard/category-flow", { params });
    return data;
  },

  async getCategoryAttributes(params: CategoryParams & DateRangeParams) {
    const { data } = await api.get("/dashboard/category-attributes", { params });
    return data;
  },
};