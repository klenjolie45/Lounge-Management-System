import React, { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Filter,
  KeyRound,
  Lock,
  Plus,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  CloudSystemState,
  PermissionDefinition,
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
  const [showAddPermissionModal, setShowAddPermissionModal] = useState(false);
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);

  // New user form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('bartender');
  const [newPin, setNewPin] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // New custom permission form state
  const [newPermTitle, setNewPermTitle] = useState('');
  const [newPermKey, setNewPermKey] = useState('');
  const [newPermKeyEdited, setNewPermKeyEdited] = useState(false);
  const [newPermDesc, setNewPermDesc] = useState('');
  const [newPermCategory, setNewPermCategory] = useState('Service & Bar');
  const [newPermRoles, setNewPermRoles] = useState<UserRole[]>(['manager', 'bartender']);
  const [permFormError, setPermFormError] = useState('');

  // Matrix filter state
  const [matrixSearch, setMatrixSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Switch User modal state
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const currentUser = useMemo(() => {
    return state.users.find((u) => u.id === state.activeUserId) || state.users[0];
  }, [state.users, state.activeUserId]);

  const rolesList: UserRole[] = ['admin', 'manager', 'bartender', 'cashier', 'inventory'];

  // Current active role permissions map
  const activeRolePermissions = useMemo<Record<UserRole, string[]>>(() => {
    if (state.settings?.rolePermissions) {
      return state.settings.rolePermissions;
    }
    return JSON.parse(JSON.stringify(ROLE_DEFAULT_PERMISSIONS));
  }, [state.settings?.rolePermissions]);

  // Combined standard + custom permissions
  const allPermissions = useMemo<PermissionDefinition[]>(() => {
    const standard: PermissionDefinition[] = (Object.keys(PERMISSION_LABELS) as PermissionKey[]).map(
      (key) => {
        let cat = 'Point of Sale';
        if (key.startsWith('inventory_') || key === 'recipe_edit' || key === 'purchase_orders_manage') {
          cat = 'Inventory & Supply';
        } else if (key === 'analytics_view' || key === 'eod_closeout') {
          cat = 'Financial & Auditing';
        } else if (key === 'crm_manage') {
          cat = 'Customer & Hospitality';
        } else if (key === 'manage_users' || key === 'system_settings') {
          cat = 'Administration & Security';
        }
        return {
          key,
          title: PERMISSION_LABELS[key].title,
          description: PERMISSION_LABELS[key].description,
          category: cat,
          isCustom: false,
        };
      }
    );

    const custom: PermissionDefinition[] = (state.settings?.customPermissions || []).map((cp) => ({
      ...cp,
      category: cp.category || 'Custom Privileges',
      isCustom: true,
    }));

    return [...standard, ...custom];
  }, [state.settings?.customPermissions]);

  // Categories list for filter
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    allPermissions.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [allPermissions]);

  // Filtered permissions for matrix display
  const filteredPermissions = useMemo(() => {
    return allPermissions.filter((p) => {
      const matchesSearch =
        p.title.toLowerCase().includes(matrixSearch.toLowerCase()) ||
        p.description.toLowerCase().includes(matrixSearch.toLowerCase()) ||
        p.key.toLowerCase().includes(matrixSearch.toLowerCase());
      const matchesCategory =
        selectedCategory === 'all' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [allPermissions, matrixSearch, selectedCategory]);

  // Handle title input change for custom permission with auto-slug
  const handleTitleChange = (val: string) => {
    setNewPermTitle(val);
    if (!newPermKeyEdited) {
      const slug = val
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      setNewPermKey(slug);
    }
  };

  // Toggle permission for a role in editable matrix
  const handleToggleRolePermission = async (role: UserRole, permKey: string) => {
    if (role === 'admin') return; // Admin is always super-admin

    const currentMap = JSON.parse(JSON.stringify(activeRolePermissions)) as Record<UserRole, string[]>;
    const roleKeys = currentMap[role] || [];
    const isGranted = roleKeys.includes(permKey);

    const updatedRoleKeys = isGranted
      ? roleKeys.filter((k: string) => k !== permKey)
      : [...roleKeys, permKey];

    currentMap[role] = updatedRoleKeys;

    const roleName = getRoleBadgeLabel(role);
    const meta = allPermissions.find((p) => p.key === permKey);
    const permName = meta ? meta.title : permKey;

    await onDispatch(
      'UPDATE_ROLE_PERMISSIONS',
      { rolePermissions: currentMap },
      `${isGranted ? 'Revoked' : 'Granted'} "${permName}" for ${roleName}`
    );
  };

  // Batch toggle: Grant All for role
  const handleGrantAllForRole = async (role: UserRole) => {
    if (role === 'admin') return;
    const currentMap = JSON.parse(JSON.stringify(activeRolePermissions)) as Record<UserRole, string[]>;
    currentMap[role] = allPermissions.map((p) => p.key);

    await onDispatch(
      'UPDATE_ROLE_PERMISSIONS',
      { rolePermissions: currentMap },
      `Granted all capabilities to ${getRoleBadgeLabel(role)}`
    );
  };

  // Batch toggle: Revoke All for role
  const handleRevokeAllForRole = async (role: UserRole) => {
    if (role === 'admin') return;
    const currentMap = JSON.parse(JSON.stringify(activeRolePermissions)) as Record<UserRole, string[]>;
    currentMap[role] = [];

    await onDispatch(
      'UPDATE_ROLE_PERMISSIONS',
      { rolePermissions: currentMap },
      `Revoked all capabilities from ${getRoleBadgeLabel(role)}`
    );
  };

  // Reset to default factory permissions
  const handleResetToDefaultPermissions = async () => {
    if (
      !confirm(
        'Reset all roles to factory standard permissions? Custom permissions will remain in the catalog.'
      )
    ) {
      return;
    }
    await onDispatch(
      'UPDATE_ROLE_PERMISSIONS',
      { rolePermissions: JSON.parse(JSON.stringify(ROLE_DEFAULT_PERMISSIONS)) },
      'Reset all role access controls to standard system defaults'
    );
  };

  // Add new custom permission
  const handleCreateCustomPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    setPermFormError('');

    const titleTrimmed = newPermTitle.trim();
    const keyTrimmed = newPermKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

    if (!titleTrimmed) {
      setPermFormError('Please enter a permission title.');
      return;
    }

    if (!keyTrimmed) {
      setPermFormError('Please enter a valid unique permission key.');
      return;
    }

    const alreadyExists = allPermissions.some((p) => p.key === keyTrimmed);
    if (alreadyExists) {
      setPermFormError(`The permission identifier "${keyTrimmed}" is already in use. Please choose another.`);
      return;
    }

    const permission: PermissionDefinition = {
      key: keyTrimmed,
      title: titleTrimmed,
      description: newPermDesc.trim() || `Operational capability for ${titleTrimmed}`,
      category: newPermCategory.trim() || 'Custom Privileges',
      isCustom: true,
    };

    await onDispatch(
      'CREATE_CUSTOM_PERMISSION',
      {
        permission,
        assignedRoles: newPermRoles,
      },
      `Created custom permission "${permission.title}" (${permission.key})`
    );

    setShowAddPermissionModal(false);
    setNewPermTitle('');
    setNewPermKey('');
    setNewPermKeyEdited(false);
    setNewPermDesc('');
    setNewPermCategory('Service & Bar');
    setNewPermRoles(['manager', 'bartender']);
  };

  // Delete custom permission
  const handleDeleteCustomPermission = async (permKey: string, permTitle: string) => {
    if (
      !confirm(`Are you sure you want to delete "${permTitle}"? It will be removed from all assigned roles.`)
    ) {
      return;
    }

    await onDispatch(
      'DELETE_CUSTOM_PERMISSION',
      { permissionKey: permKey },
      `Deleted custom permission "${permTitle}"`
    );
  };

  // Staff User Handlers
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPin.trim()) return;

    const user: StaffUser = {
      id: `usr-${Date.now()}`,
      name: newName.trim(),
      email: newEmail.trim() || `${newName.toLowerCase().replace(/\s+/g, '.')}@lounge.internal`,
      phone: newPhone.trim() || '+234 801 234 5678',
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

  const activePermsCount =
    currentUser?.role === 'admin'
      ? allPermissions.length
      : (activeRolePermissions[currentUser?.role || 'bartender'] || []).length;

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
              Active Terminal Session · PIN: •••• · Active Permissions:{' '}
              {currentUser?.role === 'admin' ? (
                <span className="text-amber-300 font-medium">Unrestricted Super-Admin</span>
              ) : (
                <span className="text-emerald-400 font-medium font-mono tabular-nums">
                  {activePermsCount} of {allPermissions.length} Privileges Granted
                </span>
              )}
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
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-lg whitespace-nowrap cursor-pointer transition-colors"
        >
          <KeyRound className="w-3.5 h-3.5 text-amber-400" />
          <span>Switch Staff User / Enter PIN</span>
        </button>
      </div>

      {/* Tabs & Header Actions */}
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
            <span>Editable Permissions Matrix ({allPermissions.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'matrix' ? (
            <>
              <button
                type="button"
                onClick={handleResetToDefaultPermissions}
                title="Reset matrix to standard system defaults"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg whitespace-nowrap cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Reset Defaults</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAddPermissionModal(true);
                  setPermFormError('');
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg whitespace-nowrap cursor-pointer shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Permission</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddUserModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg whitespace-nowrap cursor-pointer shadow-xs transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Staff Member</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: USERS LIST */}
      {activeTab === 'users' && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xs">
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
                            <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.2 rounded font-mono">
                              Active Session
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-200 border border-slate-700">
                          {getRoleBadgeLabel(u.role)}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {u.pin ? `•••• (${u.pin})` : 'Not set'}
                      </td>
                      <td className="py-3 px-4">
                        {u.active ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                            <UserCheck className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-medium">Suspended</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingUser(u)}
                          className="px-2.5 py-1 text-slate-300 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-[11px] cursor-pointer"
                        >
                          Edit Profile
                        </button>
                        {state.users.length > 1 && u.id !== state.activeUserId && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            className="px-2 py-1 text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-950/50 border border-rose-800/40 rounded text-[11px] cursor-pointer"
                            title="Remove staff account"
                          >
                            <Trash2 className="w-3 h-3 inline" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: EDITABLE PERMISSIONS MATRIX */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          {/* Matrix Controls & Search */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Role-Based Access Control (RBAC) Matrix</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Click any cell to grant or revoke specific privileges. Super-Admin maintains full unrestricted access.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={matrixSearch}
                    onChange={(e) => setMatrixSearch(e.target.value)}
                    placeholder="Search privileges..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 w-44 sm:w-56"
                  />
                  {matrixSearch && (
                    <button
                      type="button"
                      onClick={() => setMatrixSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">All Categories ({allPermissions.length})</option>
                  {categoriesList.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Role Legend / Batch Actions */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-3.5 h-3.5 rounded bg-emerald-950/80 border border-emerald-700 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-emerald-400" />
                  </span>
                  Granted
                </span>
                <span className="flex items-center gap-1 text-slate-500">
                  <span className="w-3.5 h-3.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-center font-mono">
                    —
                  </span>
                  Restricted
                </span>
                <span className="flex items-center gap-1 text-amber-300">
                  <Lock className="w-3 h-3 text-amber-400" />
                  Admin Locked
                </span>
              </div>

              <div className="text-slate-500 font-mono">
                Showing {filteredPermissions.length} of {allPermissions.length} privileges
              </div>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] text-slate-400 bg-slate-950/80">
                    <th className="py-3 px-4 font-medium min-w-[260px]">
                      Operational Privilege & Capability
                    </th>
                    {rolesList.map((r) => {
                      const isAdm = r === 'admin';
                      const count = isAdm
                        ? allPermissions.length
                        : (activeRolePermissions[r] || []).length;
                      return (
                        <th key={r} className="py-3 px-3 font-medium text-center min-w-[120px]">
                          <div className="font-semibold text-slate-200">{getRoleBadgeLabel(r)}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            {isAdm ? 'All Access' : `${count}/${allPermissions.length} active`}
                          </div>
                          {!isAdm && (
                            <div className="flex items-center justify-center gap-1.5 mt-1.5">
                              <button
                                type="button"
                                onClick={() => handleGrantAllForRole(r)}
                                title={`Grant all privileges to ${getRoleBadgeLabel(r)}`}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 cursor-pointer transition-colors"
                              >
                                All
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRevokeAllForRole(r)}
                                title={`Revoke all privileges from ${getRoleBadgeLabel(r)}`}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-400 cursor-pointer transition-colors"
                              >
                                None
                              </button>
                            </div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {filteredPermissions.length === 0 ? (
                    <tr>
                      <td colSpan={rolesList.length + 1} className="py-8 text-center text-slate-400">
                        No privileges matched your query "{matrixSearch}".
                      </td>
                    </tr>
                  ) : (
                    filteredPermissions.map((perm) => {
                      return (
                        <tr key={perm.key} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-100">{perm.title}</span>
                              {perm.isCustom && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  <Sparkles className="w-2.5 h-2.5" /> Custom
                                </span>
                              )}
                              {perm.category && (
                                <span className="text-[10px] text-slate-500 font-mono hidden md:inline">
                                  [{perm.category}]
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {perm.description}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-slate-500 font-mono font-medium">
                                key: {perm.key}
                              </span>
                              {perm.isCustom && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCustomPermission(perm.key, perm.title)}
                                  className="text-[10px] text-rose-400 hover:text-rose-300 inline-flex items-center gap-1 cursor-pointer hover:underline"
                                  title="Delete custom permission"
                                >
                                  <Trash2 className="w-2.5 h-2.5" /> Remove
                                </button>
                              )}
                            </div>
                          </td>

                          {rolesList.map((role) => {
                            if (role === 'admin') {
                              return (
                                <td key={role} className="py-3 px-3 text-center align-middle">
                                  <span
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30 select-none cursor-default"
                                    title="Admin/Owner has unrestricted system authority"
                                  >
                                    <Lock className="w-3 h-3 text-amber-400" />
                                    <span>Locked</span>
                                  </span>
                                </td>
                              );
                            }

                            const roleKeys = activeRolePermissions[role] || [];
                            const isGranted = roleKeys.includes(perm.key);

                            return (
                              <td key={role} className="py-3 px-3 text-center align-middle">
                                <button
                                  type="button"
                                  onClick={() => handleToggleRolePermission(role, perm.key)}
                                  title={`${isGranted ? 'Click to revoke' : 'Click to grant'} "${perm.title}" for ${getRoleBadgeLabel(role)}`}
                                  className={`inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    isGranted
                                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/80 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-800'
                                      : 'bg-slate-950 text-slate-500 border border-slate-800 hover:bg-emerald-950/40 hover:text-emerald-300 hover:border-emerald-800'
                                  }`}
                                >
                                  {isGranted ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                      <span className="font-mono text-[11px]">Active</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="font-mono text-slate-600 text-[11px]">—</span>
                                      <span className="text-[10px] text-slate-500">Off</span>
                                    </>
                                  )}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add Custom Permission */}
      {showAddPermissionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleCreateCustomPermission}
            className="w-full max-w-lg rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-100">Add New System Permission</h3>
                  <p className="text-[11px] text-slate-400">
                    Define an operational capability and assign access across staff roles
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPermissionModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {permFormError && (
              <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-800/80 text-xs text-rose-300">
                {permFormError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Permission Name / Title <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newPermTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. Vintage Reserve Cellar Uncorking"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Unique Key Identifier <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newPermKey}
                    onChange={(e) => {
                      setNewPermKeyEdited(true);
                      setNewPermKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
                    }}
                    placeholder="e.g. vintage_cellar_uncorking"
                    className="w-full px-3 py-2 font-mono bg-slate-950 border border-slate-800 rounded-lg text-amber-300 text-xs focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-slate-500 font-mono">Lowercase alphanumeric & underscores</span>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Functional Category</label>
                  <select
                    value={newPermCategory}
                    onChange={(e) => setNewPermCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Point of Sale">Point of Sale</option>
                    <option value="Service & Bar">Service & Bar</option>
                    <option value="Inventory & Supply">Inventory & Supply</option>
                    <option value="Financial & Auditing">Financial & Auditing</option>
                    <option value="Customer & Hospitality">Customer & Hospitality</option>
                    <option value="Administration & Security">Administration & Security</option>
                    <option value="Custom Privileges">Custom Privileges</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description / Scope of Authority</label>
                <textarea
                  rows={2}
                  value={newPermDesc}
                  onChange={(e) => setNewPermDesc(e.target.value)}
                  placeholder="Describe what operational stations or transactions this permission unlocks..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {/* Initial Role Assignment Checkboxes */}
              <div>
                <label className="block text-slate-300 font-medium mb-2">
                  Initial Assigned Staff Roles:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['manager', 'bartender', 'cashier', 'inventory'] as UserRole[]).map((role) => {
                    const isChecked = newPermRoles.includes(role);
                    return (
                      <label
                        key={role}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewPermRoles([...newPermRoles, role]);
                            } else {
                              setNewPermRoles(newPermRoles.filter((r) => r !== role));
                            }
                          }}
                          className="rounded text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700"
                        />
                        <span className="font-semibold">{getRoleBadgeLabel(role)}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">
                  Note: Super-Admin automatically inherits all created permissions.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddPermissionModal(false)}
                className="px-4 py-2 text-xs text-slate-300 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg cursor-pointer shadow-xs"
              >
                Create Permission & Update Matrix
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Add Staff Member */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
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
                    placeholder="+234 801 234 5678"
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

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleUpdateUser}
            className="w-full max-w-md rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-semibold text-slate-100">
                Edit Staff: {editingUser.name}
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
                <label className="block text-slate-300 mb-1">Full Name</label>
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

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
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
                Select your account to switch terminal session:
              </p>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
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
                        {getRoleBadgeLabel(u.role)} · {u.email}
                      </div>
                    </div>
                    <span className="text-[11px] text-amber-400 font-mono font-medium">Switch</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
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
