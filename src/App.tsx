import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  CloudOff,
  KeyRound,
  Lock,
  RefreshCw,
  RotateCcw,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { AnalyticsReportsView } from './components/AnalyticsReportsView';
import { AuthModal } from './components/AuthModal';
import { CustomerCrmView } from './components/CustomerCrmView';
import { DailyRecipeUsageView } from './components/DailyRecipeUsageView';
import { EodReconciliationView } from './components/EodReconciliationView';
import { InventoryRecipesView } from './components/InventoryRecipesView';
import { PosTerminalView } from './components/PosTerminalView';
import { PrintContentType, PrintReceiptModal } from './components/PrintReceiptModal';
import { PurchaseOrdersSuppliersView } from './components/PurchaseOrdersSuppliersView';
import { SettingsView } from './components/SettingsView';
import { ActiveModule, Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { UsersPermissionsView } from './components/UsersPermissionsView';
import { useCloudSyncEngine } from './services/syncEngine';
import { CustomerProfile, StaffUser } from './types/lounge';
import { getRoleBadgeLabel, hasPermission } from './utils/formatters';

export default function App() {
  const {
    state,
    deviceId,
    isOnline,
    simulateOffline,
    offlineQueue,
    isSyncing,
    lastSyncedAt,
    dispatchOperation,
    syncNow,
    toggleSimulateOffline,
    resetDemoData,
    switchActiveUser,
  } = useCloudSyncEngine();

  const [activeModule, setActiveModule] = useState<ActiveModule>('pos');
  const [preselectedCustomer, setPreselectedCustomer] = useState<CustomerProfile | null>(null);
  const [showSyncDrawer, setShowSyncDrawer] = useState<boolean>(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [printContent, setPrintContent] = useState<PrintContentType | null>(null);

  // Active Staff User
  const currentUser: StaffUser = useMemo(() => {
    return state.users?.find((u) => u.id === state.activeUserId) || state.users?.[0] || {
      id: 'default',
      name: 'Henri Laurent',
      email: 'henri@lounge.internal',
      role: 'admin',
      pin: '1234',
      active: true,
    };
  }, [state.users, state.activeUserId]);

  // Apply theme dynamically to document root
  useEffect(() => {
    const theme = state.settings?.theme || 'dark_luxe';
    document.documentElement.classList.remove(
      'theme-dark-luxe',
      'theme-obsidian',
      'theme-warm-bistro',
      'theme-light-ivory',
      'theme-light-wine-pink',
      'theme-light-navy-blue'
    );
    document.documentElement.classList.add(`theme-${theme.replace(/_/g, '-')}`);
    if (theme === 'light_ivory' || theme === 'light_wine_pink' || theme === 'light_navy_blue') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }, [state.settings?.theme]);

  const handleStartOrderForCustomer = (customer: CustomerProfile) => {
    setPreselectedCustomer(customer);
    setActiveModule('pos');
  };

  const handleQuickPrintFromHeader = () => {
    if (activeModule === 'eod' && state.reconciliations.length > 0) {
      setPrintContent({ type: 'eod_report', reconciliation: state.reconciliations[0] });
    } else if (activeModule === 'purchase_orders' && state.purchaseOrders?.length > 0) {
      const firstPo = state.purchaseOrders[0];
      const sup = state.suppliers?.find((s) => s.id === firstPo.supplierId);
      setPrintContent({ type: 'purchase_order', po: firstPo, supplier: sup });
    } else if (activeModule === 'daily_recipes') {
      const today = new Date().toISOString().slice(0, 10);
      setPrintContent({
        type: 'daily_recipe_usage',
        date: today,
        recipesUsed: [],
        totalIngredientsUsed: [],
        totalRecipeCost: 0,
      });
    } else if (activeModule === 'analytics') {
      const grossRevenue = state.orders.reduce((acc, o) => acc + o.totalAmount, 0);
      const totalRecipeCogs = state.orders.reduce((acc, o) => acc + o.totalCogs, 0);
      setPrintContent({
        type: 'sales_analytics_report',
        title: 'EXECUTIVE SALES & RECIPE MARGIN REPORT',
        metrics: {
          grossRevenue,
          totalRecipeCogs,
          grossProfit: grossRevenue - totalRecipeCogs,
          marginPct: grossRevenue > 0 ? ((grossRevenue - totalRecipeCogs) / grossRevenue) * 100 : 0,
          ordersCount: state.orders.length,
          avgCheck: state.orders.length > 0 ? grossRevenue / state.orders.length : 0,
        },
        categoryBreakdown: [],
      });
    } else if (state.orders.length > 0) {
      setPrintContent({ type: 'order_receipt', order: state.orders[0] });
    }
  };

  const currentTheme = state.settings?.theme || 'dark_luxe';

  const themeContainerBg =
    currentTheme === 'light_wine_pink'
      ? 'bg-[#FFF5F7] text-[#4C0519]'
      : currentTheme === 'light_navy_blue'
      ? 'bg-[#F8FAFC] text-[#0F172A]'
      : currentTheme === 'light_ivory'
      ? 'bg-[#F8F9FA] text-slate-900'
      : currentTheme === 'obsidian'
      ? 'bg-[#050811] text-slate-100'
      : currentTheme === 'warm_bistro'
      ? 'bg-[#181512] text-amber-50'
      : 'bg-[#0F172A] text-slate-100';

  return (
    <div className={`min-h-screen flex ${themeContainerBg}`}>
      {/* Collapsible / Fixed Left Sidebar */}
      <Sidebar
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        state={state}
        currentUser={currentUser}
        isOpenMobile={showMobileSidebar}
        onCloseMobile={() => setShowMobileSidebar(false)}
        onOpenSyncDrawer={() => setShowSyncDrawer(true)}
        onOpenSwitchUser={() => {
          setAuthModalMode('login');
          setShowAuthModal(true);
        }}
        isOnline={isOnline}
        offlineQueueCount={offlineQueue.length}
      />

      {/* Main Content Area (Offset by Sidebar on md+ screens) */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0 transition-all">
        {/* Top Header */}
        <TopHeader
          activeModule={activeModule}
          state={state}
          currentUser={currentUser}
          onOpenMobileSidebar={() => setShowMobileSidebar(true)}
          onOpenSwitchUser={() => {
            setAuthModalMode('login');
            setShowAuthModal(true);
          }}
          onQuickPrint={handleQuickPrintFromHeader}
          isOnline={isOnline}
        />

        {/* Offline Mode Banner */}
        {!isOnline && (
          <div className="bg-amber-950/80 border-b border-amber-700/60 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-200 print:hidden">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Offline Capability Active:</strong> Real-time POS sales and ingredient
                deductions are saving locally ({offlineQueue.length} operations queued). All data
                synchronizes seamlessly once connection is restored.
              </span>
            </div>
            <button
              type="button"
              onClick={() => toggleSimulateOffline(false)}
              className="px-3 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold whitespace-nowrap cursor-pointer"
            >
              Restore Connection & Sync Now
            </button>
          </div>
        )}

        {/* Main Content Workspace */}
        <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
          {activeModule === 'pos' && (
            <PosTerminalView
              state={state}
              deviceId={deviceId}
              isOnline={isOnline}
              preselectedCustomer={preselectedCustomer}
              onClearPreselectedCustomer={() => setPreselectedCustomer(null)}
              onDispatch={dispatchOperation}
              onNavigateToInventory={() => setActiveModule('inventory')}
              onOpenPrint={(c) => setPrintContent(c)}
            />
          )}

          {activeModule === 'daily_recipes' && (
            <DailyRecipeUsageView
              state={state}
              onOpenPrint={(c) => setPrintContent(c)}
            />
          )}

          {activeModule === 'inventory' && (
            <InventoryRecipesView state={state} onDispatch={dispatchOperation} />
          )}

          {activeModule === 'purchase_orders' && (
            <PurchaseOrdersSuppliersView
              state={state}
              onDispatch={dispatchOperation}
              onOpenPrint={(c) => setPrintContent(c)}
            />
          )}

          {activeModule === 'analytics' && (
            <AnalyticsReportsView
              state={state}
              onOpenPrint={(c) => setPrintContent(c)}
            />
          )}

          {activeModule === 'eod' && (
            <EodReconciliationView
              state={state}
              onDispatch={dispatchOperation}
              onOpenPrint={(c) => setPrintContent(c)}
            />
          )}

          {activeModule === 'crm' && (
            <CustomerCrmView
              state={state}
              onDispatch={dispatchOperation}
              onStartOrderForCustomer={handleStartOrderForCustomer}
            />
          )}

          {activeModule === 'users' && (
            <UsersPermissionsView
              state={state}
              onDispatch={dispatchOperation}
              onSwitchUser={(id) => switchActiveUser(id)}
            />
          )}

          {activeModule === 'settings' && (
            <SettingsView
              state={state}
              onDispatch={dispatchOperation}
            />
          )}
        </main>
      </div>

      {/* Global Printable Receipt / Report Modal */}
      <PrintReceiptModal
        content={printContent}
        state={state}
        onClose={() => setPrintContent(null)}
      />

      {/* Staff Authentication & Login / Register Modal with OTP Option */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        state={state}
        onDispatch={dispatchOperation}
        onSwitchUser={(id) => switchActiveUser(id)}
        initialMode={authModalMode}
      />

      {/* Cloud Synchronization & Offline Queue Modal */}
      {showSyncDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 print:hidden">
          <div className="w-full max-w-xl rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-100">
                  Cloud Synchronization & Offline Queue
                </h3>
                <p className="text-xs text-slate-400 font-mono tabular-nums">
                  Terminal ID: {deviceId} · Cloud Version: v{state.version}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSyncDrawer(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Connection Controls */}
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  {isOnline ? (
                    <span className="text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Connected to Cloud Database
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1.5">
                      <CloudOff className="w-4 h-4" />
                      Operating in Offline Local Queue Mode
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  {isOnline
                    ? 'All orders and recipe deductions synchronize seamlessly in real time across devices.'
                    : 'Transactions are stored in local storage and will reconcile automatically upon reconnection.'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleSimulateOffline()}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer"
                >
                  {simulateOffline ? 'Reconnect to Cloud' : 'Simulate Offline'}
                </button>
                {isOnline && (
                  <button
                    type="button"
                    onClick={() => syncNow()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Sync Now</span>
                  </button>
                )}
              </div>
            </div>

            {/* Pending Offline Operations */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">
                  Pending Offline Operations Queue ({offlineQueue.length})
                </span>
                <span className="text-slate-400 font-mono tabular-nums">
                  {offlineQueue.length === 0 ? 'All changes synced' : 'Awaiting connection'}
                </span>
              </div>

              {offlineQueue.length === 0 ? (
                <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-400 text-center">
                  Zero unsynced operations. Switch to &ldquo;Simulate Offline&rdquo; and ring up a
                  sale to test offline queueing and automatic sync.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {offlineQueue.map((op) => (
                    <div
                      key={op.id}
                      className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-700/40 text-xs flex items-center justify-between gap-2"
                    >
                      <div>
                        <span className="font-mono text-amber-300 font-medium">{op.type}</span>
                        <p className="text-slate-200 mt-0.5">{op.description}</p>
                      </div>
                      <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
                        {new Date(op.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Cloud Synchronization Log */}
            <div className="space-y-2">
              <span className="block text-xs font-semibold text-slate-200">
                Recent Multi-Device Cloud Sync Events
              </span>
              <div className="divide-y divide-slate-800/70 rounded-lg bg-slate-950 border border-slate-800 px-3 max-h-44 overflow-y-auto">
                {state.syncLog?.map((entry) => (
                  <div
                    key={entry.id}
                    className="py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-mono text-amber-400">{entry.deviceId}</span>
                      <span className="mx-1.5 text-slate-600">·</span>
                      <span className="text-slate-200">{entry.summary}</span>
                    </div>
                    <span className="font-mono tabular-nums text-[11px] text-slate-400 shrink-0">
                      {new Date(entry.syncedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={resetDemoData}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Demo Dataset</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSyncDrawer(false)}
                className="px-4 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
