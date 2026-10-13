import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChefHat,
  Clock,
  Filter,
  Flame,
  History,
  Play,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Timer,
  Trash2,
  User,
  Utensils,
  Volume2,
  VolumeX,
  Wine,
  X,
} from 'lucide-react';
import {
  CloudSystemState,
  KitchenTicket,
  KitchenTicketPriority,
  KitchenTicketStatus,
  SyncOperationType,
} from '../types/lounge';
import { formatDateTime } from '../utils/formatters';
import { playKitchenOrderChime } from '../utils/soundEffects';

interface KitchenChefDisplayViewProps {
  state: CloudSystemState;
  onDispatch: (type: SyncOperationType, payload: any, description: string) => Promise<void>;
  onNavigateToPos?: () => void;
}

export const KitchenChefDisplayView: React.FC<KitchenChefDisplayViewProps> = ({
  state,
  onDispatch,
  onNavigateToPos,
}) => {
  const [filterStatus, setFilterStatus] = useState<
    'all_active' | KitchenTicketStatus
  >('all_active');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStation, setSelectedStation] = useState<string>('All');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // New manual ticket modal (for direct phone-in or chef scratch ticket)
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [manualTable, setManualTable] = useState('VIP Booth');
  const [manualServer, setManualServer] = useState(
    state.users?.[0]?.name || 'Chef Lead'
  );
  const [manualPriority, setManualPriority] = useState<KitchenTicketPriority>('normal');
  const [manualItemText, setManualItemText] = useState('');
  const [manualNotes, setManualNotes] = useState('');

  const tickets = state.kitchenTickets || [];

  // Kitchen chime sound notification: alerts the chef immediately when a new order arrives
  const isFirstRender = React.useRef(true);
  const knownTicketIdsRef = React.useRef<Set<string>>(
    new Set((state.kitchenTickets || []).map((t) => t.id))
  );

  React.useEffect(() => {
    const currentTickets = state.kitchenTickets || [];
    if (isFirstRender.current) {
      isFirstRender.current = false;
      knownTicketIdsRef.current = new Set(currentTickets.map((t) => t.id));
      return;
    }

    const newTickets = currentTickets.filter((t) => !knownTicketIdsRef.current.has(t.id));
    if (newTickets.length > 0) {
      if (soundEnabled) {
        const hasUrgent = newTickets.some((t) => t.priority === 'rush' || t.priority === 'vip');
        playKitchenOrderChime(hasUrgent ? 'vip' : 'normal');
      }
      knownTicketIdsRef.current = new Set(currentTickets.map((t) => t.id));
    }
  }, [state.kitchenTickets, soundEnabled]);

  // Active tickets counts
  const pendingCount = tickets.filter((t) => t.status === 'pending').length;
  const preparingCount = tickets.filter((t) => t.status === 'preparing').length;
  const readyCount = tickets.filter((t) => t.status === 'ready').length;
  const activeCount = pendingCount + preparingCount + readyCount;

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      // Status filtering
      if (filterStatus === 'all_active') {
        if (ticket.status === 'completed' || ticket.status === 'cancelled') return false;
      } else if (ticket.status !== filterStatus) {
        return false;
      }

      // Station filter
      if (selectedStation !== 'All') {
        const matchesStation = ticket.items.some((i) => i.station === selectedStation);
        if (!matchesStation) return false;
      }

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        ticket.ticketNumber.toLowerCase().includes(q) ||
        ticket.serverName.toLowerCase().includes(q) ||
        (ticket.customerName && ticket.customerName.toLowerCase().includes(q)) ||
        ticket.serviceMode.toLowerCase().includes(q) ||
        ticket.items.some((i) => i.name.toLowerCase().includes(q))
      );
    });
  }, [tickets, filterStatus, selectedStation, searchQuery]);

  // Handle status update
  const handleUpdateStatus = async (
    ticketId: string,
    newStatus: KitchenTicketStatus,
    ticketNumber: string
  ) => {
    await onDispatch(
      'UPDATE_KITCHEN_TICKET_STATUS',
      { ticketId, status: newStatus },
      `Kitchen Ticket ${ticketNumber} updated to ${newStatus.toUpperCase()}`
    );
  };

  // Handle manual ticket creation
  const handleCreateManualTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualItemText.trim()) return;

    const items = manualItemText
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        const trimmed = line.trim();
        // check if starts with number e.g. "2x Wagyu Sliders"
        const match = trimmed.match(/^(\d+)x?\s+(.*)/i);
        if (match) {
          return {
            name: match[2],
            quantity: parseInt(match[1], 10) || 1,
            station: 'Kitchen Hot Line' as any,
          };
        }
        return {
          name: trimmed,
          quantity: 1,
          station: 'Kitchen Hot Line' as any,
        };
      });

    const newTicket: KitchenTicket = {
      id: `kt-${Date.now()}`,
      ticketNumber: `K-${Math.floor(100 + Math.random() * 900)}`,
      createdAt: new Date().toISOString(),
      serviceMode: manualTable as any,
      serverName: manualServer,
      status: 'pending',
      priority: manualPriority,
      items,
      notes: manualNotes.trim() || undefined,
    };

    await onDispatch(
      'CREATE_KITCHEN_TICKET',
      { ticket: newTicket },
      `Kitchen Ticket ${newTicket.ticketNumber} created manually by ${manualServer}`
    );

    if (soundEnabled) {
      playKitchenOrderChime(newTicket.priority);
    }

    setShowNewTicketModal(false);
    setManualItemText('');
    setManualNotes('');
  };

  // Calculate elapsed time from createdAt
  const getElapsedMinutes = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    return Math.max(0, Math.floor(diffMs / (60 * 1000)));
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Top Header / KDS Control Bar */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-100">
                  Kitchen Display System (Chef Screen)
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Live Queue · {activeCount} Active
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Real-time tickets fired by POS waitstaff & bar mixologists
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                const nextSound = !soundEnabled;
                setSoundEnabled(nextSound);
                if (nextSound) {
                  playKitchenOrderChime('normal');
                }
              }}
              className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                soundEnabled
                  ? 'bg-slate-800 border-slate-700 text-slate-200 shadow-xs'
                  : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
              title={soundEnabled ? 'Chime sound enabled (click to mute)' : 'Sound muted (click to enable)'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="text-[11px] hidden sm:inline">Chime</span>
            </button>

            <button
              type="button"
              onClick={() => setShowNewTicketModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Kitchen Ticket</span>
            </button>

            {onNavigateToPos && (
              <button
                type="button"
                onClick={onNavigateToPos}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
              >
                Go to POS Register →
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills & Station Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setFilterStatus('all_active')}
              className={`px-3 py-1.5 rounded-lg border font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                filterStatus === 'all_active'
                  ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              All Active ({activeCount})
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus('pending')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                filterStatus === 'pending'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block animate-pulse" />
              <span>New / Pending ({pendingCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus('preparing')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                filterStatus === 'preparing'
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />
              <span>Cooking ({preparingCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus('ready')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                filterStatus === 'ready'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              <span>Ready for Pass ({readyCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus('completed')}
              className={`px-3 py-1.5 rounded-lg border font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                filterStatus === 'completed'
                  ? 'bg-slate-800 text-slate-200 border-slate-600'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Served Archive
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative min-w-[160px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket #, item..."
                className="w-full pl-8 pr-2.5 py-1 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500"
              />
            </div>
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              className="px-2.5 py-1 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-300"
            >
              <option value="All">All Stations</option>
              <option value="Kitchen Hot Line">Hot Line</option>
              <option value="Cold Pantry">Cold Pantry</option>
              <option value="Lounge Mixology Bar">Mixology Bar</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Responsive KDS Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
        {filteredTickets.length === 0 ? (
          <div className="col-span-full py-16 text-center rounded-2xl border-2 border-dashed border-slate-800 bg-slate-900/50 space-y-3">
            <ChefHat className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-semibold text-slate-300">
              Kitchen Queue Clear
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No orders matching the active filter. When POS staff send a ticket or fire an order, it will appear here immediately.
            </p>
          </div>
        ) : (
          filteredTickets.map((ticket) => {
            const elapsed = getElapsedMinutes(ticket.createdAt);
            const isLate = elapsed >= 10 && ticket.status !== 'completed';
            const isWarning = elapsed >= 6 && ticket.status !== 'completed';
            const isRush = ticket.priority === 'rush';

            return (
              <div
                key={ticket.id}
                className={`kitchen-ticket-card rounded-xl border overflow-hidden flex flex-col justify-between transition-all bg-slate-900 ${
                  isRush
                    ? 'border-rose-500/80 shadow-lg shadow-rose-950/20'
                    : ticket.status === 'ready'
                    ? 'border-emerald-500/80'
                    : ticket.status === 'preparing'
                    ? 'border-sky-500/80'
                    : 'border-amber-500/70'
                }`}
              >
                {/* Ticket Top Banner */}
                <div
                  className={`px-3.5 py-2.5 border-b flex items-center justify-between text-xs ${
                    isRush
                      ? 'bg-rose-950/70 border-rose-800 text-rose-200'
                      : ticket.status === 'ready'
                      ? 'bg-emerald-950/70 border-emerald-800 text-emerald-200'
                      : ticket.status === 'preparing'
                      ? 'bg-sky-950/70 border-sky-800 text-sky-200'
                      : 'bg-amber-950/70 border-amber-800 text-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-slate-100">
                      {ticket.ticketNumber}
                    </span>
                    {isRush && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500 text-white animate-pulse">
                        <Flame className="w-3 h-3" />
                        RUSH
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 font-mono text-[11px]">
                    <Clock className="w-3 h-3" />
                    <span
                      className={`font-bold ${
                        isLate
                          ? 'text-rose-400 animate-pulse'
                          : isWarning
                          ? 'text-amber-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {elapsed}m ago
                    </span>
                  </div>
                </div>

                {/* Ticket Metadata (Server, Area, Customer) */}
                <div className="px-3.5 py-2 bg-slate-950/80 border-b border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span className="font-semibold text-slate-200">
                    {ticket.serviceMode}
                  </span>
                  <span>
                    Server: <strong>{ticket.serverName}</strong>
                  </span>
                </div>

                {ticket.customerName && (
                  <div className="px-3.5 py-1 bg-slate-950/40 border-b border-slate-800/80 text-[11px] text-amber-300 font-medium">
                    Guest: {ticket.customerName}
                  </div>
                )}

                {/* Ticket Items List */}
                <div className="p-3.5 space-y-2.5 flex-1">
                  <div className="space-y-2">
                    {ticket.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold text-slate-100 leading-snug">
                            <span className="text-amber-400 font-mono text-sm mr-1.5">
                              {item.quantity}×
                            </span>
                            {item.name}
                          </span>
                          {item.station && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 whitespace-nowrap shrink-0">
                              {item.station}
                            </span>
                          )}
                        </div>
                        {item.notes && (
                          <p className="text-[11px] text-rose-300 font-medium bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-900/50">
                            ⚠️ {item.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {ticket.notes && (
                    <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-800/40 text-[11px] text-amber-200">
                      <strong>Chef Note:</strong> {ticket.notes}
                    </div>
                  )}
                </div>

                {/* Ticket Action Buttons (Single Tap Workflow) */}
                <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Current Status:</span>
                    <span
                      className={`font-bold capitalize font-mono ${
                        ticket.status === 'ready'
                          ? 'text-emerald-400'
                          : ticket.status === 'preparing'
                          ? 'text-sky-400'
                          : ticket.status === 'completed'
                          ? 'text-slate-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {ticket.status}
                    </span>
                  </div>

                  {/* Actions by current state */}
                  {ticket.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateStatus(ticket.id, 'preparing', ticket.ticketNumber)
                      }
                      className="w-full py-2.5 rounded-lg text-xs font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start Cooking / Prep</span>
                    </button>
                  )}

                  {ticket.status === 'preparing' && (
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateStatus(ticket.id, 'ready', ticket.ticketNumber)
                      }
                      className="w-full py-2.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Ready for Pass</span>
                    </button>
                  )}

                  {ticket.status === 'ready' && (
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateStatus(ticket.id, 'completed', ticket.ticketNumber)
                      }
                      className="w-full py-2.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Utensils className="w-3.5 h-3.5" />
                      <span>Served to Guest</span>
                    </button>
                  )}

                  {ticket.status === 'completed' && (
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateStatus(ticket.id, 'preparing', ticket.ticketNumber)
                      }
                      className="w-full py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Recall Ticket</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Manual Kitchen Ticket Modal */}
      {showNewTicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    Create Kitchen Ticket
                  </h3>
                  <p className="text-xs text-slate-400">
                    Dispatch order or special request directly to kitchen line
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewTicketModal(false)}
                className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateManualTicket} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Service Area</label>
                  <select
                    value={manualTable}
                    onChange={(e) => setManualTable(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  >
                    <option value="VIP Booth">VIP Booth</option>
                    <option value="Lounge Table">Lounge Area</option>
                    <option value="Bar Tab">Bar Counter</option>
                    <option value="Bistro Dining">Bistro Dining</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Server / Lead</label>
                  <select
                    value={manualServer}
                    onChange={(e) => setManualServer(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  >
                    {state.users?.map((u) => (
                      <option key={u.id} value={u.name}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Order Priority</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setManualPriority('normal')}
                    className={`py-1.5 rounded-lg border font-semibold cursor-pointer ${
                      manualPriority === 'normal'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualPriority('rush')}
                    className={`py-1.5 rounded-lg border font-semibold flex items-center justify-center gap-1 cursor-pointer ${
                      manualPriority === 'rush'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    Rush / Urgent
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  Ordered Dishes / Drinks (One per line) *
                </label>
                <textarea
                  required
                  rows={4}
                  value={manualItemText}
                  onChange={(e) => setManualItemText(e.target.value)}
                  placeholder="e.g.&#10;2x Truffle Wagyu Sliders&#10;1x Burrata Board&#10;2x Smoked Honey Old Fashioned"
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  Special Chef Notes (Allergies / Cooking Temp)
                </label>
                <input
                  type="text"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="e.g. Nut allergy · Steak medium rare"
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewTicketModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg cursor-pointer shadow-sm"
                >
                  Fire Ticket to Line
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
