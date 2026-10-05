import React, { useRef } from 'react';
import { Printer, X } from 'lucide-react';
import {
  CloudSystemState,
  EodReconciliation,
  PurchaseOrder,
  SaleOrder,
  Supplier,
} from '../types/lounge';
import { formatCurrency, formatDateTime } from '../utils/formatters';

export type PrintContentType =
  | { type: 'order_receipt'; order: SaleOrder }
  | { type: 'eod_report'; reconciliation: EodReconciliation }
  | { type: 'purchase_order'; po: PurchaseOrder; supplier?: Supplier }
  | {
      type: 'daily_recipe_usage';
      date: string;
      recipesUsed: Array<{
        recipeName: string;
        menuItemName: string;
        category: string;
        portionsCount: number;
        ingredientsSummary: Array<{ name: string; totalQty: number; unit: string; cost: number }>;
        totalCost: number;
      }>;
      totalIngredientsUsed: Array<{ name: string; totalQty: number; unit: string; cost: number }>;
      totalRecipeCost: number;
    }
  | {
      type: 'sales_analytics_report';
      title: string;
      metrics: {
        grossRevenue: number;
        totalRecipeCogs: number;
        grossProfit: number;
        marginPct: number;
        ordersCount: number;
        avgCheck: number;
      };
      categoryBreakdown: Array<{ category: string; revenue: number; cogs: number; units: number }>;
    };

interface PrintReceiptModalProps {
  content: PrintContentType | null;
  state: CloudSystemState;
  onClose: () => void;
}

