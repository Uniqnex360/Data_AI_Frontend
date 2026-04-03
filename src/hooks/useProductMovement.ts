import { useEffect, useRef, useState, useCallback } from 'react';
import { productService } from '../services/productService';
import { notify } from '../lib/notifications';

interface UseProductMovementOptions {
  projectId: string | null;
  currentTab: 'aggregation' | 'enrichment';
  onProductsMoved?: () => void;
  enabled?: boolean;
}

export function useProductMovement({ 
  projectId, 
  currentTab, 
  onProductsMoved,
  enabled = true 
}: UseProductMovementOptions) {
  const [processingProductIds, setProcessingProductIds] = useState<Set<string>>(new Set());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const notifiedProducts = useRef<Set<string>>(new Set());

  const trackProcessingProduct = useCallback((productId: string) => {
    setProcessingProductIds(prev => new Set(prev).add(productId));
    notifiedProducts.current.delete(productId);
  }, []);

  const removeTrackingProduct = useCallback((productId: string) => {
    setProcessingProductIds(prev => {
      const updated = new Set(prev);
      updated.delete(productId);
      return updated;
    });
  }, []);

  useEffect(() => {
    if (!enabled || !projectId || processingProductIds.size === 0) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    const checkMovedProducts = async () => {
      try {
        const [aggregationData, enrichmentData] = await Promise.all([
          productService.getProductsByProject(projectId, 'aggregation'),
          productService.getProductsByProject(projectId, 'enrichment'),
        ]);

        const allProducts = [...aggregationData, ...enrichmentData];
        
        for (const productId of processingProductIds) {
          if (notifiedProducts.current.has(productId)) continue;
          
          const product = allProducts.find(p => p.id === productId);
          if (!product) continue;
          
          const isComplete = product.enrichment_status === 'completed';
          if (!isComplete) continue;
          
          const score = product.completeness_score || 0;
          const isInAggregation = aggregationData.some(p => p.id === productId);
          const isInEnrichment = enrichmentData.some(p => p.id === productId);
          
          // ONLY handle CROSS-TAB MOVEMENTS
          if (currentTab === 'aggregation' && !isInAggregation && isInEnrichment && score < 90) {
            notify.info(
              "Moved to Enrichment",
              `${product.product_name || product.product_code} has ${score}% completeness and requires further enrichment.`
            );
            notifiedProducts.current.add(productId);
            onProductsMoved?.();
          } 
          else if (currentTab === 'enrichment' && !isInEnrichment && isInAggregation && score >= 90) {
            notify.success(
              "Ready for Export",
              `${product.product_name || product.product_code} has reached ${score}% completeness and is ready in the Aggregation tab.`
            );
            notifiedProducts.current.add(productId);
            onProductsMoved?.();
          }
        }
        
        const stillProcessing = new Set<string>();
        for (const productId of processingProductIds) {
          const product = allProducts.find(p => p.id === productId);
          if (product && product.enrichment_status === 'processing') {
            stillProcessing.add(productId);
          }
        }
        
        if (stillProcessing.size !== processingProductIds.size) {
          setProcessingProductIds(stillProcessing);
        }
      } catch (error) {
        console.error('Failed to check product movement:', error);
      }
    };

    pollingIntervalRef.current = setInterval(checkMovedProducts, 3000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [projectId, processingProductIds, currentTab, onProductsMoved, enabled]);

  return { 
    trackProcessingProduct, 
    removeTrackingProduct, 
    processingProductIds 
  };
}