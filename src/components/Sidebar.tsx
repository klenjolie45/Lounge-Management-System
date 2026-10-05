import React from 'react';
import {
  AlertTriangle,
  Boxes,
  ChefHat,
  ClipboardCheck,
  Cloud,
  CloudOff,
  Coins,
  FileText,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Shield,
  ShoppingBag,
  Sparkles,
  Truck,
  Users,
  UtensilsCrossed,
  Wine,
  X,
} from 'lucide-react';
import { CloudSystemState, PermissionKey, StaffUser, UserRole } from '../types/lounge';
import { getRoleBadgeLabel, hasPermission } from '../utils/formatters';
import { PWAInstallButton } from './PWAInstallButton';

export type ActiveModule =
  | 'pos'
  | 'daily_recipes'
  | 'inventory'
  | 'purchase_orders'
  | 'analytics'
  | 'eod'
  | 'crm'
  | 'users'
  | 'settings';

interface SidebarProps {
  activeModule: ActiveModule;
  onSelectModule: (module: ActiveModule) => void;
  state: CloudSystemState;
  currentUser: StaffUser;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenSyncDrawer: () => void;
  onOpenSwitchUser: () => void;
  isOnline: boolean;
  offlineQueueCount: number;
}

interface NavItem {
  id: ActiveModule;
  label: string;
  icon: React.ElementType;
  requiredPermission?: PermissionKey;
  badge?: number | string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onSelectModule,
  state,
  currentUser,
  isOpenMobile,
  onCloseMobile,
  onOpenSyncDrawer,
  onOpenSwitchUser,
  isOnline,
  offlineQueueCount,
}) => {
  const lowStockCount = state.ingredients.filter((i) => i.currentStock <= i.parLevel).length;
  const pendingDeliveryCount =
    state.purchaseOrders?.filter(
      (p) => p.status === 'ORDERED_SENT' || p.status === 'PARTIALLY_RECEIVED'
    ).length || 0;

  const navSections: Array<{ title: string; items: NavItem[] }> = [
    {
      title: 'POINT OF SALE',
      items: [
        {
          id: 'pos',
          label: 'POS Register',
          icon: ShoppingBag,
          requiredPermission: 'pos_sales',
        },
        {
          id: 'daily_recipes',
          label: 'Daily Recipes Used',
          icon: ChefHat,
        },
      ],
    },
    {
      title: 'OPERATIONS',
      items: [
        {
          id: 'inventory',
          label: 'Inventory & Recipes',
          icon: Boxes,
          requiredPermission: 'inventory_view',
          badge: lowStockCount > 0 ? lowStockCount : undefined,
        },
        {
          id: 'purchase_orders',
          label: 'Purchase Orders & Suppliers',
          icon: Truck,
          requiredPermission: 'purchase_orders_manage',
          badge: pendingDeliveryCount > 0 ? pendingDeliveryCount : undefined,
        },
        {
          id: 'eod',
          label: 'EOD Reconciliation',
          icon: ClipboardCheck,
          requiredPermission: 'eod_closeout',
        },
      ],
    },
    {
      title: 'MANAGEMENT',
      items: [
        {
          id: 'analytics',
          label: 'Analytics & Reports',
          icon: LayoutDashboard,
          requiredPermission: 'analytics_view',
        },
        {
          id: 'crm',
          label: 'VIP Customer CRM',
          icon: Users,
          requiredPermission: 'crm_manage',
        },
      ],
    },
    {
      title: 'ADMINISTRATION',
      items: [
        {
          id: 'users',
          label: 'Users & Permissions',
          icon: Shield,
          requiredPermission: 'manage_users',
        },
        {
          id: 'settings',
          label: 'System Settings',
          icon: Settings,
          requiredPermission: 'system_settings',
        },
      ],
    },
  ];

  const handleNavClick = (id: ActiveModule) => {
    onSelectModule(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between transition-transform duration-200 md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        } print:hidden`}
      >
        {/* Top: Brand Wordmark & Close button (mobile) */}
        <div>
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Wine className="w-4 h-4 text-amber-400" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold tracking-tight text-slate-100 font-display truncate">
                  {state.settings.branding.businessName}
                </h1>
                <p className="text-[10px] text-slate-400 truncate">
                  {state.settings.branding.tagline || 'Lounge & Bistro System'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1 text-slate-400 hover:text-slate-200 md:hidden cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links Grouped by Section */}
          <div className="px-3 py-4 space-y-6 overflow-y-auto max-h-[calc(100vh-220px)]">
            {navSections.map((sec) => (
              <div key={sec.title} className="space-y-1">
                <div className="px-3 text-[10px] font-semibold text-slate-500 tracking-wider">
                  {sec.title}
                </div>
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeModule === item.id;
                  const isPermitted =
                    !item.requiredPermission || hasPermission(currentUser, item.requiredPermission);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={!isPermitted}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                        !isPermitted
                          ? 'opacity-40 cursor-not-allowed text-slate-500'
                          : isActive
                          ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge !== undefined && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full font-mono tabular-nums ${
                            isActive
                              ? 'bg-slate-950 text-amber-400'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Area: Cloud Sync Indicator, PWA Install & Active Staff Profile */}
        <div className="p-3 border-t border-slate-800/80 space-y-2 bg-slate-950">
          {/* Cloud Sync & Offline Status */}
          <div
            onClick={onOpenSyncDrawer}
            className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-colors ${
              isOnline
                ? 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                : 'bg-amber-950/40 border-amber-700/50 text-amber-200'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {isOnline ? (
                <Cloud className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <CloudOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              )}
              <span className="truncate text-[11px]">
                {isOnline ? `Cloud Synced · v${state.version}` : `Offline (${offlineQueueCount} queued)`}
              </span>
            </div>
            <span className="text-[10px] text-amber-400 font-mono">Sync</span>
          </div>

          {/* In-App PWA Install */}
          <div className="w-full">
            <PWAInstallButton />
          </div>

          {/* Active Staff User Card with Quick Switch */}
          <div className="pt-1">
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-xs shrink-0">
                  {currentUser.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-200 truncate">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {getRoleBadgeLabel(currentUser.role)}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenSwitchUser}
                className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                title="Switch Staff / Lock Station"
              >
                <KeyRound className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
