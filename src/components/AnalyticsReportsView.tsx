import React, { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  Filter,
  Layers,
  PieChart,
  Printer,
  Receipt,
  Search,
  ShoppingBag,
  TrendingUp,
  User,
  Users,
  Wine,
  X,
} from 'lucide-react';
import { CloudSystemState, PaymentMethod, SaleOrder } from '../types/lounge';
import { PrintContentType } from './PrintReceiptModal';
import { formatCurrency, formatDateTime } from '../utils/formatters';

interface AnalyticsReportsViewProps {
  state: CloudSystemState;
  onOpenPrint?: (content: PrintContentType) => void;
}

export type SalesReportTab =
  | 'charts'
  | 'summary'
  | 'by_item'
  | 'by_category'
  | 'by_employee'
  | 'by_payment'
  | 'receipts';

export type DateFilterMode = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' | 'all';

export const AnalyticsReportsView: React.FC<AnalyticsReportsViewProps> = ({
  state,
  onOpenPrint,
}) => {
  const [activeTab, setActiveTab] = useState<SalesReportTab>('charts');
  const [dateFilter, setDateFilter] = useState<DateFilterMode>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [tenderFilter, setTenderFilter] = useState<string>('All');
  const [inspectedOrder, setInspectedOrder] = useState<SaleOrder | null>(null);

  // Item sorting
  const [itemSortKey, setItemSortKey] = useState<'revenue' | 'units' | 'name'>('revenue');
  const [itemSortDir, setItemSortDir] = useState<'asc' | 'desc'>('desc');

  // Filter orders by date range
  const filteredOrdersByDate = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    return state.orders.filter((order) => {
      const orderDate = new Date(order.createdAt);
      if (isNaN(orderDate.getTime())) return true;
      const orderDateStr = order.createdAt.slice(0, 10);

      if (dateFilter === 'daily') {
        return orderDateStr === todayStr;
      } else if (dateFilter === 'weekly') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return orderDate >= sevenDaysAgo && orderDate <= now;
      } else if (dateFilter === 'monthly') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return orderDate >= thirtyDaysAgo && orderDate <= now;
      } else if (dateFilter === 'yearly') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        return orderDate >= startOfYear && orderDate <= now;
      } else if (dateFilter === 'custom') {
        if (customStartDate && orderDateStr < customStartDate) return false;
        if (customEndDate && orderDateStr > customEndDate) return false;
        return true;
      }
      return true; // 'all'
    });
  }, [state.orders, dateFilter, customStartDate, customEndDate]);

  // Overall Financial & Performance Metrics for Filtered Period
  const metrics = useMemo(() => {
    const orders = filteredOrdersByDate;
    const grossRevenue = orders.reduce((acc, o) => acc + o.totalAmount, 0);
    const subtotal = orders.reduce((acc, o) => acc + o.subtotal, 0);
    const discountAmount = orders.reduce((acc, o) => acc + o.discountAmount, 0);
    const taxAmount = orders.reduce((acc, o) => acc + o.taxAmount, 0);
    const serviceCharge = orders.reduce((acc, o) => acc + o.serviceCharge, 0);
    const totalRecipeCogs = orders.reduce((acc, o) => acc + o.totalCogs, 0);
    const netSales = subtotal - discountAmount;
    const grossProfit = netSales - totalRecipeCogs;
    const marginPct = netSales > 0 ? (grossProfit / netSales) * 100 : 0;
    const avgCheck = orders.length > 0 ? grossRevenue / orders.length : 0;
    const totalItemsSold = orders.reduce(
      (acc, o) => acc + o.items.reduce((sum, item) => sum + item.quantity, 0),
      0
    );

    // Sales by Item Aggregation
    const itemMap = new Map<
      string,
      {
        id: string;
        name: string;
        category: string;
        sku?: string;
        unitsSold: number;
        revenue: number;
        cogs: number;
        unitPrice: number;
      }
    >();

    for (const order of orders) {
      for (const item of order.items) {
        const menuItem = state.menuItems.find((m) => m.id === item.menuItemId);
        const cat = menuItem?.category || 'Signature Cocktails';
        const existing = itemMap.get(item.menuItemId) || {
          id: item.menuItemId,
          name: item.name,
          category: cat,
          sku: menuItem?.sku || 'SKU',
          unitsSold: 0,
          revenue: 0,
          cogs: 0,
          unitPrice: item.unitPrice,
        };
        existing.unitsSold += item.quantity;
        existing.revenue += item.unitPrice * item.quantity;
        existing.cogs += item.unitCost * item.quantity;
        itemMap.set(item.menuItemId, existing);
      }
    }

    const itemsList = Array.from(itemMap.values());

    // Sales by Category Aggregation
    const categoryMap = new Map<
      string,
      { category: string; unitsSold: number; revenue: number; cogs: number; orderCount: number }
    >();

    for (const item of itemsList) {
      const prev = categoryMap.get(item.category) || {
        category: item.category,
        unitsSold: 0,
        revenue: 0,
        cogs: 0,
        orderCount: 0,
      };
      prev.unitsSold += item.unitsSold;
      prev.revenue += item.revenue;
      prev.cogs += item.cogs;
      categoryMap.set(item.category, prev);
    }

    const categoryList = Array.from(categoryMap.values()).sort(
      (a, b) => b.revenue - a.revenue
    );

    // Sales by Employee Aggregation
    const employeeMap = new Map<
      string,
      {
        name: string;
        role: string;
        ordersCount: number;
        revenue: number;
        totalItemsSold: number;
      }
    >();

    for (const order of orders) {
      const serverKey = order.serverName || 'Staff Server';
      const staffUser = state.users.find(
        (u) => u.name.toLowerCase() === serverKey.toLowerCase()
      );
      const prev = employeeMap.get(serverKey) || {
        name: serverKey,
        role: staffUser?.role || 'bartender',
        ordersCount: 0,
        revenue: 0,
        totalItemsSold: 0,
      };
      prev.ordersCount += 1;
      prev.revenue += order.totalAmount;
      prev.totalItemsSold += order.items.reduce((s, i) => s + i.quantity, 0);
      employeeMap.set(serverKey, prev);
    }

    const employeeList = Array.from(employeeMap.values()).sort(
      (a, b) => b.revenue - a.revenue
    );

    // Sales by Payment Type Aggregation
    const paymentMap = new Map<
      PaymentMethod | string,
      { method: string; count: number; totalAmount: number }
    >();

    for (const order of orders) {
      const method = order.paymentMethod || 'Card Terminal';
      const prev = paymentMap.get(method) || {
        method,
        count: 0,
        totalAmount: 0,
      };
      prev.count += 1;
      prev.totalAmount += order.totalAmount;
      paymentMap.set(method, prev);
    }

    const paymentList = Array.from(paymentMap.values()).sort(
      (a, b) => b.totalAmount - a.totalAmount
    );

    return {
      grossRevenue,
      subtotal,
      discountAmount,
      taxAmount,
      serviceCharge,
      totalRecipeCogs,
      netSales,
      grossProfit,
      marginPct,
      avgCheck,
      totalItemsSold,
      ordersCount: orders.length,
      itemsList,
      categoryList,
      employeeList,
      paymentList,
    };
  }, [filteredOrdersByDate, state.menuItems, state.users]);

  // Hourly / Timeline Series for Visual Chart
  const timelineChartData = useMemo(() => {
    if (dateFilter === 'daily') {
      // Hourly distribution
      const hours = [
        { label: '12:00', rev: 0 },
        { label: '14:00', rev: 0 },
        { label: '16:00', rev: 0 },
        { label: '18:00', rev: 0 },
        { label: '20:00', rev: 0 },
        { label: '22:00', rev: 0 },
        { label: '00:00', rev: 0 },
      ];
      for (const o of filteredOrdersByDate) {
        const d = new Date(o.createdAt);
        const hr = d.getHours();
        if (hr < 13) hours[0].rev += o.totalAmount;
        else if (hr < 15) hours[1].rev += o.totalAmount;
        else if (hr < 17) hours[2].rev += o.totalAmount;
        else if (hr < 19) hours[3].rev += o.totalAmount;
        else if (hr < 21) hours[4].rev += o.totalAmount;
        else if (hr < 23) hours[5].rev += o.totalAmount;
        else hours[6].rev += o.totalAmount;
      }
      return hours;
    } else {
      // 7-bucket timeline or day distribution
      const days = [
        { label: 'Mon', rev: 0 },
        { label: 'Tue', rev: 0 },
        { label: 'Wed', rev: 0 },
        { label: 'Thu', rev: 0 },
        { label: 'Fri', rev: 0 },
        { label: 'Sat', rev: 0 },
        { label: 'Sun', rev: 0 },
      ];
      for (const o of filteredOrdersByDate) {
        const d = new Date(o.createdAt);
        const dayIdx = (d.getDay() + 6) % 7; // Mon = 0
        days[dayIdx].rev += o.totalAmount;
      }
      return days;
    }
  }, [filteredOrdersByDate, dateFilter]);

  const maxTimelineRev = Math.max(...timelineChartData.map((d) => d.rev), 100);

  // Sorted Items
  const sortedItems = useMemo(() => {
    return [...metrics.itemsList].sort((a, b) => {
      let diff = 0;
      if (itemSortKey === 'revenue') diff = a.revenue - b.revenue;
      else if (itemSortKey === 'units') diff = a.unitsSold - b.unitsSold;
      else diff = a.name.localeCompare(b.name);
      return itemSortDir === 'asc' ? diff : -diff;
    });
  }, [metrics.itemsList, itemSortKey, itemSortDir]);

  // Receipts Table Filtered
  const filteredReceipts = useMemo(() => {
    return filteredOrdersByDate.filter((o) => {
      const matchesTender = tenderFilter === 'All' || o.paymentMethod === tenderFilter;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchesTender;
      return (
        matchesTender &&
        (o.orderNumber.toLowerCase().includes(q) ||
          o.tableOrTab.toLowerCase().includes(q) ||
          (o.serverName && o.serverName.toLowerCase().includes(q)) ||
          (o.customerName && o.customerName.toLowerCase().includes(q)) ||
          (o.paymentReference && o.paymentReference.toLowerCase().includes(q)) ||
          o.items.some((i) => i.name.toLowerCase().includes(q)))
      );
    });
  }, [filteredOrdersByDate, tenderFilter, searchQuery]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Order Number',
      'Date & Time',
      'Service Area',
      'Server / Bartender',
      'Guest Profile',
      'Payment Type',
      'Payment Ref',
      'Items Count',
      'Subtotal',
      'Discount',
      'Service Charge',
      'Tax',
      'Gross Total Paid',
      'Recipe COGS',
    ];

    const rows = filteredReceipts.map((o) => [
      o.orderNumber,
      `"${o.createdAt}"`,
      `"${o.serviceMode || o.tableOrTab}"`,
      `"${o.serverName}"`,
      `"${o.customerName || 'Walk-in'}"`,
      `"${o.paymentMethod}"`,
      `"${o.paymentReference || ''}"`,
      o.items.reduce((sum, i) => sum + i.quantity, 0),
      o.subtotal.toFixed(2),
      o.discountAmount.toFixed(2),
      o.serviceCharge.toFixed(2),
      o.taxAmount.toFixed(2),
      o.totalAmount.toFixed(2),
      o.totalCogs.toFixed(2),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `sales-report-${dateFilter}-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar & Global Period Filters */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-400" />
              Executive Sales & Performance Reports
            </h1>
            <p className="text-xs text-slate-400">
              Live multi-dimensional sales analysis, recipe margin efficiency, and revenue audit
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Export CSV</span>
            </button>

            {onOpenPrint && (
              <button
                type="button"
                onClick={() =>
                  onOpenPrint({
                    type: 'sales_analytics_report',
                    title: `SALES & MARGIN PERFORMANCE REPORT (${dateFilter.toUpperCase()})`,
                    metrics: {
                      grossRevenue: metrics.grossRevenue,
                      totalRecipeCogs: metrics.totalRecipeCogs,
                      grossProfit: metrics.grossProfit,
                      marginPct: metrics.marginPct,
                      ordersCount: metrics.ordersCount,
                      avgCheck: metrics.avgCheck,
                    },
                    categoryBreakdown: metrics.categoryList.map((c) => ({
                      category: c.category,
                      revenue: c.revenue,
                      cogs: c.cogs,
                      units: c.unitsSold,
                    })),
                  })
                }
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg cursor-pointer shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Report</span>
              </button>
            )}
          </div>
        </div>

        {/* Date Period Filter Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 mr-1">
              <Calendar className="w-3.5 h-3.5" />
              Period:
            </span>
            {(
              [
                { id: 'daily', label: 'Daily (Today)' },
                { id: 'weekly', label: 'Weekly (7 Days)' },
                { id: 'monthly', label: 'Monthly (30 Days)' },
                { id: 'yearly', label: 'Yearly (YTD)' },
                { id: 'all', label: 'All Time' },
                { id: 'custom', label: 'Custom Range' },
              ] as Array<{ id: DateFilterMode; label: string }>
            ).map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setDateFilter(filter.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap cursor-pointer ${
                  dateFilter === filter.id
                    ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2 text-xs">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
              />
              <span className="text-slate-500">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
              />
            </div>
          )}
        </div>

        {/* Sub-Tabs Navigation for Sales Reports Suite */}
        <div className="flex items-center gap-1 overflow-x-auto pt-2 border-t border-slate-800 text-xs">
          {(
            [
              { id: 'charts', label: 'Charts & Trends', icon: TrendingUp },
              { id: 'summary', label: 'Sales Summary', icon: DollarSign },
              { id: 'by_item', label: 'Sales by Item', icon: Wine },
              { id: 'by_category', label: 'Sales by Category', icon: Layers },
              { id: 'by_employee', label: 'Sales by Employee', icon: Users },
              { id: 'by_payment', label: 'Sales by Payment Type', icon: CreditCard },
              { id: 'receipts', label: 'Receipts & Orders', icon: Receipt },
            ] as Array<{ id: SalesReportTab; label: string; icon: React.ElementType }>
          ).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* High-Level Financial KPI Bar (Shown Across Tabs) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] text-slate-400">Gross Sales</span>
          <div className="text-lg font-bold font-mono tabular-nums text-amber-400">
            {formatCurrency(metrics.grossRevenue, state.settings?.currency)}
          </div>
          <p className="text-[11px] text-slate-400">{metrics.ordersCount} checks</p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] text-slate-400">Net Sales</span>
          <div className="text-lg font-bold font-mono tabular-nums text-slate-100">
            {formatCurrency(metrics.netSales, state.settings?.currency)}
          </div>
          <p className="text-[11px] text-slate-400">Excl. discounts</p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] text-slate-400">Recipe COGS</span>
          <div className="text-lg font-bold font-mono tabular-nums text-rose-400">
            {formatCurrency(metrics.totalRecipeCogs, state.settings?.currency)}
          </div>
          <p className="text-[11px] text-slate-400">
            {metrics.netSales > 0
              ? `${((metrics.totalRecipeCogs / metrics.netSales) * 100).toFixed(1)}% cost ratio`
              : '0.0%'}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] text-slate-400">Gross Profit</span>
          <div className="text-lg font-bold font-mono tabular-nums text-emerald-400">
            {formatCurrency(metrics.grossProfit, state.settings?.currency)}
          </div>
          <p className="text-[11px] text-emerald-400 font-mono">
            {metrics.marginPct.toFixed(1)}% margin
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] text-slate-400">Avg Ticket (Check)</span>
          <div className="text-lg font-bold font-mono tabular-nums text-slate-100">
            {formatCurrency(metrics.avgCheck, state.settings?.currency)}
          </div>
          <p className="text-[11px] text-slate-400">Per transaction</p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] text-slate-400">Items Sold</span>
          <div className="text-lg font-bold font-mono tabular-nums text-slate-100">
            {metrics.totalItemsSold}
          </div>
          <p className="text-[11px] text-slate-400">Units delivered</p>
        </div>
      </div>

      {/* TAB 1: CHARTS & TRENDS */}
      {activeTab === 'charts' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Main Visual Sales Timeline Chart */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-100">
                  Sales Trend & Pacing ({dateFilter.toUpperCase()})
                </h3>
                <p className="text-xs text-slate-400">
                  Pacing volume across selected timeframe
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1.5 text-amber-400">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
                  Revenue Volume
                </span>
              </div>
            </div>

            <div className="h-60 pt-6 flex items-end justify-between gap-3 border-b border-slate-800 pb-3">
              {timelineChartData.map((slot) => {
                const height = Math.max(10, Math.round((slot.rev / maxTimelineRev) * 190));
                return (
                  <div key={slot.label} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="text-[11px] font-mono tabular-nums text-slate-400 group-hover:text-amber-300 font-semibold truncate w-full text-center">
                      {formatCurrency(Math.round(slot.rev), {
                        ...state.settings?.currency,
                        decimals: 0,
                      })}
                    </div>
                    <div className="w-full flex items-end justify-center h-44">
                      <div
                        className="w-full max-w-[48px] bg-amber-500/90 hover:bg-amber-400 rounded-t-md transition-all shadow-sm"
                        style={{ height: `${height}px` }}
                        title={`${slot.label}: ${formatCurrency(slot.rev, state.settings?.currency)}`}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-300">
                      {slot.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dual Visual Breakdowns: Category & Payment Share Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category Share Visual Bars */}
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-100">
                    Category Revenue Distribution
                  </h3>
                  <p className="text-xs text-slate-400">
                    Share of gross sales across menu categories
                  </p>
                </div>
                <Layers className="w-4 h-4 text-amber-400" />
              </div>

              <div className="space-y-3 pt-2">
                {metrics.categoryList.map((cat) => {
                  const pct =
                    metrics.grossRevenue > 0
                      ? Math.round((cat.revenue / metrics.grossRevenue) * 100)
                      : 0;
                  return (
                    <div key={cat.category} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-200">{cat.category}</span>
                        <span className="font-mono tabular-nums text-amber-400 font-bold">
                          {formatCurrency(cat.revenue, state.settings?.currency)} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.max(3, pct))}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                        <span>{cat.unitsSold} items sold</span>
                        <span>
                          Margin:{' '}
                          {cat.revenue > 0
                            ? Math.round(((cat.revenue - cat.cogs) / cat.revenue) * 100)
                            : 0}
                          %
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment Method Share Visual Bars */}
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-100">
                    Payment Method Share
                  </h3>
                  <p className="text-xs text-slate-400">
                    Distribution of settled payments by tender type
                  </p>
                </div>
                <CreditCard className="w-4 h-4 text-emerald-400" />
              </div>

              <div className="space-y-3 pt-2">
                {metrics.paymentList.map((pay) => {
                  const pct =
                    metrics.grossRevenue > 0
                      ? Math.round((pay.totalAmount / metrics.grossRevenue) * 100)
                      : 0;
                  return (
                    <div key={pay.method} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-200">{pay.method}</span>
                        <span className="font-mono tabular-nums text-emerald-400 font-bold">
                          {formatCurrency(pay.totalAmount, state.settings?.currency)} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.max(3, pct))}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                        <span>{pay.count} transactions</span>
                        <span>Avg check: {formatCurrency(pay.totalAmount / (pay.count || 1), state.settings?.currency)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SALES SUMMARY */}
      {activeTab === 'summary' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Financial Ledger Table */}
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-base font-semibold text-slate-100">
                Revenue & Tax Statement
              </h3>
              <div className="space-y-2 text-xs divide-y divide-slate-800/80">
                <div className="flex justify-between py-2 text-slate-300">
                  <span>Gross Product Subtotal</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-100">
                    {formatCurrency(metrics.subtotal, state.settings?.currency)}
                  </span>
                </div>
                <div className="flex justify-between py-2 text-rose-400">
                  <span>VIP & Promotional Discounts</span>
                  <span className="font-mono tabular-nums font-semibold">
                    -{formatCurrency(metrics.discountAmount, state.settings?.currency)}
                  </span>
                </div>
                <div className="flex justify-between py-2 text-slate-300">
                  <span>Hospitality Service Charge</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-100">
                    +{formatCurrency(metrics.serviceCharge, state.settings?.currency)}
                  </span>
                </div>
                <div className="flex justify-between py-2 text-slate-300">
                  <span>Sales Tax Collected</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-100">
                    +{formatCurrency(metrics.taxAmount, state.settings?.currency)}
                  </span>
                </div>
                <div className="flex justify-between py-2.5 text-sm font-bold text-slate-100 border-t border-slate-700">
                  <span>Total Gross Collections</span>
                  <span className="font-mono tabular-nums text-amber-400">
                    {formatCurrency(metrics.grossRevenue, state.settings?.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Profitability & Food/Beverage Cost */}
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-base font-semibold text-slate-100">
                COGS & Contribution Margin
              </h3>
              <div className="space-y-2 text-xs divide-y divide-slate-800/80">
                <div className="flex justify-between py-2 text-slate-300">
                  <span>Net Sales (Revenue Base)</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-100">
                    {formatCurrency(metrics.netSales, state.settings?.currency)}
                  </span>
                </div>
                <div className="flex justify-between py-2 text-rose-400">
                  <span>Exact Deducted Recipe COGS</span>
                  <span className="font-mono tabular-nums font-semibold">
                    -{formatCurrency(metrics.totalRecipeCogs, state.settings?.currency)}
                  </span>
                </div>
                <div className="flex justify-between py-2.5 text-sm font-bold text-emerald-400 border-t border-slate-700">
                  <span>Gross Operating Margin</span>
                  <span className="font-mono tabular-nums">
                    {formatCurrency(metrics.grossProfit, state.settings?.currency)} (
                    {metrics.marginPct.toFixed(1)}%)
                  </span>
                </div>
                <div className="flex justify-between py-2 text-slate-400 text-[11px]">
                  <span>Pour & Food Cost Ratio</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-300">
                    {metrics.netSales > 0
                      ? `${((metrics.totalRecipeCogs / metrics.netSales) * 100).toFixed(1)}%`
                      : '0.0%'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SALES BY ITEM */}
      {activeTab === 'by_item' && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Sales by Item Breakdown ({sortedItems.length} Products)
              </h3>
              <p className="text-xs text-slate-400">
                Full rankings with volume, gross revenue, and recipe contribution
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold">Sort by:</span>
              <button
                type="button"
                onClick={() => {
                  if (itemSortKey === 'revenue') setItemSortDir(itemSortDir === 'asc' ? 'desc' : 'asc');
                  else {
                    setItemSortKey('revenue');
                    setItemSortDir('desc');
                  }
                }}
                className={`px-2.5 py-1 text-xs rounded-lg border font-semibold cursor-pointer ${
                  itemSortKey === 'revenue'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Revenue {itemSortKey === 'revenue' && (itemSortDir === 'desc' ? '↓' : '↑')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (itemSortKey === 'units') setItemSortDir(itemSortDir === 'asc' ? 'desc' : 'asc');
                  else {
                    setItemSortKey('units');
                    setItemSortDir('desc');
                  }
                }}
                className={`px-2.5 py-1 text-xs rounded-lg border font-semibold cursor-pointer ${
                  itemSortKey === 'units'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Quantity {itemSortKey === 'units' && (itemSortDir === 'desc' ? '↓' : '↑')}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400">
                  <th className="py-2.5 px-3 font-semibold">Item Name</th>
                  <th className="py-2.5 px-3 font-semibold">Category</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Unit Price</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Qty Sold</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Gross Sales</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Recipe COGS</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Net Margin</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Sales Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {sortedItems.map((item) => {
                  const net = item.revenue - item.cogs;
                  const marginPct = item.revenue > 0 ? Math.round((net / item.revenue) * 100) : 0;
                  const sharePct =
                    metrics.grossRevenue > 0
                      ? ((item.revenue / metrics.grossRevenue) * 100).toFixed(1)
                      : '0.0';
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-semibold text-slate-100">{item.name}</td>
                      <td className="py-2.5 px-3 text-slate-400">{item.category}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-300">
                        {formatCurrency(item.unitPrice, state.settings?.currency)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-100">
                        {item.unitsSold}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-amber-400">
                        {formatCurrency(item.revenue, state.settings?.currency)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-400">
                        {formatCurrency(item.cogs, state.settings?.currency)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-400 font-semibold">
                        {formatCurrency(net, state.settings?.currency)} ({marginPct}%)
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-400">
                        {sharePct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SALES BY CATEGORY */}
      {activeTab === 'by_category' && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-4 animate-fadeIn">
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Sales by Menu Category
            </h3>
            <p className="text-xs text-slate-400">
              Performance, item counts, and revenue contribution per category
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400">
                  <th className="py-2.5 px-3 font-semibold">Category</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Items Sold</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Gross Sales</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Recipe COGS</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Gross Profit</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Margin %</th>
                  <th className="py-2.5 px-3 font-semibold text-right">% of Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {metrics.categoryList.map((cat) => {
                  const profit = cat.revenue - cat.cogs;
                  const marginPct =
                    cat.revenue > 0 ? Math.round((profit / cat.revenue) * 100) : 0;
                  const sharePct =
                    metrics.grossRevenue > 0
                      ? ((cat.revenue / metrics.grossRevenue) * 100).toFixed(1)
                      : '0.0';
                  return (
                    <tr key={cat.category} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-semibold text-slate-100">{cat.category}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-200">
                        {cat.unitsSold}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-amber-400">
                        {formatCurrency(cat.revenue, state.settings?.currency)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-400">
                        {formatCurrency(cat.cogs, state.settings?.currency)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-400 font-semibold">
                        {formatCurrency(profit, state.settings?.currency)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-400 font-semibold">
                        {marginPct}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-300 font-semibold">
                        {sharePct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: SALES BY EMPLOYEE */}
      {activeTab === 'by_employee' && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-4 animate-fadeIn">
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Sales by Server / Bartender / Cashier
            </h3>
            <p className="text-xs text-slate-400">
              Shift performance, orders settled, and revenue per staff member
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400">
                  <th className="py-2.5 px-3 font-semibold">Employee</th>
                  <th className="py-2.5 px-3 font-semibold">Assigned Role</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Orders / Checks</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Items Sold</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Gross Sales</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Average Check</th>
                  <th className="py-2.5 px-3 font-semibold text-right">% of Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {metrics.employeeList.map((emp) => {
                  const avgCheck = emp.ordersCount > 0 ? emp.revenue / emp.ordersCount : 0;
                  const sharePct =
                    metrics.grossRevenue > 0
                      ? ((emp.revenue / metrics.grossRevenue) * 100).toFixed(1)
                      : '0.0';
                  return (
                    <tr key={emp.name} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-semibold text-slate-100 flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-amber-400" />
                        {emp.name}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 capitalize">{emp.role}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-200">
                        {emp.ordersCount}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-200">
                        {emp.totalItemsSold}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-amber-400">
                        {formatCurrency(emp.revenue, state.settings?.currency)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-300">
                        {formatCurrency(avgCheck, state.settings?.currency)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-300 font-semibold">
                        {sharePct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: SALES BY PAYMENT TYPE */}
      {activeTab === 'by_payment' && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-4 animate-fadeIn">
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Sales by Payment Tender Type
            </h3>
            <p className="text-xs text-slate-400">
              Settlement breakdowns including Card, Cash, Bank Transfer, House Accounts, and Split
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400">
                  <th className="py-2.5 px-3 font-semibold">Payment Type</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Transactions</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Gross Collections</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Average Transaction</th>
                  <th className="py-2.5 px-3 font-semibold text-right">% of Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {metrics.paymentList.map((pay) => {
                  const avg = pay.count > 0 ? pay.totalAmount / pay.count : 0;
                  const sharePct =
                    metrics.grossRevenue > 0
                      ? ((pay.totalAmount / metrics.grossRevenue) * 100).toFixed(1)
                      : '0.0';
                  return (
                    <tr key={pay.method} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-semibold text-slate-100 flex items-center gap-2">
                        <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                        {pay.method}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-200">
                        {pay.count}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-amber-400">
                        {formatCurrency(pay.totalAmount, state.settings?.currency)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-300">
                        {formatCurrency(avg, state.settings?.currency)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-300 font-semibold">
                        {sharePct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: RECEIPTS & ORDERS ARCHIVE */}
      {activeTab === 'receipts' && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Settled Receipts & Order Audit Ledger ({filteredReceipts.length} Orders)
              </h3>
              <p className="text-xs text-slate-400">
                Search receipts, view customer & server records, inspect raw BOM deductions, reprint slips
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search receipt #, server, ref..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500"
                />
              </div>

              <select
                value={tenderFilter}
                onChange={(e) => setTenderFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
              >
                <option value="All">All Payment Types</option>
                <option value="Card Terminal">Card Terminal</option>
                <option value="Cash Drawer">Cash Drawer</option>
                <option value="Transfer">Transfer</option>
                <option value="VIP House Account">VIP House Account</option>
                <option value="Split Tender">Split Tender</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400">
                  <th className="py-2.5 px-3 font-semibold">Receipt #</th>
                  <th className="py-2.5 px-3 font-semibold">Date & Time</th>
                  <th className="py-2.5 px-3 font-semibold">Service Area</th>
                  <th className="py-2.5 px-3 font-semibold">Server</th>
                  <th className="py-2.5 px-3 font-semibold">Payment Tender</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Items</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Total Paid</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredReceipts.map((order) => {
                  const itemsCount = order.items.reduce((s, i) => s + i.quantity, 0);
                  return (
                    <tr key={order.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-400">
                        {order.orderNumber}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                        {formatDateTime(order.createdAt)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {order.serviceMode || order.tableOrTab}
                      </td>
                      <td className="py-2.5 px-3 text-slate-200">{order.serverName}</td>
                      <td className="py-2.5 px-3 text-slate-300">
                        <span className="font-medium">{order.paymentMethod}</span>
                        {order.paymentReference && (
                          <span className="block text-[10px] font-mono text-emerald-400">
                            Ref: {order.paymentReference}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-300">
                        {itemsCount}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-100">
                        {formatCurrency(order.totalAmount, state.settings?.currency)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setInspectedOrder(order)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                            title="Inspect BOM Deductions & Items"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {onOpenPrint && (
                            <button
                              type="button"
                              onClick={() =>
                                onOpenPrint({
                                  type: 'order_receipt',
                                  order,
                                })
                              }
                              className="p-1 rounded bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-400 cursor-pointer"
                              title="Reprint Receipt Slip"
                            >
                              <Printer className="w-3.5 h-3.5" />
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

      {/* Inspected Order Modal */}
      {inspectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-100">
                  Order Details · {inspectedOrder.orderNumber}
                </h3>
                <p className="text-xs text-slate-400">
                  {formatDateTime(inspectedOrder.createdAt)} · {inspectedOrder.serviceMode || inspectedOrder.tableOrTab}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedOrder(null)}
                className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 block text-[11px]">Server / Bartender</span>
                  <span className="text-slate-200 font-semibold">{inspectedOrder.serverName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Payment Tender</span>
                  <span className="text-slate-200 font-semibold">
                    {inspectedOrder.paymentMethod}
                    {inspectedOrder.paymentReference ? ` (${inspectedOrder.paymentReference})` : ''}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-300 mb-1.5">Items Purchased</h4>
                <div className="space-y-1 divide-y divide-slate-800/80">
                  {inspectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between py-1.5 font-mono">
                      <span className="text-slate-200">
                        {item.quantity}x {item.name}
                      </span>
                      <span className="text-slate-100 font-semibold">
                        {formatCurrency(item.unitPrice * item.quantity, state.settings?.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {inspectedOrder.deductions && inspectedOrder.deductions.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-300 mb-1.5">
                    Automated Raw Inventory Stock Deductions
                  </h4>
                  <div className="space-y-1 p-3 rounded-lg bg-slate-950 border border-slate-800">
                    {inspectedOrder.deductions.map((ded, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between font-mono text-[11px] text-slate-300"
                      >
                        <span>{ded.ingredientName}</span>
                        <span className="text-emerald-400">
                          -{ded.quantityDeducted} {ded.unit} (Rem: {ded.remainingStockAfter} {ded.unit})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              {onOpenPrint && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenPrint({
                      type: 'order_receipt',
                      order: inspectedOrder,
                    });
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  <span>Reprint Slip</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setInspectedOrder(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg cursor-pointer"
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
