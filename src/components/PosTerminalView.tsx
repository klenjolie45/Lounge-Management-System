import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChefHat,
  Clock,
  Flame,
  GlassWater,
  Minus,
  Plus,
  Printer,
  Receipt,
  Search,
  Send,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Trash2,
  UserCheck,
  Utensils,
  Wine,
  X,
} from 'lucide-react';
import { PrintContentType } from './PrintReceiptModal';
import { formatCurrency } from '../utils/formatters';
import { playKitchenOrderChime } from '../utils/soundEffects';
import {
  CloudSystemState,
  CustomerProfile,
  Ingredient,
  KitchenTicket,
  KitchenTicketItem,
  KitchenTicketPriority,
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
  onNavigateToKitchen?: () => void;
  onOpenPrint?: (content: PrintContentType) => void;
}

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
  onNavigateToKitchen,
  onOpenPrint,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'All' | MenuCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showQuickAddCatModal, setShowQuickAddCatModal] = useState(false);
  const [quickCatName, setQuickCatName] = useState('');
  const [quickCatDesc, setQuickCatDesc] = useState('');
  const [cart, setCart] = useState<Array<{ menuItem: MenuItem; quantity: number; notes: string }>>(
    []
  );

  // Kitchen / Chef Display Integration states
  const [showSendKitchenModal, setShowSendKitchenModal] = useState(false);
  const [showDirectKitchenRequestModal, setShowDirectKitchenRequestModal] = useState(false);
  const [kitchenTicketPriority, setKitchenTicketPriority] = useState<KitchenTicketPriority>('normal');
  const [kitchenNotes, setKitchenNotes] = useState('');
  const [isFiringTicket, setIsFiringTicket] = useState(false);
  const [kitchenSuccessToast, setKitchenSuccessToast] = useState<string | null>(null);

  // Quick Direct Chef Note state
  const [customRequestMessage, setCustomRequestMessage] = useState('');
  const [customRequestTable, setCustomRequestTable] = useState('Lounge Table');
  const [customRequestPriority, setCustomRequestPriority] = useState<KitchenTicketPriority>('normal');

  const activeKitchenCount =
    state.kitchenTickets?.filter(
      (t) => t.status === 'pending' || t.status === 'preparing'
    ).length || 0;
  const readyKitchenCount =
    state.kitchenTickets?.filter((t) => t.status === 'ready').length || 0;

  const categoriesList = useMemo(() => {
    const list: string[] = ['All'];
    if (state.menuCategories && state.menuCategories.length > 0) {
      state.menuCategories.forEach((c) => {
        if (!list.includes(c.name)) list.push(c.name);
      });
    } else {
      list.push('Signature Cocktails', 'Bistro Plates', 'Artisanal Shareables', 'Cellar & Reserve');
    }
    state.menuItems.forEach((m) => {
      if (m.category && !list.includes(m.category)) {
        list.push(m.category);
      }
    });
    return list;
  }, [state.menuCategories, state.menuItems]);

  const handleQuickAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCatName.trim()) return;
    const catName = quickCatName.trim();
    const newCat = {
      id: `cat-${Date.now()}`,
      name: catName,
      description: quickCatDesc.trim() || `${catName} offerings`,
      badgeColor: 'amber',
      sortOrder: (state.menuCategories?.length || 0) + 1,
    };
    await onDispatch('CREATE_MENU_CATEGORY', { category: newCat }, `Created Menu Category "${catName}"`);
    setSelectedCategory(catName);
    setQuickCatName('');
    setQuickCatDesc('');
    setShowQuickAddCatModal(false);
  };
  const [serviceMode, setServiceMode] = useState<ServiceMode>('Lounge Table');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    preselectedCustomer?.id || ''
  );
  const [serverName, setServerName] = useState<string>(() => {
    const active = state.users?.find((u) => u.id === state.activeUserId && u.active !== false);
    return active?.name || state.users?.[0]?.name || 'Mateo S.';
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Card Terminal');
  const [transferRef, setTransferRef] = useState<string>('');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [completedReceipt, setCompletedReceipt] = useState<SaleOrder | null>(null);

  // Sync preselected customer from CRM tab if passed
  React.useEffect(() => {
    if (preselectedCustomer) {
      setSelectedCustomerId(preselectedCustomer.id);
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
      if (entry.menuItem.recipe && entry.menuItem.recipe.length > 0) {
        for (const comp of entry.menuItem.recipe) {
          const prev = reserved.get(comp.ingredientId) || 0;
          reserved.set(comp.ingredientId, prev + comp.quantity * entry.quantity);
        }
      } else {
        const directIngId =
          entry.menuItem.directStockIngredientId ||
          state.ingredients.find(
            (i) =>
              i.sku === entry.menuItem.sku ||
              i.name.toLowerCase() === entry.menuItem.name.toLowerCase()
          )?.id;
        if (directIngId) {
          const units = entry.menuItem.directStockUnitsPerSale || 1;
          const prev = reserved.get(directIngId) || 0;
          reserved.set(directIngId, prev + units * entry.quantity);
        }
      }
    }
    return reserved;
  }, [cart, state.ingredients]);

  // Calculate buildable servings and unit recipe cost for a menu item
  const getMenuMetrics = (item: MenuItem) => {
    let maxServings = Infinity;
    let unitCost = 0;
    let hasLowStockIngredient = false;
    let limitingIngredientName = '';

    const directIngId =
      item.directStockIngredientId ||
      state.ingredients.find(
        (i) => i.sku === item.sku || i.name.toLowerCase() === item.name.toLowerCase()
      )?.id;

    if (item.recipe && item.recipe.length > 0) {
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
    } else if (directIngId) {
      const ing = ingredientMap.get(directIngId);
      if (ing) {
        const units = item.directStockUnitsPerSale || 1;
        unitCost = units * ing.costPerUnit;
        const reservedQty = cartReservedIngredients.get(ing.id) || 0;
        const availableAfterCart = Math.max(0, ing.currentStock - reservedQty);
        const possibleFromIng = Math.floor(availableAfterCart / units);
        maxServings = possibleFromIng;
        limitingIngredientName = ing.name;
        if (ing.currentStock <= ing.parLevel) {
          hasLowStockIngredient = true;
        }
      }
    } else {
      const inCart = cart.find((c) => c.menuItem.id === item.id)?.quantity || 0;
      maxServings = Math.max(0, 50 - inCart);
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

  // Cart-level quick product search for fast ordering
  const [cartSearchQuery, setCartSearchQuery] = useState('');
  const [showCartSearchDropdown, setShowCartSearchDropdown] = useState(false);
  const cartSearchRef = React.useRef<HTMLDivElement>(null);

  // Close cart search dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cartSearchRef.current && !cartSearchRef.current.contains(event.target as Node)) {
        setShowCartSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const cartSearchResults = useMemo(() => {
    const q = cartSearchQuery.trim().toLowerCase();
    if (!q) return [];
    return state.menuItems
      .filter((item) => {
        const recipeNames = item.recipe
          ? item.recipe
              .map((r) => ingredientMap.get(r.ingredientId)?.name.toLowerCase() || '')
              .join(' ')
          : '';
        return (
          item.name.toLowerCase().includes(q) ||
          item.sku.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          recipeNames.includes(q)
        );
      })
      .slice(0, 10);
  }, [state.menuItems, cartSearchQuery, ingredientMap]);

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

    const salesTaxRate = typeof state.settings?.tax?.salesTaxRate === 'number' ? state.settings.tax.salesTaxRate : 7.5;
    const serviceChargeRate = typeof state.settings?.tax?.serviceChargeRate === 'number' ? state.settings.tax.serviceChargeRate : 10.0;
    const isTaxInclusive = Boolean(state.settings?.tax?.taxInclusive);

    let taxAmount = 0;
    let serviceCharge = 0;
    let totalAmount = 0;

    if (isTaxInclusive) {
      // Menu display prices already include sales tax
      const preTaxSubtotal = salesTaxRate > 0 ? discountedSubtotal / (1 + salesTaxRate / 100) : discountedSubtotal;
      taxAmount = Number((discountedSubtotal - preTaxSubtotal).toFixed(2));
      serviceCharge = Number((discountedSubtotal * (serviceChargeRate / 100)).toFixed(2));
      totalAmount = Number((discountedSubtotal + serviceCharge).toFixed(2));
    } else {
      taxAmount = Number((discountedSubtotal * (salesTaxRate / 100)).toFixed(2));
      serviceCharge = Number((discountedSubtotal * (serviceChargeRate / 100)).toFixed(2));
      totalAmount = Number((discountedSubtotal + taxAmount + serviceCharge).toFixed(2));
    }

    return {
      subtotal: Number(subtotal.toFixed(2)),
      discountRate,
      discountAmount,
      taxAmount,
      serviceCharge,
      totalAmount,
      salesTaxRate,
      serviceChargeRate,
      isTaxInclusive,
      totalCogs: Number(totalCogs.toFixed(2)),
    };
  }, [cart, selectedCustomer, ingredientMap, state.settings?.tax]);

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
      tableOrTab: serviceMode || 'Counter',
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
      paymentReference: paymentMethod === 'Transfer' ? transferRef.trim() || undefined : undefined,
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

    // Auto-fire kitchen ticket upon settlement
    try {
      const ticketNumber = `K-${Math.floor(100 + Math.random() * 900)}`;
      const items: KitchenTicketItem[] = cart.map((entry) => {
        const cat = entry.menuItem.category.toLowerCase();
        let station: any = 'Kitchen Hot Line';
        if (
          cat.includes('cocktail') ||
          cat.includes('wine') ||
          cat.includes('spirit') ||
          cat.includes('beer') ||
          cat.includes('beverage') ||
          cat.includes('bar')
        ) {
          station = 'Lounge Mixology Bar';
        } else if (
          cat.includes('salad') ||
          cat.includes('cold') ||
          cat.includes('dessert') ||
          cat.includes('charcuterie') ||
          cat.includes('appetizer')
        ) {
          station = 'Cold Pantry';
        }
        return {
          menuItemId: entry.menuItem.id,
          name: entry.menuItem.name,
          quantity: entry.quantity,
          station,
          notes: entry.notes || undefined,
        };
      });

      const newTicket: KitchenTicket = {
        id: `kt-${Date.now()}`,
        ticketNumber,
        orderNumber,
        createdAt: new Date().toISOString(),
        serviceMode,
        serverName,
        customerName: selectedCustomer?.name,
        status: 'pending',
        priority: 'normal',
        items,
        prepTimeMinutes: 0,
      };

      await onDispatch(
        'CREATE_KITCHEN_TICKET',
        { ticket: newTicket },
        `Kitchen Ticket ${ticketNumber} auto-fired from Sale ${orderNumber}`
      );
      playKitchenOrderChime('normal');
    } catch {
      // ignore
    }

    setCompletedReceipt(newOrder);
    setCart([]);
    setCashTendered('');
    setTransferRef('');

    if (state.settings.print.autoPrintReceiptOnSale && onOpenPrint) {
      onOpenPrint({ type: 'order_receipt', order: newOrder });
    }
  };

  const handleSendCartToKitchen = async (
    priority: KitchenTicketPriority = kitchenTicketPriority,
    notes = kitchenNotes
  ) => {
    if (cart.length === 0) return;
    setIsFiringTicket(true);
    try {
      const ticketNumber = `K-${Math.floor(100 + Math.random() * 900)}`;
      const items: KitchenTicketItem[] = cart.map((entry) => {
        const cat = entry.menuItem.category.toLowerCase();
        let station: any = 'Kitchen Hot Line';
        if (
          cat.includes('cocktail') ||
          cat.includes('wine') ||
          cat.includes('spirit') ||
          cat.includes('beer') ||
          cat.includes('beverage') ||
          cat.includes('bar')
        ) {
          station = 'Lounge Mixology Bar';
        } else if (
          cat.includes('salad') ||
          cat.includes('cold') ||
          cat.includes('dessert') ||
          cat.includes('charcuterie') ||
          cat.includes('appetizer')
        ) {
          station = 'Cold Pantry';
        }
        return {
          menuItemId: entry.menuItem.id,
          name: entry.menuItem.name,
          quantity: entry.quantity,
          station,
          notes: entry.notes || undefined,
        };
      });

      const newTicket: KitchenTicket = {
        id: `kt-${Date.now()}`,
        ticketNumber,
        orderNumber: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
        createdAt: new Date().toISOString(),
        serviceMode,
        serverName,
        customerName: selectedCustomer?.name,
        status: 'pending',
        priority,
        items,
        notes: notes.trim() || undefined,
        prepTimeMinutes: 0,
      };

      await onDispatch(
        'CREATE_KITCHEN_TICKET',
        { ticket: newTicket },
        `Kitchen Ticket ${ticketNumber} (${items.length} items) fired to Chef Screen for ${serviceMode}`
      );
      playKitchenOrderChime(priority);

      setKitchenSuccessToast(`Ticket ${ticketNumber} sent to Chef Screen! (${items.length} items queued)`);
      setShowSendKitchenModal(false);
      setKitchenNotes('');
      setTimeout(() => setKitchenSuccessToast(null), 5000);
    } finally {
      setIsFiringTicket(false);
    }
  };

  const handleSendDirectChefRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRequestMessage.trim()) return;

    const ticketNumber = `REQ-${Math.floor(100 + Math.random() * 900)}`;
    const newTicket: KitchenTicket = {
      id: `kt-${Date.now()}`,
      ticketNumber,
      createdAt: new Date().toISOString(),
      serviceMode: (customRequestTable || serviceMode) as any,
      serverName,
      customerName: selectedCustomer?.name,
      status: 'pending',
      priority: customRequestPriority,
      items: [
        {
          name: `Chef Special Request: ${customRequestMessage.trim()}`,
          quantity: 1,
          station: 'Kitchen Hot Line' as any,
          notes: customRequestMessage.trim(),
        },
      ],
      notes: customRequestMessage.trim(),
      prepTimeMinutes: 0,
    };

    await onDispatch(
      'CREATE_KITCHEN_TICKET',
      { ticket: newTicket },
      `Chef Request ${ticketNumber} sent by ${serverName}: "${customRequestMessage.trim()}"`
    );
    playKitchenOrderChime(customRequestPriority);

    setKitchenSuccessToast(`Request ${ticketNumber} sent to Chef Screen!`);
    setShowDirectKitchenRequestModal(false);
    setCustomRequestMessage('');
    setTimeout(() => setKitchenSuccessToast(null), 5000);
  };

  const lowStockCount = state.ingredients.filter((i) => i.currentStock <= i.parLevel).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 lg:gap-4 items-start">
      {/* Left Column: Menu Catalog Grid & Category Filters */}
      <div className="md:col-span-7 lg:col-span-7 xl:col-span-8 space-y-3">
        {/* Kitchen Ticket Success Toast Notification */}
        {kitchenSuccessToast && (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs animate-fadeIn shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold">{kitchenSuccessToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setKitchenSuccessToast(null)}
              className="p-1 text-emerald-400 hover:text-emerald-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Live Kitchen Status & Waitstaff Request Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <ChefHat className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-200">Chef / Kitchen Queue:</span>
              <span className="font-mono text-amber-400 font-bold">
                {activeKitchenCount} active {activeKitchenCount === 1 ? 'ticket' : 'tickets'}
              </span>
              {readyKitchenCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                  {readyKitchenCount} READY FOR PASS
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDirectKitchenRequestModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 cursor-pointer transition-colors"
              title="Send custom instructions, VIP alerts, or notes directly to the Chef Display"
            >
              <Send className="w-3 h-3 text-amber-400" />
              <span>Send Request to Chef</span>
            </button>

            {onNavigateToKitchen && (
              <button
                type="button"
                onClick={onNavigateToKitchen}
                className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer transition-colors"
              >
                Chef Screen →
              </button>
            )}
          </div>
        </div>

        {/* Low Stock Alert Strip */}
        {lowStockCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2 rounded-xl bg-amber-950/40 border border-amber-700/50 text-amber-200">
            <div className="flex items-center gap-2 text-xs">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
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
              Inspect Queue
            </button>
          </div>
        )}

        {/* Filter Controls & Live Search - Tightened Spacing */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1 border-b border-slate-800/80">
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto">
            {categoriesList.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowQuickAddCatModal(true)}
              title="Add New Menu Category"
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-amber-400 hover:text-amber-300 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0 border border-dashed border-amber-500/40 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Category</span>
            </button>
          </div>

          <div className="relative min-w-[210px]">
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

        {/* Menu Cards Grid - Tightened Gap and Guaranteed Color Contrast */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5">
          {filteredMenu.map((item) => {
            const { maxServings, hasLowStockIngredient, limitingIngredientName } =
              getMenuMetrics(item);
            const isOut = maxServings <= 0;
            const imgSrc = item.imageKey ? IMAGE_MAP[item.imageKey] : undefined;
            const showImage = imgSrc && !brokenImages[item.id];
            const inCartQty = cart.find((c) => c.menuItem.id === item.id)?.quantity || 0;

            return (
              <div
                key={item.id}
                className={`pos-menu-card flex flex-col justify-between rounded-xl border transition-all overflow-hidden ${
                  isOut
                    ? 'border-red-900/50 opacity-60'
                    : inCartQty > 0
                    ? 'border-amber-500/80 ring-1 ring-amber-500/30'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Optional High-Craft Visual Header for Featured Items */}
                  {showImage ? (
                    <div className="relative h-32 w-full overflow-hidden bg-slate-950">
                      <img
                        src={imgSrc}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setBrokenImages((prev) => ({ ...prev, [item.id]: true }))
                        }
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
                      <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between gap-2 z-10">
                        <span className="pos-image-category text-[11px] font-semibold text-white drop-shadow">
                          {item.category} · {item.sku}
                        </span>
                        <span className="pos-image-price text-base font-bold font-mono tabular-nums text-amber-300 drop-shadow">
                          {formatCurrency(item.price, state.settings?.currency)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="pos-card-header px-3.5 pt-3 pb-2 flex items-center justify-between border-b">
                      <span className="pos-card-sku text-[11px] font-medium text-slate-400">
                        {item.category} · {item.sku}
                      </span>
                      <span className="pos-card-price text-base font-bold font-mono tabular-nums text-amber-400">
                        {formatCurrency(item.price, state.settings?.currency)}
                      </span>
                    </div>
                  )}

                  <div className="p-3.5 space-y-1.5 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="pos-card-title text-base font-bold text-slate-100 leading-snug">
                        {item.name}
                      </h3>
                      {inCartQty > 0 && (
                        <span className="text-[11px] font-mono tabular-nums font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                          {inCartQty} in cart
                        </span>
                      )}
                    </div>

                    <p className="pos-card-desc text-xs text-slate-400 leading-relaxed line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Card Footer: Real-Time Deliverable Stock & Add Button */}
                <div className="pos-card-footer px-3.5 py-2.5 border-t flex items-center justify-between gap-2">
                  <div className="text-[11px]">
                    {isOut ? (
                      <span className="text-red-400 font-medium">
                        Depleted ({limitingIngredientName})
                      </span>
                    ) : hasLowStockIngredient ? (
                      <span className="text-amber-300 font-mono tabular-nums">
                        Low Stock · {maxServings} left {inCartQty > 0 ? `(${inCartQty} in cart)` : ''}
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-mono tabular-nums">
                        In Stock · {maxServings} avail {inCartQty > 0 ? `(${inCartQty} in cart)` : ''}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={isOut}
                    onClick={() => addToCart(item)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isOut
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs'
                    }`}
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Add to Cart</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Active POS Cart & Order Summary - Tablet Side-by-Side (Beside, not scroll down) */}
      <div
        id="pos-ticket-panel"
        className="md:col-span-5 lg:col-span-5 xl:col-span-4 rounded-xl bg-slate-900 border border-slate-800 p-3.5 sm:p-4 lg:p-5 space-y-3.5 sm:space-y-4 md:sticky md:top-3 md:max-h-[calc(100vh-1.5rem)] md:overflow-y-auto shadow-sm"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-slate-100 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              <span>Active Order Cart</span>
            </h2>
            <p className="text-[11px] text-slate-400 font-mono tabular-nums">
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
              <span>Clear Cart</span>
            </button>
          )}
        </div>

        {/* Quick Product Search Bar on Active Order Cart for Easy Search */}
        <div ref={cartSearchRef} className="relative">
          <label className="block text-[11px] text-slate-400 mb-1 font-medium flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Search className="w-3 h-3 text-amber-400" />
              <span>Quick Product Search</span>
            </span>
            {cartSearchQuery && (
              <span className="text-[10px] text-slate-500 font-mono">
                {cartSearchResults.length} match{cartSearchResults.length === 1 ? '' : 'es'}
              </span>
            )}
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={cartSearchQuery}
              onChange={(e) => {
                setCartSearchQuery(e.target.value);
                setShowCartSearchDropdown(true);
              }}
              onFocus={() => setShowCartSearchDropdown(true)}
              placeholder="Search product name or SKU..."
              className="w-full pl-8 pr-8 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all"
            />
            {cartSearchQuery && (
              <button
                type="button"
                onClick={() => {
                  setCartSearchQuery('');
                  setShowCartSearchDropdown(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                title="Clear product search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Dropdown Results for Fast Cart Addition */}
          {showCartSearchDropdown && cartSearchQuery.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-40 max-h-64 overflow-y-auto rounded-xl bg-slate-950 border border-slate-700/90 shadow-2xl divide-y divide-slate-800">
              {cartSearchResults.length > 0 ? (
                cartSearchResults.map((prod) => {
                  const { maxServings } = getMenuMetrics(prod);
                  const isOut = maxServings <= 0;
                  return (
                    <div
                      key={prod.id}
                      className="p-2.5 flex items-center justify-between gap-2.5 hover:bg-slate-900/90 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-slate-100 truncate">{prod.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">({prod.sku})</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span className="text-amber-400 font-mono font-bold">
                            {formatCurrency(prod.price, state.settings?.currency)}
                          </span>
                          <span>·</span>
                          <span className="text-slate-400 truncate">{prod.category}</span>
                          <span>·</span>
                          <span className={isOut ? 'text-rose-400 font-medium' : 'text-emerald-400'}>
                            {isOut ? 'Out of stock' : `${maxServings} avail`}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={isOut}
                        onClick={() => {
                          addToCart(prod);
                          setCartSearchQuery('');
                          setShowCartSearchDropdown(false);
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1 shrink-0 transition-transform active:scale-95 cursor-pointer ${
                          isOut
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs text-slate-400">
                  No products found matching "{cartSearchQuery}"
                </div>
              )}
            </div>
          )}
        </div>

        {/* Service Area, Server & Guest Selection */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Service Area</label>
              <select
                value={serviceMode}
                onChange={(e) => setServiceMode(e.target.value as ServiceMode)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="Lounge Table">Lounge Area</option>
                <option value="VIP Booth">VIP Booth</option>
                <option value="Bar Tab">Bar Counter</option>
                <option value="Bistro Dining">Bistro Dining</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Server / Bartender</label>
              <select
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
              >
                {state.users && state.users.length > 0 ? (
                  state.users
                    .filter((u) => u.active !== false)
                    .map((u) => (
                      <option key={u.id} value={u.name}>
                        {u.name} ({u.role.charAt(0).toUpperCase() + u.role.slice(1)})
                      </option>
                    ))
                ) : (
                  <option value="Mateo S.">Mateo S. (Bartender)</option>
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">
              Guest / VIP Loyalty Profile (Optional)
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
                    {formatCurrency(entry.menuItem.price, state.settings?.currency)} each · Subtotal{' '}
                    {formatCurrency(entry.menuItem.price * entry.quantity, state.settings?.currency)}
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
            <span className="font-mono tabular-nums">{formatCurrency(orderTotals.subtotal, state.settings?.currency)}</span>
          </div>
          {orderTotals.discountAmount > 0 && (
            <div className="flex justify-between text-amber-400">
              <span>VIP Tier Discount ({Math.round(orderTotals.discountRate * 100)}%)</span>
              <span className="font-mono tabular-nums">
                -{formatCurrency(orderTotals.discountAmount, state.settings?.currency)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-slate-400">
            <span>Hospitality Service Charge ({orderTotals.serviceChargeRate}%)</span>
            <span className="font-mono tabular-nums">{formatCurrency(orderTotals.serviceCharge, state.settings?.currency)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Sales Tax ({orderTotals.salesTaxRate}%){orderTotals.isTaxInclusive ? ' (Included)' : ''}</span>
            <span className="font-mono tabular-nums">{formatCurrency(orderTotals.taxAmount, state.settings?.currency)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold text-slate-100 pt-2 border-t border-slate-800">
            <span>Total Due</span>
            <span className="font-mono tabular-nums text-amber-400">
              {formatCurrency(orderTotals.totalAmount, state.settings?.currency)}
            </span>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div className="space-y-2.5">
          <label className="block text-[11px] text-slate-400">Payment Type / Settlement</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {(
              ['Card Terminal', 'Cash Drawer', 'Transfer', 'VIP House Account', 'Split Tender'] as PaymentMethod[]
            ).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                className={`px-2.5 py-2 text-xs font-medium rounded-lg border text-left transition-colors whitespace-nowrap truncate cursor-pointer ${
                  paymentMethod === method
                    ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {method}
              </button>
            ))}
          </div>

          {/* Transfer Details Panel */}
          {paymentMethod === 'Transfer' && cart.length > 0 && (
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-amber-300 font-semibold">
                <span>Bank / Instant Transfer</span>
                <span className="font-mono tabular-nums text-slate-200">
                  {formatCurrency(orderTotals.totalAmount, state.settings?.currency)}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Direct bank transfer / wire verification. Enter confirmation reference or session ID:
              </p>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Transfer Ref / Session ID (Optional)
                </label>
                <input
                  type="text"
                  value={transferRef}
                  onChange={(e) => setTransferRef(e.target.value)}
                  placeholder="e.g. TRF-820194 / Bank Ref"
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-900 border border-slate-700 rounded text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Transfer ready to complete</span>
              </div>
            </div>
          )}

          {paymentMethod === 'Cash Drawer' && cart.length > 0 && (
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] text-slate-400">
                  Cash Received ({state.settings?.currency?.symbol || '₦'})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  placeholder={orderTotals.totalAmount.toFixed(2)}
                  className="w-28 px-2 py-1 text-xs font-mono tabular-nums text-right bg-slate-900 border border-slate-700 rounded text-slate-100"
                />
              </div>
              <div className="grid grid-cols-6 gap-1">
                {[1000, 500, 200, 100, 50, 20].map((bill) => (
                  <button
                    key={bill}
                    type="button"
                    onClick={() => setCashTendered(String(bill))}
                    className="py-1 text-[11px] font-mono tabular-nums bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 text-center cursor-pointer transition-colors hover:text-amber-300 hover:border-amber-500/40"
                    title={`Tender ${state.settings?.currency?.symbol || '₦'}${bill} Naira bill`}
                  >
                    {state.settings?.currency?.symbol || '₦'}{bill}
                  </button>
                ))}
              </div>
              {parseFloat(cashTendered) >= orderTotals.totalAmount && (
                <div className="flex justify-between text-xs font-mono tabular-nums text-emerald-400 pt-1 border-t border-slate-800">
                  <span>Change Due to Guest</span>
                  <span>
                    {formatCurrency(parseFloat(cashTendered) - orderTotals.totalAmount, state.settings?.currency)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Kitchen Fire Action Button */}
        {cart.length > 0 && (
          <button
            type="button"
            disabled={isFiringTicket}
            onClick={() => setShowSendKitchenModal(true)}
            className="w-full py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all border border-amber-500/50 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 cursor-pointer shadow-xs active:scale-[0.99]"
          >
            <ChefHat className="w-4 h-4 text-amber-400" />
            <span>
              Send Order to Kitchen / Chef ({cart.reduce((s, i) => s + i.quantity, 0)} items)
            </span>
          </button>
        )}

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
                    {completedReceipt.serviceMode} · {completedReceipt.paymentMethod}
                    {completedReceipt.paymentReference ? ` (Ref: ${completedReceipt.paymentReference})` : ''} ·{' '}
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

      {/* Floating Mobile Cart Bar for Small Screens (only phones, hidden on tablet md+) */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 md:hidden p-3.5 rounded-xl bg-amber-500 text-slate-950 font-bold shadow-2xl flex items-center justify-between gap-3 animate-fadeIn">
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
            Review Cart & Pay →
          </button>
        </div>
      )}

      {/* QUICK ADD CATEGORY MODAL */}
      {showQuickAddCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Create New Menu Category</h3>
                  <p className="text-[11px] text-slate-400">Add an interactive section to your POS & digital menu</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAddCatModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddCategory} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Category Title</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={quickCatName}
                  onChange={(e) => setQuickCatName(e.target.value)}
                  placeholder="e.g. Late Night Bites, Mocktails, Dessert Wines"
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={quickCatDesc}
                  onChange={(e) => setQuickCatDesc(e.target.value)}
                  placeholder="Short note or menu description..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickAddCatModal(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  Create & Select Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SEND CART TO KITCHEN / CHEF MODAL */}
      {showSendKitchenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <ChefHat className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Send Order to Chef Display</h3>
                  <p className="text-xs text-slate-400">
                    Fires immediate ticket to the kitchen and bar workstations
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSendKitchenModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Service Details Strip */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <span className="text-[11px] text-slate-400 block">Service Location:</span>
                  <span className="font-semibold text-slate-200">{serviceMode}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Waitstaff / Bartender:</span>
                  <span className="font-semibold text-slate-200">{serverName}</span>
                </div>
              </div>

              {/* Priority Selector */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Ticket Priority</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['normal', 'rush', 'vip'] as KitchenTicketPriority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setKitchenTicketPriority(p)}
                      className={`py-2 px-3 rounded-lg border text-xs font-bold capitalize flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                        kitchenTicketPriority === p
                          ? p === 'rush'
                            ? 'bg-rose-500 text-white border-rose-400 shadow-md'
                            : p === 'vip'
                            ? 'bg-purple-500 text-white border-purple-400 shadow-md'
                            : 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {p === 'rush' && <Flame className="w-3.5 h-3.5 fill-current" />}
                      {p === 'vip' && <Sparkles className="w-3.5 h-3.5" />}
                      <span>{p}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Items Summary */}
              <div>
                <div className="flex items-center justify-between text-slate-300 font-semibold mb-1">
                  <span>Items to Prep ({cart.reduce((s, i) => s + i.quantity, 0)})</span>
                  <span className="text-[11px] text-slate-500 font-normal">Auto-routed to stations</span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {cart.map((entry) => (
                    <div
                      key={entry.menuItem.id}
                      className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <span className="font-medium text-slate-200">
                        <span className="text-amber-400 font-bold mr-1.5 font-mono">
                          {entry.quantity}×
                        </span>
                        {entry.menuItem.name}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {entry.menuItem.category.toLowerCase().includes('bar') ||
                        entry.menuItem.category.toLowerCase().includes('cocktail') ||
                        entry.menuItem.category.toLowerCase().includes('wine') ||
                        entry.menuItem.category.toLowerCase().includes('spirit')
                          ? 'Mixology Bar'
                          : entry.menuItem.category.toLowerCase().includes('cold') ||
                            entry.menuItem.category.toLowerCase().includes('dessert')
                          ? 'Cold Pantry'
                          : 'Hot Kitchen'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chef Notes & Allergy Special Instructions */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Special Instructions / Chef Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={kitchenNotes}
                  onChange={(e) => setKitchenNotes(e.target.value)}
                  placeholder="e.g. Extra hot sauce on the side, rush first course, guest has gluten allergy..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSendKitchenModal(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isFiringTicket}
                  onClick={() => handleSendCartToKitchen()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer shadow-lg shadow-amber-500/20 active:scale-[0.99]"
                >
                  <Send className="w-4 h-4" />
                  <span>Fire Order to Kitchen Display</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DIRECT REQUEST / NOTE TO CHEF MODAL */}
      {showDirectKitchenRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <ChefHat className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Direct Note to Chef</h3>
                  <p className="text-xs text-slate-400">
                    Send instructions or alerts to the Kitchen Display Screen
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDirectKitchenRequestModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendDirectChefRequest} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Table / Service Area</label>
                <select
                  value={customRequestTable}
                  onChange={(e) => setCustomRequestTable(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  {TABLES_LIST.map((tbl) => (
                    <option key={tbl} value={tbl}>
                      {tbl}
                    </option>
                  ))}
                  <option value="Lounge Table">General Lounge Table</option>
                  <option value="VIP Booth">VIP Booth</option>
                  <option value="Bar Tab">Bar Counter</option>
                  <option value="Bistro Dining">Bistro Dining Room</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Priority</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['normal', 'rush', 'vip'] as KitchenTicketPriority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCustomRequestPriority(p)}
                      className={`py-1.5 px-2.5 rounded-lg border text-xs font-bold capitalize flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                        customRequestPriority === p
                          ? p === 'rush'
                            ? 'bg-rose-500 text-white border-rose-400 shadow-md'
                            : p === 'vip'
                            ? 'bg-purple-500 text-white border-purple-400 shadow-md'
                            : 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {p === 'rush' && <Flame className="w-3 h-3 fill-current" />}
                      {p === 'vip' && <Sparkles className="w-3 h-3" />}
                      <span>{p}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Message / Instruction to Kitchen Staff
                </label>
                <textarea
                  required
                  rows={3}
                  value={customRequestMessage}
                  onChange={(e) => setCustomRequestMessage(e.target.value)}
                  placeholder="e.g. Table 03 requests appetizers fired immediately. VIP guest has seafood allergy. Check on Wagyu sliders..."
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDirectKitchenRequestModal(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer shadow-lg shadow-amber-500/20 active:scale-[0.99]"
                >
                  <Send className="w-4 h-4" />
                  <span>Send to Chef Screen</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
