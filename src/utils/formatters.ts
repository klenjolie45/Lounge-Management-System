import {
  CurrencyConfig,
  Ingredient,
  IngredientPackaging,
  PermissionKey,
  StaffUser,
  TimezoneConfig,
  UserRole,
} from '../types/lounge';

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

export function getDefaultPackaging(unit: string, name?: string): IngredientPackaging {
  const lower = (name || '').toLowerCase();
  if (unit === 'ml' || unit === 'cl') {
    if (lower.includes('wine') || lower.includes('champagne') || lower.includes('barolo')) {
      return {
        unitSizeValue: 75,
        unitSizeUnit: 'cl',
        baseUnitsPerPiece: 750,
        piecesPerCarton: 6,
        packLabel: 'bottle',
        cartonLabel: 'case',
      };
    }
    if (lower.includes('syrup') || lower.includes('cane') || lower.includes('mixer')) {
      return {
        unitSizeValue: 100,
        unitSizeUnit: 'cl',
        baseUnitsPerPiece: 1000,
        piecesPerCarton: 6,
        packLabel: 'bottle',
        cartonLabel: 'box',
      };
    }
    if (lower.includes('bitter')) {
      return {
        unitSizeValue: 20,
        unitSizeUnit: 'cl',
        baseUnitsPerPiece: 200,
        piecesPerCarton: 12,
        packLabel: 'bottle',
        cartonLabel: 'box',
      };
    }
    // Default spirit / beverage: e.g., Kentucky Small-Batch Bourbon packed 50 cl (500 ml) and 12 pc in a carton
    return {
      unitSizeValue: 50,
      unitSizeUnit: 'cl',
      baseUnitsPerPiece: 500,
      piecesPerCarton: 12,
      packLabel: 'bottle',
      cartonLabel: 'carton',
    };
  }

  if (unit === 'g' || unit === 'kg') {
    return {
      unitSizeValue: 500,
      unitSizeUnit: 'g',
      baseUnitsPerPiece: 500,
      piecesPerCarton: 10,
      packLabel: 'pack',
      cartonLabel: 'carton',
    };
  }

  return {
    unitSizeValue: 12,
    unitSizeUnit: 'pc',
    baseUnitsPerPiece: 12,
    piecesPerCarton: 12,
    packLabel: 'pack',
    cartonLabel: 'carton',
  };
}

export interface FormattedIngredientStock {
  primary: string; // e.g. "1,680 ml (168 cl)"
  clMl: string; // e.g. "168 cl / 1,680 ml"
  pieces: string; // e.g. "3.36 bottles"
  cartons: string; // e.g. "0.28 cartons"
  piecesDetail: string; // e.g. "3.36 bottles (50 cl each)"
  cartonsDetail: string; // e.g. "0.28 cartons (12 btl/ctn)"
  specLabel: string; // e.g. "50 cl (500 ml) · 12 pc in a carton"
  summary: string; // e.g. "1,680 ml (168 cl) · 3.36 pcs · 0.28 cartons"
  breakdown: string; // e.g. "0 cartons + 3 bottles + 180 ml (18 cl)"
}

