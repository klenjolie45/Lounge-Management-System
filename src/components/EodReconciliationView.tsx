import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  Printer,
} from 'lucide-react';
import {
  CloudSystemState,
  EodReconciliation,
  SyncOperationType,
} from '../types/lounge';
import { PrintContentType } from './PrintReceiptModal';
import { formatCurrency } from '../utils/formatters';

interface EodReconciliationViewProps {
  state: CloudSystemState;
  onDispatch: (type: SyncOperationType, payload: any, description: string) => Promise<void>;
  onOpenPrint?: (content: PrintContentType) => void;
}

export const EodReconciliationView: React.FC<EodReconciliationViewProps> = ({
  state,
  onDispatch,
  onOpenPrint,
}) => {
  const [shiftLabel, setShiftLabel] = useState('Sunday Night Lounge & Bistro Close');
  const [closedBy, setClosedBy] = useState('Fadray Bukola (Admin / Owner)');
  const [openingFloat, setOpeningFloat] = useState<string>('500.00');
  const [cashPayouts, setCashPayouts] = useState<string>('35.00');

  // Denomination counter state for physical cash drawer count (1000, 500, 200, 100, 50, 20 naira only)
  const [bills1000, setBills1000] = useState<number>(0);
  const [bills500, setBills500] = useState<number>(1);
  const [bills200, setBills200] = useState<number>(1);
  const [bills100, setBills100] = useState<number>(1);
  const [bills50, setBills50] = useState<number>(1);
  const [bills20, setBills20] = useState<number>(1);
  const [coinsAmount, setCoinsAmount] = useState<string>('0.00');

  const [cardBatchInput, setCardBatchInput] = useState<string>('');
  const [managerNotes, setManagerNotes] = useState<string>(
    'All bar & bistro stations audited. Recipe stock deductions verified against physical backbar bottle weights.'
  );
  const [justSubmittedId, setJustSubmittedId] = useState<string | null>(null);

  // Aggregate current live session figures from state.orders and state.stockMovements
  const shiftMetrics = useMemo(() => {
    let cashSalesSystem = 0;
    let cardSalesSystem = 0;
    let vipAccountSalesSystem = 0;
    let totalGrossSales = 0;
    let totalTaxCollected = 0;
    let totalServiceCharges = 0;
    let totalDiscounts = 0;
    let totalRecipeCogs = 0;

    for (const order of state.orders) {
      totalGrossSales += order.totalAmount;
      totalTaxCollected += order.taxAmount;
      totalServiceCharges += order.serviceCharge;
      totalDiscounts += order.discountAmount;
      totalRecipeCogs += order.totalCogs;

      if (order.paymentMethod === 'Cash Drawer') {
        cashSalesSystem += order.totalAmount;
      } else if (order.paymentMethod === 'VIP House Account') {
        vipAccountSalesSystem += order.totalAmount;
      } else {
        cardSalesSystem += order.totalAmount;
      }
    }

    const wasteAndSpillageCost = state.stockMovements
      .filter((m) => m.type === 'WASTE_SPILLAGE')
      .reduce((acc, m) => acc + m.costImpact, 0);

    const lowStockAlertsAtClose = state.ingredients.filter(
      (i) => i.currentStock <= i.parLevel
    ).length;

    return {
      cashSalesSystem: Number(cashSalesSystem.toFixed(2)),
      cardSalesSystem: Number(cardSalesSystem.toFixed(2)),
      vipAccountSalesSystem: Number(vipAccountSalesSystem.toFixed(2)),
      totalGrossSales: Number(totalGrossSales.toFixed(2)),
      totalTaxCollected: Number(totalTaxCollected.toFixed(2)),
      totalServiceCharges: Number(totalServiceCharges.toFixed(2)),
      totalDiscounts: Number(totalDiscounts.toFixed(2)),
      totalRecipeCogs: Number(totalRecipeCogs.toFixed(2)),
      wasteAndSpillageCost: Number(wasteAndSpillageCost.toFixed(2)),
      lowStockAlertsAtClose,
    };
  }, [state.orders, state.stockMovements, state.ingredients]);

  const floatNum = parseFloat(openingFloat) || 0;
  const payoutsNum = parseFloat(cashPayouts) || 0;
  const expectedCashInDrawer = Number(
    (floatNum + shiftMetrics.cashSalesSystem - payoutsNum).toFixed(2)
  );

  const actualCashCounted = useMemo(() => {
    const billsSum =
      bills1000 * 1000 +
      bills500 * 500 +
      bills200 * 200 +
      bills100 * 100 +
      bills50 * 50 +
      bills20 * 20;
    const coins = parseFloat(coinsAmount) || 0;
    return Number((billsSum + coins).toFixed(2));
  }, [bills1000, bills500, bills200, bills100, bills50, bills20, coinsAmount]);

  const cashVariance = Number((actualCashCounted - expectedCashInDrawer).toFixed(2));

  const effectiveCardBatch =
    cardBatchInput.trim() === ''
      ? shiftMetrics.cardSalesSystem
      : parseFloat(cardBatchInput) || 0;
  const cardVariance = Number((effectiveCardBatch - shiftMetrics.cardSalesSystem).toFixed(2));

  const netOperatingMargin = Number(
    (
      shiftMetrics.totalGrossSales -
      shiftMetrics.totalTaxCollected -
      shiftMetrics.totalRecipeCogs -
      shiftMetrics.wasteAndSpillageCost
    ).toFixed(2)
  );

  const handleMatchExpectedCash = () => {
    let rem = Math.max(0, expectedCashInDrawer);
    const b1000 = Math.floor(rem / 1000);
    rem = Number((rem - b1000 * 1000).toFixed(2));
    const b500 = Math.floor(rem / 500);
    rem = Number((rem - b500 * 500).toFixed(2));
    const b200 = Math.floor(rem / 200);
    rem = Number((rem - b200 * 200).toFixed(2));
    const b100 = Math.floor(rem / 100);
    rem = Number((rem - b100 * 100).toFixed(2));
    const b50 = Math.floor(rem / 50);
    rem = Number((rem - b50 * 50).toFixed(2));
    const b20 = Math.floor(rem / 20);
    rem = Number((rem - b20 * 20).toFixed(2));

    setBills1000(b1000);
    setBills500(b500);
    setBills200(b200);
    setBills100(b100);
    setBills50(b50);
    setBills20(b20);
    setCoinsAmount(rem.toFixed(2));
  };

  const handleSubmitEod = async (e: React.FormEvent) => {
    e.preventDefault();
    const isBalanced = Math.abs(cashVariance) < 0.01 && Math.abs(cardVariance) < 0.01;
    const rec: EodReconciliation = {
      id: `eod-${Date.now()}`,
      businessDate: new Date().toISOString().slice(0, 10),
      closedAt: new Date().toISOString(),
      closedBy,
      shiftLabel,
      openingFloat: floatNum,
      cashSalesSystem: shiftMetrics.cashSalesSystem,
      cashPayouts: payoutsNum,
      expectedCashInDrawer,
      actualCashCounted,
      cashVariance,
      cardSalesSystem: shiftMetrics.cardSalesSystem,
      cardTerminalBatchTotal: effectiveCardBatch,
      cardVariance,
      vipAccountSalesSystem: shiftMetrics.vipAccountSalesSystem,
      totalGrossSales: shiftMetrics.totalGrossSales,
      totalTaxCollected: shiftMetrics.totalTaxCollected,
      totalServiceCharges: shiftMetrics.totalServiceCharges,
      totalDiscounts: shiftMetrics.totalDiscounts,
      totalRecipeCogs: shiftMetrics.totalRecipeCogs,
      wasteAndSpillageCost: shiftMetrics.wasteAndSpillageCost,
      netOperatingMargin,
      ordersCount: state.orders.length,
      lowStockAlertsAtClose: shiftMetrics.lowStockAlertsAtClose,
      notes: managerNotes,
      status: isBalanced ? 'RECONCILED_BALANCED' : 'VARIANCE_FLAGGED',
    };

    await onDispatch(
      'CREATE_EOD_RECONCILIATION',
      { reconciliation: rec },
      `Committed EOD Reconciliation (${rec.businessDate}) · Net Margin ${formatCurrency(rec.netOperatingMargin, state.settings?.currency)}`
    );

    setJustSubmittedId(rec.id);
  };

  return (
    <div className="space-y-6">
      {/* Top Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Expected Cash in Drawer</span>
          <div className="text-2xl font-semibold font-mono tabular-nums text-slate-100">
            {formatCurrency(expectedCashInDrawer, state.settings?.currency)}
          </div>
          <p className="text-xs text-slate-400 font-mono tabular-nums">
            Float {formatCurrency(floatNum, state.settings?.currency)} + Cash Sales {formatCurrency(shiftMetrics.cashSalesSystem, state.settings?.currency)} - Payouts {formatCurrency(payoutsNum, state.settings?.currency)}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Physical Counted Cash</span>
          <div className="text-2xl font-semibold font-mono tabular-nums text-amber-400">
            {formatCurrency(actualCashCounted, state.settings?.currency)}
          </div>
          <p
            className={`text-xs font-mono tabular-nums ${
              Math.abs(cashVariance) < 0.01
                ? 'text-emerald-400'
                : 'text-amber-300'
            }`}
          >
            Variance: {cashVariance >= 0 ? `+${formatCurrency(cashVariance, state.settings?.currency)}` : `-${formatCurrency(Math.abs(cashVariance), state.settings?.currency)}`}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Card & VIP House Settlement</span>
          <div className="text-2xl font-semibold font-mono tabular-nums text-slate-100">
            {formatCurrency(shiftMetrics.cardSalesSystem + shiftMetrics.vipAccountSalesSystem, state.settings?.currency)}
          </div>
          <p className="text-xs text-slate-400 font-mono tabular-nums">
            Card {formatCurrency(shiftMetrics.cardSalesSystem, state.settings?.currency)} · VIP House {formatCurrency(shiftMetrics.vipAccountSalesSystem, state.settings?.currency)}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Shift Net Operating Margin</span>
          <div className="text-2xl font-semibold font-mono tabular-nums text-emerald-400">
            {formatCurrency(netOperatingMargin, state.settings?.currency)}
          </div>
          <p className="text-xs text-slate-400 font-mono tabular-nums">
            COGS {formatCurrency(shiftMetrics.totalRecipeCogs, state.settings?.currency)} · Spillage {formatCurrency(shiftMetrics.wasteAndSpillageCost, state.settings?.currency)}
          </p>
        </div>
      </div>

      {/* Interactive EOD Closeout Workstation */}
      <form
        onSubmit={handleSubmitEod}
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
      >
        {/* Left 7 Columns: Cash Drawer Denomination Count & Float Controls */}
        <div className="lg:col-span-7 p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-amber-400" />
              <div>
                <h3 className="text-base font-semibold text-slate-100">
                  01. Physical Cash Drawer Count & Till Verification
                </h3>
                <p className="text-xs text-slate-400">
                  Enter physical currency denominations in the bar & bistro cash drawer
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleMatchExpectedCash}
              className="px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg cursor-pointer"
            >
              Auto-Fill Exact Expected Count
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">
                Opening Drawer Float ({state.settings?.currency?.symbol || '₦'})
              </label>
              <input
                type="number"
                step="0.01"
                value={openingFloat}
                onChange={(e) => setOpeningFloat(e.target.value)}
                className="w-full px-3 py-2 font-mono tabular-nums bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">
                Petty Cash Payouts / Ice & Garnish Runs ({state.settings?.currency?.symbol || '₦'})
              </label>
              <input
                type="number"
                step="0.01"
                value={cashPayouts}
                onChange={(e) => setCashPayouts(e.target.value)}
                className="w-full px-3 py-2 font-mono tabular-nums bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
              />
            </div>
          </div>

          {/* Denomination Grid (1000, 500, 200, 100, 50, 20 Naira Bills Only) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            {[
              { label: `${state.settings?.currency?.symbol || '₦'}1,000 Bills`, val: bills1000, setter: setBills1000, mult: 1000 },
              { label: `${state.settings?.currency?.symbol || '₦'}500 Bills`, val: bills500, setter: setBills500, mult: 500 },
              { label: `${state.settings?.currency?.symbol || '₦'}200 Bills`, val: bills200, setter: setBills200, mult: 200 },
              { label: `${state.settings?.currency?.symbol || '₦'}100 Bills`, val: bills100, setter: setBills100, mult: 100 },
              { label: `${state.settings?.currency?.symbol || '₦'}50 Bills`, val: bills50, setter: setBills50, mult: 50 },
              { label: `${state.settings?.currency?.symbol || '₦'}20 Bills`, val: bills20, setter: setBills20, mult: 20 },
            ].map((denom) => (
              <div
                key={denom.label}
                className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5"
              >
                <div className="flex items-center justify-between text-slate-400">
                  <span className="font-medium text-slate-300">{denom.label}</span>
                  <span className="font-mono tabular-nums text-slate-300">
                    {formatCurrency(denom.val * denom.mult, state.settings?.currency)}
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  value={denom.val}
                  onChange={(e) => denom.setter(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-2.5 py-1.5 font-mono tabular-nums bg-slate-900 border border-slate-800 rounded text-slate-100"
                />
              </div>
            ))}

            <div className="col-span-2 sm:col-span-3 p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-slate-400">
                <span>Loose Rolled Coins & Change ({state.settings?.currency?.symbol || '₦'})</span>
                <span className="font-mono tabular-nums text-slate-300">
                  {formatCurrency(parseFloat(coinsAmount) || 0, state.settings?.currency)}
                </span>
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                value={coinsAmount}
                onChange={(e) => setCoinsAmount(e.target.value)}
                className="w-full px-2.5 py-1.5 font-mono tabular-nums bg-slate-900 border border-slate-800 rounded text-slate-100"
              />
            </div>
          </div>

          {/* Drawer Variance Status Box */}
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {Math.abs(cashVariance) < 0.01 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span className="text-slate-200 font-medium">
                {Math.abs(cashVariance) < 0.01
                  ? `Cash Drawer Perfectly Balanced (${formatCurrency(0, state.settings?.currency)} Variance)`
                  : cashVariance > 0
                  ? `Cash Drawer Overage Flagged (+${formatCurrency(cashVariance, state.settings?.currency)})`
                  : `Cash Drawer Shortage Flagged (-${formatCurrency(Math.abs(cashVariance), state.settings?.currency)})`}
              </span>
            </div>
            <span className="font-mono tabular-nums text-slate-400">
              Counted {formatCurrency(actualCashCounted, state.settings?.currency)} vs Expected {formatCurrency(expectedCashInDrawer, state.settings?.currency)}
            </span>
          </div>
        </div>

        {/* Right 5 Columns: Card Batch, Inventory Usage Sign-off & Commit Z-Report */}
        <div className="lg:col-span-5 p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="text-base font-semibold text-slate-100">
              02. Card Batch & Recipe Stock Sign-Off
            </h3>
            <p className="text-xs text-slate-400">
              Verify terminal settlement and commit final Z-Report to cloud archive
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="col-span-2">
              <label className="block text-slate-400 mb-1">Shift Closeout Title</label>
              <input
                type="text"
                required
                value={shiftLabel}
                onChange={(e) => setShiftLabel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Reconciling Manager</label>
              <input
                type="text"
                required
                value={closedBy}
                onChange={(e) => setClosedBy(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">
                Card Terminal Batch Total ({state.settings?.currency?.symbol || '₦'})
              </label>
              <input
                type="number"
                step="0.01"
                value={cardBatchInput}
                onChange={(e) => setCardBatchInput(e.target.value)}
                placeholder={shiftMetrics.cardSalesSystem.toFixed(2)}
                className="w-full px-3 py-2 font-mono tabular-nums bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
              />
            </div>
          </div>

          {/* Inventory & Financial Audit Summary */}
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-xs font-mono tabular-nums">
            <div className="flex justify-between text-slate-300">
              <span className="font-sans text-slate-400">Gross Shift Sales ({state.orders.length} Orders)</span>
              <span>{formatCurrency(shiftMetrics.totalGrossSales, state.settings?.currency)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="font-sans text-slate-400">Deducted Recipe Ingredients COGS</span>
              <span>-{formatCurrency(shiftMetrics.totalRecipeCogs, state.settings?.currency)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="font-sans text-slate-400">Logged Bar/Kitchen Spillage Cost</span>
              <span>-{formatCurrency(shiftMetrics.wasteAndSpillageCost, state.settings?.currency)}</span>
            </div>
            <div className="flex justify-between text-amber-300">
              <span className="font-sans">Low-Stock Ingredients Flagged for PO</span>
              <span>{shiftMetrics.lowStockAlertsAtClose} SKUs</span>
            </div>
          </div>

          <div className="text-xs">
            <label className="block text-slate-400 mb-1">Shift Handover & Audit Notes</label>
            <textarea
              rows={2}
              value={managerNotes}
              onChange={(e) => setManagerNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 py-3 px-4 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>Commit & Finalize Z-Report</span>
            </button>
            {onOpenPrint && (
              <button
                type="button"
                onClick={() => {
                  const previewRec: EodReconciliation = {
                    id: 'preview',
                    businessDate: new Date().toISOString().slice(0, 10),
                    closedAt: new Date().toISOString(),
                    closedBy,
                    shiftLabel,
                    openingFloat: floatNum,
                    cashSalesSystem: shiftMetrics.cashSalesSystem,
                    cashPayouts: payoutsNum,
                    expectedCashInDrawer,
                    actualCashCounted,
                    cashVariance,
                    cardSalesSystem: shiftMetrics.cardSalesSystem,
                    cardTerminalBatchTotal: effectiveCardBatch,
                    cardVariance,
                    vipAccountSalesSystem: shiftMetrics.vipAccountSalesSystem,
                    totalGrossSales: shiftMetrics.totalGrossSales,
                    totalTaxCollected: shiftMetrics.totalTaxCollected,
                    totalServiceCharges: shiftMetrics.totalServiceCharges,
                    totalDiscounts: shiftMetrics.totalDiscounts,
                    totalRecipeCogs: shiftMetrics.totalRecipeCogs,
                    wasteAndSpillageCost: shiftMetrics.wasteAndSpillageCost,
                    netOperatingMargin,
                    ordersCount: state.orders.length,
                    lowStockAlertsAtClose: shiftMetrics.lowStockAlertsAtClose,
                    notes: managerNotes,
                    status: Math.abs(cashVariance) < 0.01 ? 'RECONCILED_BALANCED' : 'VARIANCE_FLAGGED',
                  };
                  onOpenPrint({ type: 'eod_report', reconciliation: previewRec });
                }}
                className="px-3.5 py-3 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Print Draft Z-Report"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Print Slip</span>
              </button>
            )}
          </div>

          {justSubmittedId && (
            <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-700/50 text-xs text-emerald-300 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 shrink-0" />
              <span>
                End-of-Day Z-Report archived and synchronized with cloud ledger.
              </span>
            </div>
          )}
        </div>
      </form>

      {/* Historical EOD Reconciliation Archive Table */}
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-semibold text-slate-100">
            Historical End-of-Day Reconciliation Ledger
          </h3>
          <p className="text-xs text-slate-400">
            Audited Z-Reports across shifts with cash variance, recipe COGS, and net margin
          </p>
        </div>

        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400 bg-slate-950/60">
                  <th className="py-3 px-4 font-medium">Business Date & Shift</th>
                  <th className="py-3 px-4 font-medium">Closed By</th>
                  <th className="py-3 px-4 font-medium text-right">Gross Sales</th>
                  <th className="py-3 px-4 font-medium text-right">Expected vs Counted Cash</th>
                  <th className="py-3 px-4 font-medium text-right">Cash Variance</th>
                  <th className="py-3 px-4 font-medium text-right">Recipe COGS</th>
                  <th className="py-3 px-4 font-medium text-right">Net Margin</th>
                  <th className="py-3 px-4 font-medium">Audit Status</th>
                  <th className="py-3 px-4 font-medium text-right">Z-Report Slip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-xs">
                {state.reconciliations.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4">
                      <div className="font-mono tabular-nums font-semibold text-slate-100">
                        {rec.businessDate}
                      </div>
                      <div className="text-[11px] text-slate-400">{rec.shiftLabel}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <div>{rec.closedBy}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">
                        {rec.notes}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-100">
                      {formatCurrency(rec.totalGrossSales, state.settings?.currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-300">
                      {formatCurrency(rec.expectedCashInDrawer, state.settings?.currency)} / {formatCurrency(rec.actualCashCounted, state.settings?.currency)}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono tabular-nums font-medium ${
                        Math.abs(rec.cashVariance) < 0.01
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {rec.cashVariance >= 0
                        ? `+${formatCurrency(rec.cashVariance, state.settings?.currency)}`
                        : `-${formatCurrency(Math.abs(rec.cashVariance), state.settings?.currency)}`}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-400">
                      {formatCurrency(rec.totalRecipeCogs, state.settings?.currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-400 font-semibold">
                      {formatCurrency(rec.netOperatingMargin, state.settings?.currency)}
                    </td>
                    <td className="py-3 px-4">
                      {rec.status === 'RECONCILED_BALANCED' ? (
                        <span className="text-emerald-400 font-medium">Balanced</span>
                      ) : (
                        <span className="text-amber-400 font-medium">Variance Flagged</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {onOpenPrint && (
                        <button
                          type="button"
                          onClick={() => onOpenPrint({ type: 'eod_report', reconciliation: rec })}
                          className="px-2.5 py-1 text-xs text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Print Slip</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
