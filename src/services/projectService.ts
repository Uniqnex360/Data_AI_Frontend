import api from "../lib/api.ts";
import { Project } from "../types/business-rules.types.ts";

export const projectService = {
  async getAllProjects(params?:{operation_mode?:string,tab?:string,q?: string;
  start_date?: string;
  end_date?: string;
  date_field?: "created_at" | "updated_at";}): Promise<Project[]> {
    try {
      const { data } = await api.get<Project[]>("/projects/",{params});
      return data || [];
    } catch (error) {
      console.error("Failed to fetch projects", error);
      throw error;
    }
  },
  async createProject(project: Partial<Project>): Promise<Project> {
    try {
      const { data } = await api.post<Project>("/projects/", project);
      return data;
    } catch (error) {
      console.error("Failed to create project", error);
      throw error;
    }
  },
 async searchProjects(q: string, operationMode?: string) {
    const params: any = { q };
    if (operationMode) params.operation_mode = operationMode;
    const { data } = await api.get<Project[]>("/projects/", { params });
    return data;
  }
};
