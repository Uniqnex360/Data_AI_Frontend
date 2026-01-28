// import { supabase } from '../lib/supabase';
// import type { Project } from '../types/database.types';

import api from "../lib/api.ts";

// export class ProjectService {
//   async getAllProjects(): Promise<Project[]> {
//     const { data, error } = await supabase
//       .from('projects')
//       .select('*')
//       .order('created_at', { ascending: false });

//     if (error) throw error;
//     return data || [];
//   }

//   async createProject(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> {
//     const { data, error } = await supabase
//       .from('projects')
//       .insert(project)
//       .select()
//       .maybeSingle();

//     if (error) throw error;
//     return data!;
//   }

//   async archiveProject(id: string): Promise<void> {
//     await supabase
//       .from('projects')
//       .update({ status: 'archived' })
//       .eq('id', id);
//   }
// }

// export const projectService = new ProjectService();

export const projectService={
  async getAllProjects():Promise<Project[]>{
    try {
      const { data } = await api.get<Project[]>('/projects');
      return data||[]
        
    } catch (error) {
      console.error("Failed to fetch projects",error)
      return []
    }
  },
  async createProject(project:Partial<Project>):Promise<Project>{
    try {
      const {data}=await api.post<Project>('/projects',project)
      return data
    } catch (error) {
      console.error('Failed to create project',error)
      throw new Error("Failed to create project")
    }
  }
}