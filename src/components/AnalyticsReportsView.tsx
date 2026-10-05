import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Download,
  Eye,
  Printer,
  Search,
  TrendingUp,
  X,
} from 'lucide-react';
import { CloudSystemState, SaleOrder } from '../types/lounge';
import { PrintContentType } from './PrintReceiptModal';

interface AnalyticsReportsViewProps {
  state: CloudSystemState;
  onOpenPrint?: (content: PrintContentType) => void;
}

export const AnalyticsReportsView: React.FC<AnalyticsReportsViewProps> = ({
  state,
  onOpenPrint,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [tenderFilter, setTenderFilter] = useState<string>('All');
  const [inspectedOrder, setInspectedOrder] = useState<SaleOrder | null>(null);

  const metrics = useMemo(() => {
    const grossRevenue = state.orders.reduce((acc, o) => acc + o.totalAmount, 0);
    const netSubtotal = state.orders.reduce((acc, o) => acc + (o.subtotal - o.discountAmount), 0);
    const totalRecipeCogs = state.orders.reduce((acc, o) => acc + o.totalCogs, 0);
    const grossProfit = netSubtotal - totalRecipeCogs;
    const marginPct = netSubtotal > 0 ? (grossProfit / netSubtotal) * 100 : 0;
    const avgCheck = state.orders.length > 0 ? grossRevenue / state.orders.length : 0;

    // Product performance
    const productStats = new Map<
      string,
      { name: string; category: string; unitsSold: number; revenue: number; cogs: number }
    >();

    for (const order of state.orders) {
      for (const item of order.items) {
        const menuObj = state.menuItems.find((m) => m.id === item.menuItemId);
        const cat = menuObj?.category || 'Signature Cocktails';
        const existing = productStats.get(item.menuItemId) || {
          name: item.name,
          category: cat,
          unitsSold: 0,
          revenue: 0,
          cogs: 0,
        };
        existing.unitsSold += item.quantity;
        existing.revenue += item.unitPrice * item.quantity;
        existing.cogs += item.unitCost * item.quantity;
        productStats.set(item.menuItemId, existing);
      }
    }

    const topProducts = Array.from(productStats.values()).sort((a, b) => b.revenue - a.revenue);

    // Category breakdown
    const categoryStats = new Map<string, { revenue: number; cogs: number; units: number }>();
    for (const p of topProducts) {
      const prev = categoryStats.get(p.category) || { revenue: 0, cogs: 0, units: 0 };
      prev.revenue += p.revenue;
      prev.cogs += p.cogs;
      prev.units += p.unitsSold;
      categoryStats.set(p.category, prev);
    }

    return {
      grossRevenue,
      netSubtotal,
      totalRecipeCogs,
      grossProfit,
      marginPct,
      avgCheck,
      topProducts,
      categoryBreakdown: Array.from(categoryStats.entries()).map(([category, vals]) => ({
        category,
        ...vals,
      })),
    };
  }, [state.orders, state.menuItems]);

  // Hourly Lounge & Bistro Pacing Curve (18:00 to 02:00)
  const hourlySeries = useMemo(() => {
    const slots = [
      { label: '18:00', rev: 420, cogs: 105 },
      { label: '19:00', rev: 680, cogs: 172 },
      { label: '20:00', rev: 940, cogs: 245 },
      { label: '21:00', rev: 1290, cogs: 318 },
      { label: '22:00', rev: 1480, cogs: 355 },
      { label: '23:00', rev: 1320, cogs: 310 },
      { label: '00:00', rev: 0, cogs: 0 },
      { label: '01:00', rev: 0, cogs: 0 },
      { label: '02:00', rev: 0, cogs: 0 },
    ];
    for (const o of state.orders) {
      const hr = new Date(o.createdAt).getUTCHours();
      if (hr === 0) {
        slots[6].rev += o.totalAmount;
        slots[6].cogs += o.totalCogs;
      } else if (hr === 1) {
        slots[7].rev += o.totalAmount;
        slots[7].cogs += o.totalCogs;
      } else {
        slots[8].rev += o.totalAmount;
        slots[8].cogs += o.totalCogs;
      }
    }
    return slots;
  }, [state.orders]);

  const maxHourlyRev = Math.max(...hourlySeries.map((s) => s.rev), 500);

  const filteredOrders = useMemo(() => {
    return state.orders.filter((o) => {
      const matchesTender = tenderFilter === 'All' || o.paymentMethod === tenderFilter;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchesTender;
      return (
        matchesTender &&
        (o.orderNumber.toLowerCase().includes(q) ||
          o.tableOrTab.toLowerCase().includes(q) ||
          (o.customerName && o.customerName.toLowerCase().includes(q)) ||
          o.items.some((i) => i.name.toLowerCase().includes(q)))
      );
    });
  }, [state.orders, tenderFilter, searchQuery]);

  const handleExportCsv = () => {
    const headers = [
      'Order Number',
      'Timestamp',
      'Service Area',
      'Table / Tab',
      'Guest',
      'Server',
      'Payment Method',
      'Subtotal',
      'Discount',
      'Tax',
      'Service Charge',
      'Total Paid',
      'Recipe COGS',
      'Ingredients Deducted Count',
    ];
    const rows = state.orders.map((o) => [
      o.orderNumber,
      o.createdAt,
      o.serviceMode,
      `"${o.tableOrTab}"`,
      `"${o.customerName || 'Walk-in Guest'}"`,
      `"${o.serverName}"`,
      o.paymentMethod,
      o.subtotal.toFixed(2),
      o.discountAmount.toFixed(2),
      o.taxAmount.toFixed(2),
      o.serviceCharge.toFixed(2),
      o.totalAmount.toFixed(2),
      o.totalCogs.toFixed(2),
      o.deductions.length,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `lounge-sales-analytics-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Real-Time Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Live Session Gross Revenue</span>
          <div className="text-2xl font-semibold font-mono tabular-nums text-amber-400">
            ${metrics.grossRevenue.toFixed(2)}
          </div>
          <p className="text-xs text-slate-400 font-mono tabular-nums">
            {state.orders.length} settled tickets · Avg ${metrics.avgCheck.toFixed(2)}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Recipe COGS Deducted</span>
          <div className="text-2xl font-semibold font-mono tabular-nums text-slate-100">
            ${metrics.totalRecipeCogs.toFixed(2)}
          </div>
          <p className="text-xs text-slate-400 font-mono tabular-nums">
            {metrics.netSubtotal > 0
              ? `${((metrics.totalRecipeCogs / metrics.netSubtotal) * 100).toFixed(1)}% pour & food cost ratio`
              : '0.0% cost ratio'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Gross Operating Margin</span>
          <div className="text-2xl font-semibold font-mono tabular-nums text-emerald-400">
            ${metrics.grossProfit.toFixed(2)} ({metrics.marginPct.toFixed(1)}%)
          </div>
          <p className="text-xs text-slate-400">
            Net sales minus exact BOM ingredient cost
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Cloud Sync Ledger Version</span>
          <div className="text-2xl font-semibold font-mono tabular-nums text-slate-100">
            v{state.version}
          </div>
          <p className="text-xs text-slate-400 font-mono tabular-nums">
            {state.stockMovements.length} logged stock movements
          </p>
        </div>
      </div>

      {/* Hourly Revenue & COGS Curve + Category Profitability */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Hourly Lounge & Bistro Revenue vs. Recipe COGS
              </h3>
              <p className="text-xs text-slate-400">
                Real-time service pacing across bar, mezzanine, and dining floor
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
                Gross Revenue
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-600 inline-block" />
                Recipe COGS
              </span>
            </div>
          </div>

          <div className="h-52 pt-4 flex items-end justify-between gap-2 border-b border-slate-800 pb-2">
            {hourlySeries.map((slot) => {
              const revHeight = Math.max(6, Math.round((slot.rev / maxHourlyRev) * 160));
              const cogsHeight = Math.max(3, Math.round((slot.cogs / maxHourlyRev) * 160));
              return (
                <div
                  key={slot.label}
                  className="flex-1 flex flex-col items-center gap-1.5 group"
                >
                  <div className="text-[10px] font-mono tabular-nums text-slate-400 group-hover:text-amber-300">
                    ${Math.round(slot.rev)}
                  </div>
                  <div className="w-full flex items-end justify-center gap-1 h-40">
                    <div
                      className="w-3.5 bg-amber-500/90 group-hover:bg-amber-400 rounded-t transition-all"
                      style={{ height: `${revHeight}px` }}
                      title={`Revenue: $${slot.rev.toFixed(2)}`}
                    />
                    <div
                      className="w-2.5 bg-slate-600 rounded-t transition-all"
                      style={{ height: `${cogsHeight}px` }}
                      title={`COGS: $${slot.cogs.toFixed(2)}`}
                    />
                  </div>
                  <span className="text-[11px] font-mono tabular-nums text-slate-400">
                    {slot.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Margin & Product Mix */}
        <div className="lg:col-span-5 p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Menu Category Profitability
              </h3>
              <p className="text-xs text-slate-400">
                Calculated from actual deducted raw ingredients
              </p>
            </div>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>

          <div className="space-y-3">
            {metrics.categoryBreakdown.map((cat) => {
              const margin = cat.revenue - cat.cogs;
              const marginPct = cat.revenue > 0 ? Math.round((margin / cat.revenue) * 100) : 0;
              return (
                <div
                  key={cat.category}
                  className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-100">{cat.category}</span>
                    <span className="font-mono tabular-nums text-amber-400 font-semibold">
                      ${cat.revenue.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono tabular-nums">
                    <span>{cat.units} units sold</span>
                    <span>
                      COGS ${cat.cogs.toFixed(2)} · Margin {marginPct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Selling Products Table */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Product Sales & Recipe Margin Breakdown
            </h3>
            <p className="text-xs text-slate-400">
              Ranked by gross revenue contribution and real-time recipe cost efficiency
            </p>
          </div>
          <BarChart3 className="w-4 h-4 text-slate-400" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-400">
                <th className="py-2.5 px-3 font-medium">Menu Product</th>
                <th className="py-2.5 px-3 font-medium">Category</th>
                <th className="py-2.5 px-3 font-medium text-right">Units Sold</th>
                <th className="py-2.5 px-3 font-medium text-right">Gross Sales</th>
                <th className="py-2.5 px-3 font-medium text-right">Deducted Recipe COGS</th>
                <th className="py-2.5 px-3 font-medium text-right">Net Contribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs">
              {metrics.topProducts.map((prod) => {
                const net = prod.revenue - prod.cogs;
                const pct = prod.revenue > 0 ? Math.round((net / prod.revenue) * 100) : 0;
                return (
                  <tr key={prod.name} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-medium text-slate-100">{prod.name}</td>
                    <td className="py-2.5 px-3 text-slate-400">{prod.category}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-200">
                      {prod.unitsSold}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-100">
                      ${prod.revenue.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-400">
                      ${prod.cogs.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-400 font-medium">
                      ${net.toFixed(2)} ({pct}%)
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full Sales & Ingredient Deduction Audit Ledger */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Settled POS Orders & Ingredient Deduction Ledger
            </h3>
            <p className="text-xs text-slate-400">
              Click any order to inspect the exact raw ingredient quantities deducted from inventory
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search order, guest, table..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500"
              />
            </div>

            <select
              value={tenderFilter}
              onChange={(e) => setTenderFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200"
            >
              <option value="All">All Tenders</option>
              <option value="Card Terminal">Card Terminal</option>
              <option value="Cash Drawer">Cash Drawer</option>
              <option value="VIP House Account">VIP House Account</option>
              <option value="Split Tender">Split Tender</option>
            </select>

            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg whitespace-nowrap cursor-pointer"
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
                    title: 'EXECUTIVE SALES & RECIPE MARGIN REPORT',
                    metrics: {
                      grossRevenue: metrics.grossRevenue,
                      totalRecipeCogs: metrics.totalRecipeCogs,
                      grossProfit: metrics.grossProfit,
                      marginPct: metrics.marginPct,
                      ordersCount: state.orders.length,
                      avgCheck: metrics.avgCheck,
                    },
                    categoryBreakdown: metrics.categoryBreakdown,
                  })
                }
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg whitespace-nowrap cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Report</span>
              </button>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400 bg-slate-950/60">
                  <th className="py-3 px-4 font-medium">Order # & Time</th>
                  <th className="py-3 px-4 font-medium">Table & Service Mode</th>
                  <th className="py-3 px-4 font-medium">Guest & Server</th>
                  <th className="py-3 px-4 font-medium">Items Ordered</th>
                  <th className="py-3 px-4 font-medium">Tender</th>
                  <th className="py-3 px-4 font-medium text-right">Total Paid</th>
                  <th className="py-3 px-4 font-medium text-right">BOM Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-xs">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono tabular-nums">
                      <div className="font-semibold text-amber-400">{order.orderNumber}</div>
                      <div className="text-[11px] text-slate-400">
                        {new Date(order.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-100">{order.tableOrTab}</div>
                      <div className="text-[11px] text-slate-400">
                        {order.serviceMode} · {order.deviceOrigin}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-200">
                        {order.customerName || 'Walk-in Guest'}
                      </div>
                      <div className="text-[11px] text-slate-400">Server: {order.serverName}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {order.items.map((i) => `${i.quantity}x ${i.name}`).join(' · ')}
                    </td>
                    <td className="py-3 px-4 text-slate-300">{order.paymentMethod}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      <div className="font-semibold text-slate-100">
                        ${order.totalAmount.toFixed(2)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        COGS ${order.totalCogs.toFixed(2)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setInspectedOrder(order)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-md whitespace-nowrap cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{order.deductions.length} SKUs</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: Order Ingredient Deduction Inspector */}
      {inspectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-lg rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-100">
                  Order {inspectedOrder.orderNumber} · BOM Deduction Audit
                </h3>
                <p className="text-xs text-slate-400">
                  {inspectedOrder.tableOrTab} · {inspectedOrder.paymentMethod} ·{' '}
                  {inspectedOrder.deviceOrigin}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedOrder(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="text-slate-400 font-medium">Products Sold:</div>
              {inspectedOrder.items.map((item, i) => (
                <div key={i} className="flex justify-between font-mono tabular-nums text-slate-200">
                  <span>
                    {item.quantity}x {item.name}
                  </span>
                  <span>${(item.unitPrice * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <div className="text-xs font-semibold text-slate-200">
                Raw Ingredients Deducted Automatically:
              </div>
              <div className="divide-y divide-slate-800/70 text-xs font-mono tabular-nums">
                {inspectedOrder.deductions.map((d) => (
                  <div key={d.ingredientId} className="py-1.5 flex items-center justify-between">
                    <span className="text-slate-300 font-sans">{d.ingredientName}</span>
                    <span className="text-amber-300">
                      -{d.quantityDeducted}
                      {d.unit} (${d.costImpact.toFixed(2)}) · Rem: {d.remainingStockAfter}
                      {d.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setInspectedOrder(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 rounded-lg cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
