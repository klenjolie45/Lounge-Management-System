import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  DollarSign,
  Edit2,
  FileCheck2,
  FilePlus2,
  FileText,
  Filter,
  Mail,
  PackageCheck,
  PackagePlus,
  Phone,
  Plus,
  Printer,
  Search,
  Send,
  Sparkles,
  Tag,
  Truck,
  UserCheck,
  X,
} from 'lucide-react';
import {
  CloudSystemState,
  Ingredient,
  IngredientCategory,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatus,
  Supplier,
  SyncOperationType,
  UnitType,
} from '../types/lounge';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { PrintContentType } from './PrintReceiptModal';

interface PurchaseOrdersSuppliersViewProps {
  state: CloudSystemState;
  onDispatch: (type: SyncOperationType, payload: any, description: string) => Promise<void>;
  onOpenPrint?: (content: PrintContentType) => void;
}

export const PurchaseOrdersSuppliersView: React.FC<PurchaseOrdersSuppliersViewProps> = ({
  state,
  onDispatch,
  onOpenPrint,
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'suppliers'>('orders');
  const [statusFilter, setStatusFilter] = useState<'ALL' | PurchaseOrderStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showCreatePoModal, setShowCreatePoModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState<PurchaseOrder | null>(null);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // New PO Draft State
  const [newPoSupplierId, setNewPoSupplierId] = useState('');
  const [newPoExpectedDate, setNewPoExpectedDate] = useState('');
  const [newPoNotes, setNewPoNotes] = useState('');
  const [newPoShippingFee, setNewPoShippingFee] = useState<number>(0);
  const [newPoTaxRate, setNewPoTaxRate] = useState<number>(state.settings.tax.salesTaxRate || 8.75);
  const [newPoItems, setNewPoItems] = useState<PurchaseOrderItem[]>([]);
  const [selectedIngredientToAdd, setSelectedIngredientToAdd] = useState('');
  const [addQty, setAddQty] = useState<number>(1000);

  // Receive items state: map ingredientId -> quantityReceived
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({});
  const [receiverName, setReceiverName] = useState('');

  // New Supplier State
  const [newSupName, setNewSupName] = useState('');
  const [newSupContact, setNewSupContact] = useState('');
  const [newSupEmail, setNewSupEmail] = useState('');
  const [newSupPhone, setNewSupPhone] = useState('');
  const [newSupAddress, setNewSupAddress] = useState('');
  const [newSupTerms, setNewSupTerms] = useState<Supplier['paymentTerms']>('Net 30');
  const [newSupCategories, setNewSupCategories] = useState<IngredientCategory[]>(['Spirits & Liqueurs']);
  const [newSupLeadDays, setNewSupLeadDays] = useState<number>(2);
  const [newSupNotes, setNewSupNotes] = useState('');

  const suppliers = state.suppliers || [];
  const purchaseOrders = state.purchaseOrders || [];

  // Low stock calculation
  const lowStockIngredients = useMemo(() => {
    return state.ingredients.filter((i) => i.currentStock <= i.parLevel);
  }, [state.ingredients]);

  // Filtered Purchase Orders
  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter((po) => {
      const matchStatus = statusFilter === 'ALL' || po.status === statusFilter;
      const matchQuery =
        po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.items.some((it) => it.ingredientName.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchStatus && matchQuery;
    });
  }, [purchaseOrders, statusFilter, searchQuery]);

  // Filtered Suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      return (
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.categories.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    });
  }, [suppliers, searchQuery]);

  // Helper to get supplier by ID
  const getSupplier = (supId: string): Supplier | undefined => {
    return suppliers.find((s) => s.id === supId);
  };

  // Open Receive Modal
  const handleOpenReceive = (po: PurchaseOrder) => {
    const initQtys: Record<string, number> = {};
    po.items.forEach((it) => {
      const pending = it.quantityOrdered - (it.quantityReceived || 0);
      initQtys[it.ingredientId] = Math.max(0, pending);
    });
    setReceiveQuantities(initQtys);
    const currentUser = state.users.find((u) => u.id === state.activeUserId);
    setReceiverName(currentUser?.name || 'Inventory Lead');
    setShowReceiveModal(po);
  };

  // Confirm Receive Items
  const handleConfirmReceive = async () => {
    if (!showReceiveModal) return;

    const receivedItemsList = Object.entries(receiveQuantities).map(([ingredientId, qty]) => ({
      ingredientId,
      quantityReceived: Number(qty),
    }));

    // Determine if fully or partially received
    let isFullyReceived = true;
    showReceiveModal.items.forEach((it) => {
      const currentRec = (it.quantityReceived || 0) + (receiveQuantities[it.ingredientId] || 0);
      if (currentRec < it.quantityOrdered) {
        isFullyReceived = false;
      }
    });

    const status: PurchaseOrderStatus = isFullyReceived
      ? 'RECEIVED_COMPLETED'
      : 'PARTIALLY_RECEIVED';

    await onDispatch(
      'RECEIVE_PURCHASE_ORDER',
      {
        poId: showReceiveModal.id,
        receivedItems: receivedItemsList,
        receivedBy: receiverName,
        status,
      },
      `Received items for ${showReceiveModal.poNumber} (${showReceiveModal.supplierName}) · Restocked inventory`
    );

    setShowReceiveModal(null);
  };

  // Generate draft PO from low stock items
  const handleGeneratePoFromLowStock = () => {
    if (lowStockIngredients.length === 0) return;

    // Pick first supplier that has low stock items or default
    const firstLow = lowStockIngredients[0];
    const sup = suppliers.find((s) => s.name === firstLow.supplier) || suppliers[0];

    const supId = sup ? sup.id : suppliers[0]?.id || '';
    setNewPoSupplierId(supId);

    // Filter ingredients for this supplier
    const supIngs = lowStockIngredients.filter((i) => !sup || i.supplier === sup.name);
    const targetIngs = supIngs.length > 0 ? supIngs : lowStockIngredients;

    const items: PurchaseOrderItem[] = targetIngs.map((i) => {
      const neededQty = Math.max(i.parLevel * 2 - i.currentStock, i.parLevel);
      return {
        ingredientId: i.id,
        ingredientName: i.name,
        unit: i.unit,
        quantityOrdered: Math.round(neededQty),
        unitCost: i.costPerUnit,
        totalCost: Number((neededQty * i.costPerUnit).toFixed(2)),
      };
    });

    setNewPoItems(items);
    setNewPoNotes(`Automated replenishment for ${items.length} items below par threshold.`);
    const today = new Date();
    today.setDate(today.getDate() + (sup?.leadTimeDays || 2));
    setNewPoExpectedDate(today.toISOString().slice(0, 10));
    setShowCreatePoModal(true);
  };

  // Add line item to draft PO
  const handleAddLineItemToPo = () => {
    if (!selectedIngredientToAdd || addQty <= 0) return;
    const ing = state.ingredients.find((i) => i.id === selectedIngredientToAdd);
    if (!ing) return;

    // Check if already in items
    const existingIndex = newPoItems.findIndex((it) => it.ingredientId === ing.id);
    if (existingIndex >= 0) {
      const updated = [...newPoItems];
      updated[existingIndex].quantityOrdered += addQty;
      updated[existingIndex].totalCost = Number(
        (updated[existingIndex].quantityOrdered * updated[existingIndex].unitCost).toFixed(2)
      );
      setNewPoItems(updated);
    } else {
      setNewPoItems([
        ...newPoItems,
        {
          ingredientId: ing.id,
          ingredientName: ing.name,
          unit: ing.unit,
          quantityOrdered: addQty,
          unitCost: ing.costPerUnit,
          totalCost: Number((addQty * ing.costPerUnit).toFixed(2)),
        },
      ]);
    }
  };

  const handleRemoveLineItem = (index: number) => {
    setNewPoItems(newPoItems.filter((_, idx) => idx !== index));
  };

  // Save new Purchase Order
  const handleSavePurchaseOrder = async (status: PurchaseOrderStatus = 'ORDERED_SENT') => {
    if (!newPoSupplierId || newPoItems.length === 0) return;
    const sup = getSupplier(newPoSupplierId);
    const subtotal = Number(newPoItems.reduce((acc, it) => acc + it.totalCost, 0).toFixed(2));
    const tax = Number(((subtotal * newPoTaxRate) / 100).toFixed(2));
    const totalAmount = Number((subtotal + tax + Number(newPoShippingFee || 0)).toFixed(2));

    const poNumber = `PO-${new Date().getFullYear()}-${1040 + purchaseOrders.length + 1}`;
    const currentUser = state.users.find((u) => u.id === state.activeUserId);

    const newPo: PurchaseOrder = {
      id: `po-${Date.now()}`,
      poNumber,
      supplierId: newPoSupplierId,
      supplierName: sup?.name || 'Purveyor Partner',
      orderDate: new Date().toISOString(),
      expectedDeliveryDate: newPoExpectedDate
        ? new Date(newPoExpectedDate).toISOString()
        : new Date(Date.now() + 86400000 * 2).toISOString(),
      status,
      items: newPoItems,
      subtotal,
      tax,
      shippingFee: Number(newPoShippingFee) || 0,
      totalAmount,
      notes: newPoNotes,
      createdBy: currentUser?.name || 'Lounge Manager',
    };

    await onDispatch(
      'CREATE_PURCHASE_ORDER',
      { purchaseOrder: newPo },
      `Created Purchase Order ${poNumber} (${newPo.supplierName}) for ${formatCurrency(
        totalAmount,
        state.settings.currency
      )}`
    );

    setShowCreatePoModal(false);
    setNewPoItems([]);
    setNewPoNotes('');
    setNewPoShippingFee(0);
  };

  // Save New Supplier
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupName.trim()) return;

    if (editingSupplier) {
      await onDispatch(
        'UPDATE_SUPPLIER',
        {
          supplierId: editingSupplier.id,
          updates: {
            name: newSupName,
            contactPerson: newSupContact,
            email: newSupEmail,
            phone: newSupPhone,
            address: newSupAddress,
            paymentTerms: newSupTerms,
            categories: newSupCategories,
            leadTimeDays: Number(newSupLeadDays),
            notes: newSupNotes,
          },
        },
        `Updated purveyor supplier ${newSupName}`
      );
      setEditingSupplier(null);
    } else {
      const newSup: Supplier = {
        id: `sup-${Date.now()}`,
        name: newSupName,
        contactPerson: newSupContact,
        email: newSupEmail,
        phone: newSupPhone,
        address: newSupAddress,
        paymentTerms: newSupTerms,
        categories: newSupCategories,
        leadTimeDays: Number(newSupLeadDays),
        notes: newSupNotes,
        active: true,
      };

      await onDispatch(
        'CREATE_SUPPLIER',
        { supplier: newSup },
        `Added purveyor supplier ${newSupName} (${newSupTerms})`
      );
      setShowAddSupplierModal(false);
    }

    // Reset form
    setNewSupName('');
    setNewSupContact('');
    setNewSupEmail('');
    setNewSupPhone('');
    setNewSupAddress('');
    setNewSupNotes('');
  };

  const getStatusBadge = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'RECEIVED_COMPLETED':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60';
      case 'PARTIALLY_RECEIVED':
        return 'bg-blue-950/80 text-blue-300 border-blue-700/60';
      case 'ORDERED_SENT':
        return 'bg-amber-950/80 text-amber-300 border-amber-700/60';
      case 'DRAFT':
        return 'bg-slate-800 text-slate-300 border-slate-700';
      case 'CANCELLED':
        return 'bg-rose-950/80 text-rose-300 border-rose-700/60';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const draftSubtotal = newPoItems.reduce((acc, it) => acc + it.totalCost, 0);
  const draftTax = (draftSubtotal * newPoTaxRate) / 100;
  const draftTotal = draftSubtotal + draftTax + Number(newPoShippingFee || 0);

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 font-display">
            Purveyors, Suppliers & Purchase Orders
          </h2>
          <p className="text-xs text-slate-400">
            Automated stock replenishment, vendor directories, purchase invoices, and 1-click receiving.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {lowStockIngredients.length > 0 && (
            <button
              type="button"
              onClick={handleGeneratePoFromLowStock}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Auto PO from Low Stock ({lowStockIngredients.length})</span>
            </button>
          )}

          {activeTab === 'orders' ? (
            <button
              type="button"
              onClick={() => {
                setNewPoSupplierId(suppliers[0]?.id || '');
                const d = new Date();
                d.setDate(d.getDate() + 2);
                setNewPoExpectedDate(d.toISOString().slice(0, 10));
                setNewPoItems([]);
                setShowCreatePoModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Purchase Order</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditingSupplier(null);
                setNewSupName('');
                setNewSupContact('');
                setNewSupEmail('');
                setNewSupPhone('');
                setNewSupAddress('');
                setNewSupNotes('');
                setShowAddSupplierModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Supplier</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Active Suppliers</span>
            <Building2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-100 font-mono tabular-nums">
            {suppliers.filter((s) => s.active).length}
          </div>
          <div className="text-[11px] text-slate-500">Purveyors on Net 15/30 terms</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Pending Delivery</span>
            <Truck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-blue-300 font-mono tabular-nums">
            {purchaseOrders.filter((p) => p.status === 'ORDERED_SENT' || p.status === 'PARTIALLY_RECEIVED').length}
          </div>
          <div className="text-[11px] text-slate-500">Awaiting receiving verification</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Low Stock SKUs</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-amber-400 font-mono tabular-nums">
            {lowStockIngredients.length}
          </div>
          <div className="text-[11px] text-slate-500">At or below par threshold</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total POs Fulfilled</span>
            <PackageCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-300 font-mono tabular-nums">
            {purchaseOrders.filter((p) => p.status === 'RECEIVED_COMPLETED').length}
          </div>
          <div className="text-[11px] text-slate-500">Restocked into cellar & pantry</div>
        </div>
      </div>

      {/* Main Tabs Navigation & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Purchase Orders ({purchaseOrders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('suppliers')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'suppliers'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Suppliers Directory ({suppliers.length})</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'orders' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
            >
              <option value="ALL">All Statuses</option>
              <option value="ORDERED_SENT">Ordered / Sent</option>
              <option value="PARTIALLY_RECEIVED">Partially Received</option>
              <option value="RECEIVED_COMPLETED">Received & Completed</option>
              <option value="DRAFT">Draft</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          )}

          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder={activeTab === 'orders' ? 'Search PO # or vendor...' : 'Search supplier name, contact...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500"
            />
          </div>
        </div>
      </div>

      {/* TAB 1: PURCHASE ORDERS LIST */}
      {activeTab === 'orders' && (
        <div className="space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400 space-y-2">
              <PackagePlus className="w-8 h-8 mx-auto text-slate-500" />
              <p className="text-sm font-medium text-slate-300">No purchase orders found</p>
              <p className="text-xs text-slate-500">
                Click &ldquo;Create Purchase Order&rdquo; or &ldquo;Auto PO from Low Stock&rdquo; to place a purveyor order.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((po) => {
                const sup = getSupplier(po.supplierId);
                const isPending = po.status === 'ORDERED_SENT' || po.status === 'PARTIALLY_RECEIVED';

                return (
                  <div
                    key={po.id}
                    className="p-4 sm:p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700/80 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-bold text-amber-400">
                          {po.poNumber}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="font-semibold text-slate-100 text-sm">{po.supplierName}</span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-medium ${getStatusBadge(
                            po.status
                          )}`}
                        >
                          {po.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenPrint && onOpenPrint({ type: 'purchase_order', po, supplier: sup })}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
                          title="Print official Purchase Order form"
                        >
                          <Printer className="w-3.5 h-3.5 text-amber-400" />
                          <span className="hidden sm:inline">Print PO</span>
                        </button>

                        {isPending && (
                          <button
                            type="button"
                            onClick={() => handleOpenReceive(po)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer shadow-xs"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            <span>Receive & Restock</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* PO Details Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Order Date:</span>
                        <span className="text-slate-200 font-mono">
                          {new Date(po.orderDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Expected Delivery:</span>
                        <span className="text-slate-200 font-mono">
                          {new Date(po.expectedDeliveryDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Issued By:</span>
                        <span className="text-slate-200">{po.createdBy}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Total Invoice:</span>
                        <span className="text-amber-400 font-bold font-mono">
                          {formatCurrency(po.totalAmount, state.settings.currency)}
                        </span>
                      </div>
                    </div>

                    {/* Ordered Items Preview */}
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs space-y-1.5">
                      <div className="font-semibold text-slate-300 text-[11px] flex justify-between">
                        <span>Items in Order ({po.items.length}):</span>
                        <span className="text-slate-500 font-normal">
                          Subtotal: {formatCurrency(po.subtotal, state.settings.currency)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {po.items.map((it, idx) => (
                          <div
                            key={idx}
                            className="p-1.5 rounded bg-slate-900 border border-slate-800 text-[11px] flex justify-between items-center"
                          >
                            <div className="truncate mr-2">
                              <span className="font-medium text-slate-200 truncate block">
                                {it.ingredientName}
                              </span>
                              <span className="text-slate-400 text-[10px]">
                                {it.quantityOrdered} {it.unit} @ {formatCurrency(it.unitCost, state.settings.currency)}/{it.unit}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-mono text-slate-100 font-semibold block">
                                {formatCurrency(it.totalCost, state.settings.currency)}
                              </span>
                              {it.quantityReceived !== undefined && (
                                <span className="text-[9px] text-emerald-400 font-mono">
                                  Recv: {it.quantityReceived}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {po.notes && (
                      <p className="text-xs text-slate-400 italic">
                        <strong>Notes:</strong> {po.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SUPPLIERS DIRECTORY */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSuppliers.map((sup) => {
            const suppliedIngredients = state.ingredients.filter(
              (i) => i.supplier === sup.name
            );

            return (
              <div
                key={sup.id}
                className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4 hover:border-slate-700/80 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-100 font-display">
                        {sup.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-amber-400 font-medium">
                          {sup.contactPerson}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="text-[11px] px-2 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                          Terms: {sup.paymentTerms}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingSupplier(sup);
                        setNewSupName(sup.name);
                        setNewSupContact(sup.contactPerson);
                        setNewSupEmail(sup.email);
                        setNewSupPhone(sup.phone);
                        setNewSupAddress(sup.address);
                        setNewSupTerms(sup.paymentTerms);
                        setNewSupCategories(sup.categories);
                        setNewSupLeadDays(sup.leadTimeDays);
                        setNewSupNotes(sup.notes || '');
                        setShowAddSupplierModal(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg cursor-pointer"
                      title="Edit Supplier Details"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Contact Info List */}
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="font-mono">{sup.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{sup.email}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Truck className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                      <span className="text-slate-400">
                        {sup.address} · <strong className="text-slate-200">{sup.leadTimeDays}d lead time</strong>
                      </span>
                    </div>
                  </div>

                  {/* Categories Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {sup.categories.map((c) => (
                      <span
                        key={c}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800"
                      >
                        {c}
                      </span>
                    ))}
                  </div>

                  {/* Supplied Items Summary */}
                  <div className="pt-2 border-t border-slate-800/80 text-xs">
                    <span className="text-slate-400 text-[11px]">
                      Catalog SKUs Linked ({suppliedIngredients.length}):
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {suppliedIngredients.map((i) => (
                        <span
                          key={i.id}
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            i.currentStock <= i.parLevel
                              ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {i.name} ({i.currentStock} {i.unit})
                        </span>
                      ))}
                      {suppliedIngredients.length === 0 && (
                        <span className="text-slate-500 text-[11px] italic">
                          No inventory SKUs mapped yet.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick PO Button for this vendor */}
                <div className="pt-3 border-t border-slate-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setNewPoSupplierId(sup.id);
                      const d = new Date();
                      d.setDate(d.getDate() + sup.leadTimeDays);
                      setNewPoExpectedDate(d.toISOString().slice(0, 10));

                      // Pre-fill supplied ingredients
                      const prefillItems: PurchaseOrderItem[] = suppliedIngredients.map((i) => ({
                        ingredientId: i.id,
                        ingredientName: i.name,
                        unit: i.unit,
                        quantityOrdered: Math.max(i.parLevel * 2 - i.currentStock, i.parLevel),
                        unitCost: i.costPerUnit,
                        totalCost: Number(
                          (Math.max(i.parLevel * 2 - i.currentStock, i.parLevel) * i.costPerUnit).toFixed(2)
                        ),
                      }));
                      setNewPoItems(prefillItems);
                      setShowCreatePoModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create PO for {sup.name.split(' ')[0]}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: CREATE PURCHASE ORDER */}
      {showCreatePoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FilePlus2 className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-semibold text-slate-100">
                  Create Purveyor Purchase Order
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreatePoModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Select Purveyor / Supplier</label>
                <select
                  value={newPoSupplierId}
                  onChange={(e) => setNewPoSupplierId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.paymentTerms})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Expected Delivery Date</label>
                <input
                  type="date"
                  value={newPoExpectedDate}
                  onChange={(e) => setNewPoExpectedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                >
                </input>
              </div>
            </div>

            {/* Line Items Builder */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">
                  Add Ingredients to Purchase Order
                </span>
                <span className="text-[11px] text-slate-400">
                  {newPoItems.length} item(s) selected
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2">
                <select
                  value={selectedIngredientToAdd}
                  onChange={(e) => setSelectedIngredientToAdd(e.target.value)}
                  className="w-full sm:flex-1 px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                >
                  <option value="">-- Choose Raw Ingredient SKU --</option>
                  {state.ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} (Stock: {ing.currentStock} {ing.unit}, Par: {ing.parLevel})
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="number"
                    min={1}
                    value={addQty}
                    onChange={(e) => setAddQty(Number(e.target.value))}
                    className="w-24 px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                    placeholder="Qty"
                  />

                  <button
                    type="button"
                    onClick={handleAddLineItemToPo}
                    className="px-3 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg whitespace-nowrap cursor-pointer"
                  >
                    Add Line
                  </button>
                </div>
              </div>

              {/* Items List Table */}
              <div className="divide-y divide-slate-800/80 rounded-lg bg-slate-950 border border-slate-800 max-h-48 overflow-y-auto">
                {newPoItems.map((it, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 flex items-center justify-between text-xs gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-100 truncate">{it.ingredientName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {it.quantityOrdered} {it.unit} × {formatCurrency(it.unitCost, state.settings.currency)}/{it.unit}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono font-semibold text-amber-400">
                        {formatCurrency(it.totalCost, state.settings.currency)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveLineItem(idx)}
                        className="text-slate-500 hover:text-red-400 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {newPoItems.length === 0 && (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No items in this order yet. Select an ingredient above to add.
                  </div>
                )}
              </div>
            </div>

            {/* Financial Totals */}
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Subtotal:</span>
                <span className="font-mono font-semibold text-slate-200">
                  {formatCurrency(draftSubtotal, state.settings.currency)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Tax ({newPoTaxRate}%):</span>
                <span className="font-mono font-semibold text-slate-200">
                  {formatCurrency(draftTax, state.settings.currency)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Shipping / Freight:</span>
                <input
                  type="number"
                  min={0}
                  value={newPoShippingFee}
                  onChange={(e) => setNewPoShippingFee(Number(e.target.value))}
                  className="w-20 px-2 py-0.5 text-xs font-mono bg-slate-900 border border-slate-700 rounded text-slate-100"
                />
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Total Invoice:</span>
                <span className="font-mono font-bold text-amber-400 text-sm">
                  {formatCurrency(draftTotal, state.settings.currency)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 text-xs">Special Purveyor Instructions</label>
              <textarea
                value={newPoNotes}
                onChange={(e) => setNewPoNotes(e.target.value)}
                placeholder="e.g., Deliver through back dock before 11:00 AM, temperature cellar verified."
                rows={2}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreatePoModal(false)}
                className="px-4 py-2 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSavePurchaseOrder('DRAFT')}
                className="px-4 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer"
              >
                Save as Draft
              </button>
              <button
                type="button"
                disabled={newPoItems.length === 0}
                onClick={() => handleSavePurchaseOrder('ORDERED_SENT')}
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg cursor-pointer disabled:opacity-40"
              >
                Issue & Send to Purveyor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: RECEIVE ITEMS & RESTOCK INVENTORY */}
      {showReceiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                  <PackageCheck className="w-5 h-5 text-emerald-400" />
                  Receive & Restock Inventory
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {showReceiveModal.poNumber} · {showReceiveModal.supplierName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReceiveModal(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Verify incoming quantities delivered by purveyor. Confirming will automatically increment
              raw ingredient levels and log stock movements.
            </p>

            <div className="space-y-2">
              <div className="divide-y divide-slate-800/80 rounded-lg bg-slate-950 border border-slate-800 max-h-60 overflow-y-auto">
                {showReceiveModal.items.map((it) => (
                  <div
                    key={it.ingredientId}
                    className="p-3 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-100">{it.ingredientName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Ordered: {it.quantityOrdered} {it.unit} · Prev Recv:{' '}
                        {it.quantityReceived || 0} {it.unit}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">Qty Delivered:</span>
                      <input
                        type="number"
                        min={0}
                        max={it.quantityOrdered}
                        value={receiveQuantities[it.ingredientId] ?? (it.quantityOrdered - (it.quantityReceived || 0))}
                        onChange={(e) =>
                          setReceiveQuantities({
                            ...receiveQuantities,
                            [it.ingredientId]: Number(e.target.value),
                          })
                        }
                        className="w-24 px-2.5 py-1.5 text-xs font-mono font-bold bg-slate-900 border border-slate-700 rounded-lg text-emerald-300"
                      />
                      <span className="font-mono text-slate-400 text-xs">{it.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 text-xs font-semibold">
                Receiving Staff Sign-off
              </label>
              <input
                type="text"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                placeholder="Full name of staff who accepted the shipment"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowReceiveModal(null)}
                className="px-4 py-2 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReceive}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg cursor-pointer shadow-xs"
              >
                Confirm Restock & Update Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD / EDIT SUPPLIER */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-400" />
                <span>{editingSupplier ? 'Edit Supplier' : 'Register New Purveyor / Supplier'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddSupplierModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Company / Purveyor Name *</label>
                <input
                  type="text"
                  required
                  value={newSupName}
                  onChange={(e) => setNewSupName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  placeholder="e.g., Grand Cru Imports & Distillers"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Contact Representative</label>
                  <input
                    type="text"
                    value={newSupContact}
                    onChange={(e) => setNewSupContact(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                    placeholder="e.g., Jean-Luc Dupont"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Phone Number</label>
                  <input
                    type="text"
                    value={newSupPhone}
                    onChange={(e) => setNewSupPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                    placeholder="+1 (415) 555-0199"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Orders Email</label>
                  <input
                    type="email"
                    value={newSupEmail}
                    onChange={(e) => setNewSupEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                    placeholder="orders@purveyor.com"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Payment Terms</label>
                  <select
                    value={newSupTerms}
                    onChange={(e) => setNewSupTerms(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  >
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Net 60">Net 60</option>
                    <option value="COD">Cash on Delivery (COD)</option>
                    <option value="Prepaid">Prepaid</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Warehouse / Dispatch Address</label>
                  <input
                    type="text"
                    value={newSupAddress}
                    onChange={(e) => setNewSupAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                    placeholder="Street, City, State"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Lead Time (Days)</label>
                  <input
                    type="number"
                    min={1}
                    value={newSupLeadDays}
                    onChange={(e) => setNewSupLeadDays(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Purveyor Notes</label>
                <textarea
                  value={newSupNotes}
                  onChange={(e) => setNewSupNotes(e.target.value)}
                  placeholder="Specialization, cold-chain logistics, cut-off hours..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(false)}
                  className="px-4 py-2 text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg cursor-pointer"
                >
                  {editingSupplier ? 'Save Changes' : 'Register Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
