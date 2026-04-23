import { useCallback, useState } from "react";
import { productService } from "../services/productService";

export function useProjectFilters() {
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [filtersLoading, setFiltersLoading] = useState(false);

  const loadProjectFilters = useCallback(async (projectId?: string,brand?:string,category?:string) => {
    try {
      if (!projectId) {
      setAvailableBrands([]);
      setAvailableCategories([]);
      return;
    }
      setFiltersLoading(true);
      const data = await productService.getProjectFilters(projectId,brand,category);
      setAvailableBrands(data.brands || []);
      setAvailableCategories(data.categories || []);
    } catch (error) {
      console.error("Failed to load project filters:", error);
      setAvailableBrands([]);
      setAvailableCategories([]);
    } finally {
      setFiltersLoading(false);
    }
  }, []);

  const resetProjectFilters = useCallback(() => {
    setAvailableBrands([]);
    setAvailableCategories([]);
  }, []);

  return {
    availableBrands,
    availableCategories,
    filtersLoading,
    loadProjectFilters,
    resetProjectFilters,
  };
}