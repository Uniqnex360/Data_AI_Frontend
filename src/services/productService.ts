import api from "../lib/api";
import type { Product, ProductAttributes } from "../types/database.types";
import { Project } from '../types/business-rules.types';

export const productService = {
  async getAllProducts(skip = 0, limit = 100): Promise<Product[]> {
    const response = await api.get("/products/", {
      params: { skip, limit },
    });
    return response.data;
  },
  
  async getProjectProductStats(projectId: string): Promise<{
    total: number;
    completed: number;
    pending: number;
    processing: number;
    failed: number;
  }> {
    try {
      const { data } = await api.get(`/products/stats/project/${projectId}`);
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
  
  async getProjectFilters(projectId?: string): Promise<{
    categories: string[];
    brands: string[];
  }> {
    try {
      const params = projectId ? { project_id: projectId } : undefined;

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
    limit = 100
  ): Promise<{
    products: Product[];
    total: number;
    skip: number;
    limit: number;
    project: Project | null;
  }> {
    const response = await api.get("/products/", {
      params: { project_id: projectId, skip, limit, workflow_stage },
    });

    // If the API returns the expected structure
    if (response.data && typeof response.data === 'object' && 'products' in response.data) {
      return {
        products: Array.isArray(response.data.products) ? response.data.products : [],
        total: response.data.total ?? 0,
        skip: response.data.skip ?? skip,
        limit: response.data.limit ?? limit,
        project: response.data.project ?? null,
      };
    }

    // If the API returns an array (legacy format)
    if (Array.isArray(response.data)) {
      return {
        products: response.data,
        total: response.data.length,
        skip,
        limit,
        project: null,
      };
    }

    // Fallback for unexpected response format
    console.warn('Unexpected API response format:', response.data);
    return {
      products: [],
      total: 0,
      skip,
      limit,
      project: null,
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
  
  async standardize(productCode: string, attributes: ProductAttributes) {
    return api.post("/standardize/", {
      product_key: productCode,
      data: attributes,
    });
  },
  
  async enrich(
    productCode: string,
    brand: string,
    category: string,
    attributes: ProductAttributes,
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