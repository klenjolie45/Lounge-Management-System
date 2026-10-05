import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  GlassWater,
  Minus,
  Plus,
  Printer,
  Receipt,
  Search,
  ShoppingBag,
  Trash2,
  UserCheck,
  Utensils,
  Wine,
  X,
} from 'lucide-react';
import { PrintContentType } from './PrintReceiptModal';
import { formatCurrency } from '../utils/formatters';
import {
  CloudSystemState,
  CustomerProfile,
  Ingredient,
  MenuCategory,
  MenuItem,
  OrderItem,
  PaymentMethod,
  SaleOrder,
  ServiceMode,
  SyncOperationType,
} from '../types/lounge';

import imgOldFashioned from '../assets/images/pos_smoked_old_fashioned_1791193062525.jpg';
import imgWagyuSliders from '../assets/images/pos_truffle_wagyu_sliders_1791193074263.jpg';
import imgEspressoMartini from '../assets/images/pos_espresso_martini_1791193085971.jpg';
import imgBurrataBoard from '../assets/images/pos_burrata_charcuterie_1791193097627.jpg';

const IMAGE_MAP: Record<string, string> = {
  old_fashioned: imgOldFashioned,
  wagyu_sliders: imgWagyuSliders,
  espresso_martini: imgEspressoMartini,
  burrata_charcuterie: imgBurrataBoard,
};

interface PosTerminalViewProps {
  state: CloudSystemState;
  deviceId: string;
  isOnline: boolean;
  preselectedCustomer: CustomerProfile | null;
  onClearPreselectedCustomer: () => void;
  onDispatch: (type: SyncOperationType, payload: any, description: string) => Promise<void>;
  onNavigateToInventory: () => void;
  onOpenPrint?: (content: PrintContentType) => void;
}

const CATEGORIES: Array<'All' | MenuCategory> = [
  'All',
  'Signature Cocktails',
  'Bistro Plates',
  'Artisanal Shareables',
  'Cellar & Reserve',
];

const TABLES_LIST = [
  'Booth 01 · Velvet Corner',
  'Booth 02 · Amber Alcove',
  'Mezzanine Table 04',
  'Mezzanine Table 05',
  'Main Bar · Seat 01',
  'Main Bar · Seat 03',
  'Bistro Window 08',
  'Terrace Firepit Lounge',
];

