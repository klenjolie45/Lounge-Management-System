import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  Boxes,
  Check,
  Edit2,
  FolderPlus,
  History,
  Layers,
  PackagePlus,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Tags,
  Trash2,
  X,
} from 'lucide-react';
import {
  CloudSystemState,
  Ingredient,
  IngredientCategory,
  MenuCategory,
  MenuCategoryDefinition,
  MenuItem,
  PrepStation,
  RecipeIngredient,
  StorageZone,
  SyncOperationType,
  UnitType,
} from '../types/lounge';
import { formatCurrency } from '../utils/formatters';

interface InventoryRecipesViewProps {
  state: CloudSystemState;
  onDispatch: (type: SyncOperationType, payload: any, description: string) => Promise<void>;
}

type SubView = 'ingredients' | 'alerts' | 'recipes' | 'categories' | 'movements';

export const InventoryRecipesView: React.FC<InventoryRecipesViewProps> = ({
  state,
  onDispatch,
}) => {
  const [subView, setSubView] = useState<SubView>('ingredients');
  const [searchQuery, setSearchQuery] = useState('');
  const [zoneFilter, setZoneFilter] = useState<'All' | StorageZone>('All');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');

  // Category modal states
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');
  const [categoryColor, setCategoryColor] = useState('amber');

  const [editingCategory, setEditingCategory] = useState<MenuCategoryDefinition | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryDesc, setEditCategoryDesc] = useState('');
  const [editCategoryColor, setEditCategoryColor] = useState('amber');

  const [deletingCategory, setDeletingCategory] = useState<MenuCategoryDefinition | null>(null);
  const [deleteFallbackCategory, setDeleteFallbackCategory] = useState('Signature Cocktails');

  // Menu Item detail editing state
  const [editingMenuItemDetails, setEditingMenuItemDetails] = useState<MenuItem | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemSku, setEditItemSku] = useState('');
  const [editItemCategory, setEditItemCategory] = useState<string>('');
  const [editItemStation, setEditItemStation] = useState<PrepStation>('Lounge Mixology Bar');
  const [editItemPrice, setEditItemPrice] = useState('20');
  const [editItemDesc, setEditItemDesc] = useState('');

  // Restock modal state
  const [restockTarget, setRestockTarget] = useState<Ingredient | null>(null);
  const [restockQty, setRestockQty] = useState<string>('');
  const [restockNote, setRestockNote] = useState<string>('');

  // Waste / Adjustment modal state
  const [adjustTarget, setAdjustTarget] = useState<Ingredient | null>(null);
  const [adjustDelta, setAdjustDelta] = useState<string>('-10');
  const [adjustReason, setAdjustReason] = useState<string>('Bar spillage / shift line check');

  // New Ingredient modal state
  const [showNewIngModal, setShowNewIngModal] = useState(false);
  const [newIngName, setNewIngName] = useState('');
  const [newIngSku, setNewIngSku] = useState('SPR-NEW-20');
  const [newIngCategory, setNewIngCategory] = useState<IngredientCategory>('Spirits & Liqueurs');
  const [newIngZone, setNewIngZone] = useState<StorageZone>('Main Backbar');
  const [newIngUnit, setNewIngUnit] = useState<UnitType>('ml');
  const [newIngStock, setNewIngStock] = useState('1500');
  const [newIngPar, setNewIngPar] = useState('500');
  const [newIngMax, setNewIngMax] = useState('3000');
  const [newIngCost, setNewIngCost] = useState('0.05');
  const [newIngSupplier, setNewIngSupplier] = useState('Heritage Distillers Co.');

  // New Menu Item + Recipe BOM modal state
  const [showNewMenuModal, setShowNewMenuModal] = useState(false);
  const [newMenuName, setNewMenuName] = useState('');
  const [newMenuSku, setNewMenuSku] = useState('CKT-009');
  const [newMenuCategory, setNewMenuCategory] = useState<MenuCategory>('Signature Cocktails');
  const [newMenuStation, setNewMenuStation] = useState<PrepStation>('Lounge Mixology Bar');
  const [newMenuPrice, setNewMenuPrice] = useState('24');
  const [newMenuDesc, setNewMenuDesc] = useState('');
  const [newMenuRecipe, setNewMenuRecipe] = useState<RecipeIngredient[]>([
    { ingredientId: state.ingredients[0]?.id || 'ing-bourbon', quantity: 60 },
  ]);

  // Recipe inline editing state
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
  const [draftRecipe, setDraftRecipe] = useState<RecipeIngredient[]>([]);

  const lowStockItems = useMemo(
    () => state.ingredients.filter((i) => i.currentStock <= i.parLevel),
    [state.ingredients]
  );

  const totalInventoryValue = useMemo(
    () =>
      state.ingredients.reduce(
        (acc, ing) => acc + ing.currentStock * ing.costPerUnit,
        0
      ),
    [state.ingredients]
  );

  const filteredIngredients = useMemo(() => {
    return state.ingredients.filter((ing) => {
      const matchesZone = zoneFilter === 'All' || ing.storageZone === zoneFilter;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchesZone;
      return (
        matchesZone &&
        (ing.name.toLowerCase().includes(q) ||
          ing.sku.toLowerCase().includes(q) ||
          ing.category.toLowerCase().includes(q) ||
          ing.supplier.toLowerCase().includes(q))
      );
    });
  }, [state.ingredients, zoneFilter, searchQuery]);

  // Map which menu items depend on a given ingredient
  const getDependentMenuItems = (ingredientId: string): MenuItem[] => {
    return state.menuItems.filter((m) =>
      m.recipe.some((r) => r.ingredientId === ingredientId)
    );
  };

  const handleConfirmRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockTarget) return;
    const qty = parseFloat(restockQty);
    if (isNaN(qty) || qty <= 0) return;

    await onDispatch(
      'RESTOCK_INGREDIENT',
      {
        ingredientId: restockTarget.id,
        addedQuantity: qty,
        supplierNote: restockNote || `Purchase Order Received (${restockTarget.supplier})`,
        actor: 'Inventory Manager',
      },
      `Restocked +${qty}${restockTarget.unit} ${restockTarget.name}`
    );

    setRestockTarget(null);
    setRestockQty('');
    setRestockNote('');
  };

  const handleQuickRestockToMax = async (ing: Ingredient) => {
    const needed = Math.max(0, Number((ing.maxCapacity - ing.currentStock).toFixed(2)));
    if (needed <= 0) return;
    await onDispatch(
      'RESTOCK_INGREDIENT',
      {
        ingredientId: ing.id,
        addedQuantity: needed,
        supplierNote: `Automated Par-Level Replenishment to Max (${ing.supplier})`,
        actor: 'Inventory Manager',
      },
      `Replenished +${needed}${ing.unit} ${ing.name} to full capacity`
    );
  };

  const handleConfirmAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget) return;
    const delta = parseFloat(adjustDelta);
    if (isNaN(delta) || delta === 0) return;

    await onDispatch(
      'ADJUST_INGREDIENT',
      {
        ingredientId: adjustTarget.id,
        delta,
        movementType: delta < 0 ? 'WASTE_SPILLAGE' : 'AUDIT_ADJUSTMENT',
        reason: adjustReason,
        actor: 'Shift Manager',
      },
      `Adjusted ${adjustTarget.name} by ${delta}${adjustTarget.unit} (${adjustReason})`
    );

    setAdjustTarget(null);
  };

  const handleCreateIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIngName.trim()) return;

    const newIng: Ingredient = {
      id: `ing-${Date.now()}`,
      name: newIngName.trim(),
      sku: newIngSku.trim() || `SKU-${Date.now().toString().slice(-4)}`,
      category: newIngCategory,
      storageZone: newIngZone,
      currentStock: parseFloat(newIngStock) || 0,
      parLevel: parseFloat(newIngPar) || 100,
      criticalLevel: Math.round((parseFloat(newIngPar) || 100) * 0.45),
      maxCapacity: parseFloat(newIngMax) || 2000,
      unit: newIngUnit,
      costPerUnit: parseFloat(newIngCost) || 0.05,
      supplier: newIngSupplier.trim() || 'House Purveyor',
      lastRestockedAt: new Date().toISOString(),
    };

    await onDispatch(
      'CREATE_INGREDIENT',
      { ingredient: newIng },
      `Created raw ingredient SKU ${newIng.name}`
    );
    setShowNewIngModal(false);
    setNewIngName('');
  };

  const handleCreateMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMenuName.trim() || newMenuRecipe.length === 0) return;

    const created: MenuItem = {
      id: `menu-${Date.now()}`,
      name: newMenuName.trim(),
      sku: newMenuSku.trim() || `MNU-${Date.now().toString().slice(-3)}`,
      category: newMenuCategory,
      prepStation: newMenuStation,
      price: parseFloat(newMenuPrice) || 20,
      description:
        newMenuDesc.trim() ||
        'House-crafted lounge specialty with automatic ingredient stock deduction.',
      recipe: newMenuRecipe.filter((r) => r.quantity > 0),
    };

    await onDispatch(
      'CREATE_MENU_ITEM',
      { menuItem: created },
      `Added menu item ${created.name} with ${created.recipe.length} linked recipe ingredients`
    );
    setShowNewMenuModal(false);
    setNewMenuName('');
    setNewMenuDesc('');
  };

  const handleSaveRecipeChanges = async (menuItem: MenuItem) => {
    await onDispatch(
      'UPDATE_MENU_RECIPE',
      {
        menuItemId: menuItem.id,
        recipe: draftRecipe.filter((r) => r.quantity > 0),
      },
      `Updated recipe BOM for ${menuItem.name}`
    );
    setEditingMenuId(null);
  };

  const menuCategoriesList = useMemo(() => {
    if (state.menuCategories && state.menuCategories.length > 0) {
      return state.menuCategories;
    }
    return [
      { id: 'cat-cocktails', name: 'Signature Cocktails', description: 'Hand-crafted artisanal cocktails and craft mixology creations', badgeColor: 'amber' },
      { id: 'cat-bistro', name: 'Bistro Plates', description: 'Hot gourmet kitchen entrees, burgers, and chef specialties', badgeColor: 'emerald' },
      { id: 'cat-shareables', name: 'Artisanal Shareables', description: 'Charcuterie, tapas, artisanal flatbreads, and grazing boards', badgeColor: 'rose' },
      { id: 'cat-cellar', name: 'Cellar & Reserve', description: 'Grand Cru Champagnes, vintage red wines, and rare reserve pours', badgeColor: 'purple' },
    ];
  }, [state.menuCategories]);

  const filteredCategories = useMemo(() => {
    const q = categorySearchQuery.trim().toLowerCase();
    if (!q) return menuCategoriesList;
    return menuCategoriesList.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
    );
  }, [menuCategoriesList, categorySearchQuery]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;
    const catName = categoryName.trim();
    const newCat: MenuCategoryDefinition = {
      id: `cat-${Date.now()}`,
      name: catName,
      description: categoryDesc.trim() || `${catName} offerings and selections`,
      badgeColor: categoryColor || 'amber',
      sortOrder: menuCategoriesList.length + 1,
    };
    await onDispatch('CREATE_MENU_CATEGORY', { category: newCat }, `Created Menu Category "${catName}"`);
    setCategoryName('');
    setCategoryDesc('');
    setShowCreateCategoryModal(false);
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editCategoryName.trim()) return;
    const newName = editCategoryName.trim();
    await onDispatch(
      'UPDATE_MENU_CATEGORY',
      {
        categoryId: editingCategory.id,
        oldName: editingCategory.name,
        updates: {
          name: newName,
          description: editCategoryDesc.trim(),
          badgeColor: editCategoryColor,
        },
      },
      `Updated Menu Category "${editingCategory.name}" to "${newName}"`
    );
    setEditingCategory(null);
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    await onDispatch(
      'DELETE_MENU_CATEGORY',
      {
        categoryId: deletingCategory.id,
        categoryName: deletingCategory.name,
        fallbackCategory: deleteFallbackCategory || 'Signature Cocktails',
      },
      `Deleted Menu Category "${deletingCategory.name}"`
    );
    setDeletingCategory(null);
  };

  const handleSaveMenuItemDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMenuItemDetails) return;
    await onDispatch(
      'UPDATE_MENU_ITEM',
      {
        menuItemId: editingMenuItemDetails.id,
        updates: {
          name: editItemName.trim(),
          sku: editItemSku.trim(),
          category: editItemCategory,
          prepStation: editItemStation,
          price: parseFloat(editItemPrice) || editingMenuItemDetails.price,
          description: editItemDesc.trim(),
        },
      },
      `Updated menu product details for "${editItemName}"`
    );
    setEditingMenuItemDetails(null);
  };

  return (
    <div className="space-y-6">
      {/* Top KPI Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Tracked Raw Ingredients</span>
          <div className="text-2xl font-semibold font-mono tabular-nums text-slate-100">
            {state.ingredients.length} SKUs
          </div>
          <p className="text-xs text-slate-400">
            4 storage zones · Real-time BOM linked
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Automated Low-Stock Alerts</span>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-semibold font-mono tabular-nums ${
                lowStockItems.length > 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {lowStockItems.length} Active
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Triggered when stock ≤ par threshold
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">On-Hand Stock Valuation</span>
          <div className="text-2xl font-semibold font-mono tabular-nums text-slate-100">
            {formatCurrency(totalInventoryValue, state.settings.currency)}
          </div>
          <p className="text-xs text-slate-400">
            Weighted by live unit purveyor cost
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Recipe-Linked Menu Items</span>
          <div className="text-2xl font-semibold font-mono tabular-nums text-slate-100">
            {state.menuItems.length} Products
          </div>
          <p className="text-xs text-slate-400">
            100% automated deduction on POS sale
          </p>
        </div>
      </div>

      {/* Sub-navigation & Primary Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto">
          <button
            type="button"
            onClick={() => setSubView('ingredients')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              subView === 'ingredients'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Raw Stock Ledger ({state.ingredients.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubView('alerts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              subView === 'alerts'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low-Stock Alerts ({lowStockItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubView('recipes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              subView === 'recipes'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Menu Recipe BOMs ({state.menuItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubView('categories')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              subView === 'categories'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Tags className="w-3.5 h-3.5" />
            <span>Menu Categories ({menuCategoriesList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubView('movements')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              subView === 'movements'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Stock Movement Audit ({state.stockMovements.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setCategoryName('');
              setCategoryDesc('');
              setCategoryColor('amber');
              setShowCreateCategoryModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg whitespace-nowrap cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
            <span>New Category</span>
          </button>
          <button
            type="button"
            onClick={() => setShowNewIngModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>New Raw Ingredient</span>
          </button>
          <button
            type="button"
            onClick={() => setShowNewMenuModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Recipe Product</span>
          </button>
        </div>
      </div>

      {/* SUBVIEW 1: RAW INGREDIENTS LEDGER */}
      {subView === 'ingredients' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(
                [
                  'All',
                  'Main Backbar',
                  'Walk-in Cold Room',
                  'Dry Bistro Pantry',
                  'Temperature Cellar',
                ] as const
              ).map((zone) => (
                <button
                  key={zone}
                  type="button"
                  onClick={() => setZoneFilter(zone)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                    zoneFilter === zone
                      ? 'bg-slate-800 border-amber-500/60 text-amber-300 font-medium'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {zone}
                </button>
              ))}
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by ingredient, SKU, supplier..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] text-slate-400 bg-slate-950/60">
                    <th className="py-3 px-4 font-medium">Ingredient & SKU</th>
                    <th className="py-3 px-4 font-medium">Storage & Category</th>
                    <th className="py-3 px-4 font-medium text-right">Current Stock</th>
                    <th className="py-3 px-4 font-medium text-right">Par Threshold</th>
                    <th className="py-3 px-4 font-medium">Stock Status</th>
                    <th className="py-3 px-4 font-medium text-right">Unit Cost / Value</th>
                    <th className="py-3 px-4 font-medium text-right">Inventory Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-xs">
                  {filteredIngredients.map((ing) => {
                    const isCritical = ing.currentStock <= ing.criticalLevel;
                    const isLow = ing.currentStock <= ing.parLevel;
                    const fillPct = Math.min(
                      100,
                      Math.round((ing.currentStock / ing.maxCapacity) * 100)
                    );
                    const totalVal = ing.currentStock * ing.costPerUnit;

                    return (
                      <tr
                        key={ing.id}
                        className="hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-100">{ing.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                            {ing.sku} · {ing.supplier}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          <div>{ing.storageZone}</div>
                          <div className="text-[11px] text-slate-500">{ing.category}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          <div
                            className={`font-semibold ${
                              isCritical
                                ? 'text-red-400'
                                : isLow
                                ? 'text-amber-400'
                                : 'text-slate-100'
                            }`}
                          >
                            {ing.currentStock.toLocaleString()} {ing.unit}
                          </div>
                          <div className="w-24 ml-auto mt-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                isCritical
                                  ? 'bg-red-500'
                                  : isLow
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${fillPct}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-400">
                          <div>
                            {ing.parLevel.toLocaleString()} {ing.unit}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Max {ing.maxCapacity.toLocaleString()} {ing.unit}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {isCritical ? (
                            <span className="text-red-400 font-medium flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>Critical Depletion</span>
                            </span>
                          ) : isLow ? (
                            <span className="text-amber-400 font-medium flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>Below Par Alert</span>
                            </span>
                          ) : (
                            <span className="text-emerald-400">Nominal Stock</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          <div className="text-slate-200">{formatCurrency(totalVal, state.settings.currency)}</div>
                          <div className="text-[11px] text-slate-500">
                            {formatCurrency(ing.costPerUnit, state.settings.currency)} / {ing.unit}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setRestockTarget(ing);
                                setRestockQty(
                                  String(Math.max(100, ing.maxCapacity - ing.currentStock))
                                );
                              }}
                              className="px-2.5 py-1 text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-md whitespace-nowrap cursor-pointer"
                            >
                              + Restock
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAdjustTarget(ing);
                                setAdjustDelta('-10');
                              }}
                              className="px-2.5 py-1 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-md whitespace-nowrap cursor-pointer"
                            >
                              Audit / Waste
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBVIEW 2: AUTOMATED LOW-STOCK ALERTS */}
      {subView === 'alerts' && (
        <div className="space-y-4">
          {lowStockItems.length === 0 ? (
            <div className="p-10 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-2">
              <Check className="w-8 h-8 text-emerald-400 mx-auto" />
              <h3 className="text-base font-semibold text-slate-100">
                All Raw Ingredients Above Par Threshold
              </h3>
              <p className="text-xs text-slate-400">
                Real-time stock monitoring is active. Alerts will appear automatically as POS sales
                deduct recipe ingredients.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lowStockItems.map((ing) => {
                const dependentDishes = getDependentMenuItems(ing.id);
                const deficit = Math.max(0, ing.parLevel - ing.currentStock);
                const restockToFull = Math.max(0, ing.maxCapacity - ing.currentStock);

                return (
                  <div
                    key={ing.id}
                    className="p-5 rounded-xl bg-slate-900 border border-amber-600/50 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs text-amber-400 font-medium">
                            {ing.currentStock <= ing.criticalLevel
                              ? 'Critical Reorder Alert'
                              : 'Automated Low-Stock Alert'}{' '}
                            · {ing.storageZone}
                          </span>
                          <h3 className="text-base font-semibold text-slate-100 mt-0.5">
                            {ing.name}
                          </h3>
                          <p className="text-xs text-slate-400 font-mono tabular-nums">
                            {ing.sku} · Supplier: {ing.supplier}
                          </p>
                        </div>
                        <div className="text-right font-mono tabular-nums">
                          <div className="text-lg font-semibold text-amber-400">
                            {ing.currentStock} {ing.unit}
                          </div>
                          <div className="text-xs text-slate-400">
                            Par: {ing.parLevel} {ing.unit}
                          </div>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                        <div className="text-[11px] text-slate-400">
                          Impacted Menu Items & Remaining Buildable Servings:
                        </div>
                        {dependentDishes.map((dish) => {
                          const comp = dish.recipe.find((r) => r.ingredientId === ing.id);
                          const servingsLeft = comp
                            ? Math.floor(ing.currentStock / comp.quantity)
                            : 0;
                          return (
                            <div
                              key={dish.id}
                              className="flex items-center justify-between text-xs font-mono tabular-nums"
                            >
                              <span className="text-slate-200">{dish.name}</span>
                              <span className="text-amber-300">
                                {servingsLeft} servings left ({comp?.quantity}
                                {ing.unit}/order)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
                      <span className="text-xs text-slate-400 font-mono tabular-nums">
                        Deficit below par: {deficit} {ing.unit}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setRestockTarget(ing);
                            setRestockQty(String(restockToFull));
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer"
                        >
                          Custom Receive
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickRestockToMax(ing)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg cursor-pointer"
                        >
                          Restock +{restockToFull}
                          {ing.unit} to Max
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBVIEW 3: RECIPE BOMs & MENU ENGINEERING */}
      {subView === 'recipes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {state.menuItems.map((item) => {
            const isEditing = editingMenuId === item.id;
            const activeRecipe = isEditing ? draftRecipe : item.recipe;
            const totalCogs = activeRecipe.reduce((acc, r) => {
              const ing = state.ingredients.find((i) => i.id === r.ingredientId);
              return acc + (ing ? ing.costPerUnit * r.quantity : 0);
            }, 0);
            const marginPct = Math.round(((item.price - totalCogs) / item.price) * 100);

            return (
              <div
                key={item.id}
                className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-800">
                    <div>
                      <span className="text-xs text-slate-400">
                        {item.category} · {item.prepStation} · {item.sku}
                      </span>
                      <h3 className="text-base font-semibold text-slate-100 mt-0.5">
                        {item.name}
                      </h3>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <div className="text-base font-semibold text-amber-400">
                        {formatCurrency(item.price, state.settings.currency)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        COGS {formatCurrency(totalCogs, state.settings.currency)} ({marginPct}% Margin)
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Ingredients Automatically Deducted per Sale:</span>
                      {!isEditing ? (
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMenuItemDetails(item);
                              setEditItemName(item.name);
                              setEditItemSku(item.sku);
                              setEditItemCategory(item.category);
                              setEditItemStation(item.prepStation);
                              setEditItemPrice(item.price.toString());
                              setEditItemDesc(item.description || '');
                            }}
                            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3 text-slate-400" />
                            <span>Edit Product</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMenuId(item.id);
                              setDraftRecipe(JSON.parse(JSON.stringify(item.recipe)));
                            }}
                            className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                          >
                            <SlidersHorizontal className="w-3 h-3" />
                            <span>Edit BOM</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingMenuId(null)}
                            className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveRecipeChanges(item)}
                            className="px-2.5 py-1 text-xs font-semibold bg-amber-500 text-slate-950 rounded cursor-pointer"
                          >
                            Save Recipe
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="divide-y divide-slate-800/70 rounded-lg bg-slate-950 border border-slate-800 px-3">
                      {activeRecipe.map((comp, idx) => {
                        const ing = state.ingredients.find((i) => i.id === comp.ingredientId);
                        if (!ing) return null;
                        const compCost = ing.costPerUnit * comp.quantity;

                        return (
                          <div
                            key={comp.ingredientId}
                            className="py-2 flex items-center justify-between gap-2 text-xs font-mono tabular-nums"
                          >
                            <div className="text-slate-200 font-sans">
                              {ing.name}{' '}
                              <span className="text-slate-500 font-mono">
                                (Stock: {ing.currentStock}
                                {ing.unit})
                              </span>
                            </div>
                            {isEditing ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  step="1"
                                  min="0"
                                  value={comp.quantity}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setDraftRecipe((prev) =>
                                      prev.map((r, i) =>
                                        i === idx ? { ...r, quantity: val } : r
                                      )
                                    );
                                  }}
                                  className="w-20 px-2 py-0.5 text-right bg-slate-900 border border-slate-700 rounded text-amber-300"
                                />
                                <span className="text-slate-400">{ing.unit}</span>
                              </div>
                            ) : (
                              <div className="text-slate-300">
                                {comp.quantity} {ing.unit} ·{' '}
                                <span className="text-slate-500">{formatCurrency(compCost, state.settings.currency)}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SUBVIEW: MENU CATEGORIES MANAGEMENT */}
      {subView === 'categories' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative min-w-[260px] flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={categorySearchQuery}
                onChange={(e) => setCategorySearchQuery(e.target.value)}
                placeholder="Filter categories by name or description..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setCategoryName('');
                setCategoryDesc('');
                setCategoryColor('amber');
                setShowCreateCategoryModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg whitespace-nowrap cursor-pointer shadow-lg shadow-amber-500/10"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Category</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCategories.map((cat) => {
              const assignedItems = state.menuItems.filter((m) => m.category === cat.name);
              return (
                <div
                  key={cat.id}
                  className="rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700/80 transition-all p-5 flex flex-col justify-between space-y-4 shadow-sm"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                          <Tag className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-100">{cat.name}</h4>
                          <span className="text-[11px] font-mono text-amber-400/90 font-medium">
                            {assignedItems.length} {assignedItems.length === 1 ? 'Menu Product' : 'Menu Products'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategory(cat);
                            setEditCategoryName(cat.name);
                            setEditCategoryDesc(cat.description || '');
                            setEditCategoryColor(cat.badgeColor || 'amber');
                          }}
                          title="Edit Category"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeletingCategory(cat);
                            const other = menuCategoriesList.find((c) => c.id !== cat.id);
                            setDeleteFallbackCategory(other?.name || 'Signature Cocktails');
                          }}
                          title="Delete Category"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {cat.description || 'Custom defined menu classification and POS department.'}
                    </p>

                    <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                      <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                        <span>Items in Category:</span>
                        <span className="font-mono text-slate-500">{assignedItems.length} total</span>
                      </div>
                      {assignedItems.length === 0 ? (
                        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60 text-[11px] text-slate-500 italic text-center">
                          No menu items currently in this category
                        </div>
                      ) : (
                        <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                          {assignedItems.slice(0, 4).map((item) => (
                            <div
                              key={item.id}
                              className="px-2.5 py-1.5 rounded-md bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                            >
                              <span className="text-slate-200 truncate pr-2">{item.name}</span>
                              <span className="font-mono font-medium text-amber-400 shrink-0">
                                {formatCurrency(item.price, state.settings.currency)}
                              </span>
                            </div>
                          ))}
                          {assignedItems.length > 4 && (
                            <div className="text-[11px] text-slate-500 text-center font-mono pt-0.5">
                              + {assignedItems.length - 4} more items
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategory(cat);
                        setEditCategoryName(cat.name);
                        setEditCategoryDesc(cat.description || '');
                        setEditCategoryColor(cat.badgeColor || 'amber');
                      }}
                      className="text-xs text-slate-400 hover:text-slate-200 font-medium cursor-pointer"
                    >
                      Configure Category
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewMenuCategory(cat.name);
                        setShowNewMenuModal(true);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-400 hover:text-amber-300 hover:bg-slate-800 rounded-md border border-amber-500/30 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Item</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBVIEW 4: STOCK MOVEMENT AUDIT LEDGER */}
      {subView === 'movements' && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400 bg-slate-950/60">
                  <th className="py-3 px-4 font-medium">Timestamp</th>
                  <th className="py-3 px-4 font-medium">Ingredient</th>
                  <th className="py-3 px-4 font-medium">Movement Type</th>
                  <th className="py-3 px-4 font-medium text-right">Quantity Delta</th>
                  <th className="py-3 px-4 font-medium text-right">Stock After</th>
                  <th className="py-3 px-4 font-medium">Trigger / Order Reference</th>
                  <th className="py-3 px-4 font-medium">Terminal & Actor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-xs">
                {state.stockMovements.map((mov) => {
                  const isPositive = mov.delta > 0;
                  return (
                    <tr key={mov.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 font-mono tabular-nums text-slate-400">
                        {new Date(mov.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-100">
                        {mov.ingredientName}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 ${
                            mov.type === 'RESTOCK_RECEIPT'
                              ? 'text-emerald-400'
                              : mov.type === 'WASTE_SPILLAGE'
                              ? 'text-red-400'
                              : 'text-amber-300'
                          }`}
                        >
                          {isPositive ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          )}
                          <span>{mov.type.replace('_', ' ')}</span>
                        </span>
                      </td>
                      <td
                        className={`py-2.5 px-4 text-right font-mono tabular-nums font-semibold ${
                          isPositive ? 'text-emerald-400' : 'text-amber-300'
                        }`}
                      >
                        {isPositive ? `+${mov.delta}` : mov.delta} {mov.unit}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-300">
                        {mov.balanceAfter} {mov.unit}
                      </td>
                      <td className="py-2.5 px-4 text-slate-300">{mov.reference}</td>
                      <td className="py-2.5 px-4 text-slate-400 font-mono tabular-nums">
                        {mov.actor}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Restock Raw Ingredient */}
      {restockTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <form
            onSubmit={handleConfirmRestock}
            className="w-full max-w-md rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-semibold text-slate-100">
                  Receive Stock: {restockTarget.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRestockTarget(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-400 font-mono tabular-nums">
              Current Stock: {restockTarget.currentStock} {restockTarget.unit} · Par Threshold:{' '}
              {restockTarget.parLevel} {restockTarget.unit} · Max: {restockTarget.maxCapacity}{' '}
              {restockTarget.unit}
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Quantity Received ({restockTarget.unit})
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={restockQty}
                onChange={(e) => setRestockQty(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Purveyor Invoice / Delivery Note
              </label>
              <input
                type="text"
                value={restockNote}
                onChange={(e) => setRestockNote(e.target.value)}
                placeholder={`PO Delivery from ${restockTarget.supplier}`}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRestockTarget(null)}
                className="px-4 py-2 text-xs text-slate-300 bg-slate-800 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg cursor-pointer"
              >
                Confirm & Update Stock
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Audit / Spillage Adjustment */}
      {adjustTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <form
            onSubmit={handleConfirmAdjustment}
            className="w-full max-w-md rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-semibold text-slate-100">
                Log Spillage / Audit Adjustment: {adjustTarget.name}
              </h3>
              <button
                type="button"
                onClick={() => setAdjustTarget(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Stock Delta ({adjustTarget.unit}) — use negative for waste/spillage
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={adjustDelta}
                onChange={(e) => setAdjustDelta(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">Reason / Audit Note</label>
              <input
                type="text"
                required
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdjustTarget(null)}
                className="px-4 py-2 text-xs text-slate-300 bg-slate-800 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg cursor-pointer"
              >
                Record Adjustment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: New Raw Ingredient */}
      {showNewIngModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <form
            onSubmit={handleCreateIngredient}
            className="w-full max-w-lg rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-semibold text-slate-100">
                Add New Raw Ingredient SKU
              </h3>
              <button
                type="button"
                onClick={() => setShowNewIngModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <label className="block text-slate-300 mb-1">Ingredient Name</label>
                <input
                  type="text"
                  required
                  value={newIngName}
                  onChange={(e) => setNewIngName(e.target.value)}
                  placeholder="e.g., Aged Mezcal Artesanal"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">SKU Code</label>
                <input
                  type="text"
                  value={newIngSku}
                  onChange={(e) => setNewIngSku(e.target.value)}
                  className="w-full px-3 py-2 font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Measurement Unit</label>
                <select
                  value={newIngUnit}
                  onChange={(e) => setNewIngUnit(e.target.value as UnitType)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                >
                  <option value="ml">ml (Milliliters)</option>
                  <option value="g">g (Grams)</option>
                  <option value="pc">pc (Pieces / Units)</option>
                  <option value="oz">oz (Ounces)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Category</label>
                <select
                  value={newIngCategory}
                  onChange={(e) => setNewIngCategory(e.target.value as IngredientCategory)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                >
                  <option value="Spirits & Liqueurs">Spirits & Liqueurs</option>
                  <option value="Mixers & Garnishes">Mixers & Garnishes</option>
                  <option value="Wagyu & Proteins">Wagyu & Proteins</option>
                  <option value="Artisanal Dairy & Produce">Artisanal Dairy & Produce</option>
                  <option value="Dry Pantry & Bakery">Dry Pantry & Bakery</option>
                  <option value="Cellar Wines">Cellar Wines</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Storage Zone</label>
                <select
                  value={newIngZone}
                  onChange={(e) => setNewIngZone(e.target.value as StorageZone)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                >
                  <option value="Main Backbar">Main Backbar</option>
                  <option value="Walk-in Cold Room">Walk-in Cold Room</option>
                  <option value="Dry Bistro Pantry">Dry Bistro Pantry</option>
                  <option value="Temperature Cellar">Temperature Cellar</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Opening Stock</label>
                <input
                  type="number"
                  value={newIngStock}
                  onChange={(e) => setNewIngStock(e.target.value)}
                  className="w-full px-3 py-2 font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Low-Stock Par Threshold</label>
                <input
                  type="number"
                  value={newIngPar}
                  onChange={(e) => setNewIngPar(e.target.value)}
                  className="w-full px-3 py-2 font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Cost per Unit ({state.settings.currency.symbol})</label>
                <input
                  type="number"
                  step="0.001"
                  value={newIngCost}
                  onChange={(e) => setNewIngCost(e.target.value)}
                  className="w-full px-3 py-2 font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Supplier</label>
                <input
                  type="text"
                  value={newIngSupplier}
                  onChange={(e) => setNewIngSupplier(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewIngModal(false)}
                className="px-4 py-2 text-xs text-slate-300 bg-slate-800 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg cursor-pointer"
              >
                Create Ingredient SKU
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: New Menu Product with Linked Recipe BOM */}
      {showNewMenuModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <form
            onSubmit={handleCreateMenuItem}
            className="w-full max-w-xl rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-semibold text-slate-100">
                Create Menu Product with Automated Recipe BOM
              </h3>
              <button
                type="button"
                onClick={() => setShowNewMenuModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <label className="block text-slate-300 mb-1">Product Title</label>
                <input
                  type="text"
                  required
                  value={newMenuName}
                  onChange={(e) => setNewMenuName(e.target.value)}
                  placeholder="e.g., Gold Leaf Negroni Sbagliato"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300">Menu Category</label>
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryName('');
                      setCategoryDesc('');
                      setCategoryColor('amber');
                      setShowCreateCategoryModal(true);
                    }}
                    className="text-[11px] text-amber-400 hover:text-amber-300 cursor-pointer font-medium"
                  >
                    + New Category
                  </button>
                </div>
                <select
                  value={newMenuCategory}
                  onChange={(e) => setNewMenuCategory(e.target.value as MenuCategory)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                >
                  {menuCategoriesList.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Selling Price ({state.settings.currency.symbol})</label>
                <input
                  type="number"
                  step="0.5"
                  value={newMenuPrice}
                  onChange={(e) => setNewMenuPrice(e.target.value)}
                  className="w-full px-3 py-2 font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-slate-300 mb-1">Tasting / Menu Description</label>
                <input
                  type="text"
                  value={newMenuDesc}
                  onChange={(e) => setNewMenuDesc(e.target.value)}
                  placeholder="Brief menu description..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">
                  Recipe Ingredients Deducted per Sale
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setNewMenuRecipe((prev) => [
                      ...prev,
                      { ingredientId: state.ingredients[0]?.id || 'ing-bourbon', quantity: 15 },
                    ])
                  }
                  className="text-xs text-amber-400 hover:text-amber-300 cursor-pointer"
                >
                  + Add Ingredient Line
                </button>
              </div>

              {newMenuRecipe.map((line, idx) => {
                const ing = state.ingredients.find((i) => i.id === line.ingredientId);
                return (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <select
                      value={line.ingredientId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewMenuRecipe((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, ingredientId: val } : r))
                        );
                      }}
                      className="flex-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                    >
                      {state.ingredients.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.unit})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={line.quantity}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 1;
                        setNewMenuRecipe((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, quantity: val } : r))
                        );
                      }}
                      className="w-24 px-2.5 py-1.5 font-mono text-right bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                    />
                    <span className="text-slate-400 font-mono w-8">{ing?.unit}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setShowNewMenuModal(false)}
                className="px-4 py-2 text-xs text-slate-300 bg-slate-800 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg cursor-pointer"
              >
                Save Menu Item & Link Recipe
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: CREATE MENU CATEGORY */}
      {showCreateCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Create Menu Category</h3>
                  <p className="text-[11px] text-slate-400">Define a new category for POS filtering and recipe management</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateCategoryModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Category Title</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g. Artisanal Mocktails, Late Night Bites, Reserve Bottles"
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Category Description</label>
                <textarea
                  rows={2}
                  value={categoryDesc}
                  onChange={(e) => setCategoryDesc(e.target.value)}
                  placeholder="Summary of offerings, mixology notes, or preparation focus..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Badge Accent Color</label>
                <div className="grid grid-cols-6 gap-2">
                  {[
                    { id: 'amber', label: 'Gold', bg: 'bg-amber-500' },
                    { id: 'emerald', label: 'Green', bg: 'bg-emerald-500' },
                    { id: 'rose', label: 'Rose', bg: 'bg-rose-500' },
                    { id: 'purple', label: 'Purple', bg: 'bg-purple-500' },
                    { id: 'cyan', label: 'Cyan', bg: 'bg-cyan-500' },
                    { id: 'blue', label: 'Blue', bg: 'bg-blue-500' },
                  ].map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => setCategoryColor(color.id)}
                      className={`h-8 rounded-lg ${color.bg} flex items-center justify-center cursor-pointer transition-all ${
                        categoryColor === color.id ? 'ring-2 ring-white scale-105' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {categoryColor === color.id && <Check className="w-4 h-4 text-slate-950 stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateCategoryModal(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT MENU CATEGORY */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Edit Category: {editingCategory.name}</h3>
                  <p className="text-[11px] text-slate-400">Update classification title and display attributes</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateCategory} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Category Title</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={editCategoryName}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
                />
                <p className="text-[11px] text-amber-400/80 mt-1">
                  Renaming this category will automatically update all {state.menuItems.filter((m) => m.category === editingCategory.name).length} existing menu items in this category.
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Category Description</label>
                <textarea
                  rows={2}
                  value={editCategoryDesc}
                  onChange={(e) => setEditCategoryDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Badge Accent Color</label>
                <div className="grid grid-cols-6 gap-2">
                  {[
                    { id: 'amber', label: 'Gold', bg: 'bg-amber-500' },
                    { id: 'emerald', label: 'Green', bg: 'bg-emerald-500' },
                    { id: 'rose', label: 'Rose', bg: 'bg-rose-500' },
                    { id: 'purple', label: 'Purple', bg: 'bg-purple-500' },
                    { id: 'cyan', label: 'Cyan', bg: 'bg-cyan-500' },
                    { id: 'blue', label: 'Blue', bg: 'bg-blue-500' },
                  ].map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => setEditCategoryColor(color.id)}
                      className={`h-8 rounded-lg ${color.bg} flex items-center justify-center cursor-pointer transition-all ${
                        editCategoryColor === color.id ? 'ring-2 ring-white scale-105' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {editCategoryColor === color.id && <Check className="w-4 h-4 text-slate-950 stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-3.5 py-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE MENU CATEGORY */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Delete Category</h3>
                  <p className="text-[11px] text-slate-400">Remove "{deletingCategory.name}" from your catalog</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {(() => {
                const assigned = state.menuItems.filter((m) => m.category === deletingCategory.name);
                return (
                  <>
                    <p className="text-slate-300">
                      Are you sure you want to remove the category <strong className="text-white">"{deletingCategory.name}"</strong>?
                    </p>
                    {assigned.length > 0 && (
                      <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/60 space-y-2">
                        <div className="flex items-center gap-2 text-amber-300 font-semibold">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>{assigned.length} menu items are currently in this category.</span>
                        </div>
                        <label className="block text-slate-300 font-medium">
                          Select category to reassign these products to:
                        </label>
                        <select
                          value={deleteFallbackCategory}
                          onChange={(e) => setDeleteFallbackCategory(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                        >
                          {menuCategoriesList
                            .filter((c) => c.id !== deletingCategory.id)
                            .map((cat) => (
                              <option key={cat.id} value={cat.name}>
                                {cat.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </>
                );
              })()}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeletingCategory(null)}
                  className="px-3.5 py-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCategory}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer shadow-lg shadow-rose-600/20"
                >
                  Confirm Delete & Reassign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT MENU ITEM DETAILS */}
      {editingMenuItemDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Edit Product: {editingMenuItemDetails.name}</h3>
                  <p className="text-[11px] text-slate-400">Reassign category, update price, or change station</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingMenuItemDetails(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMenuItemDetails} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">Product Title</label>
                  <input
                    type="text"
                    required
                    value={editItemName}
                    onChange={(e) => setEditItemName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Category</label>
                  <select
                    value={editItemCategory}
                    onChange={(e) => setEditItemCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    {menuCategoriesList.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Selling Price ({state.settings.currency.symbol})</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={editItemPrice}
                    onChange={(e) => setEditItemPrice(e.target.value)}
                    className="w-full px-3 py-2 font-mono bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">SKU Code</label>
                  <input
                    type="text"
                    required
                    value={editItemSku}
                    onChange={(e) => setEditItemSku(e.target.value)}
                    className="w-full px-3 py-2 font-mono bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Preparation Station</label>
                  <select
                    value={editItemStation}
                    onChange={(e) => setEditItemStation(e.target.value as PrepStation)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Lounge Mixology Bar">Lounge Mixology Bar</option>
                    <option value="Bistro Hot Kitchen">Bistro Hot Kitchen</option>
                    <option value="Garde Manger & Charcuterie">Garde Manger & Charcuterie</option>
                    <option value="Sommelier Cellar">Sommelier Cellar</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">Tasting & Recipe Description</label>
                  <textarea
                    rows={2}
                    value={editItemDesc}
                    onChange={(e) => setEditItemDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingMenuItemDetails(null)}
                  className="px-3.5 py-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  Save Product Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
