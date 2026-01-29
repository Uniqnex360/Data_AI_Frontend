import type { StandardizedAttribute } from '../types/database.types';
import api from '../lib/api';

export const standardizationService = {
  async getStandardizedAttributes(productId: string): Promise<StandardizedAttribute[]> {
    try {
      const { data } = await api.get(`/standardization/${productId}/`);
      
      return (data || []).map((item: any) => ({
        ...item,
        standard_format: item.unit ? `Unit: ${item.unit}` : (item.reason || 'AI Processed'),
        derived_from: Array.isArray(item.derived_from) ? item.derived_from : []
      }));
    } catch (error) {
      console.error('Standardization fetch error:', error);
      return [];
    }
  },

  async performStandardization(productId: string): Promise<void> {
    try {
      await api.post(`/standardization/run/${productId}/`);
    } catch (error) {
      console.error('Standardization run error:', error);
      throw new Error("Failed to run standardization engine.");
    }
  }
};