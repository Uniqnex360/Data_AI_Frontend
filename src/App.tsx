import { useState, useEffect } from 'react';
import { BarChart3, FolderOpen, Database, FileText, GitMerge, Sparkles, CheckCircle, Shield, Target, FileSearch, Eye, Send, TrendingUp, Users } from 'lucide-react';
import DashboardTab from './components/DashboardTab';
import ProjectsTab from './components/ProjectsTab';
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

type TabId = 'dashboard' | 'projects' | 'sources' | 'priority' | 'aggregation' | 'cleansing' | 'standardization' | 'rules' | 'enrichment' | 'validation' | 'golden' | 'publishing' | 'audit' | 'users';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
  component: React.ComponentType<any>;
}

const tabs: Tab[] = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3, component: DashboardTab },
  { id: 'projects', label: 'Projects', icon: FolderOpen, component: ProjectsTab },
  { id: 'sources', label: 'Sources', icon: FileText, component: SourcesTab },
  { id: 'priority', label: 'Source Priority', icon: TrendingUp, component: SourcePriorityTab },
  { id: 'aggregation', label: 'Aggregation', icon: GitMerge, component: AggregationTab },
  { id: 'cleansing', label: 'Cleansing', icon: Sparkles, component: CleansingTab },
  { id: 'standardization', label: 'Standardization', icon: CheckCircle, component: StandardizationTab },
  { id: 'rules', label: 'Business Rules', icon: Shield, component: BusinessRulesTab },
  { id: 'enrichment', label: 'Enrichment', icon: Target, component: EnrichmentTab },
  { id: 'validation', label: 'Validation', icon: Eye, component: ValidationTab },
  { id: 'golden', label: 'Golden Records', icon: Database, component: GoldenRecordsTab },
  { id: 'publishing', label: 'Publishing', icon: Send, component: PublishingTab },
  { id: 'audit', label: 'Audit Trail', icon: FileSearch, component: AuditTrailTab },
  { id: 'users', label: 'Users', icon: Users, component: UserManagementTab },
];

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [selectedProject, setSelectedProject] = useState<string | undefined>(undefined);

  useEffect(() => {
    seedBusinessRules().catch(console.error);
  }, []);

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  const handleProjectSelect = (projectId: string) => {
    setSelectedProject(projectId);
    setActiveTab('sources');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
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

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200 overflow-x-auto">
            <nav className="flex">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                      ${isActive
                        ? 'border-blue-600 text-blue-600 bg-blue-50'
                        : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {ActiveComponent && (
              <ActiveComponent
                projectId={selectedProject}
                onProjectSelect={activeTab === 'projects' ? handleProjectSelect : undefined}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
