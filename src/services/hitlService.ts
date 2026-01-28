import api from '../lib/api';
import type { ReviewItem } from '../types/database.types';

export type HITLAction = 'approve' | 'reject';

export const hitlService = {
  async getPendingReviews(): Promise<Record<string, ReviewItem[]>> {
    const { data } = await api.get<Record<string, ReviewItem[]>>('/hitl/pending');
    return data;
  },

  async processAction(
    action: HITLAction, 
    productCode: string, 
    attribute: string, 
    reviewer: string
  ): Promise<ReviewItem> {
    const { data } = await api.post<ReviewItem>(`/hitl/${action}`, null, {
      params: { product_key: productCode, attribute, reviewer }
    });
    return data;
  },

  async overrideItem(
    productCode: string, 
    attribute: string, 
    newValue: string | number | boolean, 
    reviewer: string
  ): Promise<ReviewItem> {
    const { data } = await api.post<ReviewItem>('/hitl/override', null, {
      params: { product_key: productCode, attribute, new_value: newValue, reviewer }
    });
    return data;
  }
};