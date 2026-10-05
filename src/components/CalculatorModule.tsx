import React, { useEffect, useState } from 'react';
import {
  ArrowRightLeft,
  Calculator,
  Check,
  ChevronRight,
  Clipboard,
  Copy,
  DollarSign,
  Download,
  Flame,
  History,
  Layers,
  Percent,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Users,
  Wine,
  X,
} from 'lucide-react';
import { CloudSystemState } from '../types/lounge';
import { formatCurrency } from '../utils/formatters';

interface TemporarySaveItem {
  id: string;
  title: string;
  value: number;
  formattedValue: string;
  category: 'arithmetic' | 'pour_cost' | 'split_check' | 'unit_converter';
  expressionOrDetails: string;
  timestamp: string;
  notes?: string;
}

interface CalculatorModuleProps {
  state: CloudSystemState;
  onNavigateToPos?: () => void;
}

export const CalculatorModule: React.FC<CalculatorModuleProps> = ({
  state,
  onNavigateToPos,
}) => {
  const [activeTab, setActiveTab] = useState<'standard' | 'pour_cost' | 'split_check' | 'converter'>('standard');
  const [showDrawer, setShowDrawer] = useState(true);
  const [copiedToast, setCopiedToast] = useState<string | null>(null);

  // STORAGE KEY
  const STORAGE_KEY = 'lounge_calculator_temp_saves';

  // Temporary Saved Scratchpad State
  const [tempSaves, setTempSaves] = useState<TemporarySaveItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }
    return [
      {
        id: 'save-1',
        title: 'VIP Booth #4 Split Check (4 Guests)',
        value: 18750,
        formattedValue: formatCurrency(18750, state.settings?.currency),
        category: 'split_check',
        expressionOrDetails: '₦75,000 ÷ 4 guests (includes 10% gratuity)',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        notes: 'Pre-authorized for Table 4 split payment',
      },
      {
        id: 'save-2',
        title: 'Hennessy VSOP Standard 50ml Pour Cost',
        value: 1250,
        formattedValue: formatCurrency(1250, state.settings?.currency),
        category: 'pour_cost',
        expressionOrDetails: '₦18,750 bottle cost / 15 pours (750ml bottle)',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        notes: 'Target pour cost 19.5% -> Recommended price ₦6,400',
      },
    ];
  });

  // Save to localStorage whenever tempSaves updates
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tempSaves));
    } catch {
      // ignore
    }
  }, [tempSaves]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedToast(label);
    setTimeout(() => setCopiedToast(null), 2500);
  };

  const handleSaveToScratchpad = (item: Omit<TemporarySaveItem, 'id' | 'timestamp'>) => {
    const newItem: TemporarySaveItem = {
      ...item,
      id: `save-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    setTempSaves([newItem, ...tempSaves]);
    setCopiedToast(`Saved "${newItem.title}" to Temporary Scratchpad!`);
    setTimeout(() => setCopiedToast(null), 3000);
  };

  const handleDeleteSave = (id: string) => {
    setTempSaves(tempSaves.filter((s) => s.id !== id));
  };

  const handleClearAllSaves = () => {
    if (confirm('Clear all temporary saved calculations from scratchpad?')) {
      setTempSaves([]);
    }
  };

  // ----------------------------------------------------
  // TAB 1: STANDARD ARITHMETIC CALCULATOR
  // ----------------------------------------------------
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcExpression, setCalcExpression] = useState('');
  const [calcHistory, setCalcHistory] = useState<string[]>([]);
  const [saveTitleInput, setSaveTitleInput] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);

  const handleCalcNumber = (num: string) => {
    if (calcDisplay === '0' || calcDisplay === 'Error') {
      setCalcDisplay(num);
    } else {
      setCalcDisplay(calcDisplay + num);
    }
  };

  const handleCalcDecimal = () => {
    if (!calcDisplay.includes('.')) {
      setCalcDisplay(calcDisplay + '.');
    }
  };

  const handleCalcOperator = (op: string) => {
    setCalcExpression(`${calcDisplay} ${op} `);
    setCalcDisplay('0');
  };

  const handleCalcClear = () => {
    setCalcDisplay('0');
    setCalcExpression('');
  };

  const handleCalcBackspace = () => {
    if (calcDisplay.length > 1) {
      setCalcDisplay(calcDisplay.slice(0, -1));
    } else {
      setCalcDisplay('0');
    }
  };

  const handleCalcEquals = () => {
    try {
      if (!calcExpression) return;
      const full = `${calcExpression}${calcDisplay}`.replace(/×/g, '*').replace(/÷/g, '/');
      // eslint-disable-next-line no-eval
      const result = Function(`'use strict'; return (${full})`)();
      const numResult = Number(result);
      if (isNaN(numResult) || !isFinite(numResult)) {
        setCalcDisplay('Error');
        return;
      }
      const formatted = Number.isInteger(numResult) ? String(numResult) : numResult.toFixed(2);
      const historyEntry = `${calcExpression}${calcDisplay} = ${formatted}`;
      setCalcHistory([historyEntry, ...calcHistory.slice(0, 9)]);
      setCalcExpression('');
      setCalcDisplay(formatted);
    } catch {
      setCalcDisplay('Error');
    }
  };

  const handleCalcPercent = () => {
    const val = parseFloat(calcDisplay) || 0;
    setCalcDisplay(String(val / 100));
  };

  const handleCalcPlusMinus = () => {
    const val = parseFloat(calcDisplay) || 0;
    setCalcDisplay(String(-val));
  };

  const submitStandardSave = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(calcDisplay) || 0;
    const title = saveTitleInput.trim() || `Calculation ${formatCurrency(val, state.settings?.currency)}`;
    handleSaveToScratchpad({
      title,
      value: val,
      formattedValue: formatCurrency(val, state.settings?.currency),
      category: 'arithmetic',
      expressionOrDetails: calcHistory[0] || `Result: ${calcDisplay}`,
    });
    setSaveTitleInput('');
    setShowSaveModal(false);
  };

  // ----------------------------------------------------
  // TAB 2: POUR COST & BEVERAGE MARGIN
  // ----------------------------------------------------
  const [selectedIngredientId, setSelectedIngredientId] = useState<string>('');
  const [bottleCost, setBottleCost] = useState<number>(18500);
  const [bottleVolumeMl, setBottleVolumeMl] = useState<number>(750);
  const [pourSizeMl, setPourSizeMl] = useState<number>(50);
  const [targetPourCostPct, setTargetPourCostPct] = useState<number>(20);
  const [pourCostTitle, setPourCostTitle] = useState('Whiskey Pour Cost Calculation');

  // When selecting ingredient from inventory
  const handleSelectIngredient = (ingId: string) => {
    setSelectedIngredientId(ingId);
    const ing = state.ingredients.find((i) => i.id === ingId);
    if (ing) {
      setBottleCost(ing.costPerUnit * 750);
      setPourCostTitle(`${ing.name} Pour Cost & Menu Margin`);
    }
  };

  // Computed pour metrics
  const poursPerBottle = bottleVolumeMl > 0 && pourSizeMl > 0 ? bottleVolumeMl / pourSizeMl : 0;
  const costPerPour = poursPerBottle > 0 ? bottleCost / poursPerBottle : 0;
  const recommendedMenuPrice = targetPourCostPct > 0 ? costPerPour / (targetPourCostPct / 100) : 0;
  const grossProfitPerPour = recommendedMenuPrice - costPerPour;
  const grossProfitPerBottle = grossProfitPerPour * poursPerBottle;

  const handleSavePourCost = () => {
    handleSaveToScratchpad({
      title: pourCostTitle || 'Beverage Pour Cost Computation',
      value: costPerPour,
      formattedValue: `${formatCurrency(costPerPour, state.settings?.currency)} / pour`,
      category: 'pour_cost',
      expressionOrDetails: `Bottle: ${formatCurrency(bottleCost, state.settings?.currency)} (${bottleVolumeMl}ml) · ${pourSizeMl}ml pour (${poursPerBottle.toFixed(1)} drinks/bottle) · Rec. Price: ${formatCurrency(recommendedMenuPrice, state.settings?.currency)} at ${targetPourCostPct}% cost`,
      notes: `Gross Profit: ${formatCurrency(grossProfitPerPour, state.settings?.currency)}/drink · ${formatCurrency(grossProfitPerBottle, state.settings?.currency)}/bottle`,
    });
  };

  // ----------------------------------------------------
  // TAB 3: BILL SPLITTING & TIP CALCULATOR
  // ----------------------------------------------------
  const [splitBillAmount, setSplitBillAmount] = useState<number>(45000);
  const [splitGuestCount, setSplitGuestCount] = useState<number>(4);
  const [splitTipPct, setSplitTipPct] = useState<number>(10);
  const [splitTitle, setSplitTitle] = useState('VIP Check Split');

  const tipAmount = (splitBillAmount * splitTipPct) / 100;
  const totalWithTip = splitBillAmount + tipAmount;
  const amountPerGuest = splitGuestCount > 0 ? totalWithTip / splitGuestCount : totalWithTip;
  const basePerGuest = splitGuestCount > 0 ? splitBillAmount / splitGuestCount : splitBillAmount;
  const tipPerGuest = splitGuestCount > 0 ? tipAmount / splitGuestCount : tipAmount;

  const handleSaveSplitCheck = () => {
    handleSaveToScratchpad({
      title: splitTitle || `Check Split (${splitGuestCount} Guests)`,
      value: amountPerGuest,
      formattedValue: `${formatCurrency(amountPerGuest, state.settings?.currency)} / guest`,
      category: 'split_check',
      expressionOrDetails: `Total Check ${formatCurrency(totalWithTip, state.settings?.currency)} (${splitTipPct}% Tip) split across ${splitGuestCount} guests`,
      notes: `Base: ${formatCurrency(basePerGuest, state.settings?.currency)} + Gratuity: ${formatCurrency(tipPerGuest, state.settings?.currency)}`,
    });
  };

  // ----------------------------------------------------
  // TAB 4: BAR & KITCHEN UNIT CONVERTER
  // ----------------------------------------------------
  const [convertType, setConvertType] = useState<'volume' | 'weight'>('volume');
  const [convertAmount, setConvertAmount] = useState<number>(750);
  const [fromUnit, setFromUnit] = useState<string>('ml');
  const [toUnit, setToUnit] = useState<string>('oz');

  const volumeRatiosInMl: Record<string, number> = {
    ml: 1,
    cl: 10,
    l: 1000,
    oz: 29.5735,
    shot30: 30,
    shot44: 44,
    bottle750: 750,
    bottle1000: 1000,
  };

  const weightRatiosInGrams: Record<string, number> = {
    g: 1,
    kg: 1000,
    oz: 28.3495,
    lb: 453.592,
  };

  const calculateConversion = (): number => {
    if (convertType === 'volume') {
      const ml = (convertAmount || 0) * (volumeRatiosInMl[fromUnit] || 1);
      return ml / (volumeRatiosInMl[toUnit] || 1);
    } else {
      const g = (convertAmount || 0) * (weightRatiosInGrams[fromUnit] || 1);
      return g / (weightRatiosInGrams[toUnit] || 1);
    }
  };

  const convertedResult = calculateConversion();

  const handleSaveConversion = () => {
    handleSaveToScratchpad({
      title: `${convertAmount} ${fromUnit} to ${toUnit}`,
      value: convertedResult,
      formattedValue: `${convertedResult.toFixed(2)} ${toUnit}`,
      category: 'unit_converter',
      expressionOrDetails: `${convertAmount} ${fromUnit} = ${convertedResult.toFixed(2)} ${toUnit}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {copiedToast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-semibold text-xs shadow-2xl flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4" />
          <span>{copiedToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/20 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>Lounge & Bar Calculator</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-normal">
                  with Temporary Scratchpad
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Register arithmetic, beverage pour cost margins, bill splitting, and bar conversions with instant temporary saves.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDrawer(!showDrawer)}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
              showDrawer
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                : 'bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>Temporary Saves ({tempSaves.length})</span>
          </button>

          {onNavigateToPos && (
            <button
              type="button"
              onClick={onNavigateToPos}
              className="px-3.5 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-xl cursor-pointer"
            >
              Back to POS
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('standard')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'standard'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>Register Arithmetic</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pour_cost')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'pour_cost'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Wine className="w-3.5 h-3.5" />
          <span>Pour Cost & Menu Margin</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('split_check')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'split_check'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Split Bill & Gratuity</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('converter')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'converter'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>Bar & Kitchen Converter</span>
        </button>
      </div>

      {/* Main Workspace with Scratchpad Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Tool Area */}
        <div className={showDrawer ? 'lg:col-span-8 space-y-6' : 'lg:col-span-12 space-y-6'}>
          {/* TAB 1: STANDARD ARITHMETIC */}
          {activeTab === 'standard' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Keypad Column */}
              <div className="md:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
                {/* Display Screen */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-right space-y-1">
                  <div className="text-xs font-mono text-slate-400 h-5 overflow-hidden truncate">
                    {calcExpression || ' '}
                  </div>
                  <div className="text-3xl font-bold font-mono text-amber-400 tracking-tight overflow-x-auto">
                    {calcDisplay}
                  </div>
                </div>

                {/* Keypad Grid */}
                <div className="grid grid-cols-4 gap-2 text-sm font-semibold font-mono">
                  <button
                    type="button"
                    onClick={handleCalcClear}
                    className="p-3.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 cursor-pointer transition-colors"
                  >
                    AC
                  </button>
                  <button
                    type="button"
                    onClick={handleCalcBackspace}
                    className="p-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer transition-colors"
                  >
                    ⌫
                  </button>
                  <button
                    type="button"
                    onClick={handleCalcPercent}
                    className="p-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer transition-colors"
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCalcOperator('÷')}
                    className="p-3.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 cursor-pointer transition-colors"
                  >
                    ÷
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCalcNumber('7')}
                    className="p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-100 border border-slate-800/80 cursor-pointer transition-colors"
                  >
                    7
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCalcNumber('8')}
                    className="p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-100 border border-slate-800/80 cursor-pointer transition-colors"
                  >
                    8
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCalcNumber('9')}
                    className="p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-100 border border-slate-800/80 cursor-pointer transition-colors"
                  >
                    9
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCalcOperator('×')}
                    className="p-3.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 cursor-pointer transition-colors"
                  >
                    ×
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCalcNumber('4')}
                    className="p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-100 border border-slate-800/80 cursor-pointer transition-colors"
                  >
                    4
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCalcNumber('5')}
                    className="p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-100 border border-slate-800/80 cursor-pointer transition-colors"
                  >
                    5
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCalcNumber('6')}
                    className="p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-100 border border-slate-800/80 cursor-pointer transition-colors"
                  >
                    6
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCalcOperator('-')}
                    className="p-3.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 cursor-pointer transition-colors"
                  >
                    -
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCalcNumber('1')}
                    className="p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-100 border border-slate-800/80 cursor-pointer transition-colors"
                  >
                    1
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCalcNumber('2')}
                    className="p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-100 border border-slate-800/80 cursor-pointer transition-colors"
                  >
                    2
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCalcNumber('3')}
                    className="p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-100 border border-slate-800/80 cursor-pointer transition-colors"
                  >
                    3
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCalcOperator('+')}
                    className="p-3.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 cursor-pointer transition-colors"
                  >
                    +
                  </button>

                  <button
                    type="button"
                    onClick={handleCalcPlusMinus}
                    className="p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-100 border border-slate-800/80 cursor-pointer transition-colors"
                  >
                    ±
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCalcNumber('0')}
                    className="p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-100 border border-slate-800/80 cursor-pointer transition-colors"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleCalcDecimal}
                    className="p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-100 border border-slate-800/80 cursor-pointer transition-colors"
                  >
                    .
                  </button>
                  <button
                    type="button"
                    onClick={handleCalcEquals}
                    className="p-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer transition-colors shadow-xs"
                  >
                    =
                  </button>
                </div>

                {/* Save to Scratchpad Button */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSaveModal(true)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Temporary Save Display Value ({calcDisplay})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(calcDisplay, 'Copied value!')}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                    title="Copy value"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tape / History Column */}
              <div className="md:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                    <History className="w-4 h-4 text-amber-400" />
                    <span>Calculation Tape</span>
                  </div>
                  {calcHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCalcHistory([])}
                      className="text-[11px] text-slate-500 hover:text-rose-400 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {calcHistory.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    No calculations performed yet in this session.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                    {calcHistory.map((entry, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          const parts = entry.split('=');
                          if (parts[1]) setCalcDisplay(parts[1].trim());
                        }}
                        className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 transition-colors cursor-pointer group"
                      >
                        <div className="text-xs font-mono text-slate-300 group-hover:text-amber-300">
                          {entry}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                          <span>Click to recall result</span>
                          <span className="text-amber-400 font-mono">Load</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: POUR COST & MENU MARGIN */}
          {activeTab === 'pour_cost' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div>
                <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                  <Wine className="w-4 h-4 text-amber-400" />
                  <span>Beverage Pour Cost & Menu Margin Calculator</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Analyze cost per pour, yield per bottle, target beverage margins, and recommended retail prices.
                </p>
              </div>

              {/* Quick Inventory Selector */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Quick Load from Lounge Bottle Inventory (Optional):
                </label>
                <select
                  value={selectedIngredientId}
                  onChange={(e) => handleSelectIngredient(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-100"
                >
                  <option value="">-- Custom Manual Bottle Entry --</option>
                  {state.ingredients
                    .filter(
                      (i) =>
                        i.category === 'Spirits & Liqueurs' ||
                        i.category === 'Cellar Wines' ||
                        i.unit === 'ml' ||
                        i.unit === 'oz'
                    )
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} ({i.unit}) · Current Cost: {formatCurrency(i.costPerUnit * 750, state.settings?.currency)}/750ml
                      </option>
                    ))}
                </select>
              </div>

              {/* Input Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">
                    Bottle Cost ({state.settings?.currency?.symbol || '₦'})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={bottleCost}
                    onChange={(e) => setBottleCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 font-mono tabular-nums bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Bottle Volume (ml)</label>
                  <select
                    value={bottleVolumeMl}
                    onChange={(e) => setBottleVolumeMl(parseInt(e.target.value) || 750)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  >
                    <option value={750}>750 ml (Standard Bottle)</option>
                    <option value={1000}>1,000 ml (1 Liter Bar Pour)</option>
                    <option value={700}>700 ml (European Import)</option>
                    <option value={1500}>1,500 ml (Magnum)</option>
                    <option value={330}>330 ml (Beer Bottle/Can)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Standard Pour Size (ml)</label>
                  <select
                    value={pourSizeMl}
                    onChange={(e) => setPourSizeMl(parseInt(e.target.value) || 50)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  >
                    <option value={50}>50 ml (Double Standard)</option>
                    <option value={60}>60 ml (2 oz Neat/Rocks)</option>
                    <option value={45}>45 ml (1.5 oz Standard Shot)</option>
                    <option value={30}>30 ml (Single Shot)</option>
                    <option value={150}>150 ml (Wine Glass)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Target Pour Cost %</label>
                  <input
                    type="number"
                    min="5"
                    max="60"
                    step="0.5"
                    value={targetPourCostPct}
                    onChange={(e) => setTargetPourCostPct(parseFloat(e.target.value) || 20)}
                    className="w-full px-3 py-2 font-mono tabular-nums bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  />
                </div>
              </div>

              {/* Output Result Metric Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[11px] text-slate-400">Cost Per Pour (COGS)</div>
                  <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                    {formatCurrency(costPerPour, state.settings?.currency)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {poursPerBottle.toFixed(1)} pours / bottle
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[11px] text-slate-400">Rec. Selling Price</div>
                  <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                    {formatCurrency(recommendedMenuPrice, state.settings?.currency)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Hits target {targetPourCostPct}% pour cost
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[11px] text-slate-400">Profit Per Drink</div>
                  <div className="text-xl font-bold font-mono text-slate-100 mt-1">
                    {formatCurrency(grossProfitPerPour, state.settings?.currency)}
                  </div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">
                    {(100 - targetPourCostPct).toFixed(1)}% Gross Margin
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[11px] text-slate-400">Total Bottle Profit</div>
                  <div className="text-xl font-bold font-mono text-amber-300 mt-1">
                    {formatCurrency(grossProfitPerBottle, state.settings?.currency)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Yield: {formatCurrency(recommendedMenuPrice * poursPerBottle, state.settings?.currency)} rev
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  value={pourCostTitle}
                  onChange={(e) => setPourCostTitle(e.target.value)}
                  placeholder="Scratchpad save label (e.g. VIP Tequila Costing)"
                  className="flex-1 px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
                <button
                  type="button"
                  onClick={handleSavePourCost}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Temporary Save Pour Cost</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: SPLIT CHECK & GRATUITY */}
          {activeTab === 'split_check' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div>
                <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>VIP Bill Splitting & Hospitality Gratuity Calculator</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Instantly calculate per-guest share with optional service charge and hospitality tip.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">
                    Total Check Amount ({state.settings?.currency?.symbol || '₦'})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={splitBillAmount}
                    onChange={(e) => setSplitBillAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 font-mono tabular-nums bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Number of Guests</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={splitGuestCount}
                      onChange={(e) => setSplitGuestCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 font-mono tabular-nums bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Tip / Gratuity Percentage</label>
                  <div className="flex items-center gap-1.5">
                    {[0, 5, 10, 15, 20].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setSplitTipPct(pct)}
                        className={`flex-1 py-2 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                          splitTipPct === pct
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Big Per-Guest Result */}
              <div className="p-6 rounded-2xl bg-slate-950 border border-amber-500/30 text-center space-y-2">
                <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                  Each Guest Pays (Equal Split · {splitGuestCount} Guests)
                </div>
                <div className="text-4xl sm:text-5xl font-extrabold font-mono text-amber-400">
                  {formatCurrency(amountPerGuest, state.settings?.currency)}
                </div>
                <div className="text-xs text-slate-400 flex flex-wrap items-center justify-center gap-3 pt-2">
                  <span>Base: {formatCurrency(basePerGuest, state.settings?.currency)}</span>
                  <span>·</span>
                  <span>Gratuity: {formatCurrency(tipPerGuest, state.settings?.currency)}</span>
                  <span>·</span>
                  <span>Total Check: {formatCurrency(totalWithTip, state.settings?.currency)}</span>
                </div>
              </div>

              {/* Save or Copy */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <input
                  type="text"
                  value={splitTitle}
                  onChange={(e) => setSplitTitle(e.target.value)}
                  placeholder="Save title (e.g. VIP Booth 4 Split)"
                  className="flex-1 px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
                <button
                  type="button"
                  onClick={handleSaveSplitCheck}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>Temporary Save Split</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      `${formatCurrency(amountPerGuest, state.settings?.currency)} per person (${splitGuestCount} guests, total ${formatCurrency(totalWithTip, state.settings?.currency)})`,
                      'Copied split breakdown!'
                    )
                  }
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy Breakdown</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: UNIT CONVERTER */}
          {activeTab === 'converter' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div>
                <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                  <span>Bar & Kitchen Measurement Converter</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Seamlessly convert fluid ounces, milliliters, centiliters, shots, and bottles.
                </p>
              </div>

              {/* Type Switcher */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setConvertType('volume');
                    setFromUnit('ml');
                    setToUnit('oz');
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                    convertType === 'volume'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-950 border border-slate-800 text-slate-400'
                  }`}
                >
                  Volume (Liquids & Spirits)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConvertType('weight');
                    setFromUnit('g');
                    setToUnit('oz');
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                    convertType === 'weight'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-950 border border-slate-800 text-slate-400'
                  }`}
                >
                  Weight (Culinary & Pantry)
                </button>
              </div>

              {/* Conversion Controls */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center text-xs">
                <div className="md:col-span-2">
                  <label className="block text-slate-400 mb-1">Enter Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={convertAmount}
                    onChange={(e) => setConvertAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 font-mono text-base bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">From Unit</label>
                  <select
                    value={fromUnit}
                    onChange={(e) => setFromUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  >
                    {convertType === 'volume' ? (
                      <>
                        <option value="ml">Milliliters (ml)</option>
                        <option value="cl">Centiliters (cl)</option>
                        <option value="l">Liters (L)</option>
                        <option value="oz">Fluid Ounces (fl oz)</option>
                        <option value="shot30">Single Shot (30ml)</option>
                        <option value="shot44">Jigger (44ml / 1.5oz)</option>
                        <option value="bottle750">Standard Bottle (750ml)</option>
                        <option value="bottle1000">Liter Bottle (1000ml)</option>
                      </>
                    ) : (
                      <>
                        <option value="g">Grams (g)</option>
                        <option value="kg">Kilograms (kg)</option>
                        <option value="oz">Ounces (oz)</option>
                        <option value="lb">Pounds (lb)</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">To Unit</label>
                  <select
                    value={toUnit}
                    onChange={(e) => setToUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  >
                    {convertType === 'volume' ? (
                      <>
                        <option value="oz">Fluid Ounces (fl oz)</option>
                        <option value="ml">Milliliters (ml)</option>
                        <option value="cl">Centiliters (cl)</option>
                        <option value="l">Liters (L)</option>
                        <option value="shot30">Single Shot (30ml)</option>
                        <option value="shot44">Jigger (44ml / 1.5oz)</option>
                        <option value="bottle750">Standard Bottle (750ml)</option>
                      </>
                    ) : (
                      <>
                        <option value="oz">Ounces (oz)</option>
                        <option value="g">Grams (g)</option>
                        <option value="kg">Kilograms (kg)</option>
                        <option value="lb">Pounds (lb)</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="pt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      const temp = fromUnit;
                      setFromUnit(toUnit);
                      setToUnit(temp);
                    }}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                    title="Swap Units"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Conversion Result Display */}
              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-slate-400">Equivalent Measurement</div>
                  <div className="text-3xl font-extrabold font-mono text-emerald-400 mt-1">
                    {convertedResult.toFixed(2)} <span className="text-lg text-slate-300 font-sans">{toUnit}</span>
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    {convertAmount} {fromUnit} = {convertedResult.toFixed(4)} {toUnit}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveConversion}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Temporary Save</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(`${convertedResult.toFixed(2)} ${toUnit}`, 'Copied conversion!')}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                    title="Copy result"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Scratchpad Side Panel: TEMPORARY SAVES */}
        {showDrawer && (
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Save className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-slate-100">
                  Temporary Scratchpad ({tempSaves.length})
                </h3>
              </div>
              {tempSaves.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllSaves}
                  className="text-[11px] text-slate-500 hover:text-rose-400 cursor-pointer"
                  title="Clear all scratchpad saves"
                >
                  Clear All
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-400">
              Draft computations preserved across module navigation and refreshes.
            </p>

            {tempSaves.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                <Save className="w-8 h-8 text-slate-700 mx-auto" />
                <p>No temporary calculations saved yet.</p>
                <p className="text-[10px]">Use the "Temporary Save" button on any calculator mode to pin estimates here.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                {tempSaves.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 transition-all space-y-2 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-200 truncate">
                          {item.title}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {' · '}
                          <span className="uppercase text-amber-400/80">{item.category.replace('_', ' ')}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteSave(item.id)}
                        className="text-slate-600 hover:text-rose-400 p-1 rounded cursor-pointer transition-colors"
                        title="Delete from scratchpad"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-lg font-bold font-mono text-amber-400">
                        {item.formattedValue}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(String(item.value), `Copied ${item.value}`)}
                        className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-lg font-mono">
                      {item.expressionOrDetails}
                    </div>

                    {item.notes && (
                      <div className="text-[10px] text-emerald-400/90 italic">
                        {item.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SAVE DIALOG MODAL (For Standard Calc) */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <form
            onSubmit={submitStandardSave}
            className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Save className="w-4 h-4 text-amber-400" />
                <span>Temporary Save to Scratchpad</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Computation Value
                </label>
                <div className="p-2.5 rounded-lg bg-slate-950 font-mono text-base font-bold text-amber-400">
                  {formatCurrency(parseFloat(calcDisplay) || 0, state.settings?.currency)} ({calcDisplay})
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Label / Note Description
                </label>
                <input
                  type="text"
                  required
                  value={saveTitleInput}
                  onChange={(e) => setSaveTitleInput(e.target.value)}
                  placeholder="e.g. Table 12 Split Estimate"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg cursor-pointer shadow-xs"
              >
                Save to Scratchpad
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
