import api from "../lib/api";
import { PendingValidation, ValidationDecision } from "../types/business-rules.types";

const PDF_VALIDATIONS_BASE = '/pdf-validations';

export const pdfService = {
  async getPending(
    params: { productCode?: string; projectId?: string } = {}
  ): Promise<PendingValidation[]> {
    const res = await api.get<PendingValidation[]>(
      `${PDF_VALIDATIONS_BASE}/pending`,
      {
        params: {
          product_code: params.productCode,
          project_id: params.projectId,
        },
      }
    );

    return res.data;
  },

  async resolve(validationId: string, decision: ValidationDecision): Promise<void> {
    await api.post(`${PDF_VALIDATIONS_BASE}/${validationId}/resolve`, {
      decision,
    });
  },
};