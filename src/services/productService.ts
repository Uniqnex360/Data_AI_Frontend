import api from "../lib/api";
import { Product, ProductAttributesViewProps, Project } from "../types/business-rules.types";

export const productService = {
  async getAllProducts(skip = 0, limit = 100): Promise<Product[]> {
    const response = await api.get("/products/", {
      params: { skip, limit },
    });
    return response.data;
  },
async getProjectProductStats(
  projectId: string,
  filters?: {
    brand?: string;
    category?: string;
    search?: string;
    enrichment_status?: string;
    bulk_attributes?: string[];  
  }
): Promise<{
  total: number;
  completed: number;
  pending: number;
  processing: number;
  failed: number;
}> {
  try {
    const params: Record<string, any> = {};
    if (filters?.brand) params.brand_name = filters.brand;
    if (filters?.category) params.category_1 = filters.category;
    if (filters?.search) params.search = filters.search;
    if (filters?.enrichment_status) params.enrichment_status = filters.enrichment_status;
    if (filters?.bulk_attributes && filters.bulk_attributes.length > 0) {
      params.bulk_attributes = filters.bulk_attributes;
    }
    
    const { data } = await api.get(`/products/stats/project/${projectId}`, { params });
    return data;
  } catch (error) {
    console.error("Failed to fetch project product stats", error);
    return {
      total: 0,
      completed: 0,
      pending: 0,
      processing: 0,
      failed: 0,
    };
  }
},

  async getProjectAttributes(
    projectId: string,
    category?: string,
  ): Promise<string[]> {
    try {
      const params: Record<string, string> = { project_id: projectId };
      if (category) {
        params.category = category;
      }

      const { data } = await api.get("/products/attributes", { params });
      return data?.attributes || [];
    } catch (error) {
      console.error("Failed to fetch project attributes", error);
      throw error;
    }
  },

  async getProjectFilters(projectId?: string,brand?:string,category?:string, workflowStage?: string): Promise<{
    categories: string[];
    brands: string[];
  }> {
    try {
      const params: Record<string, string> = {};
       if (projectId) params.project_id = projectId;
    if (brand) params.brand_name = brand;      
    if (category) params.category_1 = category;
    if (workflowStage) params.workflow_stage = workflowStage; 
      const { data } = await api.get("/products/filters", { params });

      return {
        categories: data?.categories || [],
        brands: data?.brands || [],
      };
    } catch (error) {
      console.error("Failed to fetch project filters", error);
      throw error;
    }
  },

  async getProductsByProject(
  projectId: string,
  workflow_stage?: string,
  skip = 0,
  limit = 100,
  filters?: {
    brand?: string;
    category?: string;
    search?: string;
    enrichment_status?: string;
  }
): Promise<{
  products: Product[];
  total: number;
  skip: number;
  limit: number;
  project: Project | null;
}> {
  const params: Record<string, any> = { 
    project_id: projectId, 
    skip, 
    limit, 
    workflow_stage 
  };
  
  if (filters?.brand) params.brand_name = filters.brand;
  if (filters?.category) params.category_1 = filters.category;
  if (filters?.search) params.search = filters.search;
  if (filters?.enrichment_status) params.enrichment_status = filters.enrichment_status;
  
  const response = await api.get("/products/", { params });

  return {
    products: response.data?.products ?? [],
    total: response.data?.total ?? 0,
    skip: response.data?.skip ?? skip,
    limit: response.data?.limit ?? limit,
    project: response.data?.project ?? null,
  };
},

  async getProductByCode(code: string): Promise<Product> {
    const response = await api.get(`/products/${code}`);
    return response.data;
  },

  async aggregate(mpn?: string, upc?: string, title?: string) {
    return api.post("/aggregate/", null, {
      params: { mpn, upc, title },
    });
  },

  async standardize(productCode: string, attributes: ProductAttributesViewProps) {
    return api.post("/standardize/", {
      product_key: productCode,
      data: attributes,
    });
  },

  async enrich(
    productCode: string,
    brand: string,
    category: string,
    attributes: ProductAttributesViewProps,
  ) {
    return api.post("/enrich/", {
      product_key: productCode,
      brand,
      category,
      standardized_attributes: attributes,
    });
  },

  async getBatchStatus(batchId: string) {
    return api.get(`/batch-status/${batchId}`);
  },
};
