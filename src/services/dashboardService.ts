import api from "../lib/api.ts";
import { 
  BrandFlowParams, 
  DashboardStats, 
  TimelineParams, 
  BrandAttributesParams,
  CategoryParams 
} from '../types/business-rules.types';

export const dashboardService = {
  async getGlobalMetrics(): Promise<DashboardStats> {
    try {
      const { data } = await api.get<DashboardStats>('/dashboard/metrics'); 
      return data;
    } catch (error) {
      console.error("Failed to fetch dashboard metrics", error); 
      return { totalProducts: 0, activeProjects: 0, totalProjects: 0, publishedProducts: 0, catalogHealth: 0 };
    }
  },
  
  async getProjectMetrics(projectId: string) {
    try {
      const { data } = await api.get(`/dashboard/metrics/${projectId}`); 
      return data;
    } catch (error) {
      console.error('Failed to fetch project metrics', error);
      return { totalProducts: 0, activeProjects: 0, totalProjects: 0, publishedProducts: 0, catalogHealth: 0 };
    }
  },

  async getTimeline(params: TimelineParams) {
    try {
      const { data } = await api.get('/dashboard/timeline', { params });
      return data;
    } catch (error) {
      console.error('Failed to fetch timeline', error);
      return [];
    }
  },

  async getBrandFlow(params: BrandFlowParams) {
    try {
      const { data } = await api.get('/dashboard/brand-flow', { params });
      return data;
    } catch (error) {
      console.error('Failed to fetch brand flow', error);
      return [];
    }
  },

  async getBrandAttributes(params: BrandAttributesParams) {
    try {
      const { data } = await api.get('/dashboard/brand-attributes', { params });
      return data;
    } catch (error) {
      console.error('Failed to fetch brand attributes', error);
      return [];
    }
  },

  // ==========================================
  // CATEGORY WISE ENDPOINTS
  // ==========================================

  async getCategoryDistribution(params: CategoryParams) {
    try {
      const { data } = await api.get('/dashboard/category-distribution', { params });
      return data;
    } catch (error) {
      console.error('Failed to fetch category distribution', error);
      return [];
    }
  },

  async getCategoryFlow(params: CategoryParams) {
    try {
      const { data } = await api.get('/dashboard/category-flow', { params });
      return data;
    } catch (error) {
      console.error('Failed to fetch category flow', error);
      return [];
    }
  },

  async getCategoryAttributes(params: CategoryParams) {
    try {
      const { data } = await api.get('/dashboard/category-attributes', { params });
      return data;
    } catch (error) {
      console.error('Failed to fetch category attributes', error);
      return [];
    }
  }
};