import api from "../lib/api.ts";
import { Enrichment } from '../types/database.types';
export class EnrichmentService{
  async enrichProduct(productId:string)
  {
    try {
      if(!productId)
      {
        throw new Error("Failed to process enrichproduct")
      }
      const {data}=await api.post(`/enrichment/run/${productId}`)
      return data
    } catch (error) {
      console.error("Enrichment Service Error",error)
      throw new Error("AI enrichment failed to process")
    }
  }
  async getEnrichment(productId:string):Promise<Enrichment|null>{
    try {
      const {data}=await api.get<Enrichment>(`/enrichment/${productId}`)
      return data
    } catch (error) {
      console.error('Enrichment status failed',error)
      return null
    }
  }
}
export const enrichmentService=new EnrichmentService()