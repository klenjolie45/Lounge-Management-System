import React, { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  KeyRound,
  Lock,
  Plus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  CloudSystemState,
  PermissionKey,
  StaffUser,
  SyncOperationType,
  UserRole,
} from '../types/lounge';
import {
  getRoleBadgeLabel,
  hasPermission,
  PERMISSION_LABELS,
  ROLE_DEFAULT_PERMISSIONS,
} from '../utils/formatters';

interface UsersPermissionsViewProps {
  state: CloudSystemState;
  onDispatch: (type: SyncOperationType, payload: any, description: string) => Promise<void>;
  onSwitchUser: (userId: string) => void;
}

export const UsersPermissionsView: React.FC<UsersPermissionsViewProps> = ({
  state,
  onDispatch,
  onSwitchUser,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'matrix'>('users');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);

  // New user form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('bartender');
  const [newPin, setNewPin] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Switch User PIN modal
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const currentUser = useMemo(() => {
    return state.users.find((u) => u.id === state.activeUserId) || state.users[0];
  }, [state.users, state.activeUserId]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPin.trim()) return;

    const user: StaffUser = {
      id: `usr-${Date.now()}`,
      name: newName.trim(),
      email: newEmail.trim() || `${newName.toLowerCase().replace(/\s+/g, '.')}@lounge.internal`,
      phone: newPhone.trim() || '+1 (415) 555-0100',
      role: newRole,
      pin: newPin.trim(),
      password: newPassword.trim() || 'password',
      active: true,
      registrationDate: new Date().toISOString(),
      otpVerified: true,
    };

    await onDispatch(
      'CREATE_STAFF_USER',
      { user },
      `Added staff user ${user.name} (${getRoleBadgeLabel(user.role)})`
    );

    setShowAddUserModal(false);
    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setNewPin('');
    setNewPassword('');
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    await onDispatch(
      'UPDATE_STAFF_USER',
      {
        userId: editingUser.id,
        updates: {
          name: editingUser.name,
          email: editingUser.email,
          role: editingUser.role,
          pin: editingUser.pin,
          active: editingUser.active,
        },
      },
      `Updated staff user ${editingUser.name}`
    );

    setEditingUser(null);
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (state.users.length <= 1) return;
    if (userId === state.activeUserId) {
      alert('Cannot delete the currently active logged-in user.');
      return;
    }
    await onDispatch(
      'DELETE_STAFF_USER',
      { userId },
      `Removed staff user ${name}`
    );
  };

  const handleVerifyAndSwitchPin = (targetUser: StaffUser) => {
    if (pinInput === targetUser.pin) {
      onSwitchUser(targetUser.id);
      setShowSwitchModal(false);
      setPinInput('');
      setPinError('');
    } else {
      setPinError('Incorrect 4-digit PIN for ' + targetUser.name);
    }
  };

  const rolesList: UserRole[] = ['admin', 'manager', 'bartender', 'cashier', 'inventory'];
  const permissionsList = Object.keys(PERMISSION_LABELS) as PermissionKey[];

  return (
    <div className="space-y-6">
      {/* Current User Session Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-amber-300">
            {currentUser?.name?.slice(0, 2).toUpperCase() || 'SA'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-100">{currentUser?.name}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800/80 text-amber-300 font-medium">
                {getRoleBadgeLabel(currentUser?.role || 'admin')}
              </span>
            </div>
            <div className="text-xs text-slate-400">
              Active Terminal Session · PIN: **** · Permissions Active:{' '}
              {currentUser?.role === 'admin'
                ? 'Unrestricted Super-Admin'
                : `${ROLE_DEFAULT_PERMISSIONS[currentUser?.role || 'bartender']?.length} Privileges Granted`}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowSwitchModal(true);
            setPinInput('');
            setPinError('');
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-lg whitespace-nowrap cursor-pointer"
        >
          <KeyRound className="w-3.5 h-3.5 text-amber-400" />
          <span>Switch Staff User / Enter PIN</span>
        </button>
      </div>

      {/* Tabs & Add User Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'users'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Staff Accounts ({state.users.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'matrix'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Role Permissions Matrix</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowAddUserModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg whitespace-nowrap cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* TAB 1: USERS LIST */}
      {activeTab === 'users' && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400 bg-slate-950/60">
                  <th className="py-3 px-4 font-medium">Staff Member</th>
                  <th className="py-3 px-4 font-medium">Assigned Role</th>
                  <th className="py-3 px-4 font-medium">Access PIN</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-xs">
                {state.users.map((u) => {
                  const isActive = u.id === state.activeUserId;
                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-100 flex items-center gap-2">
                          <span>{u.name}</span>
                          {isActive && (
                            <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.2 rounded">
                              Current Login
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-amber-300 font-medium">
                          {getRoleBadgeLabel(u.role)}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-400">
                        {u.pin ? `•••• (${u.pin})` : 'Not set'}
                      </td>
                      <td className="py-3 px-4">
                        {u.active ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="text-slate-500">Disabled</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isActive && (
                            <button
                              type="button"
                              onClick={() => onSwitchUser(u.id)}
                              className="px-2.5 py-1 text-xs text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded cursor-pointer whitespace-nowrap"
                            >
                              Fast Switch
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setEditingUser(JSON.parse(JSON.stringify(u)))}
                            className="px-2.5 py-1 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded cursor-pointer"
                          >
                            Edit
                          </button>
                          {state.users.length > 1 && !isActive && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u.id, u.name)}
                              className="p-1 text-slate-400 hover:text-red-400 cursor-pointer"
                              title="Delete user"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PERMISSIONS MATRIX */}
      {activeTab === 'matrix' && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400 bg-slate-950/60">
                  <th className="py-3 px-4 font-medium min-w-[220px]">
                    System Capability & Privilege
                  </th>
                  {rolesList.map((r) => (
                    <th key={r} className="py-3 px-4 font-medium text-center">
                      {getRoleBadgeLabel(r)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {permissionsList.map((perm) => {
                  const meta = PERMISSION_LABELS[perm];
                  return (
                    <tr key={perm} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-100">{meta.title}</div>
                        <div className="text-[11px] text-slate-400">{meta.description}</div>
                      </td>
                      {rolesList.map((role) => {
                        const isGranted =
                          role === 'admin' || ROLE_DEFAULT_PERMISSIONS[role].includes(perm);
                        return (
                          <td key={role} className="py-3 px-4 text-center">
                            {isGranted ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                                <Check className="w-3 h-3" />
                              </span>
                            ) : (
                              <span className="text-slate-600 font-mono">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Add Staff Member */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <form
            onSubmit={handleCreateUser}
            className="w-full max-w-md rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-semibold text-slate-100">Add Staff Member</h3>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Leo Vance"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="leo@lounge.internal"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">Mobile Phone (OTP)</label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+1 (415) 555-0100"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Portal Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Staff password"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  >
                    <option value="bartender">Lead Bartender</option>
                    <option value="cashier">Server / Cashier</option>
                    <option value="manager">General Manager</option>
                    <option value="inventory">Inventory Steward</option>
                    <option value="admin">Admin / Owner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">4-Digit Access PIN</label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="1234"
                    className="w-full px-3 py-2 font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="px-4 py-2 text-xs text-slate-300 bg-slate-800 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg cursor-pointer"
              >
                Save Staff User
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Edit Staff Member */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <form
            onSubmit={handleUpdateUser}
            className="w-full max-w-md rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-semibold text-slate-100">
                Edit Staff User: {editingUser.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">Role</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, role: e.target.value as UserRole })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  >
                    <option value="bartender">Lead Bartender</option>
                    <option value="cashier">Server / Cashier</option>
                    <option value="manager">General Manager</option>
                    <option value="inventory">Inventory Steward</option>
                    <option value="admin">Admin / Owner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">4-Digit PIN</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={editingUser.pin}
                    onChange={(e) => setEditingUser({ ...editingUser, pin: e.target.value })}
                    className="w-full px-3 py-2 font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="userActive"
                  checked={editingUser.active}
                  onChange={(e) => setEditingUser({ ...editingUser, active: e.target.checked })}
                  className="rounded text-amber-500 bg-slate-950 border-slate-800"
                />
                <label htmlFor="userActive" className="text-slate-300">
                  Account Active (Allowed to log into POS & operational stations)
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-xs text-slate-300 bg-slate-800 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Switch Staff / PIN Pad */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-sm rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-semibold text-slate-100">Switch Staff User</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSwitchModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-400">
                Select your account and verify with your 4-digit PIN:
              </p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {state.users.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => {
                      onSwitchUser(u.id);
                      setShowSwitchModal(false);
                    }}
                    className={`p-2.5 rounded-lg border flex items-center justify-between text-xs cursor-pointer transition-colors ${
                      u.id === state.activeUserId
                        ? 'bg-amber-500/10 border-amber-500/50 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{u.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {getRoleBadgeLabel(u.role)} · PIN: {u.pin}
                      </div>
                    </div>
                    <span className="text-[11px] text-amber-400 font-mono">Select</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowSwitchModal(false)}
                className="px-4 py-2 text-xs text-slate-300 bg-slate-800 rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
