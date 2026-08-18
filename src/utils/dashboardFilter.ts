export type DashboardDateFilter = {
  start_date?: string;
  end_date?: string;
  date_field?: "updated_at" | "created_at";
};

const STORAGE_KEY = "dashboard_date_filter";

export function getDashboardFilter(): DashboardDateFilter {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveDashboardFilter(filter: DashboardDateFilter) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filter));
}

export function dispatchDashboardDateChanged() {
  window.dispatchEvent(new Event("dashboard-date-changed"));
}