import React, { useEffect, useState } from 'react';
import {
  Clock,
  KeyRound,
  Lock,
  Menu,
  Printer,
  Sparkles,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { CloudSystemState, StaffUser } from '../types/lounge';
import { formatDateTime, getRoleBadgeLabel } from '../utils/formatters';
import { ActiveModule } from './Sidebar';

interface TopHeaderProps {
  activeModule: ActiveModule;
  state: CloudSystemState;
  currentUser: StaffUser;
  onOpenMobileSidebar: () => void;
  onOpenSwitchUser: () => void;
  onQuickPrint?: () => void;
  isOnline: boolean;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeModule,
  state,
  currentUser,
  onOpenMobileSidebar,
  onOpenSwitchUser,
  onQuickPrint,
  isOnline,
}) => {
  const [currentTime, setCurrentTime] = useState<string>(new Date().toISOString());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toISOString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getModuleTitle = (m: ActiveModule) => {
    switch (m) {
      case 'pos':
        return 'Point of Sale';
      case 'daily_recipes':
        return 'Daily Recipes & Ingredients Used';
      case 'inventory':
        return 'Inventory & Par Alert Center';
      case 'purchase_orders':
        return 'Purchase Orders & Suppliers';
      case 'analytics':
        return 'Analytics & Sales Reporting';
      case 'eod':
        return 'End-of-Day Reconciliation (Z-Report)';
      case 'crm':
        return 'VIP Customer CRM & House Accounts';
      case 'users':
        return 'Staff Users & Access Permissions';
      case 'settings':
        return 'General System Settings';
      default:
        return 'Lounge Management';
    }
  };

  return (
    <header className="h-16 px-4 sm:px-6 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between sticky top-0 z-30 print:hidden">
      {/* Left: Mobile Hamburger & Contextual Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="p-2 -ml-1 text-slate-400 hover:text-slate-100 hover:bg-slate-900 rounded-lg md:hidden cursor-pointer"
          title="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb Trail */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 hidden sm:inline">
            {state.settings.branding.businessName}
          </span>
          <span className="text-slate-600 hidden sm:inline">/</span>
          <span className="font-semibold text-slate-100 text-sm sm:text-xs">
            {getModuleTitle(activeModule)}
          </span>
        </div>
      </div>

      {/* Right: Station Clock, Print Shortcut, Active Staff Chip */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Real-time Clock */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-xs font-mono tabular-nums text-slate-300">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>{formatDateTime(currentTime, state.settings.time)}</span>
        </div>

        {/* Quick Print Shortcut */}
        {onQuickPrint && (
          <button
            type="button"
            onClick={onQuickPrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg cursor-pointer"
            title="Open Print Dialog"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Print View</span>
          </button>
        )}

        {/* Active Staff User Button */}
        <button
          type="button"
          onClick={onOpenSwitchUser}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors text-xs cursor-pointer"
        >
          <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-[10px]">
            {currentUser.name.slice(0, 1).toUpperCase()}
          </div>
          <span className="font-medium text-slate-200 hidden sm:inline">
            {currentUser.name}
          </span>
          <span className="text-[10px] text-amber-400 bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-800/80 hidden md:inline">
            {getRoleBadgeLabel(currentUser.role)}
          </span>
        </button>

        {/* Online / Offline Status Badge */}
        <div className="flex items-center">
          {isOnline ? (
            <span
              className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"
              title="Connected to Cloud Database"
            />
          ) : (
            <span
              className="w-2.5 h-2.5 rounded-full bg-amber-400"
              title="Operating in Offline Local Queue Mode"
            />
          )}
        </div>
      </div>
    </header>
  );
};
