import { useState, useEffect } from 'react';
import { Plus, FolderOpen, Archive } from 'lucide-react';
import { projectService } from '../services/projectService';
import type { Project } from '../types/database.types';

interface Props {
  onProjectSelect?: (projectId: string) => void;
}

export default function ProjectsTab({ onProjectSelect }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    client: '',
    target_platform: 'shopify',
    status: 'draft' as const
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await projectService.getAllProjects();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const handleCreate = async () => {
    try {
      await projectService.createProject({
        ...formData,
        categories: [],
        output_schema: {}
      });
      setShowCreateForm(false);
      await loadProjects();
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-slate-900">Projects</h3>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-slate-900 mb-4">Create New Project</h4>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Project Name"
              className="px-3 py-2 border border-slate-300 rounded-md"
            />
            <input
              type="text"
              value={formData.client}
              onChange={(e) => setFormData({ ...formData, client: e.target.value })}
              placeholder="Client / Brand"
              className="px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!formData.name}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Create Project
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {projects.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
            <FolderOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600">No projects yet</p>
          </div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-slate-900">{project.name}</h4>
                  {project.client && <p className="text-sm text-slate-600">{project.client}</p>}
                </div>
                {onProjectSelect && (
                  <button
                    onClick={() => onProjectSelect(project.id)}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  >
                    Select
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
