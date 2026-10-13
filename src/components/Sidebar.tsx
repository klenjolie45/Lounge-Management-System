import React from 'react';
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  Calculator,
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
  Plus,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Sparkles,
  Tags,
  Truck,
  User,
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
  | 'kitchen'
  | 'categories'
  | 'raw_ingredients'
  | 'recipe_products'
  | 'non_recipe_products'
  | 'inventory'
  | 'purchase_orders'
  | 'analytics'
  | 'daily_recipes'
  | 'calculator'
  | 'eod'
  | 'crm'
  | 'users'
  | 'settings';

interface SidebarProps {
  activeModule: ActiveModule;
  onSelectModule: (module: ActiveModule) => void;
  onTriggerAction?: (action: 'new_category' | 'new_ingredient' | 'new_recipe' | 'new_non_recipe') => void;
  state: CloudSystemState;
  currentUser: StaffUser;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenSyncDrawer: () => void;
  onOpenSwitchUser: () => void;
  onOpenUserProfile?: () => void;
  onLogout?: () => void;
  isOnline: boolean;
  offlineQueueCount: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavItem {
  id: ActiveModule;
  label: string;
  icon: React.ElementType;
  requiredPermission?: PermissionKey;
  badge?: number | string;
  quickAction?: {
    label: string;
    action: 'new_category' | 'new_ingredient' | 'new_recipe' | 'new_non_recipe';
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onSelectModule,
  onTriggerAction,
  state,
  currentUser,
  isOpenMobile,
  onCloseMobile,
  onOpenSyncDrawer,
  onOpenSwitchUser,
  onOpenUserProfile,
  onLogout,
  isOnline,
  offlineQueueCount,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const lowStockCount = state.ingredients.filter((i) => i.currentStock <= i.parLevel).length;
  const pendingDeliveryCount =
    state.purchaseOrders?.filter(
      (p) => p.status === 'ORDERED_SENT' || p.status === 'PARTIALLY_RECEIVED'
    ).length || 0;
  const activeKitchenCount =
    state.kitchenTickets?.filter(
      (t) => t.status === 'pending' || t.status === 'preparing' || t.status === 'ready'
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
          id: 'kitchen',
          label: 'Kitchen / Chef Screen',
          icon: ChefHat,
          badge: activeKitchenCount > 0 ? activeKitchenCount : undefined,
        },
        {
          id: 'analytics',
          label: 'Sales Reports',
          icon: BarChart3,
          requiredPermission: 'analytics_view',
        },
        {
          id: 'calculator',
          label: 'Calculator & Scratchpad',
          icon: Calculator,
        },
        {
          id: 'daily_recipes',
          label: 'Daily Recipes Used',
          icon: ClipboardCheck,
        },
      ],
    },
    {
      title: 'CATALOG & INVENTORY',
      items: [
        {
          id: 'categories',
          label: 'Categories',
          icon: Tags,
          requiredPermission: 'inventory_view',
          quickAction: {
            label: '+ New',
            action: 'new_category',
          },
        },
        {
          id: 'raw_ingredients',
          label: 'Raw Ingredients',
          icon: Boxes,
          requiredPermission: 'inventory_view',
          badge: lowStockCount > 0 ? lowStockCount : undefined,
          quickAction: {
            label: '+ New',
            action: 'new_ingredient',
          },
        },
        {
          id: 'recipe_products',
          label: 'Recipe Products',
          icon: UtensilsCrossed,
          requiredPermission: 'inventory_view',
          quickAction: {
            label: '+ New',
            action: 'new_recipe',
          },
        },
        {
          id: 'non_recipe_products',
          label: 'Non-Recipe Products',
          icon: Wine,
          requiredPermission: 'inventory_view',
          quickAction: {
            label: '+ New',
            action: 'new_non_recipe',
          },
        },
        {
          id: 'inventory',
          label: 'Inventory Ledger',
          icon: LayoutDashboard,
          requiredPermission: 'inventory_view',
        },
      ],
    },
    {
      title: 'OPERATIONS',
      items: [
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

      {/* Main Sidebar Shell */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen shrink-0 bg-slate-950 border-r border-slate-800/80 flex flex-col justify-between transition-all duration-200 ease-in-out md:translate-x-0 ${
          isCollapsed ? 'w-64 md:w-16' : 'w-64'
        } ${isOpenMobile ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Brand Header */}
          <div className="p-3 sm:p-4 border-b border-slate-800/80 flex items-center justify-between">
            {isCollapsed ? (
              <div className="w-full hidden md:flex flex-col items-center gap-2">
                <div
                  className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-serif font-bold text-lg shadow-sm"
                  title={state.settings.branding.businessName || 'KOFLY LOUNGE'}
                >
                  {state.settings.branding.logoUrl ? (
                    <img
                      src={state.settings.branding.logoUrl}
                      alt="Logo"
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <span>K</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-900 rounded-lg cursor-pointer transition-colors"
                  title="Expand sidebar"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : null}

            {/* Expanded Header View (and mobile view) */}
            <div className={`flex items-center gap-3 min-w-0 ${isCollapsed ? 'md:hidden' : ''}`}>
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-serif font-bold text-lg shadow-sm shrink-0">
                {state.settings.branding.logoUrl ? (
                  <img
                    src={state.settings.branding.logoUrl}
                    alt="Logo"
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <span>K</span>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold tracking-wide text-slate-100 truncate">
                  {state.settings.branding.businessName || 'KOFLY LOUNGE'}
                </h1>
                <p className="text-[10px] text-slate-400 truncate">
                  {state.settings.branding.tagline || 'Lounge & Bistro System'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {!isCollapsed && onToggleCollapse && (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="hidden md:flex p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-900 rounded-lg cursor-pointer transition-colors"
                  title="Minimize sidebar"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-1 text-slate-400 hover:text-slate-200 md:hidden cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <div className={`py-3 space-y-4 overflow-y-auto max-h-[calc(100vh-200px)] ${isCollapsed ? 'px-2 md:px-1.5' : 'px-3'}`}>
            {navSections.map((sec, secIdx) => (
              <div key={sec.title} className="space-y-1">
                {isCollapsed ? (
                  secIdx > 0 && <div className="hidden md:block my-2 mx-1 border-t border-slate-800/80" />
                ) : (
                  <div className="px-3 text-[10px] font-semibold text-slate-500 tracking-wider">
                    {sec.title}
                  </div>
                )}
                {/* On mobile, always show full section title if collapsed on desktop */}
                {isCollapsed && (
                  <div className="px-3 text-[10px] font-semibold text-slate-500 tracking-wider md:hidden">
                    {sec.title}
                  </div>
                )}

                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeModule === item.id;
                  const isPermitted =
                    !item.requiredPermission ||
                    hasPermission(currentUser, item.requiredPermission, state.settings?.rolePermissions);

                  if (isCollapsed) {
                    return (
                      <React.Fragment key={item.id}>
                        {/* Desktop Minimized View: Centered icon button */}
                        <div className="hidden md:block relative group">
                          <button
                            type="button"
                            disabled={!isPermitted}
                            onClick={() => handleNavClick(item.id)}
                            title={`${item.label}${item.badge !== undefined ? ` (${item.badge})` : ''}`}
                            className={`w-full flex items-center justify-center p-2.5 rounded-xl transition-all cursor-pointer ${
                              !isPermitted
                                ? 'opacity-40 cursor-not-allowed text-slate-500'
                                : isActive
                                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                            }`}
                          >
                            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                            {item.badge !== undefined && (
                              <span
                                className={`absolute top-1 right-1 min-w-[15px] h-3.5 px-1 rounded-full text-[9px] font-bold font-mono flex items-center justify-center leading-none ${
                                  isActive ? 'bg-slate-950 text-amber-400' : 'bg-amber-500 text-slate-950 ring-2 ring-slate-950'
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </button>
                        </div>

                        {/* Mobile Expanded View */}
                        <div
                          className={`md:hidden w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left ${
                            !isPermitted
                              ? 'opacity-40 cursor-not-allowed text-slate-500'
                              : isActive
                              ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
                              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                          }`}
                        >
                          <button
                            type="button"
                            disabled={!isPermitted}
                            onClick={() => handleNavClick(item.id)}
                            className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer py-0.5"
                          >
                            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                            <span className="truncate">{item.label}</span>
                          </button>

                          <div className="flex items-center gap-1 shrink-0 ml-1">
                            {item.quickAction && isPermitted && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNavClick(item.id);
                                  onTriggerAction?.(item.quickAction!.action);
                                }}
                                className={`px-1.5 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                                  isActive
                                    ? 'bg-slate-950 text-amber-300 hover:bg-slate-900'
                                    : 'bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-amber-300 border border-amber-500/30'
                                }`}
                                title={`Create new ${item.label}`}
                              >
                                {item.quickAction.label}
                              </button>
                            )}

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
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  }

                  return (
                    <div
                      key={item.id}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left ${
                        !isPermitted
                          ? 'opacity-40 cursor-not-allowed text-slate-500'
                          : isActive
                          ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                      }`}
                    >
                      <button
                        type="button"
                        disabled={!isPermitted}
                        onClick={() => handleNavClick(item.id)}
                        className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer py-0.5"
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                        <span className="truncate">{item.label}</span>
                      </button>

                      <div className="flex items-center gap-1 shrink-0 ml-1">
                        {item.quickAction && isPermitted && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNavClick(item.id);
                              onTriggerAction?.(item.quickAction!.action);
                            }}
                            className={`px-1.5 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                              isActive
                                ? 'bg-slate-950 text-amber-300 hover:bg-slate-900'
                                : 'bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-amber-300 border border-amber-500/30'
                            }`}
                            title={`Create new ${item.label}`}
                          >
                            {item.quickAction.label}
                          </button>
                        )}

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
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Area: Cloud Sync Indicator, PWA Install & Active Staff Profile */}
        <div className="p-2 sm:p-3 border-t border-slate-800/80 space-y-2 bg-slate-950">
          {isCollapsed ? (
            <div className="hidden md:flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={onOpenSyncDrawer}
                title={isOnline ? `Cloud Synced · v${state.version}` : `Offline (${offlineQueueCount} queued)`}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 relative cursor-pointer"
              >
                {isOnline ? (
                  <Cloud className="w-4 h-4 text-emerald-400" />
                ) : (
                  <CloudOff className="w-4 h-4 text-amber-400" />
                )}
                {!isOnline && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-amber-400 rounded-full" />
                )}
              </button>

              <button
                type="button"
                onClick={onOpenUserProfile}
                title={`Staff Profile: ${currentUser.name} (${getRoleBadgeLabel(currentUser.role)})`}
                className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-xs font-bold cursor-pointer hover:opacity-80"
              >
                {currentUser.name.charAt(0)}
              </button>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onOpenSwitchUser}
                  className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800 cursor-pointer"
                  title="Switch User (PIN / OTP)"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                </button>
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
                    title="Logout"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : null}

          {/* Full Bottom View (when expanded or on mobile) */}
          <div className={`space-y-2 ${isCollapsed ? 'md:hidden' : ''}`}>
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

            {/* PWA Install Button */}
            <PWAInstallButton />

            {/* Current Staff Card with Profile & Switch */}
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
              <div
                onClick={onOpenUserProfile}
                className="flex items-center gap-2 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                title="Click to view/edit user profile & password"
              >
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-xs font-bold shrink-0">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-200 truncate leading-none">
                    {currentUser.name}
                  </p>
                  <span className="text-[10px] text-amber-400 font-mono capitalize">
                    {getRoleBadgeLabel(currentUser.role)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onOpenSwitchUser}
                  className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800 cursor-pointer"
                  title="Switch User (PIN / OTP)"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                </button>
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
                    title="Logout from Terminal"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
