
import { useState, useEffect } from 'react';
import { BarChart3, Database, FileText, GitMerge, Sparkles, CheckCircle, Shield, Target, FileSearch, Eye, Send, TrendingUp, Users } from 'lucide-react';
import DashboardTab from './components/DashboardTab';
import SourcesTab from './components/SourcesTab';
import SourcePriorityTab from './components/SourcePriorityTab';
import AggregationTab from './components/AggregationTab';
import CleansingTab from './components/CleansingTab';
import StandardizationTab from './components/StandardizationTab';
import BusinessRulesTab from './components/BusinessRulesTab';
import EnrichmentTab from './components/EnrichmentTab';
import ValidationTab from './components/ValidationTab';
import GoldenRecordsTab from './components/GoldenRecordsTab';
import PublishingTab from './components/PublishingTab';
import AuditTrailTab from './components/AuditTrailTab';
import UserManagementTab from './components/UserManagementTab';
import { seedBusinessRules } from './utils/seedData';
import { Toaster } from 'sonner';

type TabId = 'dashboard' | 'projects' | 'sources' | 'priority' | 'aggregation' | 'cleansing' | 'standardization' | 'rules' | 'enrichment' | 'validation' | 'golden' | 'publishing' | 'audit' | 'users';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
  component: React.ComponentType<any>;
}

const tabs: Tab[] = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3, component: DashboardTab },
  // { id: 'projects', label: 'Projects', icon: FolderOpen, component: ProjectsTab },
  { id: 'sources', label: 'Input & Sources', icon: FileText, component: SourcesTab },
  { id: 'rules', label: 'Business Rules', icon: Shield, component: BusinessRulesTab },
  { id: 'validation', label: 'Validation', icon: Eye, component: ValidationTab },
  { id: 'priority', label: 'Source Priority', icon: TrendingUp, component: SourcePriorityTab },
  { id: 'aggregation', label: 'Aggregation', icon: GitMerge, component: AggregationTab },
  { id: 'cleansing', label: 'Cleansing', icon: Sparkles, component: CleansingTab },
  { id: 'standardization', label: 'Standardization', icon: CheckCircle, component: StandardizationTab },
  { id: 'enrichment', label: 'Enrichment', icon: Target, component: EnrichmentTab },
  { id: 'golden', label: 'Golden Records', icon: Database, component: GoldenRecordsTab },
  { id: 'publishing', label: 'Publishing', icon: Send, component: PublishingTab },
  { id: 'audit', label: 'Audit Trail', icon: FileSearch, component: AuditTrailTab },
  { id: 'users', label: 'Users', icon: Users, component: UserManagementTab },
];

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [selectedProject, setSelectedProject] = useState<string | undefined>(undefined);
  const [aggregationFilter, setAggregationFilter] = useState<string>('all');

  useEffect(() => {
    seedBusinessRules().catch(console.error);
  }, []);

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  const handleProjectSelect = (projectId: string) => {
    console.log("PROJECTID1111111111", projectId);
    setSelectedProject(projectId);
    setActiveTab('sources');
  };

  const handleDashboardNavigate = (tab: TabId, filterStatus?: string) => {
    setActiveTab(tab);
    if (filterStatus) {
      setAggregationFilter(filterStatus);
    }
  };

  return (
    <>
      <Toaster position='top-right' richColors expand={true} />
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-white border-b border-slate-200 shrink-0">
          <div className="px-6 py-4">
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
        </header>

        <div className="flex flex-1 overflow-hidden">
          <nav className="w-64 bg-white border-r border-slate-200 overflow-y-auto shrink-0 hidden md:flex flex-col">
            <div className="p-2">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      if (tab.id === 'aggregation') setAggregationFilter('all');
                    }}
                    className={`
                      flex items-center gap-3 w-full px-4 py-3 text-sm font-medium rounded-lg transition-all mb-1
                      ${isActive
                        ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-4 border-transparent'
                      }
                    `}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
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
                  onProjectSelect={activeTab === 'sources' ? handleProjectSelect : undefined}
                  onNavigate={activeTab === 'dashboard' ? handleDashboardNavigate : undefined}
                  initialFilter={activeTab === 'aggregation' ? aggregationFilter : undefined}
                />
              )}
          </main>
        </div>
      </div>
    </>
  );
}

export default App;