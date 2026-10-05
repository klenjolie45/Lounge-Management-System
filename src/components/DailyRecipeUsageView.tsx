import React, { useMemo, useState } from 'react';
import {
  Calendar,
  ChefHat,
  ChevronDown,
  CookingPot,
  Download,
  Flame,
  Printer,
  Search,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react';
import { CloudSystemState, Ingredient, MenuItem, SaleOrder } from '../types/lounge';
import { formatCurrency } from '../utils/formatters';
import { PrintContentType } from './PrintReceiptModal';

interface DailyRecipeUsageViewProps {
  state: CloudSystemState;
  onOpenPrint: (content: PrintContentType) => void;
}

export const DailyRecipeUsageView: React.FC<DailyRecipeUsageViewProps> = ({
  state,
  onOpenPrint,
}) => {
  // Extract distinct dates from existing orders
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    for (const o of state.orders) {
      dates.add(o.createdAt.slice(0, 10));
    }
    const today = new Date().toISOString().slice(0, 10);
    dates.add(today);
    return Array.from(dates).sort().reverse();
  }, [state.orders]);

  const [selectedDate, setSelectedDate] = useState<string>(availableDates[0] || new Date().toISOString().slice(0, 10));
  const [stationFilter, setStationFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const ingredientMap = useMemo(() => {
    const map = new Map<string, Ingredient>();
    for (const ing of state.ingredients) {
      map.set(ing.id, ing);
    }
    return map;
  }, [state.ingredients]);

  // Aggregate orders for the selected date
  const dayOrders = useMemo(() => {
    return state.orders.filter((o) => o.createdAt.startsWith(selectedDate));
  }, [state.orders, selectedDate]);

  // Compute recipes used on the selected date and products used for
  const recipeUsageData = useMemo(() => {
    interface RecipeUsageRow {
      menuItemId: string;
      recipeName: string;
      menuItemName: string;
      category: string;
      prepStation: string;
      portionsCount: number;
      ingredientsSummary: Array<{
        id: string;
        name: string;
        unitQty: number;
        totalQty: number;
        unit: string;
        cost: number;
      }>;
      totalCost: number;
    }

    const map = new Map<string, RecipeUsageRow>();
    const totalIngredientsMap = new Map<string, { name: string; totalQty: number; unit: string; cost: number }>();
    let totalDayRecipeCost = 0;

    for (const order of dayOrders) {
      for (const item of order.items) {
        const menuObj = state.menuItems.find((m) => m.id === item.menuItemId);
        if (!menuObj) continue;

        const row = map.get(menuObj.id) || {
          menuItemId: menuObj.id,
          recipeName: menuObj.name,
          menuItemName: menuObj.name,
          category: menuObj.category,
          prepStation: menuObj.prepStation,
          portionsCount: 0,
          ingredientsSummary: [],
          totalCost: 0,
        };

        row.portionsCount += item.quantity;
        map.set(menuObj.id, row);
      }
    }

    // Now calculate exact ingredient quantities based on recipe BOM
    const list: RecipeUsageRow[] = [];
    map.forEach((row, menuItemId) => {
      const menuObj = state.menuItems.find((m) => m.id === menuItemId);
      if (!menuObj) return;

      let rowCost = 0;
      const ingredientsSummary = menuObj.recipe.map((r) => {
        const ing = ingredientMap.get(r.ingredientId);
        const unitQty = r.quantity;
        const totalQty = Number((r.quantity * row.portionsCount).toFixed(2));
        const cost = ing ? Number((totalQty * ing.costPerUnit).toFixed(2)) : 0;
        rowCost += cost;

        if (ing) {
          const prev = totalIngredientsMap.get(ing.id) || {
            name: ing.name,
            totalQty: 0,
            unit: ing.unit,
            cost: 0,
          };
          prev.totalQty = Number((prev.totalQty + totalQty).toFixed(2));
          prev.cost = Number((prev.cost + cost).toFixed(2));
          totalIngredientsMap.set(ing.id, prev);
        }

        return {
          id: r.ingredientId,
          name: ing?.name || 'Raw Ingredient',
          unitQty,
          totalQty,
          unit: ing?.unit || 'unit',
          cost,
        };
      });

      row.ingredientsSummary = ingredientsSummary;
      row.totalCost = Number(rowCost.toFixed(2));
      totalDayRecipeCost += rowCost;
      list.push(row);
    });

    list.sort((a, b) => b.portionsCount - a.portionsCount);

    return {
      recipes: list,
      totalIngredientsUsed: Array.from(totalIngredientsMap.values()).sort((a, b) => b.cost - a.cost),
      totalDayRecipeCost: Number(totalDayRecipeCost.toFixed(2)),
      totalPortionsPrepared: list.reduce((acc, r) => acc + r.portionsCount, 0),
    };
  }, [dayOrders, state.menuItems, ingredientMap]);

  const filteredRecipes = useMemo(() => {
    return recipeUsageData.recipes.filter((r) => {
      const matchesStation = stationFilter === 'All' || r.prepStation === stationFilter;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchesStation;
      return (
        matchesStation &&
        (r.recipeName.toLowerCase().includes(q) ||
          r.menuItemName.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.ingredientsSummary.some((ing) => ing.name.toLowerCase().includes(q)))
      );
    });
  }, [recipeUsageData.recipes, stationFilter, searchQuery]);

  const handlePrintDailyLog = () => {
    onOpenPrint({
      type: 'daily_recipe_usage',
      date: selectedDate,
      recipesUsed: recipeUsageData.recipes,
      totalIngredientsUsed: recipeUsageData.totalIngredientsUsed,
      totalRecipeCost: recipeUsageData.totalDayRecipeCost,
    });
  };

  const handleExportCsv = () => {
    const headers = [
      'Business Date',
      'Recipe Name',
      'Product Used For',
      'Category',
      'Prep Station',
      'Portions Prepared',
      'Ingredients Breakdown',
      'Total Recipe Cost',
    ];
    const rows = recipeUsageData.recipes.map((r) => [
      selectedDate,
      `"${r.recipeName}"`,
      `"${r.menuItemName}"`,
      r.category,
      `"${r.prepStation}"`,
      r.portionsCount,
      `"${r.ingredientsSummary.map((i) => `${i.totalQty}${i.unit} ${i.name}`).join('; ')}"`,
      r.totalCost.toFixed(2),
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `daily-recipes-used-${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Recipes Triggered Today</span>
          <div className="text-2xl font-semibold font-mono tabular-nums text-slate-100">
            {recipeUsageData.recipes.length} Recipes
          </div>
          <p className="text-xs text-slate-400">
            {recipeUsageData.totalPortionsPrepared} portions prepared on POS
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Daily Raw Ingredient Cost</span>
          <div className="text-2xl font-semibold font-mono tabular-nums text-amber-400">
            {formatCurrency(recipeUsageData.totalDayRecipeCost, state.settings.currency)}
          </div>
          <p className="text-xs text-slate-400 font-mono tabular-nums">
            Weighted by exact BOM ingredient deductions
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Raw SKUs Consumed</span>
          <div className="text-2xl font-semibold font-mono tabular-nums text-slate-100">
            {recipeUsageData.totalIngredientsUsed.length} Ingredients
          </div>
          <p className="text-xs text-slate-400">
            Automatically deducted from lounge & kitchen stock
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Selected Service Date</span>
          <div className="text-lg font-semibold font-mono tabular-nums text-emerald-400 mt-1">
            {selectedDate}
          </div>
          <p className="text-xs text-slate-400">
            {dayOrders.length} settled tickets analyzed
          </p>
        </div>
      </div>

      {/* Date Filter & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs">
            <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-slate-400">Date:</span>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-100 font-semibold focus:outline-none cursor-pointer"
            >
              {availableDates.map((d) => (
                <option key={d} value={d} className="bg-slate-900 text-slate-100">
                  {d} {d === new Date().toISOString().slice(0, 10) ? '(Today)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto">
            {['All', 'Lounge Mixology Bar', 'Bistro Hot Kitchen', 'Garde Manger & Charcuterie', 'Sommelier Cellar'].map(
              (st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStationFilter(st)}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                    stationFilter === st
                      ? 'bg-amber-500 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st === 'All' ? 'All Stations' : st.replace(' & Charcuterie', '')}
                </button>
              )
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search recipe or ingredient..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrintDailyLog}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg whitespace-nowrap cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Daily Recipe Sheet</span>
          </button>
        </div>
      </div>

      {/* Main Content Layout: Recipe Cards and Daily Ingredient Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: List of Recipes Used and Products Used For */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <CookingPot className="w-4 h-4 text-amber-400" />
              <span>Recipes Prepared & Products Used For ({filteredRecipes.length})</span>
            </h3>
            <span className="text-xs text-slate-400">
              Sorted by portions prepared
            </span>
          </div>

          {filteredRecipes.length === 0 ? (
            <div className="p-10 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-2">
              <ChefHat className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-base font-semibold text-slate-200">
                No recipes recorded for {selectedDate}
              </p>
              <p className="text-xs text-slate-400">
                Ring up orders on the POS terminal to see recipes and products tracked automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRecipes.map((item) => (
                <div
                  key={item.menuItemId}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pb-2 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-semibold text-slate-100">
                          {item.recipeName}
                        </h4>
                        <span className="text-[11px] text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded font-mono">
                          {item.portionsCount} portions prepared
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Product Used For: <strong className="text-slate-200">{item.menuItemName}</strong> · Station: {item.prepStation}
                      </div>
                    </div>

                    <div className="text-right font-mono tabular-nums text-xs">
                      <div className="text-amber-400 font-semibold">
                        {formatCurrency(item.totalCost, state.settings.currency)} total cost
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {formatCurrency(item.totalCost / (item.portionsCount || 1), state.settings.currency)} / portion
                      </div>
                    </div>
                  </div>

                  {/* Ingredient consumption breakdown for this recipe */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">
                      Raw Ingredients Deducted For This Recipe:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {item.ingredientsSummary.map((ing) => (
                        <div
                          key={ing.id}
                          className="p-2 rounded bg-slate-950 border border-slate-800/80 flex items-center justify-between font-mono tabular-nums"
                        >
                          <span className="text-slate-300 font-sans truncate pr-2">
                            {ing.name}
                          </span>
                          <span className="text-slate-400 shrink-0">
                            {ing.totalQty.toLocaleString()} {ing.unit} ({formatCurrency(ing.cost, state.settings.currency)})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 4 Cols: Aggregated Total Ingredients Used Today */}
        <div className="lg:col-span-4 rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-4 sticky top-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Daily Ingredient Depletion
              </h3>
              <p className="text-xs text-slate-400">
                Total stock consumed across all recipes on {selectedDate}
              </p>
            </div>
            <UtensilsCrossed className="w-4 h-4 text-amber-400" />
          </div>

          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {recipeUsageData.totalIngredientsUsed.map((ing, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono tabular-nums"
              >
                <div>
                  <div className="text-slate-200 font-sans font-medium">{ing.name}</div>
                  <div className="text-[11px] text-slate-400">
                    {ing.totalQty.toLocaleString()} {ing.unit} consumed
                  </div>
                </div>
                <div className="text-amber-400 font-semibold">
                  {formatCurrency(ing.cost, state.settings.currency)}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-between font-semibold text-sm">
            <span className="text-slate-200">Total Recipe Cost:</span>
            <span className="font-mono tabular-nums text-amber-400">
              {formatCurrency(recipeUsageData.totalDayRecipeCost, state.settings.currency)}
            </span>
          </div>

          <button
            type="button"
            onClick={handlePrintDailyLog}
            className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Recipe & Ingredient Slip</span>
          </button>
        </div>
      </div>
    </div>
  );
};
