
import api from "../lib/api.ts";

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
      const {data}=await api.get<DashboardStats>('/dashboard/metrics/')
      return data
    } catch (error) {
      console.error("Failed to fetch dashboard metrics",error) 
      return {totalProducts:0,activeProjects:0,totalProjects:0,publishedProducts:0,catalogHealth:0}
    }
  },
  async getProjectMetrics(projectId:string)
  {
    try {
      const {data}=await  api.get(`/dashboard/metrics/${projectId}/`)
      return data
    } catch (error) {
      console.error('Failed to fetch project metrics',error)
      return []
    }
  }
}