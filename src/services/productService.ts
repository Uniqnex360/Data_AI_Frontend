import api from '../lib/api';
import type { Product, ProductAttributes } from '../types/database.types';
export const productService = {
  async getAllProducts(skip = 0, limit = 100): Promise<Product[]> {
    const response = await api.get('/products/', {
      params: { skip, limit }
    });
    return response.data;
  },
  async getProductByCode(code: string): Promise<Product> {
    const response = await api.get(`/products/${code}`);
    return response.data;
  },
  async aggregate(mpn?: string, upc?: string, title?: string) {
    return api.post('/aggregate', null, {
      params: { mpn, upc, title }
    });
  },
  async standardize(productCode: string, attributes: ProductAttributes) {
    return api.post('/standardize', {
      product_key: productCode,
      data: attributes
    });
  },
  async enrich(productCode: string, brand: string, category: string, attributes: ProductAttributes) {
    return api.post('/enrich', {
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