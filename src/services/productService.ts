import api from '../lib/api';
import type { Product, ProductAttributes } from '../types/database.types';
export const productService = {
  async getAllProducts(skip = 0, limit = 100): Promise<Product[]> {
    const response = await api.get('/products/', {
      params: { skip, limit }
    });
    return response.data;
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
  async getProductsByProject(projectId: string, skip = 0, limit = 100): Promise<Product[]> {
  const response = await api.get('/products/', {
    params: { project_id: projectId, skip, limit }
  });
  
  if (Array.isArray(response.data)) {
    return response.data;
  }
  
  if (response.data?.products) {
    return response.data.products;
  }
  
  if (response.data?.items) {
    return response.data.items;
  }
  
  return [];
},
  async getProductByCode(code: string): Promise<Product> {
    const response = await api.get(`/products/${code}`);
    return response.data;
  },
  async aggregate(mpn?: string, upc?: string, title?: string) {
    return api.post('/aggregate/', null, {
      params: { mpn, upc, title }
    });
  },
  async standardize(productCode: string, attributes: ProductAttributes) {
    return api.post('/standardize/', {
      product_key: productCode,
      data: attributes
    });
  },
  async enrich(productCode: string, brand: string, category: string, attributes: ProductAttributes) {
    return api.post('/enrich/', {
      product_key: productCode,
      brand,
      category,
      standardized_attributes: attributes
    });
  },
  async getBatchStatus(batchId: string) {
    return api.get(`/batch-status/${batchId}`);
  }
};