export const PrintReceiptModal: React.FC<PrintReceiptModalProps> = ({
  content,
  state,
  onClose,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!content) return null;

  const { settings } = state;
  const isThermal = settings.print.paperSize === 'thermal_80mm';

  const handleTriggerPrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 print:p-0 print:bg-white print:static">
      {/* Modal Container */}
      <div className="w-full max-w-lg rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4 max-h-[95vh] overflow-y-auto print:max-h-none print:overflow-visible print:border-none print:bg-white print:text-black print:p-0">
        {/* Screen-Only Header with Actions */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-semibold text-slate-100">Print Preview</h3>
              <p className="text-xs text-slate-400">
                Format:{' '}
                {isThermal ? '80mm Thermal Receipt Roll' : 'Standard Full Sheet (A4 / Letter)'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTriggerPrint}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Now</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas */}
        <div
          ref={printAreaRef}
          className={`mx-auto bg-white text-neutral-900 font-mono text-xs p-6 rounded shadow-md print:shadow-none print:p-2 print:m-0 print:w-full ${
            isThermal ? 'max-w-[340px]' : 'max-w-[480px]'
          }`}
        >
          {/* Business Header */}
          <div className="text-center pb-3 border-b border-dashed border-neutral-400 space-y-1">
            {settings.print.showLogoOnReceipt && settings.branding.logoUrl ? (
              <img
                src={settings.branding.logoUrl}
                alt="Logo"
                className="w-12 h-12 mx-auto object-contain mb-1"
              />
            ) : (
              <div className="font-bold text-sm tracking-wide text-neutral-950 uppercase">
                {settings.print.receiptHeaderTitle || settings.branding.businessName}
              </div>
            )}
            <div className="text-[11px] text-neutral-700">
              {settings.print.receiptSubheader || settings.branding.tagline}
            </div>
            <div className="text-[10px] text-neutral-600">
              {settings.branding.address}
            </div>
            <div className="text-[10px] text-neutral-600">
              Tel: {settings.branding.phone} · Tax ID: {settings.branding.taxIdNumber}
            </div>
          </div>

          {/* RENDER CASE 1: ORDER RECEIPT */}
          {content.type === 'order_receipt' && (
            <div className="py-3 space-y-3">
              <div className="flex justify-between text-[11px] border-b border-neutral-300 pb-2">
                <div>
                  <div>Order: <strong>{content.order.orderNumber}</strong></div>
                  <div>Table: {content.order.tableOrTab}</div>
                  <div>Server: {content.order.serverName}</div>
                </div>
                <div className="text-right">
                  <div>{new Date(content.order.createdAt).toLocaleDateString()}</div>
                  <div>{formatDateTime(content.order.createdAt, settings.time)}</div>
                  <div>{content.order.serviceMode}</div>
                </div>
              </div>

              {content.order.customerName && (
                <div className="text-[11px] bg-neutral-100 p-1.5 rounded">
                  Guest: <strong>{content.order.customerName}</strong>
                </div>
              )}

              {/* Items Table */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[10px] font-bold border-b border-neutral-300 pb-1 text-neutral-600">
                  <span>QTY / ITEM</span>
                  <span>AMOUNT</span>
                </div>
                {content.order.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-[11px]">
                    <span className="truncate pr-2">
                      {it.quantity}x {it.name}
                    </span>
                    <span className="font-semibold shrink-0">
                      {formatCurrency(it.unitPrice * it.quantity, settings.currency)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="pt-2 border-t border-dashed border-neutral-400 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(content.order.subtotal, settings.currency)}</span>
                </div>
                {content.order.discountAmount > 0 && (
                  <div className="flex justify-between text-neutral-700">
                    <span>VIP Loyalty Discount:</span>
                    <span>-{formatCurrency(content.order.discountAmount, settings.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Hospitality Service ({settings.tax.serviceChargeRate}%):</span>
                  <span>{formatCurrency(content.order.serviceCharge, settings.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sales Tax ({settings.tax.salesTaxRate}%):</span>
                  <span>{formatCurrency(content.order.taxAmount, settings.currency)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm border-t border-neutral-800 pt-1.5 mt-1">
                  <span>TOTAL DUE:</span>
                  <span>{formatCurrency(content.order.totalAmount, settings.currency)}</span>
                </div>
                <div className="flex justify-between text-[10px] pt-1 text-neutral-600">
                  <span>Payment Tender:</span>
                  <span className="font-bold">{content.order.paymentMethod}</span>
                </div>
                {content.order.cashReceived && (
                  <>
                    <div className="flex justify-between text-[10px] text-neutral-600">
                      <span>Cash Received:</span>
                      <span>{formatCurrency(content.order.cashReceived, settings.currency)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-neutral-600">
                      <span>Change Returned:</span>
                      <span>{formatCurrency(content.order.changeGiven || 0, settings.currency)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Optional Recipe Ingredient Deductions on Receipt */}
              {settings.print.showIngredientDeductionsOnReceipt &&
                content.order.deductions.length > 0 && (
                  <div className="pt-2 border-t border-dashed border-neutral-300 space-y-1 text-[9px] text-neutral-600">
                    <div className="font-bold text-[10px] text-neutral-800">
                      AUTOMATED RECIPE STOCK DEDUCTION AUDIT:
                    </div>
                    {content.order.deductions.map((ded) => (
                      <div key={ded.ingredientId} className="flex justify-between">
                        <span>{ded.ingredientName}</span>
                        <span>
                          -{ded.quantityDeducted}
                          {ded.unit} (Bal: {ded.remainingStockAfter}
                          {ded.unit})
                        </span>
                      </div>
                    ))}
                  </div>
                )}

              {/* Tip / Signature lines */}
              <div className="pt-4 border-t border-dashed border-neutral-300 space-y-3 text-[10px]">
                <div className="flex justify-between">
                  <span>Additional Tip:</span>
                  <span className="border-b border-neutral-400 w-28 inline-block"></span>
                </div>
                <div className="flex justify-between">
                  <span>Total Paid:</span>
                  <span className="border-b border-neutral-400 w-28 inline-block"></span>
                </div>
                <div className="pt-2">
                  <div className="border-b border-neutral-400 w-full mb-1"></div>
                  <div className="text-center text-[9px] text-neutral-500">
                    Guest Signature / Cardholder Verification
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* RENDER CASE 2: EOD Z-REPORT */}
          {content.type === 'eod_report' && (
            <div className="py-3 space-y-3">
              <div className="text-center font-bold text-xs uppercase border-b border-neutral-300 pb-1">
                END-OF-DAY CLOSING Z-REPORT
              </div>

              <div className="flex justify-between text-[11px] border-b border-neutral-300 pb-2">
                <div>
                  <div>Date: <strong>{content.reconciliation.businessDate}</strong></div>
                  <div>Shift: {content.reconciliation.shiftLabel}</div>
                  <div>Closed By: {content.reconciliation.closedBy}</div>
                </div>
                <div className="text-right">
                  <div>Status: {content.reconciliation.status}</div>
                  <div>Orders: {content.reconciliation.ordersCount}</div>
                </div>
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="font-bold text-[11px] text-neutral-800">
                  CASH DRAWER RECONCILIATION
                </div>
                <div className="flex justify-between">
                  <span>Opening Cash Float:</span>
                  <span>{formatCurrency(content.reconciliation.openingFloat, settings.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>System Cash Sales:</span>
                  <span>{formatCurrency(content.reconciliation.cashSalesSystem, settings.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Petty Cash Payouts:</span>
                  <span>-{formatCurrency(content.reconciliation.cashPayouts, settings.currency)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t border-neutral-300 pt-1">
                  <span>Expected Cash In Drawer:</span>
                  <span>{formatCurrency(content.reconciliation.expectedCashInDrawer, settings.currency)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Physical Cash Counted:</span>
                  <span>{formatCurrency(content.reconciliation.actualCashCounted, settings.currency)}</span>
                </div>
                <div
                  className={`flex justify-between font-bold ${
                    Math.abs(content.reconciliation.cashVariance) < 0.01
                      ? 'text-neutral-800'
                      : 'text-red-700'
                  }`}
                >
                  <span>Cash Drawer Variance:</span>
                  <span>
                    {content.reconciliation.cashVariance >= 0 ? '+' : ''}
                    {formatCurrency(content.reconciliation.cashVariance, settings.currency)}
                  </span>
                </div>
              </div>

              <div className="space-y-1 pt-2 border-t border-neutral-300 text-[11px]">
                <div className="font-bold text-[11px] text-neutral-800">
                  TERMINAL & SETTLEMENTS
                </div>
                <div className="flex justify-between">
                  <span>Card System Sales:</span>
                  <span>{formatCurrency(content.reconciliation.cardSalesSystem, settings.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Terminal Batch Settlement:</span>
                  <span>{formatCurrency(content.reconciliation.cardTerminalBatchTotal, settings.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>VIP House Account Tabs:</span>
                  <span>{formatCurrency(content.reconciliation.vipAccountSalesSystem, settings.currency)}</span>
                </div>
              </div>

              <div className="space-y-1 pt-2 border-t border-neutral-300 text-[11px]">
                <div className="font-bold text-[11px] text-neutral-800">
                  FINANCIAL & INVENTORY AUDIT
                </div>
                <div className="flex justify-between font-bold">
                  <span>Gross Sales Total:</span>
                  <span>{formatCurrency(content.reconciliation.totalGrossSales, settings.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Deducted Recipe COGS:</span>
                  <span>-{formatCurrency(content.reconciliation.totalRecipeCogs, settings.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Spillage / Waste Write-off:</span>
                  <span>-{formatCurrency(content.reconciliation.wasteAndSpillageCost, settings.currency)}</span>
                </div>
                <div className="flex justify-between font-bold text-xs border-t border-neutral-800 pt-1">
                  <span>Net Operating Margin:</span>
                  <span>{formatCurrency(content.reconciliation.netOperatingMargin, settings.currency)}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-dashed border-neutral-400 space-y-2 text-[10px]">
                <div>Manager Notes: {content.reconciliation.notes}</div>
                <div className="pt-4 flex justify-between">
                  <div className="w-36 border-t border-neutral-400 text-center text-[9px]">
                    Manager Signature
                  </div>
                  <div className="w-36 border-t border-neutral-400 text-center text-[9px]">
                    Audit Verified Date
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* RENDER CASE 3: DAILY RECIPE USAGE LOG */}
          {content.type === 'daily_recipe_usage' && (
            <div className="py-3 space-y-3">
              <div className="text-center font-bold text-xs uppercase border-b border-neutral-300 pb-1">
                DAILY RECIPES & INGREDIENT USAGE LOG
              </div>

              <div className="flex justify-between text-[11px] border-b border-neutral-300 pb-2">
                <div>Date: <strong>{content.date}</strong></div>
                <div>Recipes Triggered: {content.recipesUsed.length}</div>
              </div>

              {/* Recipe List */}
              <div className="space-y-2">
                <div className="font-bold text-[10px] text-neutral-700 uppercase">
                  Recipes Prepared & Menu Products Used For:
                </div>
                {content.recipesUsed.map((r, i) => (
                  <div key={i} className="bg-neutral-50 p-2 rounded border border-neutral-200 text-[10px] space-y-1">
                    <div className="flex justify-between font-bold text-[11px]">
                      <span>{r.recipeName}</span>
                      <span>{r.portionsCount} portions</span>
                    </div>
                    <div className="text-neutral-600">
                      Product Used For: <strong>{r.menuItemName}</strong> ({r.category})
                    </div>
                    <div className="text-[9px] text-neutral-500">
                      Ingredients Deducted:{' '}
                      {r.ingredientsSummary
                        .map((ing) => `${ing.totalQty}${ing.unit} ${ing.name}`)
                        .join(' · ')}
                    </div>
                  </div>
                ))}
              </div>

              {/* Aggregated Daily Ingredient Totals */}
              <div className="pt-2 border-t border-neutral-300 space-y-1 text-[10px]">
                <div className="font-bold text-[11px] text-neutral-800">
                  TOTAL RAW INGREDIENT CONSUMPTION:
                </div>
                {content.totalIngredientsUsed.map((ing, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{ing.name}:</span>
                    <span className="font-semibold">
                      {ing.totalQty.toLocaleString()} {ing.unit} ({formatCurrency(ing.cost, settings.currency)})
                    </span>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-xs border-t border-neutral-800 pt-1 mt-1">
                  <span>TOTAL DAILY RECIPE COST:</span>
                  <span>{formatCurrency(content.totalRecipeCost, settings.currency)}</span>
                </div>
              </div>
            </div>
          )}

          {/* RENDER CASE 4: SALES ANALYTICS REPORT */}
          {content.type === 'sales_analytics_report' && (
            <div className="py-3 space-y-3">
              <div className="text-center font-bold text-xs uppercase border-b border-neutral-300 pb-1">
                {content.title}
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Gross Sales:</span>
                  <span className="font-bold">{formatCurrency(content.metrics.grossRevenue, settings.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Recipe COGS Deducted:</span>
                  <span>{formatCurrency(content.metrics.totalRecipeCogs, settings.currency)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Operating Margin:</span>
                  <span>
                    {formatCurrency(content.metrics.grossProfit, settings.currency)} ({content.metrics.marginPct.toFixed(1)}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Orders Settled:</span>
                  <span>{content.metrics.ordersCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Average Check:</span>
                  <span>{formatCurrency(content.metrics.avgCheck, settings.currency)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-300 space-y-1 text-[10px]">
                <div className="font-bold text-[10px] text-neutral-700">
                  CATEGORY PERFORMANCE
                </div>
                {content.categoryBreakdown.map((cat, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{cat.category} ({cat.units} sold):</span>
                    <span>{formatCurrency(cat.revenue, settings.currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RENDER CASE 5: PURCHASE ORDER */}
          {content.type === 'purchase_order' && (
            <div className="py-3 space-y-3">
              <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                <div>
                  <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                    PURCHASE ORDER
                  </div>
                  <div className="font-bold text-sm tracking-wide">{content.po.poNumber}</div>
                </div>
                <div className="text-right text-[10px]">
                  <span className="px-2 py-0.5 rounded font-mono font-semibold bg-neutral-200 text-neutral-800">
                    {content.po.status}
                  </span>
                  <div className="text-neutral-500 mt-1">
                    Date: {new Date(content.po.orderDate).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Vendor & Delivery Details */}
              <div className="grid grid-cols-2 gap-2 p-2 bg-neutral-100 rounded text-[10px]">
                <div>
                  <span className="font-bold block text-neutral-700">PURVEYOR / VENDOR:</span>
                  <div className="font-semibold text-neutral-900">{content.po.supplierName}</div>
                  {content.supplier && (
                    <div className="text-neutral-600 text-[9px]">
                      <div>{content.supplier.contactPerson} · {content.supplier.phone}</div>
                      <div>{content.supplier.email}</div>
                      <div>Terms: {content.supplier.paymentTerms}</div>
                    </div>
                  )}
                </div>
                <div>
                  <span className="font-bold block text-neutral-700">DELIVERY & CONTACT:</span>
                  <div>Expected: {new Date(content.po.expectedDeliveryDate).toLocaleDateString()}</div>
                  <div>Issued By: {content.po.createdBy}</div>
                  {content.po.receivedBy && <div>Received By: {content.po.receivedBy}</div>}
                </div>
              </div>

              {/* Line items table */}
              <div className="space-y-1">
                <div className="grid grid-cols-12 text-[10px] font-bold text-neutral-700 border-b border-neutral-300 pb-1">
                  <span className="col-span-6">Ingredient SKU</span>
                  <span className="col-span-2 text-right">Qty</span>
                  <span className="col-span-2 text-right">Unit</span>
                  <span className="col-span-2 text-right">Total</span>
                </div>
                {content.po.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 text-[10px] py-1 border-b border-neutral-200">
                    <div className="col-span-6 font-medium text-neutral-900 leading-tight">
                      {item.ingredientName}
                      {item.quantityReceived !== undefined && (
                        <span className="block text-[8px] text-emerald-700 font-mono">
                          Recv: {item.quantityReceived} {item.unit}
                        </span>
                      )}
                    </div>
                    <span className="col-span-2 text-right font-mono">{item.quantityOrdered}</span>
                    <span className="col-span-2 text-right font-mono">
                      {formatCurrency(item.unitCost, settings.currency)}/{item.unit}
                    </span>
                    <span className="col-span-2 text-right font-mono font-semibold">
                      {formatCurrency(item.totalCost, settings.currency)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals Breakdown */}
              <div className="pt-2 border-t border-neutral-800 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-mono">{formatCurrency(content.po.subtotal, settings.currency)}</span>
                </div>
                {content.po.tax > 0 && (
                  <div className="flex justify-between text-neutral-600">
                    <span>Tax:</span>
                    <span className="font-mono">{formatCurrency(content.po.tax, settings.currency)}</span>
                  </div>
                )}
                {content.po.shippingFee > 0 && (
                  <div className="flex justify-between text-neutral-600">
                    <span>Freight / Shipping:</span>
                    <span className="font-mono">{formatCurrency(content.po.shippingFee, settings.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xs pt-1 border-t border-neutral-400">
                  <span>TOTAL PO AMOUNT:</span>
                  <span className="font-mono">{formatCurrency(content.po.totalAmount, settings.currency)}</span>
                </div>
              </div>

              {content.po.notes && (
                <div className="p-1.5 rounded bg-neutral-100 text-[9px] text-neutral-600">
                  <strong>Notes:</strong> {content.po.notes}
                </div>
              )}

              {/* Authorized Signature Block */}
              <div className="pt-6 grid grid-cols-2 gap-4 text-[9px] text-neutral-600">
                <div className="border-t border-neutral-400 pt-1">
                  <div>Authorized Purveyor Signature</div>
                  <div className="text-[8px] text-neutral-400">Date: _______________</div>
                </div>
                <div className="border-t border-neutral-400 pt-1">
                  <div>Receiving Manager Signature</div>
                  <div className="text-[8px] text-neutral-400">Date: _______________</div>
                </div>
              </div>
            </div>
          )}

          {/* Receipt Footer Message */}
          <div className="pt-3 border-t border-dashed border-neutral-400 text-center text-[10px] text-neutral-600">
            <div>{settings.print.receiptFooterText}</div>
            <div className="text-[8px] text-neutral-400 mt-1">
              Printed via Lounge Management system · {new Date().toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
