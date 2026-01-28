import { useState, useEffect } from 'react';
import { Users, Shield, Plus, Edit2, Trash2 } from 'lucide-react';
import type { UserRoleRecord, UserRole } from '../types/database.types';
import { userManagementService } from '../services/userManagementService.ts';

export default function UserManagementTab() {
  const [users, setUsers] = useState<UserRoleRecord[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [formData, setFormData] = useState({
    user_id: '',
    role: 'viewer' as UserRole,
    projects: [] as string[]
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data=await userManagementService.loadUsers()
      setUsers(data || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleAddUser = async () => {
    try {
      const permissions = getDefaultPermissions(formData.role);

     await userManagementService.addUser(
      formData.user_id,
      formData.role,
      permissions,
      formData.projects
     )

      setShowAddUser(false);
      setFormData({
        user_id: '',
        role: 'viewer',
        projects: []
      });
      await loadUsers();
    } catch (error) {
      console.error('Failed to add user:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this user?')) return;

    try {
      await userManagementService.deleteUser(userId)
      await loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const getDefaultPermissions = (role: UserRole): Record<string, boolean> => {
    switch (role) {
      case 'admin':
        return {
          manage_users: true,
          manage_projects: true,
          manage_sources: true,
          configure_rules: true,
          validate_products: true,
          publish_products: true,
          view_audit: true
        };
      case 'catalog_manager':
        return {
          manage_users: false,
          manage_projects: true,
          manage_sources: true,
          configure_rules: true,
          validate_products: true,
          publish_products: true,
          view_audit: true
        };
      case 'validator':
        return {
          manage_users: false,
          manage_projects: false,
          manage_sources: false,
          configure_rules: false,
          validate_products: true,
          publish_products: false,
          view_audit: true
        };
      case 'viewer':
        return {
          manage_users: false,
          manage_projects: false,
          manage_sources: false,
          configure_rules: false,
          validate_products: false,
          publish_products: false,
          view_audit: true
        };
      case 'vendor':
        return {
          manage_users: false,
          manage_projects: false,
          manage_sources: true,
          configure_rules: false,
          validate_products: false,
          publish_products: false,
          view_audit: false
        };
      default:
        return {};
    }
  };

  const getRoleBadgeColor = (role: UserRole): string => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-700';
      case 'catalog_manager':
        return 'bg-blue-100 text-blue-700';
      case 'validator':
        return 'bg-green-100 text-green-700';
      case 'viewer':
        return 'bg-slate-100 text-slate-700';
      case 'vendor':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">User & Role Management</h3>
          <p className="text-sm text-slate-600 mt-1">
            Manage user access and permissions
          </p>
        </div>
        <button
          onClick={() => setShowAddUser(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-purple-600 font-medium">Admin</p>
            <Shield className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-900">
            {users.filter(u => u.role === 'admin').length}
          </p>
          <p className="text-xs text-purple-600 mt-1">Full system access</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium mb-2">Catalog Managers</p>
          <p className="text-2xl font-bold text-blue-900">
            {users.filter(u => u.role === 'catalog_manager').length}
          </p>
          <p className="text-xs text-blue-600 mt-1">Project & source management</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium mb-2">Validators</p>
          <p className="text-2xl font-bold text-green-900">
            {users.filter(u => u.role === 'validator').length}
          </p>
          <p className="text-xs text-green-600 mt-1">Review & approval</p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <p className="text-sm text-slate-600 font-medium mb-2">Viewers</p>
          <p className="text-2xl font-bold text-slate-900">
            {users.filter(u => u.role === 'viewer').length}
          </p>
          <p className="text-xs text-slate-600 mt-1">Read-only access</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-600 font-medium mb-2">Vendors</p>
          <p className="text-2xl font-bold text-amber-900">
            {users.filter(u => u.role === 'vendor').length}
          </p>
          <p className="text-xs text-amber-600 mt-1">Data upload only</p>
        </div>
      </div>

      {showAddUser && (
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-slate-900 mb-4">Add New User</h4>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                User ID
              </label>
              <input
                type="text"
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                placeholder="UUID or email"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="admin">Admin</option>
                <option value="catalog_manager">Catalog Manager</option>
                <option value="validator">Validator</option>
                <option value="viewer">Viewer</option>
                <option value="vendor">Vendor</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddUser}
              disabled={!formData.user_id}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Add User
            </button>
            <button
              onClick={() => setShowAddUser(false)}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {users.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
            <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600">No users configured</p>
            <p className="text-sm text-slate-500 mt-1">Add users to manage access</p>
          </div>
        ) : (
          users.map(user => (
            <div
              key={user.id}
              className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-sm text-slate-900">{user.user_id}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                      {user.role.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(user.permissions || {})
                      .filter(([_, enabled]) => enabled)
                      .map(([perm]) => (
                        <span key={perm} className="px-2 py-0.5 bg-slate-50 text-slate-500 border border-slate-100 rounded text-[10px] font-medium">
                          {perm.replace('_', ' ')}
                        </span>
                      ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Added {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteUser(user.user_id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                  title="Remove user"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
