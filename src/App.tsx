import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import {
  BarChart3,
  FileText,
  GitMerge,
  LogOut,
  Shield,
  Sparkles,
  Target,
  Users, // 👈 Add this icon
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
import ReportingTab from "./components/ReportingTab.tsx";
import { ChevronRight, ChevronLeft } from "lucide-react";
import UserManagement from "./components/UserManagement.tsx";

type TabId =
  | "dashboard"
  | "sources"
  | "aggregation"
  | "rules"
  | "enrichment"
  | "golden"
  | "cleaning"
  | "reporting"
  | "users"; // 👈 Add this

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
    roles: ["admin", "user", "viewer"],
  },
  {
    id: "sources",
    label: "Input & Sources",
    icon: FileText,
    component: SourcesTab,
    roles: ["admin", "user", "viewer"],
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
    roles: ["admin", "user", "viewer"],
  },
  {
    id: "cleaning",
    label: "Cleansing & Standardization",
    icon: Sparkles,
    component: DataCleaningTab,
    roles: ["admin", "user", "viewer"],
  },
  {
    id: "enrichment",
    label: "Enrichment",
    icon: Target,
    component: EnrichmentTab,
    roles: ["admin", "user", "viewer"],
  },
  {
    id: "reporting",
    label: "Reporting",
    icon: BarChart3,
    component: ReportingTab,
    roles: ["admin", "user", "viewer"],
  },
  // 👇 ADD THIS - Admin Only Tab
  {
    id: "users",
    label: "User Management",
    icon: Users,
    component: UserManagement,
    roles: ["admin"], // 🔒 Admin only
  },
];

function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [selectedProject, setSelectedProject] = useState<string | undefined>(undefined);
  const [resetKey, setResetKey] = useState(0);
  const [aggregationFilter, setAggregationFilter] = useState<string>("all");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, logout } = useAuth();

  const allowedTabs = tabs.filter(
    (tab) => !tab.roles || (user && tab.roles.includes(user.role)),
  );
  const fallbackTab = allowedTabs[0]?.id || "dashboard";
  const currentTab = allowedTabs.find((t) => t.id === activeTab) ?? allowedTabs[0];
  const ActiveComponent = currentTab?.component;

  const handleProjectSelect = (projectId: string) => {
    setSelectedProject(projectId);
    setActiveTab("sources");
  };

  const handleNavigateToProject = (tab: TabId, projectId: string) => {
    setActiveTab(tab);
    setSelectedProject(projectId);
  };

  const handleDashboardNavigate = (tab: TabId, filterStatus?: string) => {
    const targetTab = allowedTabs.find((t) => t.id === tab);
    if (!targetTab) return;
    setActiveTab(tab);
    if (filterStatus) setAggregationFilter(filterStatus);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col h-screen">
      <header className="bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center">
          <div
            className={`${
              sidebarCollapsed ? "w-16" : "w-48"
            } px-4 py-3 border-r border-slate-200 shrink-0 hidden md:flex items-center justify-center transition-all duration-300`}
          >
            <img
              src={logo}
              alt="Logo"
              className={`${
                sidebarCollapsed ? "h-10 w-10 object-contain" : "w-full h-16 object-cover"
              } transition-all duration-300`}
            />
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
                <p className="text-sm font-medium text-slate-900">{user?.full_name}</p>
                <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
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
        <nav
          className={`${
            sidebarCollapsed ? "w-16" : "w-48"
          } bg-white border-r border-slate-200 shrink-0 hidden md:flex md:flex-col transition-all duration-300 relative`}
        >
          <button
            onClick={() => setSidebarCollapsed((s) => !s)}
            className="absolute -right-3 top-4 z-10 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center hover:bg-slate-50 shadow-sm"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
            )}
          </button>

          <div className="h-full overflow-y-auto p-1.5">
            {allowedTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab?.id === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.id === activeTab) setResetKey((k) => k + 1);
                    setActiveTab(tab.id);
                    if (tab.id === "aggregation") {
                      setAggregationFilter("all");
                      setSelectedProject(undefined);
                    } else if (tab.id !== "sources") {
                      setSelectedProject(undefined);
                    }
                  }}
                  title={sidebarCollapsed ? tab.label : undefined}
                  className={`
                    flex items-center ${sidebarCollapsed ? "justify-center" : "gap-2.5"} 
                    w-full px-3 py-2 text-sm font-medium rounded-lg transition-all mb-1
                    ${isActive
                      ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-4 border-transparent"
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                  {!sidebarCollapsed && (
                    <span className="text-left leading-tight">
                      {tab.label.split(" ").length > 2 ? (
                        <>
                          {tab.label.split(" ").slice(0, Math.ceil(tab.label.split(" ").length / 2)).join(" ")}
                          <br />
                          {tab.label.split(" ").slice(Math.ceil(tab.label.split(" ").length / 2)).join(" ")}
                        </>
                      ) : (
                        tab.label
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        <main className="flex-1 overflow-y-auto bg-slate-50 p-2">
          {ActiveComponent && (
            <ActiveComponent
              key={`${activeTab}-${selectedProject ?? "none"}-${resetKey}`}
              projectId={selectedProject}
              onProjectSelect={
                currentTab?.id === "sources" ? handleProjectSelect : undefined
              }
              onNavigate={handleDashboardNavigate}
              onNavigateToProject={handleNavigateToProject}
              initialFilter={
                currentTab?.id === "aggregation" ? aggregationFilter : undefined
              }
            />
          )}
          {!ActiveComponent && <Navigate to={`/${fallbackTab}`} replace />}
        </main>
      </div>
    </div>
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