// import api from '../lib/api';

import api from "../lib/api.ts";

// export interface GlobalMetrics {
//   total_projects: number;
//   active_projects: number;
//   total_products: number;
//   published_products: number;
//   avg_completeness: number;
// }

// export const dashboardService = {
//   async getGlobalMetrics(): Promise<GlobalMetrics> {
//     const { data } = await api.get<GlobalMetrics>('/dashboard/metrics');
//     return data;
//   },

//   async getProjectMetrics(projectId: string) {
//     const { data } = await api.get(`/dashboard/metrics/${projectId}`);
//     return data;
//   }
// };
export interface DashboardStats{
  totalProjects:number
  activeProjects:number
  totalProducts:number
  publishedProducts:number
  catalogHealth:number
}
export const dashboardService={
  async getGlobalMetrics():Promise<DashboardStats>{
    try {
      const {data}=await api.get<DashboardStats>('/dashboard/metrics')
      return data
    } catch (error) {
      console.error("Failed to fetch dashboard metrics",error) 
      return {totalProducts:0,activeProjects:0,totalProjects:0,publishedProducts:0,catalogHealth:0}
    }
  },
  async getProjectMetrics(projectId:string)
  {
    try {
      const {data}=await  api.get(`/dashboard/metrics/${projectId}`)
      return data
    } catch (error) {
      console.error('Failed to fetch project metrics',error)
      return []
    }
  }
}