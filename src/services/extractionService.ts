
import api from "../lib/api.ts";
import { Source } from "../types/database.types.ts";
import { RawExtraction, ExtractionInput } from '../types/database.types';

export const extractionService={
  async extractFromSource(input:ExtractionInput):Promise<any>{
    try {
      const {data}=await api.post('/sources/',input)
      return data
    } catch (error) {
      console.error("Extraction failed",error)
      throw new Error('AI extraction failed to process source')
    }
  },
  
  async batchAggregate(file: File, projectId?: string): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (projectId) {
        formData.append('projectId', projectId);
      }

      const { data } = await api.post('/sources/batch-aggregate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return data;
    } catch (error) {
      console.error("Batch upload failed", error);
      throw error; 
    }
  },
  async getBatchStatus(batchId:string){
    try {
      const { data } = await api.get(`/sources/batch-status/${batchId}`);
    return data; 
    } catch (error) {
      console.error("Failed to get batch status", error);
      throw new Error("Failed to get batch status")
    }
  },
  async download(sourceId: string, type: 'input' | 'output') {
    try {
      const response = await api.get(`/sources/${sourceId}/download`, {
        params: { type: type }, 
        responseType: 'blob',
      });

      const extension = type === 'input' ? 'csv' : 'xlsx';
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `data_ai_${type}_${sourceId}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Download Error", error);
    }
  },
  
  async getSourcesByProject(projectId:string):Promise<Source[]>{
    try {
      const {data}=await api.get(`/sources/project/${projectId}`)
      return data||[]
    } catch (error) {
      console.error("Failed to load project sources",error)
      return []
    }
  },
  
  async getAllSources():Promise<Source[]>{
    try {
      const {data}=await api.get<Source[]>('/sources/')
      return data||[]
    } catch (error) {
      console.error("Failed to fetch sources",error)
      return []
    }
  },
  
  async getRawExtractions(sourceId?:string):Promise<RawExtraction[]>{
    try {
      const {data}=await api.get<RawExtraction[]>('/extraction/',{
        params:{source_id:sourceId}
      })
      return data||[]
    } catch (error) {
      console.error('Failed to fetch extractions',error)
      return []
    }
  },
  async triggerAggregation(sourceId:string){
    try {
      if(!sourceId)throw new Error("Source Id is missing")
      const response=await api.post(`/sources/aggregate/${sourceId}`)
      return response.data
    } catch (error) {
       console.error('Failed to fetch extractions',error)
      return []
    }
  }
}