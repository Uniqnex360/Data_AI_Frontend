// import { aggregationService } from './aggregationService';
// import { cleansingService } from './cleansingService';
// import { standardizationService } from './standardizationService';
// import { businessRulesService } from './businessRulesService';
// import { enrichmentService } from './enrichmentService';
// import { goldenRecordService } from './goldenRecordService';

import api from "../lib/api.ts";

// export class WorkflowService {
//   async processProductThroughPipeline(productId: string): Promise<void> {
//     try {
//       await aggregationService.aggregateProductData(productId);

//       await cleansingService.performCleansing(productId);

//       await standardizationService.performStandardization(productId);

//       await businessRulesService.validateProduct(productId);

//       await enrichmentService.enrichProduct(productId);

//       await goldenRecordService.generateGoldenRecord(productId);

//       console.log(`Product ${productId} processed successfully through entire pipeline`);
//     } catch (error) {
//       console.error(`Pipeline processing failed for product ${productId}:`, error);
//       throw error;
//     }
//   }

//   async processMultipleProducts(productIds: string[]): Promise<void> {
//     const results = await Promise.allSettled(
//       productIds.map(id => this.processProductThroughPipeline(id))
//     );

//     const successful = results.filter(r => r.status === 'fulfilled').length;
//     const failed = results.filter(r => r.status === 'rejected').length;

//     console.log(`Batch processing complete: ${successful} successful, ${failed} failed`);
//   }
// }

// export const workflowService = new WorkflowService();
export const workflowService={
  async processProductThroughPipeline(productId:string):Promise<void>{
    try {
      await api.post(`/pipeline/process/${productId}`)
      console.log(`Pipeline started for product ${productId}`)
    } catch (error) {
      console.error(`Pipeline failed for product ${productId}`,error)
      throw new Error("Backend pipeline failed to initialize!")
    }
  },
  async processMultipleProducts(productIds:string[]):Promise<void>{
    try {
      await api.post('/pipeline/batch',{product_ids:productIds})
    } catch (error) {
      console.error("Batch processing failed",error)
      throw new Error("Batch processing failed")
    }
  }
}