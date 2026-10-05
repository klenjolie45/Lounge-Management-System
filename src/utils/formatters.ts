import { CurrencyConfig, PermissionKey, StaffUser, TimezoneConfig, UserRole } from '../types/lounge';

export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, PermissionKey[]> = {
  admin: [
    'pos_sales',
    'pos_discounts',
    'inventory_view',
    'inventory_restock',
    'inventory_adjust',
    'recipe_edit',
    'purchase_orders_manage',
    'analytics_view',
    'eod_closeout',
    'crm_manage',
    'manage_users',
    'system_settings',
  ],
  manager: [
    'pos_sales',
    'pos_discounts',
    'inventory_view',
    'inventory_restock',
    'inventory_adjust',
    'recipe_edit',
    'purchase_orders_manage',
    'analytics_view',
    'eod_closeout',
    'crm_manage',
    'manage_users',
  ],
  bartender: ['pos_sales', 'inventory_view', 'crm_manage'],
  cashier: ['pos_sales', 'crm_manage'],
  inventory: [
    'inventory_view',
    'inventory_restock',
    'inventory_adjust',
    'recipe_edit',
    'purchase_orders_manage',
  ],
};

export const PERMISSION_LABELS: Record<PermissionKey, { title: string; description: string }> = {
  pos_sales: { title: 'POS Order Entry & Ringing', description: 'Create and settle lounge/bistro tickets' },
  pos_discounts: { title: 'VIP & Manual Discounts', description: 'Apply loyalty and custom line-item discounts' },
  inventory_view: { title: 'View Stock & Par Levels', description: 'Access live raw ingredient quantities' },
  inventory_restock: { title: 'Receive PO Stock', description: 'Add inventory deliveries and restocks' },
  inventory_adjust: { title: 'Log Waste & Spillage', description: 'Audit adjustments and waste write-offs' },
  recipe_edit: { title: 'Modify Recipe BOMs', description: 'Edit ingredient quantities linked to menu items' },
  purchase_orders_manage: { title: 'Purchase Orders & Suppliers', description: 'Manage vendor directory, draft POs, and verify inbound restocks' },
  analytics_view: { title: 'Financial Analytics & COGS', description: 'View gross margin, revenue, and pour costs' },
  eod_closeout: { title: 'Perform EOD Closeout', description: 'Reconcile cash drawer and finalize Z-Reports' },
  crm_manage: { title: 'VIP Guest CRM', description: 'Manage guest loyalty profiles and house accounts' },
  manage_users: { title: 'Staff Users & Access', description: 'Add and edit staff roles and access PINs' },
  system_settings: { title: 'General System Settings', description: 'Configure branding, tax, themes, and notifications' },
};

export function hasPermission(
  user: StaffUser | null | undefined,
  permission: PermissionKey,
  rolePermissionsMap?: Record<UserRole, string[]>
): boolean {
  if (!user || !user.active) return false;
  if (user.role === 'admin') return true;
  if (user.customPermissions && user.customPermissions.includes(permission)) return true;
  const currentRoleMap = rolePermissionsMap || ROLE_DEFAULT_PERMISSIONS;
  const defaults = currentRoleMap[user.role] || [];
  return defaults.includes(permission);
}

export function getRoleBadgeLabel(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'Admin / Owner';
    case 'manager':
      return 'General Manager';
    case 'bartender':
      return 'Lead Bartender';
    case 'cashier':
      return 'Server / Cashier';
    case 'inventory':
      return 'Inventory Steward';
    default:
      return role;
  }
}

export function formatCurrency(amount: number, config?: CurrencyConfig): string {
  const sym = config?.symbol || '₦';
  const pos = config?.position || 'before';
  const decimals = config?.decimals ?? 2;
  const formattedNum = (amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return pos === 'before' ? `${sym}${formattedNum}` : `${formattedNum} ${sym}`;
}

export function formatDateTime(isoString: string, config?: TimezoneConfig): string {
  try {
    const date = new Date(isoString);
    const is12h = config?.timeFormat !== '24h';
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: is12h,
    });
  } catch {
    return isoString;
  }
}

export function formatDateFull(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString([], {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoString;
  }
}
