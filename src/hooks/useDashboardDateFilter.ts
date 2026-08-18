import { useState, useEffect, useCallback } from "react";
import { getDashboardFilter, DashboardDateFilter, dispatchDashboardDateChanged, saveDashboardFilter } from "../utils/dashboardFilter";

export function useDashboardDateFilter() {
  const [filter, setFilter] = useState<DashboardDateFilter>(getDashboardFilter());

  useEffect(() => {
    const handler = () => setFilter(getDashboardFilter());
    window.addEventListener("dashboard-date-changed", handler);
    return () => window.removeEventListener("dashboard-date-changed", handler);
  }, []);

  const apply = useCallback((f: DashboardDateFilter) => {
    saveDashboardFilter(f);
    setFilter(f);
    dispatchDashboardDateChanged();
  }, []);

  const refresh = useCallback(() => {
    const f = getDashboardFilter();
    setFilter(f);
    return f;
  }, []);

  return { filter, apply, refresh };
}