export const PosTerminalView: React.FC<PosTerminalViewProps> = ({
  state,
  deviceId,
  isOnline,
  preselectedCustomer,
  onClearPreselectedCustomer,
  onDispatch,
  onNavigateToInventory,
  onOpenPrint,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'All' | MenuCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<Array<{ menuItem: MenuItem; quantity: number; notes: string }>>(
    []
  );
  const [serviceMode, setServiceMode] = useState<ServiceMode>('Lounge Table');
  const [tableOrTab, setTableOrTab] = useState<string>(TABLES_LIST[0]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    preselectedCustomer?.id || ''
  );
  const [serverName, setServerName] = useState<string>('Mateo S.');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Card Terminal');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [completedReceipt, setCompletedReceipt] = useState<SaleOrder | null>(null);

  // Sync preselected customer from CRM tab if passed
  React.useEffect(() => {
    if (preselectedCustomer) {
      setSelectedCustomerId(preselectedCustomer.id);
      if (preselectedCustomer.seatingPreference) {
        setTableOrTab(preselectedCustomer.seatingPreference);
      }
      onClearPreselectedCustomer();
    }
  }, [preselectedCustomer, onClearPreselectedCustomer]);

  const ingredientMap = useMemo(() => {
    const map = new Map<string, Ingredient>();
    for (const ing of state.ingredients) {
      map.set(ing.id, ing);
    }
    return map;
  }, [state.ingredients]);

  // Calculate how much of each ingredient is currently reserved in the active POS cart
  const cartReservedIngredients = useMemo(() => {
    const reserved = new Map<string, number>();
    for (const entry of cart) {
      for (const comp of entry.menuItem.recipe) {
        const prev = reserved.get(comp.ingredientId) || 0;
        reserved.set(comp.ingredientId, prev + comp.quantity * entry.quantity);
      }
    }
    return reserved;
  }, [cart]);

  // Calculate buildable servings and unit recipe cost for a menu item
  const getMenuMetrics = (item: MenuItem) => {
    let maxServings = Infinity;
    let unitCost = 0;
    let hasLowStockIngredient = false;
    let limitingIngredientName = '';

    for (const comp of item.recipe) {
      const ing = ingredientMap.get(comp.ingredientId);
      if (!ing) continue;
      unitCost += comp.quantity * ing.costPerUnit;
      const reservedQty = cartReservedIngredients.get(ing.id) || 0;
      const availableAfterCart = Math.max(0, ing.currentStock - reservedQty);
      const possibleFromIng = Math.floor(availableAfterCart / comp.quantity);
      if (possibleFromIng < maxServings) {
        maxServings = possibleFromIng;
        limitingIngredientName = ing.name;
      }
      if (ing.currentStock <= ing.parLevel) {
        hasLowStockIngredient = true;
      }
    }

    if (maxServings === Infinity) maxServings = 99;

    return {
      maxServings,
      unitCost: Number(unitCost.toFixed(2)),
      hasLowStockIngredient,
      limitingIngredientName,
    };
  };

  const filteredMenu = useMemo(() => {
    return state.menuItems.filter((item) => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchesCategory;
      const recipeNames = item.recipe
        .map((r) => ingredientMap.get(r.ingredientId)?.name.toLowerCase() || '')
        .join(' ');
      return (
        matchesCategory &&
        (item.name.toLowerCase().includes(q) ||
          item.sku.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          recipeNames.includes(q))
      );
    });
  }, [state.menuItems, selectedCategory, searchQuery, ingredientMap]);

  const selectedCustomer = useMemo(
    () => state.customers.find((c) => c.id === selectedCustomerId) || null,
    [state.customers, selectedCustomerId]
  );

  const addToCart = (item: MenuItem) => {
    const { maxServings } = getMenuMetrics(item);
    if (maxServings <= 0) return;

    setCart((prev) => {
      const existing = prev.find((e) => e.menuItem.id === item.id);
      if (existing) {
        return prev.map((e) =>
          e.menuItem.id === item.id ? { ...e, quantity: e.quantity + 1 } : e
        );
      }
      return [...prev, { menuItem: item, quantity: 1, notes: '' }];
    });
  };

  const updateCartQuantity = (menuItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((entry) => {
          if (entry.menuItem.id !== menuItemId) return entry;
          const nextQty = entry.quantity + delta;
          return nextQty > 0 ? { ...entry, quantity: nextQty } : null;
        })
        .filter(Boolean) as Array<{ menuItem: MenuItem; quantity: number; notes: string }>
    );
  };

  // Financial calculations
  const orderTotals = useMemo(() => {
    let subtotal = 0;
    let totalCogs = 0;
    for (const entry of cart) {
      subtotal += entry.menuItem.price * entry.quantity;
      const { unitCost } = getMenuMetrics(entry.menuItem);
      totalCogs += unitCost * entry.quantity;
    }
    const discountRate =
      selectedCustomer?.tier === 'Obsidian VIP'
        ? 0.1
        : selectedCustomer?.tier === 'Gold Reserve'
        ? 0.05
        : 0;
    const discountAmount = Number((subtotal * discountRate).toFixed(2));
    const discountedSubtotal = subtotal - discountAmount;
    const taxAmount = Number((discountedSubtotal * 0.0875).toFixed(2));
    const serviceCharge = Number((discountedSubtotal * 0.18).toFixed(2));
    const totalAmount = Number((discountedSubtotal + taxAmount + serviceCharge).toFixed(2));

    return {
      subtotal: Number(subtotal.toFixed(2)),
      discountRate,
      discountAmount,
      taxAmount,
      serviceCharge,
      totalAmount,
      totalCogs: Number(totalCogs.toFixed(2)),
    };
  }, [cart, selectedCustomer, ingredientMap]);

  // Real-time preview of exact ingredient deductions for this ticket
  const pendingDeductionsPreview = useMemo(() => {
    const list: Array<{
      ingredient: Ingredient;
      toDeduct: number;
      afterStock: number;
      willTriggerAlert: boolean;
    }> = [];
    cartReservedIngredients.forEach((toDeduct, ingId) => {
      const ing = ingredientMap.get(ingId);
      if (ing) {
        const afterStock = Math.max(0, Number((ing.currentStock - toDeduct).toFixed(2)));
        list.push({
          ingredient: ing,
          toDeduct: Number(toDeduct.toFixed(2)),
          afterStock,
          willTriggerAlert: afterStock <= ing.parLevel,
        });
      }
    });
    return list;
  }, [cartReservedIngredients, ingredientMap]);

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;

    const orderNumber = `LMS-${8495 + state.orders.length}`;
    const orderItems: OrderItem[] = cart.map((entry) => {
      const { unitCost } = getMenuMetrics(entry.menuItem);
      return {
        menuItemId: entry.menuItem.id,
        name: entry.menuItem.name,
        quantity: entry.quantity,
        unitPrice: entry.menuItem.price,
        unitCost,
        notes: entry.notes || undefined,
      };
    });

    const cashNum = parseFloat(cashTendered) || orderTotals.totalAmount;
    const changeGiven =
      paymentMethod === 'Cash Drawer'
        ? Math.max(0, Number((cashNum - orderTotals.totalAmount).toFixed(2)))
        : undefined;

    const deductions = pendingDeductionsPreview.map((d) => ({
      ingredientId: d.ingredient.id,
      ingredientName: d.ingredient.name,
      quantityDeducted: d.toDeduct,
      unit: d.ingredient.unit,
      remainingStockAfter: d.afterStock,
      costImpact: Number((d.toDeduct * d.ingredient.costPerUnit).toFixed(2)),
    }));

    const newOrder: SaleOrder = {
      id: `ord-${Date.now()}`,
      orderNumber,
      createdAt: new Date().toISOString(),
      tableOrTab,
      serviceMode,
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name,
      serverName,
      items: orderItems,
      subtotal: orderTotals.subtotal,
      taxAmount: orderTotals.taxAmount,
      serviceCharge: orderTotals.serviceCharge,
      discountAmount: orderTotals.discountAmount,
      totalAmount: orderTotals.totalAmount,
      totalCogs: orderTotals.totalCogs,
      paymentMethod,
      cashReceived: paymentMethod === 'Cash Drawer' ? cashNum : undefined,
      changeGiven,
      deductions,
      syncedFromOffline: !isOnline,
      deviceOrigin: deviceId,
    };

    await onDispatch(
      'CREATE_SALE',
      { order: newOrder },
      `Sale ${orderNumber} (${formatCurrency(orderTotals.totalAmount, state.settings.currency)}) · Deducted ${deductions.length} recipe ingredients`
    );

    setCompletedReceipt(newOrder);
    setCart([]);
    setCashTendered('');

    if (state.settings.print.autoPrintReceiptOnSale && onOpenPrint) {
      onOpenPrint({ type: 'order_receipt', order: newOrder });
    }
  };

  const lowStockCount = state.ingredients.filter((i) => i.currentStock <= i.parLevel).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left 8 Columns: Menu Grid & Recipe Availability */}
      <div className="lg:col-span-8 space-y-5">
        {/* Low Stock Alert Strip */}
        {lowStockCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-950/40 border border-amber-700/50 text-amber-200">
            <div className="flex items-center gap-2.5 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong className="font-semibold text-amber-100">
                  {lowStockCount} Raw Ingredients Below Par Threshold
                </strong>
                {' · '}
                Automatic recipe deductions are active on every sale.
              </span>
            </div>
            <button
              type="button"
              onClick={onNavigateToInventory}
              className="text-xs font-semibold text-amber-300 hover:text-amber-100 underline underline-offset-4 whitespace-nowrap cursor-pointer"
            >
              Inspect Low-Stock Queue
            </button>
          </div>
        )}

        {/* Filter Controls & Live Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-800">
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative min-w-[230px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search menu or ingredient..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Menu Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMenu.map((item) => {
            const { maxServings, unitCost, hasLowStockIngredient, limitingIngredientName } =
              getMenuMetrics(item);
            const isOut = maxServings <= 0;
            const imgSrc = item.imageKey ? IMAGE_MAP[item.imageKey] : undefined;
            const showImage = imgSrc && !brokenImages[item.id];
            const inCartQty = cart.find((c) => c.menuItem.id === item.id)?.quantity || 0;

            return (
              <div
                key={item.id}
                className={`flex flex-col justify-between rounded-xl bg-slate-900/90 border transition-colors overflow-hidden ${
                  isOut
                    ? 'border-red-900/50 opacity-60'
                    : inCartQty > 0
                    ? 'border-amber-500/70'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Optional High-Craft Visual Header for Featured Items */}
                  {showImage ? (
                    <div className="relative h-36 w-full overflow-hidden bg-slate-950">
                      <img
                        src={imgSrc}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setBrokenImages((prev) => ({ ...prev, [item.id]: true }))
                        }
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                      <div className="absolute bottom-2.5 left-3.5 right-3.5 flex items-end justify-between gap-2">
                        <span className="text-xs text-slate-300">
                          {item.category} · {item.sku}
                        </span>
                        <span className="text-base font-semibold font-mono tabular-nums text-amber-400">
                          ${item.price.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 pt-4 pb-2 flex items-center justify-between border-b border-slate-800/70">
                      <span className="text-xs text-slate-400">
                        {item.category} · {item.sku}
                      </span>
                      <span className="text-base font-semibold font-mono tabular-nums text-amber-400">
                        ${item.price.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-semibold text-slate-100 leading-snug">
                        {item.name}
                      </h3>
                      {inCartQty > 0 && (
                        <span className="text-xs font-mono tabular-nums font-semibold text-amber-400 shrink-0">
                          {inCartQty} in ticket
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>

                    {/* Auto-Deducted Recipe BOM Breakdown (Unboxed quiet metadata with · separator) */}
                    <div className="pt-2 border-t border-slate-800/80 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Auto-Deduct Recipe BOM</span>
                        <span className="font-mono tabular-nums">
                          COGS ${unitCost.toFixed(2)} · Margin{' '}
                          {Math.round(((item.price - unitCost) / item.price) * 100)}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {item.recipe.map((r, idx) => {
                          const ing = ingredientMap.get(r.ingredientId);
                          if (!ing) return null;
                          const isLow = ing.currentStock <= ing.parLevel;
                          return (
                            <React.Fragment key={r.ingredientId}>
                              {idx > 0 && <span className="mx-1.5 text-slate-600">·</span>}
                              <span className={isLow ? 'text-amber-300 font-medium' : ''}>
                                {r.quantity}
                                {ing.unit} {ing.name}
                              </span>
                            </React.Fragment>
                          );
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Real-Time Deliverable Stock & Add Button */}
                <div className="px-4 py-3 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between gap-3">
                  <div className="text-xs">
                    {isOut ? (
                      <span className="text-red-400 font-medium">
                        Depleted ({limitingIngredientName})
                      </span>
                    ) : hasLowStockIngredient ? (
                      <span className="text-amber-300 font-mono tabular-nums">
                        Low Stock Alert · {maxServings} servings left
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-mono tabular-nums">
                        In Stock · {maxServings} buildable
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={isOut}
                    onClick={() => addToCart(item)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                      isOut
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to Ticket</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right 4 Columns: Active POS Ticket & Real-Time Ingredient Deduction Ledger */}
      <div id="pos-ticket-panel" className="lg:col-span-4 rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-5 sticky top-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Active Lounge Ticket</h2>
            <p className="text-xs text-slate-400 font-mono tabular-nums">
              {deviceId} · {isOnline ? 'Cloud Live' : 'Offline Local Queue'}
            </p>
          </div>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={() => setCart([])}
              className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Service Mode, Table Assignment & Guest Link */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Service Area</label>
              <select
                value={serviceMode}
                onChange={(e) => setServiceMode(e.target.value as ServiceMode)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="Lounge Table">Lounge Table</option>
                <option value="VIP Booth">VIP Booth</option>
                <option value="Bar Tab">Bar Tab</option>
                <option value="Bistro Dining">Bistro Dining</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Table / Tab</label>
              <select
                value={tableOrTab}
                onChange={(e) => setTableOrTab(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
              >
                {TABLES_LIST.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Guest / VIP Loyalty Profile
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="">Walk-in Lounge Guest</option>
                {state.customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.tier})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Server / Bartender</label>
              <select
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="Mateo S.">Mateo S. (Lead Bar)</option>
                <option value="Claire D.">Claire D. (Mezzanine)</option>
                <option value="Henri L.">Henri L. (GM Floor)</option>
              </select>
            </div>
          </div>

          {selectedCustomer && (
            <div className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1">
              <div className="flex items-center justify-between text-amber-300 font-medium">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5" />
                  {selectedCustomer.name} · {selectedCustomer.tier}
                </span>
                <span className="font-mono tabular-nums">
                  {selectedCustomer.loyaltyPoints} pts
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Pref: {selectedCustomer.seatingPreference} · Note: {selectedCustomer.dietaryNotes}
              </p>
            </div>
          )}
        </div>

        {/* Cart Items List */}
        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
          {cart.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-slate-800 rounded-lg space-y-2">
              <ShoppingBag className="w-6 h-6 text-slate-500 mx-auto" />
              <p className="text-xs text-slate-400">
                Select cocktails or bistro plates to open a ticket.
              </p>
              <p className="text-[11px] text-slate-500">
                Recipe ingredients deduct automatically upon settlement.
              </p>
            </div>
          ) : (
            cart.map((entry) => (
              <div
                key={entry.menuItem.id}
                className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/90 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-100 truncate">
                    {entry.menuItem.name}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono tabular-nums">
                    ${entry.menuItem.price.toFixed(2)} each · Subtotal $
                    {(entry.menuItem.price * entry.quantity).toFixed(2)}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => updateCartQuantity(entry.menuItem.id, -1)}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-xs font-mono tabular-nums font-semibold text-slate-100">
                    {entry.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => addToCart(entry.menuItem)}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Live Automatic Ingredient Deduction Preview */}
        {pendingDeductionsPreview.length > 0 && (
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-medium text-slate-300">
                Real-Time Inventory Deduction Preview
              </span>
              <span className="font-mono tabular-nums">
                {pendingDeductionsPreview.length} SKUs affected
              </span>
            </div>
            <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
              {pendingDeductionsPreview.map((d) => (
                <div
                  key={d.ingredient.id}
                  className="flex items-center justify-between text-[11px] font-mono tabular-nums"
                >
                  <span className="text-slate-300 truncate pr-2">{d.ingredient.name}</span>
                  <span
                    className={
                      d.willTriggerAlert ? 'text-amber-400 font-medium shrink-0' : 'text-slate-400 shrink-0'
                    }
                  >
                    -{d.toDeduct}
                    {d.ingredient.unit} → {d.afterStock}
                    {d.ingredient.unit}
                    {d.willTriggerAlert ? ' (Low!)' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Financial Summary & Payment Tender */}
        <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Subtotal</span>
            <span className="font-mono tabular-nums">${orderTotals.subtotal.toFixed(2)}</span>
          </div>
          {orderTotals.discountAmount > 0 && (
            <div className="flex justify-between text-amber-400">
              <span>VIP Tier Discount ({Math.round(orderTotals.discountRate * 100)}%)</span>
              <span className="font-mono tabular-nums">
                -${orderTotals.discountAmount.toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-slate-400">
            <span>Hospitality Service Charge (18%)</span>
            <span className="font-mono tabular-nums">${orderTotals.serviceCharge.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Sales Tax (8.75%)</span>
            <span className="font-mono tabular-nums">${orderTotals.taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold text-slate-100 pt-2 border-t border-slate-800">
            <span>Total Due</span>
            <span className="font-mono tabular-nums text-amber-400">
              ${orderTotals.totalAmount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div className="space-y-2.5">
          <label className="block text-[11px] text-slate-400">Settlement Tender</label>
          <div className="grid grid-cols-2 gap-1.5">
            {(
              ['Card Terminal', 'Cash Drawer', 'VIP House Account', 'Split Tender'] as PaymentMethod[]
            ).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                className={`px-2.5 py-2 text-xs font-medium rounded-lg border text-left transition-colors whitespace-nowrap truncate cursor-pointer ${
                  paymentMethod === method
                    ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {method}
              </button>
            ))}
          </div>

          {paymentMethod === 'Cash Drawer' && cart.length > 0 && (
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] text-slate-400">Cash Received ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  placeholder={orderTotals.totalAmount.toFixed(2)}
                  className="w-28 px-2 py-1 text-xs font-mono tabular-nums text-right bg-slate-900 border border-slate-700 rounded text-slate-100"
                />
              </div>
              <div className="flex items-center gap-1.5">
                {[50, 100, 150, 200].map((bill) => (
                  <button
                    key={bill}
                    type="button"
                    onClick={() => setCashTendered(String(bill))}
                    className="flex-1 py-1 text-[11px] font-mono tabular-nums bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 cursor-pointer"
                  >
                    ${bill}
                  </button>
                ))}
              </div>
              {parseFloat(cashTendered) >= orderTotals.totalAmount && (
                <div className="flex justify-between text-xs font-mono tabular-nums text-emerald-400 pt-1 border-t border-slate-800">
                  <span>Change Due to Guest</span>
                  <span>
                    ${(parseFloat(cashTendered) - orderTotals.totalAmount).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={cart.length === 0}
          onClick={handleCompleteSale}
          className={`w-full py-3 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
            cart.length === 0
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>
            Complete Sale & Deduct Recipe Stock ({formatCurrency(orderTotals.totalAmount, state.settings.currency)})
          </span>
        </button>
      </div>

      {/* Completed Sale & Ingredient Deduction Receipt Modal */}
      {completedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-lg rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-base font-semibold text-slate-100">
                    Order {completedReceipt.orderNumber} Settled
                  </h3>
                  <p className="text-xs text-slate-400">
                    {completedReceipt.tableOrTab} · {completedReceipt.paymentMethod} ·{' '}
                    {completedReceipt.syncedFromOffline
                      ? 'Saved to Offline Sync Queue'
                      : 'Synchronized with Cloud'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCompletedReceipt(null)}
                className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-semibold text-slate-300">Items Sold</p>
              {completedReceipt.items.map((item, idx) => (
                <div key={idx} className="flex justify-between font-mono tabular-nums text-slate-200">
                  <span>
                    {item.quantity}x {item.name}
                  </span>
                  <span>{formatCurrency(item.unitPrice * item.quantity, state.settings.currency)}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-slate-800 flex justify-between font-semibold text-sm font-mono tabular-nums text-amber-400">
                <span>Total Paid</span>
                <span>{formatCurrency(completedReceipt.totalAmount, state.settings.currency)}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <p className="text-xs font-semibold text-slate-200">
                Automated Inventory Deductions Applied ({completedReceipt.deductions.length} Raw
                Ingredients)
              </p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {completedReceipt.deductions.map((ded) => (
                  <div
                    key={ded.ingredientId}
                    className="flex items-center justify-between text-xs font-mono tabular-nums"
                  >
                    <span className="text-slate-300">{ded.ingredientName}</span>
                    <span className="text-emerald-400">
                      -{ded.quantityDeducted}
                      {ded.unit} (Rem: {ded.remainingStockAfter}
                      {ded.unit})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              {onOpenPrint && (
                <button
                  type="button"
                  onClick={() =>
                    onOpenPrint({
                      type: 'order_receipt',
                      order: completedReceipt,
                    })
                  }
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-lg cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  <span>Print Receipt Slip</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setCompletedReceipt(null)}
                className="px-4 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg cursor-pointer"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Mobile Cart Bar for Small Screens */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 lg:hidden p-3.5 rounded-xl bg-amber-500 text-slate-950 font-bold shadow-2xl flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2 text-xs">
            <ShoppingBag className="w-4 h-4 text-slate-950" />
            <span>
              {cart.reduce((a, b) => a + b.quantity, 0)} Items · {formatCurrency(orderTotals.totalAmount, state.settings.currency)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              const ticketEl = document.getElementById('pos-ticket-panel');
              ticketEl?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-900 text-amber-400 text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            Review Ticket & Pay →
          </button>
        </div>
      )}
    </div>
  );
};
