import { useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Database,
  FileText,
  GitMerge,
  Sparkles,
  Shield,
  Target,
  LogOut,
} from "lucide-react";

import DashboardTab from "./components/DashboardTab";
import SourcesTab from "./components/SourcesTab";
import AggregationTab from "./components/AggregationTab";
import BusinessRulesTab from "./components/BusinessRulesTab";
import EnrichmentTab from "./components/EnrichmentTab";
import DataCleaningTab from "./components/DataCleaningTab";


import RequireAuth from "./components/RequireAuth";
import { AuthProvider, useAuth } from "./context/AuthContext";

import { Toaster } from "sonner";
import logo from "./logo/logo.png";
import LoginPage from "./components/LoginPage.tsx";
import RegisterPage from "./components/RegisterPage.tsx";
import UnauthorizedPage from "./components/UnauthorizedPage.tsx";

type TabId =
  | "dashboard"
  | "sources"
  | "aggregation"
  | "rules"
  | "enrichment"
  | "golden"
  | "datacleaning";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
  component: React.ComponentType<any>;
  roles?: string[];
}

const tabs: Tab[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: BarChart3,
    component: DashboardTab,
    roles: ["admin", "editor", "viewer"],
  },
  {
    id: "sources",
    label: "Input & Sources",
    icon: FileText,
    component: SourcesTab,
    roles: ["admin", "editor", "viewer"],
  },
  {
    id: "rules",
    label: "Business Rules",
    icon: Shield,
    component: BusinessRulesTab,
    roles: ["admin"],
  },
  {
    id: "aggregation",
    label: "Aggregation",
    icon: GitMerge,
    component: AggregationTab,
    roles: ["admin", "editor", "viewer"],
  },
  {
    id: "datacleaning",
    label: "Data Cleaning",
    icon: Sparkles,
    component: DataCleaningTab,
    roles: ["admin", "editor", "viewer"],
  },
  {
    id: "enrichment",
    label: "Enrichment",
    icon: Target,
    component: EnrichmentTab,
    roles: ["admin", "editor", "viewer"],
  },
  // {
  //   id: "golden",
  //   label: "Golden Records",
  //   icon: Database,
  //   component: GoldenRecordsTab,
  //   roles: ["admin", "editor", "viewer"],
  // },
];

function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [selectedProject, setSelectedProject] = useState<string | undefined>(
    undefined,
  );
  const [aggregationFilter, setAggregationFilter] = useState<string>("all");

  const { user, logout } = useAuth();

  const allowedTabs = tabs.filter(
    (tab) => !tab.roles || (user && tab.roles.includes(user.role)),
  );

  const fallbackTab = allowedTabs[0]?.id || "dashboard";

  const currentTab =
    allowedTabs.find((t) => t.id === activeTab) ?? allowedTabs[0];

  const ActiveComponent = currentTab?.component;

  const handleProjectSelect = (projectId: string) => {
    setSelectedProject(projectId);
    setActiveTab("sources");
  };

  const handleDashboardNavigate = (tab: TabId, filterStatus?: string) => {
    const targetTab = allowedTabs.find((t) => t.id === tab);
    if (!targetTab) return;
    setActiveTab(tab);
    if (filterStatus) {
      setAggregationFilter(filterStatus);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-center">
            <div className="w-64 px-6 py-4 border-r border-slate-200 shrink-0 hidden md:flex items-center">
              <img src={logo} alt="Logo" className="w-full h-16 object-cover" />
            </div>

            <div className="flex-1 px-6 py-4 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">
                  Product Intelligence & Catalog Automation
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  Enterprise catalog management with AI-powered data processing
                </p>
                {selectedProject && (
                  <div className="mt-2">
                    <button
                      onClick={() => setSelectedProject(undefined)}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Clear Project Selection
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-900">
                    {user?.full_name}
                  </p>
                  <p className="text-xs text-slate-500 capitalize">
                    {user?.role}
                  </p>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <nav className="w-64 bg-white border-r border-slate-200 overflow-y-auto shrink-0 hidden md:flex flex-col">
            <div className="p-2">
              {allowedTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = currentTab?.id === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      if (tab.id === "aggregation") setAggregationFilter("all");
                    }}
                    className={`
                      flex items-center gap-3 w-full px-4 py-3 text-sm font-medium rounded-lg transition-all mb-1
                      ${
                        isActive
                          ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-4 border-transparent"
                      }
                    `}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? "text-blue-600" : "text-slate-400"
                      }`}
                    />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </nav>

          <main className="flex-1 overflow-y-auto bg-slate-50 p-2">
            {ActiveComponent && (
              <ActiveComponent
                projectId={selectedProject}
                onProjectSelect={
                  currentTab?.id === "sources" ? handleProjectSelect : undefined
                }
                onNavigate={
                  currentTab?.id === "dashboard"
                    ? handleDashboardNavigate
                    : undefined
                }
                initialFilter={
                  currentTab?.id === "aggregation"
                    ? aggregationFilter
                    : undefined
                }
              />
            )}
            {!ActiveComponent && <Navigate to={`/${fallbackTab}`} replace />}
          </main>
        </div>
      </div>
    </>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route
        path="/*"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" richColors expand={true} />
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;