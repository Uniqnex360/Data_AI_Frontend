import { useEffect, useState } from "react";
import { userService, User, CreateUserPayload } from "../services/userService";
import { notify } from "../lib/notifications";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import {
  UserPlus, Trash2, Edit, RefreshCw, Shield,
  ShieldOff, Key, X, Check, Search, Loader2
} from "lucide-react";

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const [createForm, setCreateForm] = useState<CreateUserPayload>({
    email: "", full_name: "", password: "", role: "user"
  });

  if (currentUser?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await userService.getAll();
      setUsers(data);
    } catch {
      notify.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await userService.create(createForm);
      notify.success("User created successfully");
      setShowCreateModal(false);
      setCreateForm({ email: "", full_name: "", password: "", role: "user" });
      await loadUsers();
    } catch (err: any) {
      notify.error(err?.response?.data?.detail || "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await userService.update(user.id, { is_active: !user.is_active });
      notify.success(`User ${user.is_active ? "deactivated" : "activated"}`);
      await loadUsers();
    } catch {
      notify.error("Failed to update user");
    }
  };

  const handleToggleRole = async (user: User) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    try {
      await userService.update(user.id, { role: newRole });
      notify.success(`Role changed to ${newRole}`);
      await loadUsers();
    } catch {
      notify.error("Failed to update role");
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Deactivate this user? They will lose access immediately.")) return;
    try {
      await userService.delete(userId);
      notify.success("User deactivated");
      await loadUsers();
    } catch {
      notify.error("Failed to deactivate user");
    }
  };

  const handleResetPassword = async () => {
    if (!showPasswordModal || !newPassword) return;
    setSaving(true);
    try {
      await userService.resetPassword(showPasswordModal, newPassword);
      notify.success("Password reset successfully");
      setShowPasswordModal(null);
      setNewPassword("");
    } catch {
      notify.error("Failed to reset password");
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage platform users and their permissions
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Total</p>
          <p className="text-3xl font-black text-slate-900 mt-1">{users.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Active</p>
          <p className="text-3xl font-black text-emerald-600 mt-1">{users.filter(u => u.is_active).length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Admins</p>
          <p className="text-3xl font-black text-indigo-600 mt-1">{users.filter(u => u.role === "admin").length}</p>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-xs font-black text-slate-500 uppercase tracking-widest">
              <th className="p-4">Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">Role</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </td>
              </tr>
            ) : filteredUsers.map(user => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-sm">
                      {user.full_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-slate-800">{user.full_name}</span>
                  </div>
                </td>
                <td className="p-4 text-sm text-slate-600">{user.email}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${user.role === "admin" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"}`}>
                    {user.role}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${user.is_active ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600"}`}>
                    {user.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-1 justify-end">
                    {user.id !== currentUser?.id && (
                      <button
                        onClick={() => handleToggleRole(user)}
                        title={user.role === "admin" ? "Demote to User" : "Promote to Admin"}
                        className="p-2 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        {user.role === "admin" ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                      </button>
                    )}

                    <button
                      onClick={() => setShowPasswordModal(user.id)}
                      title="Reset Password"
                      className="p-2 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors"
                    >
                      <Key className="w-4 h-4" />
                    </button>

                    {user.id !== currentUser?.id && (
                      <button
                        onClick={() => handleToggleActive(user)}
                        title={user.is_active ? "Deactivate" : "Activate"}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                      >
                        {user.is_active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                      </button>
                    )}

                    {user.id !== currentUser?.id && (
                      <button
                        onClick={() => handleDelete(user.id)}
                        title="Deactivate User"
                        className="p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-slate-900">Create New User</h2>
              <button onClick={() => setShowCreateModal(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  required
                  value={createForm.full_name}
                  onChange={e => setCreateForm(p => ({ ...p, full_name: e.target.value }))}
                  placeholder="John Doe"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
                <input
                  required
                  type="email"
                  value={createForm.email}
                  onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="john@company.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
                <input
                  required
                  type="password"
                  value={createForm.password}
                  onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Min. 8 characters"
                  minLength={5}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Role</label>
                <select
                  value={createForm.role}
                  onChange={e => setCreateForm(p => ({ ...p, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-slate-900">Reset Password</h2>
              <button onClick={() => setShowPasswordModal(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min. 5 characters"
                  minLength={5}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowPasswordModal(null)}
                  className="flex-1 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600">
                  Cancel
                </button>
                <button onClick={handleResetPassword} disabled={saving || !newPassword}
                  className="flex-1 py-2 bg-amber-500 text-white rounded-lg text-sm font-bold hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}