export function formatIngredientStock(
  quantity: number,
  ingredient?: { unit: string; packaging?: IngredientPackaging; name?: string }
): FormattedIngredientStock {
  const qty = Number(quantity) || 0;
  const unit = ingredient?.unit || 'ml';
  const pkg = ingredient?.packaging || getDefaultPackaging(unit, ingredient?.name);

  let primary = `${qty.toLocaleString()} ${unit}`;
  let clMl = `${qty.toLocaleString()} ${unit}`;

  if (unit === 'ml') {
    const cl = Number((qty / 10).toFixed(1));
    primary = `${qty.toLocaleString()} ml (${cl} cl)`;
    clMl = `${cl} cl / ${qty.toLocaleString()} ml`;
  } else if (unit === 'cl') {
    const ml = Number((qty * 10).toFixed(1));
    primary = `${qty.toLocaleString()} cl (${ml.toLocaleString()} ml)`;
    clMl = `${qty.toLocaleString()} cl / ${ml.toLocaleString()} ml`;
  } else if (unit === 'g') {
    const kg = Number((qty / 1000).toFixed(2));
    primary = `${qty.toLocaleString()} g (${kg} kg)`;
    clMl = `${qty.toLocaleString()} g (${kg} kg)`;
  } else if (unit === 'kg') {
    const g = Number((qty * 1000).toFixed(0));
    primary = `${qty.toLocaleString()} kg (${g.toLocaleString()} g)`;
    clMl = `${qty.toLocaleString()} kg`;
  } else if (unit === 'pc') {
    primary = `${qty.toLocaleString()} pcs`;
    clMl = `${qty.toLocaleString()} pcs`;
  }

  const basePerPiece = pkg.baseUnitsPerPiece > 0 ? pkg.baseUnitsPerPiece : 1;
  const pcsPerCarton = pkg.piecesPerCarton > 0 ? pkg.piecesPerCarton : 1;

  const totalPieces = qty / basePerPiece;
  const totalCartons = totalPieces / pcsPerCarton;

  const pLabel = pkg.packLabel || 'pc';
  const cLabel = pkg.cartonLabel || 'carton';

  const piecesStr = `${Number(totalPieces.toFixed(2))} ${pLabel}${totalPieces !== 1 ? 's' : ''}`;
  const cartonsStr = `${Number(totalCartons.toFixed(2))} ${cLabel}${totalCartons !== 1 ? 's' : ''}`;

  const piecesDetail = `${Number(totalPieces.toFixed(2))} ${pLabel}s (${pkg.unitSizeValue} ${pkg.unitSizeUnit} each)`;
  const cartonsDetail = `${Number(totalCartons.toFixed(2))} ${cLabel}s (${pcsPerCarton} ${pLabel}s/${cLabel})`;

  const unitSizeDisp =
    pkg.unitSizeUnit === 'cl'
      ? `${pkg.unitSizeValue} cl (${pkg.unitSizeValue * 10} ml)`
      : pkg.unitSizeUnit === 'ml'
      ? `${pkg.unitSizeValue} ml (${Number((pkg.unitSizeValue / 10).toFixed(1))} cl)`
      : `${pkg.unitSizeValue} ${pkg.unitSizeUnit}`;

  const specLabel = `${unitSizeDisp} · ${pcsPerCarton} pc in a ${cLabel}`;
  const summary = `${primary} · ${piecesStr} · ${cartonsStr}`;

  // Integer carton + piece + remainder breakdown:
  const wholeCartons = Math.floor(totalCartons);
  const remainderAfterCartons = Math.max(0, qty - wholeCartons * pcsPerCarton * basePerPiece);
  const wholePieces = Math.floor(remainderAfterCartons / basePerPiece);
  const remainderUnits = Number((remainderAfterCartons - wholePieces * basePerPiece).toFixed(1));

  const breakdownParts: string[] = [];
  if (wholeCartons > 0) breakdownParts.push(`${wholeCartons} ${cLabel}${wholeCartons > 1 ? 's' : ''}`);
  if (wholePieces > 0 || wholeCartons > 0) breakdownParts.push(`${wholePieces} ${pLabel}${wholePieces !== 1 ? 's' : ''}`);
  if (remainderUnits > 0 || breakdownParts.length === 0) {
    if (unit === 'ml') {
      breakdownParts.push(`${remainderUnits} ml (${Number((remainderUnits / 10).toFixed(1))} cl)`);
    } else if (unit === 'cl') {
      breakdownParts.push(`${remainderUnits} cl (${Number((remainderUnits * 10).toFixed(1))} ml)`);
    } else {
      breakdownParts.push(`${remainderUnits} ${unit}`);
    }
  }

  return {
    primary,
    clMl,
    pieces: piecesStr,
    cartons: cartonsStr,
    piecesDetail,
    cartonsDetail,
    specLabel,
    summary,
    breakdown: breakdownParts.join(' + '),
  };
}

export function convertPackagingToUnits(
  value: number,
  mode: 'base' | 'pieces' | 'cartons',
  packaging?: IngredientPackaging
): number {
  const val = Number(value) || 0;
  if (!packaging || mode === 'base') return val;
  const basePerPiece = packaging.baseUnitsPerPiece || 1;
  const pcsPerCarton = packaging.piecesPerCarton || 1;

  if (mode === 'pieces') {
    return Number((val * basePerPiece).toFixed(2));
  }
  if (mode === 'cartons') {
    return Number((val * pcsPerCarton * basePerPiece).toFixed(2));
  }
  return val;
}
